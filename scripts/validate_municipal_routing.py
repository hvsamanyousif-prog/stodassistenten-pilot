#!/usr/bin/env python3
"""Fail-closed municipal routing contract for Stödassistenten.

This public validator protects the boundary between the single national support
truth record and municipality-specific application/contact routes. It never
fetches municipality pages and never evaluates user eligibility. The future
private resolver can implement discovery/change detection behind the same
contract without creating 290 duplicated support records.
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_PATH = ROOT / "tests" / "fixtures" / "municipal_routing" / "cases.json"
SCHEMA_PATH = ROOT / "data" / "municipal_route.schema.json"
SCB_IDENTITY_URL = (
    "https://www.scb.se/hitta-statistik/regional-statistik-och-kartor/"
    "regionala-indelningar/lan-och-kommuner/lan-och-kommuner-i-kodnummerordning/"
)
REQUIRED_GUARDS = {
    "eligibility_inference_forbidden",
    "amount_inference_forbidden",
    "guessed_route_forbidden",
    "stale_route_fails_closed",
    "raw_situation_in_url_forbidden",
    "local_rule_duplication_forbidden",
}


class MunicipalRoutingError(ValueError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise MunicipalRoutingError(message)


def load(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        value = json.load(fh)
    require(isinstance(value, dict), f"{path}: root must be object")
    return value


def parse_day(value: str, field: str) -> date:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise MunicipalRoutingError(f"{field} must be ISO date") from exc


def valid_https_url(value: Any) -> bool:
    if not isinstance(value, str) or not value:
        return False
    parsed = urlparse(value)
    return parsed.scheme == "https" and bool(parsed.netloc)


def route_url_is_privacy_safe(value: Any) -> bool:
    if value is None:
        return True
    if not valid_https_url(value):
        return False
    parsed = urlparse(value)
    # A public route must be reusable navigation, not a serialized case. Query
    # strings/fragments can carry sensitive context and are therefore review-gated.
    return not parsed.query and not parsed.fragment


def validate_record_shape(record: dict[str, Any]) -> None:
    require(record.get("schema_version") == "1.0.0", "unsupported schema_version")
    support_id = record.get("support_id")
    require(isinstance(support_id, str) and len(support_id) >= 3, "support_id missing")

    municipality = record.get("municipality")
    require(isinstance(municipality, dict), "municipality missing")
    code = municipality.get("scb_code")
    name = municipality.get("name")
    require(isinstance(code, str) and len(code) == 4 and code.isdigit(), "invalid SCB municipality code")
    require(isinstance(name, str) and len(name.strip()) >= 2, "municipality name missing")

    identity = record.get("identity_source")
    require(isinstance(identity, dict), "identity_source missing")
    require(identity.get("owner") == "Statistiska centralbyrån (SCB)", "municipality identity must come from SCB")
    require(identity.get("url") == SCB_IDENTITY_URL, "unexpected SCB identity source URL")
    require(identity.get("source_type") == "official_municipality_identity", "invalid municipality identity source type")

    route = record.get("route")
    require(isinstance(route, dict), "route missing")
    require(valid_https_url(route.get("source_url")), "route source_url must be HTTPS")
    official_url = route.get("official_url")
    require(official_url is None or valid_https_url(official_url), "official_url must be null or HTTPS")
    require(
        route.get("source_type") in {"municipality_primary_source", "municipality_e_service", "other"},
        "invalid route source_type",
    )

    verification = record.get("verification")
    require(isinstance(verification, dict), "verification missing")
    require(
        verification.get("status") in {"SOURCE_IDENTIFIED", "VERIFIED_ROUTE", "CHANGED", "STALE", "BLOCKED"},
        "invalid verification status",
    )
    parse_day(verification.get("checked_at"), "verification.checked_at")
    max_age = verification.get("max_age_days")
    require(isinstance(max_age, int) and 1 <= max_age <= 90, "max_age_days must be 1..90")
    require(isinstance(verification.get("human_review_required"), bool), "human_review_required must be boolean")

    guards = record.get("guardrails")
    require(isinstance(guards, dict), "guardrails missing")
    require(REQUIRED_GUARDS <= set(guards), "required municipal routing guardrails missing")
    for key in REQUIRED_GUARDS:
        require(guards.get(key) is True, f"guardrail {key} must be true")


def resolve_route(record: dict[str, Any], as_of: date) -> dict[str, str]:
    """Return a product-safe routing decision without inferring eligibility."""
    validate_record_shape(record)
    route = record["route"]
    verification = record["verification"]
    municipality = record["municipality"]

    if not route_url_is_privacy_safe(route.get("official_url")):
        return {"decision": "REVIEW_REQUIRED", "reason": "unsafe_route_url"}

    status = verification["status"]
    if status in {"CHANGED", "BLOCKED"}:
        return {"decision": "REVIEW_REQUIRED", "reason": "route_changed" if status == "CHANGED" else "route_blocked"}

    checked_at = parse_day(verification["checked_at"], "verification.checked_at")
    age_days = (as_of - checked_at).days
    if age_days < 0:
        return {"decision": "REVIEW_REQUIRED", "reason": "future_check_date"}
    if status == "STALE" or age_days > verification["max_age_days"]:
        return {"decision": "CONTACT_MUNICIPALITY", "reason": "stale_route"}

    if (
        status != "VERIFIED_ROUTE"
        or route.get("source_type") != "municipality_primary_source"
        or route.get("source_owner") != municipality.get("name")
        or not route.get("official_url")
    ):
        return {"decision": "CONTACT_MUNICIPALITY", "reason": "no_verified_primary_route"}

    if route.get("e_id_required") is True and route.get("alternative_without_e_id") in {None, "unknown"}:
        return {"decision": "REVIEW_REQUIRED", "reason": "missing_non_eid_fallback"}

    return {"decision": "DIRECT_OFFICIAL_ROUTE", "reason": "fresh_verified_route"}


def validate_schema_guardrails() -> None:
    schema = load(SCHEMA_PATH)
    text = json.dumps(schema, ensure_ascii=False, sort_keys=True)
    require("not a second support truth layer" in schema.get("description", ""), "schema must state single-truth-layer boundary")
    for token in [
        "eligibility_inference_forbidden",
        "amount_inference_forbidden",
        "guessed_route_forbidden",
        "stale_route_fails_closed",
        "raw_situation_in_url_forbidden",
        "local_rule_duplication_forbidden",
        "official_municipality_identity",
        "VERIFIED_ROUTE",
        "CHANGED",
        "STALE",
    ]:
        require(token in text, f"schema missing guard token {token}")


def self_test() -> None:
    validate_schema_guardrails()
    fixture = load(FIXTURE_PATH)
    as_of = parse_day(fixture.get("as_of_date"), "as_of_date")
    cases = fixture.get("cases")
    require(isinstance(cases, list) and len(cases) >= 5, "expected at least five routing Red Team cases")

    seen: set[str] = set()
    for case in cases:
        require(isinstance(case, dict), "case must be object")
        case_id = case.get("case_id")
        require(isinstance(case_id, str) and case_id, "case_id missing")
        require(case_id not in seen, f"duplicate case_id {case_id}")
        seen.add(case_id)
        record = case.get("record")
        require(isinstance(record, dict), f"{case_id}: record missing")
        result = resolve_route(record, as_of)
        require(result["decision"] == case.get("expected_decision"), f"{case_id}: decision {result} != expected")
        require(result["reason"] == case.get("expected_reason"), f"{case_id}: reason {result} != expected")

    required_cases = {
        "fresh_verified_primary_route",
        "stale_route_falls_back_to_municipality_contact",
        "changed_route_requires_review",
        "search_result_cannot_be_promoted_to_route",
        "raw_situation_query_is_blocked",
    }
    require(required_cases <= seen, f"missing permanent routing regressions: {sorted(required_cases - seen)}")

    print(f"OK: municipal routing contract passed {len(cases)} fail-closed Red Team cases")


def main() -> int:
    self_test()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (MunicipalRoutingError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
