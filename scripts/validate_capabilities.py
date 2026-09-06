#!/usr/bin/env python3
"""Validate Stödassistenten's public capability catalog.

This validator deliberately uses only the Python standard library. It protects
architecture and security invariants without embedding pricing, entitlements,
private endpoints, secrets, user data, or private matching logic in this repo.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config"
CATALOG_PATH = CONFIG / "capabilities.json"
SCHEMA_PATH = CONFIG / "capabilities.schema.json"

CAPABILITY_ID_RE = re.compile(r"^[a-z][a-z0-9_]{2,79}$")
SEMVER_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
MODULES = {
    "matching",
    "sources",
    "watchlists",
    "documents",
    "cases",
    "collaboration",
    "analytics",
    "api",
}
EXECUTION_SURFACES = {"public_ui", "private_service"}
ENFORCEMENT = {"client_visibility", "server_authoritative"}
DATA_SCOPES = {"no_case_data", "private_case_data", "aggregate_only"}
INVARIANTS = {
    "no_pricing_logic",
    "client_flags_are_not_authorization",
    "private_capabilities_require_server_enforcement",
    "no_secrets_or_endpoints",
    "no_user_or_case_data",
}
TOP_LEVEL_KEYS = {"schema_version", "purpose", "security_invariants", "capabilities"}
CAPABILITY_KEYS = {
    "capability_id",
    "module",
    "description",
    "execution_surface",
    "enforcement",
    "data_scope",
    "dependencies",
}
FORBIDDEN_KEYS = {
    "plan",
    "tier",
    "price",
    "pricing",
    "billing",
    "secret",
    "token",
    "api_key",
    "endpoint",
    "backend_url",
    "database_url",
    "connection_string",
}


class ValidationError(Exception):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationError(message)


def load_json(path: Path):
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise ValidationError(f"missing file: {path.relative_to(ROOT)}") from exc
    except json.JSONDecodeError as exc:
        raise ValidationError(f"invalid JSON in {path.relative_to(ROOT)}: {exc}") from exc


def reject_forbidden_keys(value, path: str = "root") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            require(key not in FORBIDDEN_KEYS, f"{path} contains forbidden public key: {key}")
            reject_forbidden_keys(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            reject_forbidden_keys(child, f"{path}[{index}]")


def validate_schema_contract(schema) -> None:
    require(isinstance(schema, dict), "capabilities.schema.json must contain an object")
    require(
        schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema",
        "capability schema must use JSON Schema draft 2020-12",
    )
    require(set(schema.get("required", [])) == TOP_LEVEL_KEYS, "schema top-level required fields drifted")
    try:
        item = schema["$defs"]["capability"]
    except (KeyError, TypeError) as exc:
        raise ValidationError("schema is missing $defs.capability") from exc
    require(set(item.get("required", [])) == CAPABILITY_KEYS, "schema capability required fields drifted")
    require(item.get("additionalProperties") is False, "capability schema must deny additional properties")


def validate_catalog(catalog) -> None:
    require(isinstance(catalog, dict), "capabilities.json must contain an object")
    reject_forbidden_keys(catalog)
    require(set(catalog) == TOP_LEVEL_KEYS, "capability catalog top-level fields drifted")

    version = catalog["schema_version"]
    require(isinstance(version, str) and SEMVER_RE.fullmatch(version), "schema_version must be semantic x.y.z")
    purpose = catalog["purpose"]
    require(isinstance(purpose, str) and 20 <= len(purpose) <= 1000, "purpose must be 20..1000 characters")

    invariants = catalog["security_invariants"]
    require(isinstance(invariants, dict), "security_invariants must be an object")
    require(set(invariants) == INVARIANTS, "security invariant keys drifted")
    for key in INVARIANTS:
        require(invariants[key] is True, f"security invariant {key} must remain true")

    capabilities = catalog["capabilities"]
    require(isinstance(capabilities, list) and capabilities, "capabilities must be a non-empty list")

    by_id: dict[str, dict] = {}
    for index, capability in enumerate(capabilities):
        prefix = f"capabilities[{index}]"
        require(isinstance(capability, dict), f"{prefix} must be an object")
        require(set(capability) == CAPABILITY_KEYS, f"{prefix} fields drifted")

        cap_id = capability["capability_id"]
        require(isinstance(cap_id, str) and CAPABILITY_ID_RE.fullmatch(cap_id), f"{prefix}.capability_id invalid")
        require(cap_id not in by_id, f"duplicate capability_id: {cap_id}")
        by_id[cap_id] = capability

        require(capability["module"] in MODULES, f"{cap_id}.module invalid")
        description = capability["description"]
        require(isinstance(description, str) and 10 <= len(description) <= 400, f"{cap_id}.description invalid")
        require(capability["execution_surface"] in EXECUTION_SURFACES, f"{cap_id}.execution_surface invalid")
        require(capability["enforcement"] in ENFORCEMENT, f"{cap_id}.enforcement invalid")
        require(capability["data_scope"] in DATA_SCOPES, f"{cap_id}.data_scope invalid")

        deps = capability["dependencies"]
        require(isinstance(deps, list), f"{cap_id}.dependencies must be a list")
        require(all(isinstance(dep, str) and CAPABILITY_ID_RE.fullmatch(dep) for dep in deps), f"{cap_id}.dependencies invalid")
        require(len(deps) == len(set(deps)), f"{cap_id}.dependencies must be unique")
        require(cap_id not in deps, f"{cap_id} cannot depend on itself")

        if capability["execution_surface"] == "private_service":
            require(
                capability["enforcement"] == "server_authoritative",
                f"{cap_id}: private_service must be server_authoritative",
            )
        if capability["data_scope"] in {"private_case_data", "aggregate_only"}:
            require(
                capability["enforcement"] == "server_authoritative",
                f"{cap_id}: non-public data scope must be server_authoritative",
            )
        if capability["enforcement"] == "client_visibility":
            require(capability["execution_surface"] == "public_ui", f"{cap_id}: client visibility is UI-only")
            require(capability["data_scope"] == "no_case_data", f"{cap_id}: client visibility cannot gate case data")

    for cap_id, capability in by_id.items():
        for dependency in capability["dependencies"]:
            require(dependency in by_id, f"{cap_id} depends on unknown capability: {dependency}")

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(cap_id: str) -> None:
        if cap_id in visited:
            return
        require(cap_id not in visiting, f"capability dependency cycle detected at: {cap_id}")
        visiting.add(cap_id)
        for dependency in by_id[cap_id]["dependencies"]:
            visit(dependency)
        visiting.remove(cap_id)
        visited.add(cap_id)

    for cap_id in by_id:
        visit(cap_id)


def expect_invalid(catalog, expected_fragment: str) -> None:
    try:
        validate_catalog(catalog)
    except ValidationError as exc:
        require(expected_fragment in str(exc), f"self-test expected {expected_fragment!r}, got {str(exc)!r}")
        return
    raise ValidationError(f"self-test expected invalid catalog containing: {expected_fragment}")


def self_test(valid_catalog) -> None:
    validate_catalog(valid_catalog)

    duplicate = copy.deepcopy(valid_catalog)
    duplicate["capabilities"].append(copy.deepcopy(duplicate["capabilities"][0]))
    expect_invalid(duplicate, "duplicate capability_id")

    missing_dependency = copy.deepcopy(valid_catalog)
    missing_dependency["capabilities"][0]["dependencies"] = ["missing_capability"]
    expect_invalid(missing_dependency, "depends on unknown capability")

    cycle = copy.deepcopy(valid_catalog)
    cycle["capabilities"][0]["dependencies"] = ["source_details"]
    expect_invalid(cycle, "dependency cycle")

    private_client_gate = copy.deepcopy(valid_catalog)
    target = next(item for item in private_client_gate["capabilities"] if item["capability_id"] == "cases")
    target["enforcement"] = "client_visibility"
    expect_invalid(private_client_gate, "private_service must be server_authoritative")

    pricing_leak = copy.deepcopy(valid_catalog)
    pricing_leak["capabilities"][0]["tier"] = "pro"
    expect_invalid(pricing_leak, "forbidden public key: tier")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true", help="run negative invariant tests after validation")
    args = parser.parse_args()

    try:
        schema = load_json(SCHEMA_PATH)
        catalog = load_json(CATALOG_PATH)
        validate_schema_contract(schema)
        validate_catalog(catalog)
        if args.self_test:
            self_test(catalog)
    except ValidationError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    suffix = " + self-tests" if args.self_test else ""
    print(f"OK: validated {len(catalog['capabilities'])} capabilities{suffix}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
