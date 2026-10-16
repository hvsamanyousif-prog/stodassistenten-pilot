#!/usr/bin/env python3
"""Fail-closed validator for the public Evidence Artifact contract.

The contract is intentionally synthetic-only and standard-library-only. It
tests the promotion boundary, not real eligibility, real user cases or live
crawling. A model/search result can never become PRODUCTION_TRUTH merely by
being retrieved or repeated.
"""
from __future__ import annotations

import copy
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

HASH_RE = re.compile(r"^[a-f0-9]{64}$")
ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{2,127}$")
BLOCKED_ZERO_TOUCH_ROLES = {
    "PROPOSAL", "MOTION", "HISTORICAL_ARCHIVE", "SECONDARY_OFFICIAL",
    "THIRD_PARTY", "UNKNOWN",
}
TRUTH_STATES = {"VERIFIED", "PRODUCTION_TRUTH"}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def is_https(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme == "https" and bool(parsed.netloc) and parsed.username is None and parsed.password is None


def parse_dt(value: str) -> None:
    datetime.fromisoformat(value.replace("Z", "+00:00"))


def validate_schema(schema: dict) -> None:
    require(schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema", "schema draft drifted")
    require(schema.get("additionalProperties") is False, "top-level schema must fail closed")
    require(set(schema.get("required", [])) == {"schema_version", "artifact", "fact_assertions", "conflict_sets", "review_decisions"}, "top-level required fields drifted")
    defs = schema.get("$defs", {})
    for name in ["artifact", "factAssertion", "conflictSet", "reviewDecision", "promotionGate", "jurisdiction"]:
        require(name in defs, f"schema definition missing: {name}")
        require(defs[name].get("additionalProperties") is False, f"{name} must reject unknown fields")

    fact_status = set(defs["factAssertion"]["properties"]["status"]["enum"])
    require("PRODUCTION_TRUTH" in fact_status and "NEEDS_REVIEW" in fact_status, "truth state boundary missing")
    roles = set(defs["artifact"]["properties"]["document_role"]["enum"])
    require(BLOCKED_ZERO_TOUCH_ROLES <= roles, "blocked source roles missing from schema")


def validate_package(pkg: dict) -> None:
    require(pkg.get("schema_version") == "1.0.0", "schema_version must be 1.0.0")
    require(set(pkg) == {"schema_version", "artifact", "fact_assertions", "conflict_sets", "review_decisions"}, "unexpected package fields")

    artifact = pkg["artifact"]
    require(ID_RE.fullmatch(artifact["artifact_id"]) is not None, "artifact_id invalid")
    require(HASH_RE.fullmatch(artifact["artifact_hash"]) is not None, "artifact_hash invalid")
    require(is_https(artifact["source_url"]), "source_url must be credential-free https")
    require(artifact["jurisdiction"]["country_code"] == "SE", "evidence contract is Sweden-scoped")
    parse_dt(artifact["retrieved_at"])

    facts = pkg["fact_assertions"]
    require(isinstance(facts, list) and facts, "at least one fact assertion required")
    fact_ids = set()
    for fact in facts:
        require(ID_RE.fullmatch(fact["fact_id"]) is not None, "fact_id invalid")
        require(fact["fact_id"] not in fact_ids, "duplicate fact_id")
        fact_ids.add(fact["fact_id"])
        require(fact["artifact_id_ref"] == artifact["artifact_id"], "fact points at wrong artifact")
        require(fact["jurisdiction"]["country_code"] == "SE", "fact jurisdiction must be Sweden-scoped")
        require(fact["promotion_gate"]["sensitive_data_absent"] is True, "sensitive_data_absent must remain true")

    conflict_ids = set()
    for conflict in pkg["conflict_sets"]:
        require(ID_RE.fullmatch(conflict["conflict_id"]) is not None, "conflict_id invalid")
        require(conflict["conflict_id"] not in conflict_ids, "duplicate conflict_id")
        conflict_ids.add(conflict["conflict_id"])
        require(len(conflict["fact_ids"]) >= 2, "conflict requires at least two facts")
        require(set(conflict["fact_ids"]) <= fact_ids, "conflict references unknown fact")

    review_by_id = {}
    for review in pkg["review_decisions"]:
        require(ID_RE.fullmatch(review["review_id"]) is not None, "review_id invalid")
        require(review["review_id"] not in review_by_id, "duplicate review_id")
        require(review["reviewer_type"] == "human_reviewer", "public contract only records human review decisions")
        parse_dt(review["reviewed_at"])
        if review.get("fact_id") is not None:
            require(review["fact_id"] in fact_ids, "review references unknown fact")
        if review.get("conflict_id") is not None:
            require(review["conflict_id"] in conflict_ids, "review references unknown conflict")
        review_by_id[review["review_id"]] = review

    for fact in facts:
        for conflict_id in fact.get("conflict_set_ids", []):
            require(conflict_id in conflict_ids, "fact references unknown conflict set")
        if fact.get("supersedes_fact_id") is not None:
            require(fact["supersedes_fact_id"] in fact_ids, "supersedes_fact_id must reference this package")

        mode = fact["promotion_mode"]
        status = fact["status"]
        gate = fact["promotion_gate"]

        if status == "PRODUCTION_TRUTH":
            require(mode in {"ZERO_TOUCH", "HUMAN_REVIEW"}, "production truth requires explicit promotion mode")

        if mode == "ZERO_TOUCH":
            require(status == "PRODUCTION_TRUTH", "zero-touch is only valid for production truth")
            require(artifact["document_role"] not in BLOCKED_ZERO_TOUCH_ROLES, "source role is not zero-touch eligible")
            require(artifact["access_policy_status"] == "APPROVED", "access policy not approved")
            require(fact["validation_result"] == "PASS", "zero-touch requires deterministic PASS")
            require(fact.get("review_decision_id") is None, "zero-touch must not masquerade as human review")
            for key in [
                "authority_verified", "jurisdiction_verified", "controlling_scope_verified",
                "effective_version_verified", "deterministic_extraction",
                "deterministic_validation_passed", "access_policy_approved",
                "evidence_reproducible", "sensitive_data_absent",
                "source_class_zero_touch_approved",
            ]:
                require(gate[key] is True, f"zero-touch gate failed: {key}")
            require(gate["unresolved_conflict"] is False, "zero-touch cannot have unresolved conflict")
            require(not fact.get("conflict_set_ids"), "zero-touch cannot reference a conflict set")

        if mode == "HUMAN_REVIEW":
            review_id = fact.get("review_decision_id")
            require(review_id in review_by_id, "human-review promotion requires a review decision")
            review = review_by_id[review_id]
            require(review.get("fact_id") == fact["fact_id"], "review decision must reference promoted fact")
            require(review["decision"] == "APPROVE_FACT", "human-review promotion requires APPROVE_FACT")

        if mode == "NONE":
            require(status != "PRODUCTION_TRUTH", "unreviewed fact cannot become production truth")

    raw = json.dumps(pkg, ensure_ascii=False).lower()
    for forbidden in [
        "personnummer", "social_security_number", "diagnosis", "medical_record",
        "user_income", "user_name", "user_email", "api_key", "service_role_key",
    ]:
        require(forbidden not in raw, f"sensitive or secret-like field leaked: {forbidden}")


def expect_failure(pkg: dict, label: str) -> None:
    try:
        validate_package(pkg)
    except (AssertionError, KeyError, ValueError):
        return
    raise AssertionError(f"red team: {label} was not rejected")


def red_team(example: dict) -> None:
    # 1. Search/proposal artifact may never zero-touch into product truth.
    broken = copy.deepcopy(example)
    f = broken["fact_assertions"][0]
    broken["artifact"]["document_role"] = "MOTION"
    f["status"] = "PRODUCTION_TRUTH"
    f["promotion_mode"] = "ZERO_TOUCH"
    for key in f["promotion_gate"]:
        f["promotion_gate"][key] = key != "unresolved_conflict"
    expect_failure(broken, "motion zero-touch promotion")

    # 2. Wrong geography must block zero-touch.
    broken = copy.deepcopy(example)
    f = broken["fact_assertions"][0]
    f["status"] = "PRODUCTION_TRUTH"
    f["promotion_mode"] = "ZERO_TOUCH"
    for key in f["promotion_gate"]:
        f["promotion_gate"][key] = key != "unresolved_conflict"
    f["promotion_gate"]["jurisdiction_verified"] = False
    broken["artifact"]["document_role"] = "CONTROLLING_RULE"
    expect_failure(broken, "unverified jurisdiction")

    # 3. Unresolved conflict must block zero-touch.
    broken = copy.deepcopy(example)
    f = broken["fact_assertions"][0]
    f["status"] = "PRODUCTION_TRUTH"
    f["promotion_mode"] = "ZERO_TOUCH"
    for key in f["promotion_gate"]:
        f["promotion_gate"][key] = True
    f["promotion_gate"]["unresolved_conflict"] = True
    broken["artifact"]["document_role"] = "CONTROLLING_RULE"
    expect_failure(broken, "unresolved conflict")

    # 4. Access/terms review is mandatory.
    broken = copy.deepcopy(example)
    f = broken["fact_assertions"][0]
    f["status"] = "PRODUCTION_TRUTH"
    f["promotion_mode"] = "ZERO_TOUCH"
    for key in f["promotion_gate"]:
        f["promotion_gate"][key] = key != "unresolved_conflict"
    broken["artifact"]["document_role"] = "CONTROLLING_RULE"
    broken["artifact"]["access_policy_status"] = "NOT_REVIEWED"
    expect_failure(broken, "missing access-policy approval")

    # 5. Production truth may not appear with no promotion path.
    broken = copy.deepcopy(example)
    broken["fact_assertions"][0]["status"] = "PRODUCTION_TRUTH"
    expect_failure(broken, "production truth without promotion mode")

    # 6. Human promotion requires an actual approval decision.
    broken = copy.deepcopy(example)
    f = broken["fact_assertions"][0]
    f["status"] = "PRODUCTION_TRUTH"
    f["promotion_mode"] = "HUMAN_REVIEW"
    f["review_decision_id"] = "review.missing.001"
    expect_failure(broken, "missing human review decision")

    # 7. Artifact identity must be content-addressable.
    broken = copy.deepcopy(example)
    broken["artifact"]["artifact_hash"] = "not-a-hash"
    expect_failure(broken, "invalid artifact hash")

    # 8. Evidence URLs must be https and credential-free.
    broken = copy.deepcopy(example)
    broken["artifact"]["source_url"] = "http://example.com/insecure"
    expect_failure(broken, "insecure evidence URL")

    # 9. A fact may not silently reference a conflict that does not exist.
    broken = copy.deepcopy(example)
    broken["fact_assertions"][0]["conflict_set_ids"] = ["conflict.missing.001"]
    expect_failure(broken, "missing conflict reference")

    # 10. Sensitive/user-case material must stay outside the public contract.
    broken = copy.deepcopy(example)
    broken["fact_assertions"][0]["scope"] = "contains user_email and user_income"
    expect_failure(broken, "sensitive case data marker")


schema = load(DATA / "evidence_contract.schema.json")
example = load(DATA / "evidence_contract.example.json")
validate_schema(schema)
validate_package(example)
red_team(example)
print("evidence artifact contract v1: OK")
