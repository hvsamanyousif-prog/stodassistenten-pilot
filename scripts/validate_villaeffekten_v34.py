#!/usr/bin/env python3
"""Lock Villaeffekten truth boundaries and v34 learning semantics.

This guard does not decide user eligibility. It verifies that the public truth
record remains human-review-gated and that permanent regressions preserve the
current primary-source boundaries around house conditions, measure/timing,
material-only cost and county-board decision authority.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
EVAL = DATA / "evals"
SUPPORT = DATA / "supports" / "se-boverket-energieffektivisering-smahus.json"

record = json.loads(SUPPORT.read_text(encoding="utf-8"))
assert record["support_id"] == "se-boverket-energieffektivisering-smahus"
assert record["category"] == "housing_energy"
assert record["source"]["source_id"] == "se-boverket-small-house-energy-grant"
assert record["source"]["url"].startswith("https://www.boverket.se/")
assert record["verification"]["status"] == "NEEDS_REVIEW"
assert record["verification"]["human_review_required"] is True
assert record["verification"]["last_verified_at"] is None
assert record["verification"]["material_fields_verified"] == []

rules = {
    rule["rule_id"]: rule
    for rule in record["eligibility"]["conditions"] + record["eligibility"]["exclusions"]
}
for rid in [
    "villaeffekten.owner_and_resident",
    "villaeffekten.value_year_before_1990",
    "villaeffekten.not_district_heating_connected",
    "villaeffekten.eligible_measure",
    "villaeffekten.material_order_date",
    "villaeffekten.funds_available",
    "villaeffekten.previously_unheated_space",
]:
    assert rid in rules, f"missing Villaeffekten truth boundary: {rid}"

assert rules["villaeffekten.value_year_before_1990"]["value"] == 1989
assert rules["villaeffekten.not_district_heating_connected"]["value"] is False
assert rules["villaeffekten.material_order_date"]["value"] == "2025-10-17"
assert "district_heating_connection" in rules["villaeffekten.eligible_measure"]["value"], (
    "planned new district-heating connection must stay distinct from existing-connection exclusion"
)

amount = record["benefit"]["amount_text"].lower()
calc = record["benefit"]["calculation_text"].lower()
deadline = record["application"]["deadline_text"].lower()
next_step = record["application"]["next_step"].lower()
assert "30 procent" in amount and "60 000" in amount and "10 000" in amount
assert "material" in calc and "arbetskostnad" in calc
assert "28 februari 2027" in deadline and "1 juni 2030" in deadline
assert "länsstyrelsen" in next_step and "prövar" in next_step

registry = json.loads((DATA / "source_registry.json").read_text(encoding="utf-8"))
sources = {source["source_id"]: source for source in registry["sources"]}
source = sources["se-boverket-small-house-energy-grant"]
assert source["owner"] == "Boverket"
assert source["source_verification_status"] == "SOURCE_VERIFIED"
assert source["url"] == record["source"]["url"]

pack = json.loads((EVAL / "scenario_lab_websignals_v34.json").read_text(encoding="utf-8"))
cases = {case["case_id"]: case for case in pack["cases"]}
expected_ids = {
    "lab-homeowner-villaeffekten-candidate-v34-01",
    "lab-homeowner-villaeffekten-district-heating-v34-02",
    "lab-homeowner-villaeffekten-timing-cost-v34-03",
}
assert set(cases) == expected_ids

locks = {
    "lab-homeowner-villaeffekten-candidate-v34-01": [
        "the_product_can_guarantee_60000_sek",
        "labour_cost_is_covered_by_villaeffekten",
        "boverket_e_service_submission_is_the_same_as_an_approved_grant",
    ],
    "lab-homeowner-villaeffekten-district-heating-v34-02": [
        "any_district_heating_related_measure_is_excluded_from_villaeffekten",
        "an_already_district_heating_connected_house_meets_the_basic_no_connection_condition",
    ],
    "lab-homeowner-villaeffekten-timing-cost-v34-03": [
        "villaeffekten_covers_30_percent_of_the_entire_contractor_invoice",
        "work_started_before_2026_09_01_is_automatically_ineligible",
        "there_is_no_application_deadline_for_transition_work",
    ],
}
for cid, tokens in locks.items():
    for token in tokens:
        assert token in cases[cid]["must_not_claim"], f"{cid}: missing safety lock {token}"

signal_pack = json.loads((EVAL / "demand_friction_signals_v20.json").read_text(encoding="utf-8"))
assert len(signal_pack["signals"]) == 1
signal = signal_pack["signals"][0]
assert signal["signal_id"] == "df-villaeffekten-live-rules-v01"
assert signal["priority_band"] == "HIGH"
assert all("boverket.se" in url or "riksdagen.se" in url for url in signal["primary_sources"])
assert "news" not in " ".join(signal["primary_sources"]).lower()

mapping_pack = json.loads((EVAL / "demand_friction_regression_map_v14.json").read_text(encoding="utf-8"))
assert len(mapping_pack["mappings"]) == 1
mapping = mapping_pack["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert set(mapping["regression_case_ids"]) == expected_ids

serialized = json.dumps(
    {"record": record, "signal": signal, "cases": list(cases.values())},
    ensure_ascii=False,
).lower()
for forbidden in ["personnummer", "bankkonto", "diagnos", '"email"', '"phone"', "raw_story", "raw_post"]:
    assert forbidden not in serialized, f"forbidden sensitive/raw field leaked: {forbidden}"

print("Villaeffekten v34 guard: OK (truth review-gated; source, cost, timing and decision boundaries locked)")
