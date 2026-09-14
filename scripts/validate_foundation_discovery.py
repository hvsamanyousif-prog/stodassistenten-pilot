#!/usr/bin/env python3
"""Fail-closed guard for foundation discovery in the single Stödassistenten system.

The foundation registry is a discovery source, not an eligibility or open-window
truth source. This gate also prevents person-level registry fields from being
promoted into the public product.
"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
EVALS = DATA / "evals"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def https(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme == "https" and bool(parsed.netloc)


schema = load(DATA / "source_universe.schema.json")
universe = load(DATA / "source_universe.json")
registry = load(DATA / "source_registry.json")
signal_pack = load(EVALS / "demand_friction_signals_v15.json")
scenario_pack = load(EVALS / "scenario_lab_websignals_v28.json")

assert schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema"
assert schema.get("additionalProperties") is False
assert set(schema.get("required", [])) == {
    "schema_version", "generated_at", "purpose", "invariants", "families"
}

assert date.fromisoformat(universe["generated_at"]) <= date.today()
assert universe["schema_version"] == "0.1.0"
assert universe["families"], "source universe must contain at least one family"
for key, value in universe["invariants"].items():
    assert value is True, f"source-universe invariant must remain true: {key}"

registry_by_id = {item["source_id"]: item for item in registry["sources"]}
assert len(registry_by_id) == len(registry["sources"]), "duplicate source_id in canonical registry"

family = next(
    item for item in universe["families"]
    if item["family_id"] == "se-foundation-registry-discovery"
)
assert family["source_registry_refs"] == ["se-lansstyrelserna-foundation-search"]
assert family["domain"] == "foundations"
assert family["discovery_role"] == "registry_discovery"
assert family["opportunity_state_authority"] == "not_authoritative"
assert family["private_adapter_required"] is True
assert family["review_required"] is True

# The overlay must reference, not clone, canonical source metadata.
duplicated_source_metadata = {
    "owner", "url", "geography", "source_type", "ingestion_method",
    "source_verification_status", "last_source_check", "adapter_state",
}
assert not (duplicated_source_metadata & set(family)), "source universe duplicated canonical source metadata"

source = registry_by_id["se-lansstyrelserna-foundation-search"]
assert source["owner"] == "Länsstyrelserna"
assert source["source_type"] == "official_registry"
assert source["adapter_state"] == "SPECIAL_HANDLING_REQUIRED"
assert source["source_verification_status"] == "SOURCE_VERIFIED"
assert https(source["url"])
assert "not automatically an open" in source.get("notes", "").lower()

required_blocked = {
    "board_member_names", "auditor_names", "signatory_names",
    "personal_addresses", "personal_contact_details", "raw_registry_payload",
}
assert required_blocked <= set(family["blocked_fields"]), "person/raw registry fields must remain blocked"
assert not (set(family["public_safe_fields"]) & set(family["blocked_fields"])), "safe and blocked fields overlap"
assert "registered_foundation_equals_open_opportunity" in family["prohibited_promotions"]
assert "purpose_text_equals_user_eligibility" in family["prohibited_promotions"]
assert "registry_listing_equals_verified_application_deadline" in family["prohibited_promotions"]

signal = next(item for item in signal_pack["signals"] if item["signal_id"] == "df-foundation-find-open-application-v01")
assert signal["priority_band"] == "HIGH"
for field in ["demand_signal", "friction_signal", "miss_consequence", "current_product_coverage_gap"]:
    assert signal[field]["score"] >= 4, f"foundation signal must justify HIGH priority: {field}"
assert len(signal["natural_language_queries"]) >= 4
assert signal["primary_sources"], "primary sources required"
for url in signal["primary_sources"] + signal["discovery_sources"]:
    assert https(url), f"invalid source URL: {url}"
assert any("stiftelser.lansstyrelsen.se" in url for url in signal["primary_sources"])
truth_rule = signal["truth_rule"].lower()
for token in ["do not infer", "verify application", "community wording is discovery only"]:
    assert token in truth_rule, f"missing foundation truth boundary token: {token}"

cases = {item["case_id"]: item for item in scenario_pack["cases"]}
required_cases = {
    "lab-private-foundation-discovery-boundary-v28-01",
    "lab-association-foundation-open-window-v28-02",
}
assert required_cases <= set(cases)
for case in cases.values():
    for field in ["expected_support_areas", "must_not_claim", "expected_questions", "expected_next_actions", "source_requirements"]:
        assert isinstance(case[field], list) and case[field], f"{case['case_id']}: {field} empty"

private_case = cases["lab-private-foundation-discovery-boundary-v28-01"]
for lock in [
    "registered_active_foundation_means_an_application_is_open_now",
    "foundation_purpose_text_alone_proves_user_eligibility",
    "board_member_auditor_or_signatory_details_should_be_republished_as_product_contact_data",
]:
    assert lock in private_case["must_not_claim"], f"missing private foundation lock: {lock}"

association_case = cases["lab-association-foundation-open-window-v28-02"]
for lock in [
    "registry_presence_equals_active_funding_call",
    "purpose_similarity_equals_fit_or_eligibility",
    "mark_unknown_or_stale_application_state_for_review_instead_of_guessing_open",
]:
    target = association_case["must_not_claim"] if lock != "mark_unknown_or_stale_application_state_for_review_instead_of_guessing_open" else association_case["expected_next_actions"]
    assert lock in target, f"missing association foundation lock: {lock}"

# Public eval artifacts must not contain copied identities or raw registry payloads.
serialized = json.dumps({"universe": universe, "signals": signal_pack, "scenarios": scenario_pack}, ensure_ascii=False).lower()
for forbidden in [
    '"person_name"', '"username"', '"email"', '"phone"',
    '"raw_post"', '"raw_story"', '"raw_registry_record"',
]:
    assert forbidden not in serialized, f"forbidden public field: {forbidden}"

print("foundation discovery boundary: OK")
