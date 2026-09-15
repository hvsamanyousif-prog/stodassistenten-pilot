#!/usr/bin/env python3
"""Fail-closed v80 guard for family housing-benefit truth and learning.

This stays inside the existing Stödassistenten truth/scenario systems. It does
not make eligibility decisions and deliberately keeps the new support record
human-review gated.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SUPPORT_PATH = ROOT / "data/supports/se-forsakringskassan-bostadsbidrag-barnfamiljer.json"
SCENARIO_PATH = ROOT / "data/evals/scenario_lab_websignals_v80.json"
SIGNAL_PATH = ROOT / "data/evals/demand_friction_signals_v80.json"
MAP_PATH = ROOT / "data/evals/demand_friction_regression_map_v80.json"
PRIMARY = "https://www.forsakringskassan.se/privatperson/familj-och-barn/bostadsbidrag-for-barnfamiljer/ansok-om-bostadsbidrag-for-barnfamiljer"
EXPECTED_CASES = {
    "lab-family-housing-main-route-v80-01",
    "lab-family-housing-part-time-size-v80-02",
    "lab-family-housing-joint-application-v80-03",
    "lab-family-housing-2026-income-v80-04",
    "lab-family-housing-2027-transition-v80-05",
    "lab-family-housing-professional-false-positive-v80-06",
    "lab-family-housing-language-ar-v80-07",
    "lab-family-housing-language-fa-v80-08",
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate(support, scenarios, signal_pack, mapping_pack) -> None:
    assert support["support_id"] == "se-forsakringskassan-bostadsbidrag-barnfamiljer"
    assert support["source"]["url"] == PRIMARY, "family housing truth must point to the current exact primary page"
    assert support["application"]["url"] == PRIMARY
    assert support["verification"]["status"] == "NEEDS_REVIEW", "AI-normalized truth must remain human-review gated"
    assert support["verification"]["human_review_required"] is True
    assert support["verification"]["last_verified_at"] is None
    assert support["verification"]["material_fields_verified"] == []

    rules = {rule["rule_id"]: rule for rule in support["eligibility"]["conditions"]}
    required_rules = {
        "bhfamily.child_residence",
        "bhfamily.part_time_child_housing_size",
        "bhfamily.registration_and_home",
        "bhfamily.sweden_and_cross_border",
        "bhfamily.calculation_factors",
        "bhfamily.annual_income_basis_2026",
        "bhfamily.joint_application",
        "bhfamily.monthly_income_transition_2027",
    }
    assert required_rules <= set(rules), f"missing family housing rules: {sorted(required_rules - set(rules))}"
    for rule in rules.values():
        assert rule["source_url"] == PRIMARY, f"{rule['rule_id']} must use the current family primary source"

    child_rule = rules["bhfamily.child_residence"]["value"].lower()
    assert "30 dagar" in child_rule
    size_rule = rules["bhfamily.part_time_child_housing_size"]["value"].lower()
    assert "två rum" in size_rule and "40 kvadratmeter" in size_rule
    current_income = rules["bhfamily.annual_income_basis_2026"]["value"].lower()
    assert "2026" in current_income and "året" in current_income
    transition = (rules["bhfamily.monthly_income_transition_2027"]["value"] + " " + rules["bhfamily.monthly_income_transition_2027"].get("notes", "")).lower()
    assert "1 januari 2027" in transition and "månads" in transition
    assert "inte" in transition and "2026" in transition, "2027 change must be guarded against premature 2026 use"

    questions = {q["question_id"]: q for q in support["eligibility"]["missing_information_questions"]}
    conditional_size = questions["bhfamily.housing_size_if_needed"]
    assert "om barnet bor" in conditional_size["prompt"].lower()
    assert "bara materiell" in conditional_size["reason"].lower(), "housing-size question must remain conditional"
    cross_border = questions["bhfamily.cross_border_if_relevant"]
    assert "ställ bara frågan" in cross_border["reason"].lower(), "cross-border question must be information-gain gated"

    serialized_support = json.dumps(support, ensure_ascii=False).lower()
    for volatile_exact_amount in ["4 200 kronor", "5 200 kronor", "6 200 kronor"]:
        assert volatile_exact_amount not in serialized_support, "v80 truth intentionally avoids volatile max-benefit amounts"
    for forbidden_key in ['"raw_story"', '"raw_user_text"', '"diagnosis"', '"personnummer"', '"email"', '"phone"']:
        assert forbidden_key not in serialized_support, f"forbidden sensitive/public field in support truth: {forbidden_key}"

    cases = scenarios.get("cases", [])
    by_id = {case["case_id"]: case for case in cases}
    assert set(by_id) == EXPECTED_CASES, "v80 scenario pack must stay a focused permanent regression set"
    assert {case["language"] for case in cases} >= {"sv", "ar", "fa"}, "sv/ar/fa semantic coverage required"

    part_time = by_id["lab-family-housing-part-time-size-v80-02"]
    assert "conditional_housing_size_rule" in part_time["expected_support_areas"]
    assert "housing_size_is_irrelevant_when_child_lives_less_than_about_half_time" in part_time["must_not_claim"]
    current_2026 = by_id["lab-family-housing-2026-income-v80-04"]
    assert "2027_monthly_income_rule_already_applies_in_2026" in current_2026["must_not_claim"]
    future_2027 = by_id["lab-family-housing-2027-transition-v80-05"]
    assert "2027_rules_apply_before_2027" in future_2027["must_not_claim"]
    professional = by_id["lab-family-housing-professional-false-positive-v80-06"]
    assert "user_has_children" in professional["must_not_claim"]
    for cid in ["lab-family-housing-language-ar-v80-07", "lab-family-housing-language-fa-v80-08"]:
        assert "language_parity" in by_id[cid]["expected_support_areas"]

    signals = signal_pack.get("signals", [])
    assert len(signals) == 1
    signal = signals[0]
    assert signal["signal_id"] == "df-family-housing-benefit-v80"
    assert signal["priority_band"] == "HIGH"
    for metric in ["demand_signal", "friction_signal", "miss_consequence", "current_product_coverage_gap"]:
        assert signal[metric]["score"] >= 4
    assert PRIMARY in signal["primary_sources"]
    assert set(signal["regression_case"]) == EXPECTED_CASES
    assert "not measured search volumes" in signal_pack["purpose"].lower()

    mappings = mapping_pack.get("mappings", [])
    assert len(mappings) == 1
    mapping = mappings[0]
    assert mapping["signal_id"] == signal["signal_id"]
    assert set(mapping["regression_case_ids"]) == EXPECTED_CASES
    assert mapping["coverage_status"] == "TRUTH_AND_REGRESSION_GUARDED_V80"
    assert SUPPORT_PATH.relative_to(ROOT).as_posix() in mapping["runtime_evidence"]


def mutation_self_test(support, scenarios, signal_pack, mapping_pack) -> None:
    bad = copy.deepcopy(support)
    bad["verification"]["status"] = "VERIFIED"
    bad["verification"]["human_review_required"] = False
    try:
        validate(bad, scenarios, signal_pack, mapping_pack)
    except AssertionError:
        pass
    else:
        raise AssertionError("self-test: AI must not auto-promote family housing truth to VERIFIED")

    bad = copy.deepcopy(scenarios)
    case = next(c for c in bad["cases"] if c["case_id"] == "lab-family-housing-2026-income-v80-04")
    case["must_not_claim"].remove("2027_monthly_income_rule_already_applies_in_2026")
    try:
        validate(support, bad, signal_pack, mapping_pack)
    except AssertionError:
        pass
    else:
        raise AssertionError("self-test: removing the 2026/2027 fail-closed boundary must fail")


support = load(SUPPORT_PATH)
scenarios = load(SCENARIO_PATH)
signal_pack = load(SIGNAL_PATH)
mapping_pack = load(MAP_PATH)
validate(support, scenarios, signal_pack, mapping_pack)
mutation_self_test(support, scenarios, signal_pack, mapping_pack)
print("family housing v80: OK (truth boundary + 8 regressions + signal learning map + mutation self-tests)")
