#!/usr/bin/env python3
"""Validate v84 child-assistance truth and red-team boundaries in the shared product."""
from __future__ import annotations

import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals" / "scenario_lab_websignals_v84.json"
CHILD = ROOT / "data" / "supports" / "se-forsakringskassan-assistansersattning-barn.json"
ADULT = ROOT / "data" / "supports" / "se-forsakringskassan-assistansersattning-vuxna.json"

scenario = json.loads(EVAL.read_text(encoding="utf-8"))
child = json.loads(CHILD.read_text(encoding="utf-8"))
adult = json.loads(ADULT.read_text(encoding="utf-8"))

expected_ids = {
    "lab-child-assistance-guardian-v84-01",
    "lab-child-assistance-parental-deduction-v84-02",
    "lab-child-assistance-own-hours-v84-03",
    "lab-child-assistance-healthcare-combo-v84-04",
    "lab-child-assistance-professional-false-positive-v84-05",
    "lab-child-assistance-research-false-positive-v84-06",
    "lab-child-assistance-language-ar-v84-07",
    "lab-child-assistance-language-fa-v84-08",
}
cases = {case["case_id"]: case for case in scenario.get("cases", [])}
assert set(cases) == expected_ids, f"v84 scenario ids drifted: {sorted(cases)}"
assert all(case.get("source_requirements") for case in cases.values()), "every v84 case needs explicit source requirements"
assert {cases[x]["language"] for x in expected_ids} >= {"sv", "ar", "fa"}, "v84 must preserve sv/ar/fa semantic coverage"
assert "SAME Stödassistenten intelligence" in scenario["purpose"]


def validate_child_record(record: dict) -> None:
    assert record["support_id"] == "se-forsakringskassan-assistansersattning-barn"
    assert record["category"] == "disability"
    assert record["subtype"] == adult["subtype"] == "state_personal_assistance_compensation"
    assert record["provider"]["name"] == adult["provider"]["name"] == "Försäkringskassan"
    assert record["geography"] == adult["geography"], "child route must stay in the same national truth model"
    assert record["source"]["source_id"] == adult["source"]["source_id"] == "se-forsakringskassan-benefits-a-z"
    assert "/assistansersattning-for-barn" in record["source"]["url"]
    assert "/assistansersattning-for-vuxna" not in record["source"]["url"], "child truth must not silently fall back to adult source"
    assert record["audience"]["age_min"] == 0 and record["audience"]["age_max"] == 17
    assert {"child", "guardian", "personal_assistance"} <= set(record["audience"]["segments"])

    rules = {rule["rule_id"]: rule for rule in record["eligibility"]["conditions"]}
    assert {
        "assistans_child.lss_personkrets",
        "assistans_child.basic_needs_over_20h",
        "assistans_child.parental_deduction",
        "assistans_child.residence",
    } <= set(rules)
    assert "Försäkringskassan" in rules["assistans_child.basic_needs_over_20h"]["value"]
    assert "egen timuppskattning" in rules["assistans_child.basic_needs_over_20h"]["notes"]
    assert "inte räkna fram" in rules["assistans_child.parental_deduction"]["notes"]
    assert "/sa-beraknas-grundlaggande-behov" in rules["assistans_child.parental_deduction"]["source_url"]

    verification = record["verification"]
    assert verification["status"] == "NEEDS_REVIEW"
    assert verification["human_review_required"] is True
    assert verification["material_fields_verified"] == []
    assert "Mänsklig granskning krävs före VERIFIED" in verification["review_notes"]
    assert "inte räkna fram individuellt föräldraavdrag" in verification["review_notes"]

    # Do not normalize volatile deduction tables or pretend the public record can calculate them.
    blob = json.dumps(record, ensure_ascii=False).lower()
    for forbidden in ["1 timme och 15 minuter", "30 minuter per dygn", "beräknat föräldraavdrag:", "nettotimmar:"]:
        assert forbidden not in blob, f"volatile/derived parental-deduction value leaked into canonical record: {forbidden}"


validate_child_record(child)

# Red Team: a child record that points at the adult primary source must fail closed.
mutated = copy.deepcopy(child)
mutated["source"]["url"] = adult["source"]["url"]
try:
    validate_child_record(mutated)
except AssertionError:
    pass
else:
    raise AssertionError("red-team mutation unexpectedly accepted adult primary source for child route")

# The scenario factory must permanently protect the highest-consequence boundaries.
assert "calculated_individual_parental_deduction" in cases["lab-child-assistance-parental-deduction-v84-02"]["must_not_claim"]
assert "guardian_15_hours_is_an_official_assessment" in cases["lab-child-assistance-own-hours-v84-03"]["must_not_claim"]
assert "personal_assistance_and_healthcare_are_one_entitlement" in cases["lab-child-assistance-healthcare-combo-v84-04"]["must_not_claim"]
assert "no_personal_child_assistance_route_without_personal_need_signal" in cases["lab-child-assistance-professional-false-positive-v84-05"]["expected_support_areas"]

print("child assistance v84: OK (same canonical truth layer; child primary source locked; parental deduction fail-closed; sv/ar/fa red-team coverage)")
