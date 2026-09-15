#!/usr/bin/env python3
"""Fail-closed semantic validator for the public situation/session contract."""

from __future__ import annotations

import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "config" / "situation_session_contract.json"
SCHEMA = ROOT / "config" / "situation_session_contract.schema.json"
CLIENT = ROOT / "client" / "situation-session-contract.js"
STUDENT_GUIDANCE = ROOT / "client" / "student-finance-guidance.js"
PERSON_PILOT = ROOT / "person-pilot.html"

EXPECTED_SURFACES = ["web", "ios", "android"]
EXPECTED_LANGUAGES = ["sv", "ar", "fa"]
EXPECTED_ACTORS = ["private_person", "relative", "student", "employee", "company", "association", "property_actor", "other"]
EXPECTED_TOP_LEVEL = ["actor_type", "focus", "lang"]
REQUIRED_FORBIDDEN = {
    "q", "query", "story", "situation", "raw_situation", "rawSituation",
    "diagnosis", "medical_note", "journal", "address", "personnummer",
    "name", "email", "phone", "income", "salary", "employer",
    "child_name", "company_name", "bank_account", "password", "token",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def validate(data: dict) -> None:
    require(data.get("schema_version") == "1.0.0", "schema_version must stay pinned to 1.0.0")
    require(data.get("contract_id") == "stodassistenten-situation-session-v1", "unexpected contract_id")
    require(data.get("surfaces") == EXPECTED_SURFACES, "web/ios/android must share one ordered surface contract")
    require(data.get("languages") == EXPECTED_LANGUAGES, "sv/ar/fa parity is mandatory")
    require(data.get("actor_types") == EXPECTED_ACTORS, "actor vocabulary must exactly match the live product vocabulary")

    lifecycle = data.get("lifecycle") or {}
    require(lifecycle.get("default") == "ephemeral", "session state must be ephemeral by default")
    for key in ("public_persistence", "raw_situation_logging", "raw_situation_in_url", "raw_situation_in_feedback"):
        require(lifecycle.get(key) == "forbidden", f"{key} must fail closed")

    fields = data.get("fields") or {}
    raw = fields.get("raw_situation") or {}
    require(raw == {"scope": "ephemeral_private_input", "public_handoff": False, "log": False, "persist": False}, "raw_situation boundary weakened")
    require((fields.get("language") or {}).get("query_key") == "lang", "language query key drifted")
    require((fields.get("actor_type") or {}).get("query_key") == "actor_type", "actor query key drifted")
    require((fields.get("focus") or {}).get("query_key") == "focus", "focus query key drifted")
    require((fields.get("coarse_facts") or {}).get("public_handoff") == "capability_allowlist_only", "coarse facts require capability allowlist")
    require((fields.get("missing_facts") or {}).get("public_handoff") is False, "missing facts must not cross public handoff")

    handoff = data.get("public_handoff") or {}
    require(handoff.get("allowed_top_level_query_keys") == EXPECTED_TOP_LEVEL, "public top-level query keys must remain minimal")
    require(handoff.get("coarse_fact_policy") == "explicit_allowlist_per_capability", "arbitrary coarse facts are forbidden")
    require(handoff.get("max_value_length") == 64, "coarse public values must stay bounded")
    forbidden = set(handoff.get("forbidden_keys") or [])
    require(REQUIRED_FORBIDDEN <= forbidden, f"sensitive-key denylist weakened: {sorted(REQUIRED_FORBIDDEN - forbidden)}")

    feedback = data.get("feedback") or {}
    require(feedback == {"raw_situation": False, "identifiers": False, "free_text": False, "coarse_structured_only": True}, "feedback boundary weakened")

    core = data.get("private_core") or {}
    for key in ("matcher_logic", "ranking_logic", "prompts", "secrets"):
        require(core.get(key) == "private_only", f"{key} must remain private")
    require(core.get("raw_situation") == "ephemeral_by_default", "private raw situation must remain ephemeral by default")
    require(data.get("compatibility") == {"web": "v1", "ios": "v1", "android": "v1"}, "cross-surface compatibility drifted")


def negative_self_tests(data: dict) -> None:
    mutations = []

    m = copy.deepcopy(data)
    m["lifecycle"]["raw_situation_logging"] = "allowed"
    mutations.append(m)

    m = copy.deepcopy(data)
    m["public_handoff"]["allowed_top_level_query_keys"].append("raw_situation")
    mutations.append(m)

    m = copy.deepcopy(data)
    m["public_handoff"]["forbidden_keys"].remove("diagnosis")
    mutations.append(m)

    m = copy.deepcopy(data)
    m["private_core"]["matcher_logic"] = "public"
    mutations.append(m)

    m = copy.deepcopy(data)
    m["actor_types"][2] = "student_young_adult"
    mutations.append(m)

    for index, mutation in enumerate(mutations, start=1):
        try:
            validate(mutation)
        except AssertionError:
            continue
        raise AssertionError(f"negative self-test {index} did not fail closed")


def validate_public_client(source: str) -> None:
    for marker in ("fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "indexedDB", "supabase.co", "http://", "https://"):
        require(marker not in source, f"public contract adapter must not perform network/storage work: {marker}")
    for export_name in ("makeSessionProfile", "buildPublicHandoff", "toSafeSessionSnapshot"):
        require(export_name in source, f"missing public-safe adapter function: {export_name}")
    require("allowedFactKeys" in source, "public handoff must require explicit per-capability fact allowlisting")
    require("rawSituation" in source, "ephemeral input boundary must be explicit in the adapter")
    require("'student'" in source, "public adapter must carry the canonical live student actor token")
    require("student_young_adult" not in source, "parallel student actor vocabulary is forbidden")


def validate_live_actor_alignment(student_source: str, person_source: str) -> None:
    require("actor_type=student&focus=student_csn" in student_source, "live student handoff no longer emits canonical actor_type=student")
    require("student:'" in person_source, "person pilot no longer consumes the canonical student actor token")
    require("student_young_adult" not in student_source, "student guidance introduced a second actor vocabulary")
    require("student_young_adult" not in person_source, "person pilot introduced a second actor vocabulary")


def main() -> None:
    data = json.loads(CONTRACT.read_text(encoding="utf-8"))
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    require(schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema", "schema draft marker missing")
    require(schema.get("additionalProperties") is False, "contract schema must deny unknown top-level fields")
    validate(data)
    negative_self_tests(data)
    validate_public_client(CLIENT.read_text(encoding="utf-8"))
    validate_live_actor_alignment(
        STUDENT_GUIDANCE.read_text(encoding="utf-8"),
        PERSON_PILOT.read_text(encoding="utf-8"),
    )
    print("situation/session contract validation: OK")


if __name__ == "__main__":
    main()
