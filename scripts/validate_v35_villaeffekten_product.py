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
material_order_rule = next(
    rule for rule in support["eligibility"]["conditions"]
    if rule["rule_id"] == "villaeffekten.material_order_date"
)
assert material_order_rule["value"] == "2025-10-17"
assert "riksdagen.se" in material_order_rule["source_url"]

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
    "senast när du begär utbetalning",
    "earlyOrder",
    "early_order",
    "17 okt 2025",
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
for branch in ["r_owner_no", "r_owner_unsure", "r_value_no", "r_value_unsure", "r_district_yes", "r_district_unsure", "r_measure_unsure", "r_order_early"]:
    assert branch in person, f"fail-closed branch missing: {branch}"
assert "state.timing==='early_order'" in person
assert "materialet beställdes" in person.lower()
assert "när själva åtgärden påbörjades" in person.lower()

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
    "lab-owner-future-residence-villaeffekten-v35-04",
    "lab-villaeffekten-material-order-start-split-v35-05",
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
        "work_start_date_alone_is_enough_to_decide_material_cost_eligibility",
    ],
    "lab-owner-future-residence-villaeffekten-v35-04": [
        "not_permanently_resident_on_application_day_always_disqualifies_villaeffekten",
        "stating_future_permanent_residence_proves_final_eligibility_or_payment",
        "future_residence_allows_skipping_value_year_district_heating_measure_or_timing_checks",
    ],
    "lab-villaeffekten-material-order-start-split-v35-05": [
        "work_started_after_2025_10_17_makes_material_ordered_before_2025_10_17_eligible",
        "material_order_date_and_measure_start_date_are_the_same_legal_timing_fact",
        "a_quote_date_or_invoice_date_can_be_assumed_to_equal_the_material_order_date",
        "one_early_material_order_proves_all_other_material_orders_are_ineligible",
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
allowed_primary_hosts = ("boverket.se", "energimyndigheten.se", "riksdagen.se")
assert all(any(host in url for host in allowed_primary_hosts) for url in signal["primary_sources"])
assert any("riksdagen.se" in url for url in signal["primary_sources"])

mapping_pack = json.loads((EVAL / "demand_friction_regression_map_v15.json").read_text(encoding="utf-8"))
assert len(mapping_pack["mappings"]) == 1
mapping = mapping_pack["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert set(mapping["regression_case_ids"]) == expected_ids
assert "one product" in mapping["fix_or_guardrail"].lower()
assert "raw story" in mapping["fix_or_guardrail"].lower()
assert "payment-request timing boundary" in mapping["fix_or_guardrail"].lower()
assert "material-order date" in mapping["fix_or_guardrail"].lower()
assert "measure-start date" in mapping["fix_or_guardrail"].lower()

# v34 and v35 must coexist as one learning memory: truth boundaries + public consumption.
v34 = json.loads((EVAL / "scenario_lab_websignals_v34.json").read_text(encoding="utf-8"))
v34_ids = {case["case_id"] for case in v34["cases"]}
assert {
    "lab-homeowner-villaeffekten-candidate-v34-01",
    "lab-homeowner-villaeffekten-district-heating-v34-02",
    "lab-homeowner-villaeffekten-timing-cost-v34-03",
}.issubset(v34_ids)

# Privacy guard checks data structure, not safety prose. Regression labels are allowed
# to *name* forbidden concepts (for example "raw_story") so the tests can lock the
# prohibition. What must never appear are actual fields that could carry those values.
forbidden_field_keys = {"personnummer", "bankkonto", "diagnos", "email", "phone", "raw_story", "raw_post"}

def assert_no_forbidden_field_keys(value, path="root"):
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = str(key).strip().lower()
            assert normalized not in forbidden_field_keys, f"forbidden sensitive/raw field key leaked at {path}.{key}"
            assert_no_forbidden_field_keys(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            assert_no_forbidden_field_keys(child, f"{path}[{index}]")

assert_no_forbidden_field_keys({"signal": signal, "cases": list(cases.values())})

print("Villaeffekten v35 product guard: OK (same shell/person module; privacy, residence timing, material-order/start split, source and review gates locked)")
