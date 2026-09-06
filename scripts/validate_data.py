#!/usr/bin/env python3
"""Validate Stödassistenten public ingestion metadata contracts.

This intentionally uses only the Python standard library so CI does not need
third-party packages, network access, secrets, or user data.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

SOURCE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{2,127}$")
TOKEN_RE = re.compile(r"^[a-z][a-z0-9_]{1,79}$")
SEMVER_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")

PRIORITIES = {"P0", "P1", "P2"}
SOURCE_STATUSES = {
    "SOURCE_CANDIDATE",
    "SOURCE_VERIFIED",
    "SOURCE_CHANGED",
    "SOURCE_BLOCKED",
    "SOURCE_RETIRED",
}
ADAPTER_STATES = {
    "CANDIDATE",
    "READY_FOR_PRIVATE_ADAPTER",
    "ACTIVE",
    "PAUSED",
    "BLOCKED",
    "SPECIAL_HANDLING_REQUIRED",
}
SUPPORT_STATUSES = {
    "DISCOVERED",
    "PARSED",
    "NEEDS_REVIEW",
    "VERIFIED",
    "CHANGED",
    "EXPIRED",
    "ARCHIVED",
}
GUARDRAILS = {
    "robots_and_terms_review_required_before_crawling",
    "prefer_api_or_structured_data_when_available",
    "no_personal_data",
    "no_user_case_data",
    "product_use_requires_verified_support_records",
}
SOURCE_REQUIRED = {
    "source_id",
    "owner",
    "authority_type",
    "url",
    "geography",
    "coverage",
    "source_type",
    "ingestion_method",
    "priority",
    "suggested_review_frequency_days",
    "source_verification_status",
    "last_source_check",
    "adapter_state",
}
SOURCE_OPTIONAL = {"notes"}
CORE_SUPPORT_REQUIRED = {
    "support_id",
    "name",
    "category",
    "provider",
    "geography",
    "eligibility",
    "application",
    "source",
    "verification",
    "lifecycle",
}


def load_json(path: Path):
    try:
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        fail(f"missing file: {path.relative_to(ROOT)}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path.relative_to(ROOT)}: {exc}")


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def parse_iso_date(value: object, field: str) -> date:
    require(isinstance(value, str), f"{field} must be an ISO date string")
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        fail(f"{field} must use YYYY-MM-DD: {value!r}")
    require(parsed <= date.today(), f"{field} cannot be in the future: {value}")
    return parsed


def validate_https_url(value: object, field: str) -> None:
    require(isinstance(value, str), f"{field} must be a string")
    parsed = urlparse(value)
    require(parsed.scheme == "https", f"{field} must use https: {value!r}")
    require(bool(parsed.netloc), f"{field} must include a host: {value!r}")
    require(parsed.username is None and parsed.password is None, f"{field} must not contain credentials")


def validate_schema_contracts() -> None:
    registry_schema = load_json(DATA / "source_registry.schema.json")
    require(
        registry_schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema",
        "source_registry.schema.json must use JSON Schema draft 2020-12",
    )
    required = set(registry_schema.get("required", []))
    require(
        required == {"schema_version", "generated_at", "purpose", "automation_guardrails", "sources"},
        "source registry schema top-level required fields drifted",
    )

    support_schema = load_json(DATA / "support_record.schema.json")
    require(
        support_schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema",
        "support_record.schema.json must use JSON Schema draft 2020-12",
    )
    support_required = set(support_schema.get("required", []))
    require(
        support_required == CORE_SUPPORT_REQUIRED,
        f"support record core required fields drifted: {sorted(support_required)}",
    )
    try:
        statuses = set(
            support_schema["properties"]["verification"]["properties"]["status"]["enum"]
        )
    except (KeyError, TypeError):
        fail("support record schema is missing verification.status enum")
    require(statuses == SUPPORT_STATUSES, f"support verification states drifted: {sorted(statuses)}")


def validate_source_registry() -> None:
    registry = load_json(DATA / "source_registry.json")
    require(isinstance(registry, dict), "source_registry.json must contain an object")

    expected_top = {"schema_version", "generated_at", "purpose", "automation_guardrails", "sources"}
    require(set(registry) == expected_top, f"unexpected source registry top-level fields: {sorted(set(registry) - expected_top)}")
    require(isinstance(registry["schema_version"], str) and SEMVER_RE.fullmatch(registry["schema_version"]), "schema_version must be semantic x.y.z")
    parse_iso_date(registry["generated_at"], "generated_at")
    require(isinstance(registry["purpose"], str) and 20 <= len(registry["purpose"]) <= 1200, "purpose must be 20..1200 characters")

    guardrails = registry["automation_guardrails"]
    require(isinstance(guardrails, dict), "automation_guardrails must be an object")
    require(set(guardrails) == GUARDRAILS, "automation_guardrails keys drifted")
    for key in GUARDRAILS:
        require(guardrails[key] is True, f"guardrail {key} must remain true")

    sources = registry["sources"]
    require(isinstance(sources, list) and sources, "sources must be a non-empty list")
    seen_ids: set[str] = set()

    for index, source in enumerate(sources):
        prefix = f"sources[{index}]"
        require(isinstance(source, dict), f"{prefix} must be an object")
        missing = SOURCE_REQUIRED - set(source)
        extras = set(source) - SOURCE_REQUIRED - SOURCE_OPTIONAL
        require(not missing, f"{prefix} missing fields: {sorted(missing)}")
        require(not extras, f"{prefix} has unexpected fields: {sorted(extras)}")

        source_id = source["source_id"]
        require(isinstance(source_id, str) and SOURCE_ID_RE.fullmatch(source_id), f"{prefix}.source_id invalid")
        require(source_id not in seen_ids, f"duplicate source_id: {source_id}")
        seen_ids.add(source_id)

        require(isinstance(source["owner"], str) and 2 <= len(source["owner"]) <= 200, f"{prefix}.owner invalid")
        require(isinstance(source["authority_type"], str) and TOKEN_RE.fullmatch(source["authority_type"]), f"{prefix}.authority_type invalid")
        validate_https_url(source["url"], f"{prefix}.url")
        require(source["geography"] == "SE", f"{prefix}.geography must be SE in the national registry")

        coverage = source["coverage"]
        require(isinstance(coverage, list) and coverage, f"{prefix}.coverage must be non-empty")
        require(len(coverage) == len(set(coverage)), f"{prefix}.coverage contains duplicates")
        for item in coverage:
            require(isinstance(item, str) and TOKEN_RE.fullmatch(item), f"{prefix}.coverage token invalid: {item!r}")

        require(isinstance(source["source_type"], str) and TOKEN_RE.fullmatch(source["source_type"]), f"{prefix}.source_type invalid")
        require(isinstance(source["ingestion_method"], str) and TOKEN_RE.fullmatch(source["ingestion_method"]), f"{prefix}.ingestion_method invalid")
        require(source["priority"] in PRIORITIES, f"{prefix}.priority invalid")

        frequency = source["suggested_review_frequency_days"]
        require(type(frequency) is int and 1 <= frequency <= 365, f"{prefix}.suggested_review_frequency_days must be 1..365")
        require(source["source_verification_status"] in SOURCE_STATUSES, f"{prefix}.source_verification_status invalid")
        parse_iso_date(source["last_source_check"], f"{prefix}.last_source_check")
        require(source["adapter_state"] in ADAPTER_STATES, f"{prefix}.adapter_state invalid")

        if source["adapter_state"] == "SPECIAL_HANDLING_REQUIRED":
            require(isinstance(source.get("notes"), str) and source["notes"].strip(), f"{prefix} special handling requires notes")
        if "notes" in source:
            require(1 <= len(source["notes"]) <= 1200, f"{prefix}.notes must be 1..1200 characters")

    print(f"OK: validated {len(sources)} source registry entries")


def main() -> int:
    validate_schema_contracts()
    validate_source_registry()
    print("OK: public ingestion data contracts are internally consistent")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
