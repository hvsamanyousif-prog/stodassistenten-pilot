#!/usr/bin/env python3
"""Lock Villaeffekten discovery -> safe public action without promoting truth.

v34 established the current review-gated truth and scenario boundaries. v35
verifies that the same shared public shell can discover the need, hand off only
coarse context to the same person module, ask route-changing facts in order and
end in primary-source verification rather than eligibility/amount promises.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
SUPPORT = ROOT / "data" / "supports" / "se-boverket-energieffektivisering-smahus.json"
SHELL = ROOT / "client" / "experience-learning.js"
PERSON = ROOT / "client" / "person-context-learning.js"

support = json.loads(SUPPORT.read_text(encoding="utf-8"))
assert support["support_id"] == "se-boverket-energieffektivisering-smahus"
assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["last_verified_at"] is None
assert support["verification"]["material_fields_verified"] == []

shell = SHELL.read_text(encoding="utf-8")
person = PERSON.read_text(encoding="utf-8")

# One shared shell -> one existing person module. Never carry the raw story.
for token in [
    "focus=home_energy",
    "actor_type=private_person",
    "dataset.homeEnergyRoute",
    "Villaeffekten",
    "HOME_ENERGY_PATTERNS",
]:
    assert token in shell, f"shared-shell home-energy route missing token: {token}"
assert "person-pilot.html?actor_type=private_person&focus=home_energy&lang=" in shell
for forbidden in ["q=${", "situation=${", "raw_story", "rawSituation", "encodeURIComponent(input.value)"]:
    assert forbidden not in shell, f"raw situation must not be handed off: {forbidden}"

# The same person module must consume the focus and ask only route-changing facts.
for token in [
    "homeEnergyGuidance",
    "focus')||'').toLowerCase()!=='home_energy'",
    "state={owner:null,valueYear:null,district:null,measure:null,timing:null}",
    "qOwner",
    "qValue",
    "qDistrict",
    "qMeasure",
    "qTiming",
    "role','group'",
    "aria-label",
    "aria-pressed",
    "role','status'",
    "boverket.se/sv/bidrag--garantier/bidrag-for-energieffektivisering-i-smahus/",
    "energimyndigheten.se/effektiv-energianvandning/effektiv-energianvandning/program-och-uppdrag/kommunal-energi-och-klimatradgivning/",
]:
    assert token in person, f"person home-energy guidance missing token: {token}"

# Information-gain order must fail closed before deeper questions when a boundary changes the path.
assert person.index("if(!state.owner)") < person.index("if(!state.valueYear)") < person.index("if(!state.district)") < person.index("if(!state.measure)") < person.index("if(!state.timing)")
for branch in ["r_owner_no", "r_owner_unsure", "r_value_no", "r_value_unsure", "r_district_yes", "r_district_unsure", "r_measure_unsure"]:
    assert branch in person, f"fail-closed branch missing: {branch}"

# No new client-side eligibility engine or raw data sink.
serialized_runtime = (shell + "\n" + person).lower()
for forbidden in ["localstorage", "sessionstorage", "indexeddb", "personnummer", "bankkonto", "raw_story", "raw_post"]:
    assert forbidden not in serialized_runtime, f"forbidden storage/sensitive token in v35 runtime: {forbidden}"
assert "guarantee" not in person.lower(), "user-facing runtime must not contain a hidden guarantee switch"

pack = json.loads((EVAL / "scenario_lab_websignals_v35.json").read_text(encoding="utf-8"))
cases = {case["case_id"]: case for case in pack["cases"]}
expected_ids = {
    "lab-homeowner-villaeffekten-public-route-v35-01",
    "lab-nonowner-villaeffekten-failclosed-v35-02",
    "lab-homeowner-villaeffekten-timing-docs-budget-v35-03",
}
assert set(cases) == expected_ids
locks = {
    "lab-homeowner-villaeffekten-public-route-v35-01": [
        "the_raw_situation_story_may_be_forwarded_in_the_route_url",
        "the_product_can_guarantee_a_grant_amount_or_county_board_decision",
        "creating_a_public_route_promotes_the_review_gated_support_record_to_verified",
    ],
    "lab-nonowner-villaeffekten-failclosed-v35-02": [
        "explicitly_asking_about_villaeffekten_means_the_user_meets_owner_and_residence_conditions",
        "failing_the_villaeffekten_owner_boundary_means_no_other_energy_advice_or_support_can_exist",
    ],
    "lab-homeowner-villaeffekten-timing-docs-budget-v35-03": [
        "thirty_percent_applies_to_the_entire_contractor_invoice",
        "submission_reserves_or_guarantees_budget",
        "unknown_start_date_is_safe_to_ignore_for_deadline_risk",
    ],
}
for cid, tokens in locks.items():
    for token in tokens:
        assert token in cases[cid]["must_not_claim"], f"{cid}: missing safety lock {token}"

signal_pack = json.loads((EVAL / "demand_friction_signals_v21.json").read_text(encoding="utf-8"))
assert "not measured search volumes" in signal_pack["purpose"]
assert len(signal_pack["signals"]) == 1
signal = signal_pack["signals"][0]
assert signal["signal_id"] == "df-villaeffekten-discovery-to-action-v02"
assert signal["priority_band"] == "HIGH"
assert signal["current_product_coverage_gap"]["score"] == 5
assert "discovery" in signal["truth_rule"].lower()
assert "verify" in signal["truth_rule"].lower()
assert any("mitsubishielectric.se" in url or "vrmepumpsexperterna" in url for url in signal["discovery_sources"])
assert all("boverket.se" in url or "energimyndigheten.se" in url for url in signal["primary_sources"])

mapping_pack = json.loads((EVAL / "demand_friction_regression_map_v15.json").read_text(encoding="utf-8"))
assert len(mapping_pack["mappings"]) == 1
mapping = mapping_pack["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert set(mapping["regression_case_ids"]) == expected_ids
assert "one product" in mapping["fix_or_guardrail"].lower()
assert "raw story" in mapping["fix_or_guardrail"].lower()

# v34 and v35 must coexist as one learning memory: truth boundaries + public consumption.
v34 = json.loads((EVAL / "scenario_lab_websignals_v34.json").read_text(encoding="utf-8"))
v34_ids = {case["case_id"] for case in v34["cases"]}
assert {
    "lab-homeowner-villaeffekten-candidate-v34-01",
    "lab-homeowner-villaeffekten-district-heating-v34-02",
    "lab-homeowner-villaeffekten-timing-cost-v34-03",
}.issubset(v34_ids)

serialized = json.dumps({"signal": signal, "cases": list(cases.values())}, ensure_ascii=False).lower()
for forbidden in ["personnummer", "bankkonto", "diagnos", '"email"', '"phone"', "raw_story", "raw_post"]:
    assert forbidden not in serialized, f"forbidden sensitive/raw field leaked: {forbidden}"

print("Villaeffekten v35 product guard: OK (same shell/person module; privacy, information-gain, source and review gates locked)")