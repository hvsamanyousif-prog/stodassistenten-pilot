#!/usr/bin/env python3
"""Validate Stödassistenten's public/private API boundary contract.

The contract is intentionally implementation-neutral. This validator protects
security and privacy invariants without publishing endpoints, secrets, real
user/case data, private rules, ranking logic or prompts.
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
BOUNDARY_PATH = CONFIG / "api_boundary.json"
SCHEMA_PATH = CONFIG / "api_boundary.schema.json"
CAPABILITIES_PATH = CONFIG / "capabilities.json"

SEMVER_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
TOKEN_RE = re.compile(r"^[a-z][a-z0-9_]{2,79}$")
EXPECTED_OPERATIONS = {"match", "sources", "feedback", "interview", "cases"}
TOP_LEVEL_KEYS = {"schema_version", "purpose", "security_invariants", "operations"}
OPERATION_KEYS = {
    "operation_id",
    "purpose",
    "capability_id",
    "execution_surface",
    "auth_requirement",
    "authorization_requirement",
    "request_data_class",
    "response_data_class",
    "persistence",
    "logging",
    "safety_controls",
}
INVARIANTS = {
    "no_endpoints_or_secrets",
    "deny_by_default",
    "client_flags_are_not_authorization",
    "sensitive_input_ephemeral_by_default",
    "public_responses_minimized",
    "no_sensitive_payloads_in_logs",
    "no_real_user_or_case_data_in_public_repo",
}
EXECUTION_SURFACES = {"public_safe_service", "private_service"}
AUTH = {"none", "optional", "required"}
AUTHZ = {"none", "resource_required"}
REQUEST_CLASSES = {"public_metadata", "anonymous_product_metrics", "ephemeral_sensitive", "private_case_data"}
RESPONSE_CLASSES = {"public_metadata", "anonymous_ack", "derived_support_results", "interview_prompts", "private_case_data"}
PERSISTENCE = {"none", "metadata_only", "private_store_only"}
LOGGING = {"none", "metadata_only", "audit_metadata"}
FORBIDDEN_KEYS = {
    "endpoint",
    "url",
    "host",
    "secret",
    "token",
    "api_key",
    "database_url",
    "connection_string",
    "price",
    "pricing",
    "plan",
    "tier",
    "entitlement",
    "internal_rule",
    "prompt",
    "ranking",
    "user_id",
    "case_id",
    "organization_id",
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
    require(isinstance(schema, dict), "api_boundary.schema.json must contain an object")
    require(
        schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema",
        "API boundary schema must use JSON Schema draft 2020-12",
    )
    require(schema.get("additionalProperties") is False, "schema must deny top-level additional properties")
    require(set(schema.get("required", [])) == TOP_LEVEL_KEYS, "schema top-level required fields drifted")
    try:
        operation = schema["$defs"]["operation"]
    except (KeyError, TypeError) as exc:
        raise ValidationError("schema is missing $defs.operation") from exc
    require(operation.get("additionalProperties") is False, "operation schema must deny additional properties")
    require(set(operation.get("required", [])) == OPERATION_KEYS, "operation required fields drifted")
    reject_forbidden_keys(schema)


def capability_index(catalog) -> dict[str, dict]:
    require(isinstance(catalog, dict), "capabilities.json must contain an object")
    items = catalog.get("capabilities")
    require(isinstance(items, list), "capabilities.json missing capabilities list")
    result: dict[str, dict] = {}
    for item in items:
        require(isinstance(item, dict), "capability item must be an object")
        cap_id = item.get("capability_id")
        require(isinstance(cap_id, str), "capability_id must be a string")
        require(cap_id not in result, f"duplicate capability_id in catalog: {cap_id}")
        result[cap_id] = item
    return result


def validate_operation(operation: dict, capabilities: dict[str, dict]) -> None:
    op_id = operation["operation_id"]
    require(isinstance(op_id, str) and op_id in EXPECTED_OPERATIONS, f"invalid operation_id: {op_id!r}")
    require(isinstance(operation["purpose"], str) and 20 <= len(operation["purpose"]) <= 600, f"{op_id}.purpose invalid")
    require(operation["execution_surface"] in EXECUTION_SURFACES, f"{op_id}.execution_surface invalid")
    require(operation["auth_requirement"] in AUTH, f"{op_id}.auth_requirement invalid")
    require(operation["authorization_requirement"] in AUTHZ, f"{op_id}.authorization_requirement invalid")
    require(operation["request_data_class"] in REQUEST_CLASSES, f"{op_id}.request_data_class invalid")
    require(operation["response_data_class"] in RESPONSE_CLASSES, f"{op_id}.response_data_class invalid")
    require(operation["persistence"] in PERSISTENCE, f"{op_id}.persistence invalid")
    require(operation["logging"] in LOGGING, f"{op_id}.logging invalid")

    controls = operation["safety_controls"]
    require(isinstance(controls, list) and controls, f"{op_id}.safety_controls must be non-empty")
    require(len(controls) == len(set(controls)), f"{op_id}.safety_controls must be unique")
    require(all(isinstance(item, str) and TOKEN_RE.fullmatch(item) for item in controls), f"{op_id}.safety_controls invalid")

    cap_id = operation["capability_id"]
    if cap_id is None:
        require(op_id == "feedback", "only feedback may omit capability_id in v0.1")
    else:
        require(isinstance(cap_id, str) and TOKEN_RE.fullmatch(cap_id), f"{op_id}.capability_id invalid")
        require(cap_id in capabilities, f"{op_id} references unknown capability: {cap_id}")
        cap = capabilities[cap_id]
        if operation["execution_surface"] == "private_service":
            require(cap.get("execution_surface") == "private_service", f"{op_id}: private operation must reference private capability")
            require(cap.get("enforcement") == "server_authoritative", f"{op_id}: private capability must be server_authoritative")

    if operation["authorization_requirement"] == "resource_required":
        require(operation["auth_requirement"] == "required", f"{op_id}: resource authorization requires authentication")
        require(operation["execution_surface"] == "private_service", f"{op_id}: resource authorization must be private")

    if "private_case_data" in {operation["request_data_class"], operation["response_data_class"]}:
        require(operation["auth_requirement"] == "required", f"{op_id}: private case data requires authentication")
        require(operation["authorization_requirement"] == "resource_required", f"{op_id}: private case data requires resource authorization")
        require(operation["execution_surface"] == "private_service", f"{op_id}: private case data requires private service")
        require(operation["persistence"] == "private_store_only", f"{op_id}: case persistence must be private_store_only")
        require(operation["logging"] == "audit_metadata", f"{op_id}: case operations require audit metadata")
        require("audit_without_sensitive_payload" in controls, f"{op_id}: case audit must exclude sensitive payload")
        require("server_authorization_required" in controls, f"{op_id}: server authorization control required")

    if operation["request_data_class"] == "ephemeral_sensitive":
        require(operation["execution_surface"] == "private_service", f"{op_id}: sensitive input must use private service")
        require(operation["persistence"] == "none", f"{op_id}: sensitive input must be ephemeral by default")
        require(operation["logging"] in {"none", "metadata_only"}, f"{op_id}: sensitive payload logging forbidden")
        require("no_raw_input_logging" in controls, f"{op_id}: no_raw_input_logging control required")

    if operation["request_data_class"] == "anonymous_product_metrics":
        require(op_id == "feedback", "anonymous_product_metrics is reserved for feedback")
        for control in {"no_free_text", "no_situation_answers", "no_identifiers"}:
            require(control in controls, f"feedback requires safety control: {control}")

    if operation["execution_surface"] == "public_safe_service":
        require(operation["authorization_requirement"] == "none", f"{op_id}: public-safe service cannot imply resource authorization")
        require(operation["response_data_class"] in {"public_metadata", "anonymous_ack"}, f"{op_id}: public-safe response class is too broad")
        require(operation["request_data_class"] in {"public_metadata", "anonymous_product_metrics"}, f"{op_id}: public-safe request class is too sensitive")


def validate_boundary(boundary, catalog) -> None:
    require(isinstance(boundary, dict), "api_boundary.json must contain an object")
    reject_forbidden_keys(boundary)
    require(set(boundary) == TOP_LEVEL_KEYS, "API boundary top-level fields drifted")
    require(isinstance(boundary["schema_version"], str) and SEMVER_RE.fullmatch(boundary["schema_version"]), "schema_version must be semantic x.y.z")
    require(isinstance(boundary["purpose"], str) and 20 <= len(boundary["purpose"]) <= 1200, "purpose invalid")

    invariants = boundary["security_invariants"]
    require(isinstance(invariants, dict), "security_invariants must be an object")
    require(set(invariants) == INVARIANTS, "security invariant keys drifted")
    for key in INVARIANTS:
        require(invariants[key] is True, f"security invariant {key} must remain true")

    operations = boundary["operations"]
    require(isinstance(operations, list), "operations must be a list")
    require(len(operations) == len(EXPECTED_OPERATIONS), "v0.1 must contain exactly five operation classes")
    capabilities = capability_index(catalog)
    seen: set[str] = set()
    for index, operation in enumerate(operations):
        require(isinstance(operation, dict), f"operations[{index}] must be an object")
        require(set(operation) == OPERATION_KEYS, f"operations[{index}] fields drifted")
        validate_operation(operation, capabilities)
        op_id = operation["operation_id"]
        require(op_id not in seen, f"duplicate operation_id: {op_id}")
        seen.add(op_id)
    require(seen == EXPECTED_OPERATIONS, f"operation set drifted: {sorted(seen)}")


def expect_invalid(boundary, catalog, fragment: str) -> None:
    try:
        validate_boundary(boundary, catalog)
    except ValidationError as exc:
        require(fragment in str(exc), f"self-test expected {fragment!r}, got {str(exc)!r}")
        return
    raise ValidationError(f"self-test expected invalid boundary containing: {fragment}")


def run_self_test(boundary, catalog) -> None:
    bad = copy.deepcopy(boundary)
    bad["endpoint"] = "https://private.invalid"
    expect_invalid(bad, catalog, "forbidden public key: endpoint")

    bad = copy.deepcopy(boundary)
    case = next(item for item in bad["operations"] if item["operation_id"] == "cases")
    case["auth_requirement"] = "none"
    expect_invalid(bad, catalog, "resource authorization requires authentication")

    bad = copy.deepcopy(boundary)
    match = next(item for item in bad["operations"] if item["operation_id"] == "match")
    match["persistence"] = "private_store_only"
    expect_invalid(bad, catalog, "sensitive input must be ephemeral by default")

    bad = copy.deepcopy(boundary)
    feedback = next(item for item in bad["operations"] if item["operation_id"] == "feedback")
    feedback["safety_controls"].remove("no_free_text")
    expect_invalid(bad, catalog, "feedback requires safety control: no_free_text")

    bad = copy.deepcopy(boundary)
    match = next(item for item in bad["operations"] if item["operation_id"] == "match")
    match["capability_id"] = "source_details"
    expect_invalid(bad, catalog, "private operation must reference private capability")

    print("API boundary self-tests passed")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    try:
        boundary = load_json(BOUNDARY_PATH)
        schema = load_json(SCHEMA_PATH)
        catalog = load_json(CAPABILITIES_PATH)
        validate_schema_contract(schema)
        validate_boundary(boundary, catalog)
        if args.self_test:
            run_self_test(boundary, catalog)
        else:
            print("API boundary contract valid")
        return 0
    except ValidationError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
