#!/usr/bin/env python3
"""Fail-closed v31 guard for the age-30 activity-compensation transition.

This extends the same canonical Scenario Lab, demand/friction loop and support
truth model. It does not create a separate matcher or promote any material rule
to VERIFIED.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
SUPPORT = ROOT / "data" / "supports" / "se-forsakringskassan-sjukpenning-sarskilda-fall.json"
COVERAGE = ROOT / "docs" / "PILOT_COVERAGE_MATRIX.md"

scenario_paths = [EVAL / "scenario_lab_v01.json", *sorted(EVAL.glob("scenario_lab_websignals*.json"))]
cases = {}
for path in scenario_paths:
    pack = json.loads(path.read_text(encoding="utf-8"))
    for case in pack.get("cases", []):
        cid = case["case_id"]
        assert cid not in cases, f"duplicate scenario id: {cid}"
        cases[cid] = case

assert len(cases) >= 79, f"expected at least 79 canonical scenarios after v31, got {len(cases)}"

locks = {
    "lab-activity-compensation-turning-30-route-split-v31-01": {
        "expected_support_areas": [
            "activity_compensation_age30_transition",
            "sickness_compensation_candidate_if_work_capacity_is_permanently_reduced",
            "sickness_benefit_special_cases_candidate_if_transition_conditions_fit",
        ],
        "must_not_claim": [
            "activity_compensation_automatically_converts_to_sickness_compensation_at_age_30",
            "turning_30_after_activity_compensation_automatically_entitles_the_person_to_sickness_benefit_in_special_cases",
            "a_diagnosis_or_disability_label_alone_proves_sickness_compensation_eligibility",
            "low_or_no_sgi_alone_proves_sickness_benefit_in_special_cases_eligibility",
        ],
        "expected_questions": [
            "q_did_activity_compensation_continue_through_the_month_before_turning_30",
            "q_is_current_work_capacity_reduction_expected_to_be_permanent_or_is_future_work_possible",
            "q_is_sgi_low_or_absent_if_the_special_cases_route_is_being_considered",
            "q_has_the_right_been_protected_through_work_employment_service_registration_or_program_when_relevant",
        ],
        "expected_next_actions": [
            "start_the_transition_check_before_activity_compensation_ends_instead_of_waiting_for_an_automatic_conversion",
            "do_not_promote_any_new_transition_support_record_from_needs_review_to_verified_without_human_review",
        ],
    },
    "lab-activity-compensation-age30-housing-support-v31-02": {
        "expected_support_areas": [
            "primary_benefit_transition_before_housing_support_transition",
            "bostadstillagg_and_boendetillagg_kept_distinct",
        ],
        "must_not_claim": [
            "bostadstillagg_automatically_continues_unchanged_when_activity_compensation_ends",
            "boendetillagg_is_the_same_benefit_as_bostadstillagg",
            "boendetillagg_is_automatic_because_the_person_previously_had_activity_compensation",
        ],
        "expected_questions": [
            "q_which_primary_income_replacement_route_is_currently_being_considered_after_activity_compensation_ends",
        ],
        "expected_next_actions": [
            "verify_the_primary_income_replacement_route_first_because_it_changes_which_housing_support_route_is_relevant",
            "surface_timing_risk_early_and_direct_the_user_to_current_forsakringskassan_application_status_without_promising_eligibility_or_amount",
        ],
    },
}

for cid, fields in locks.items():
    assert cid in cases, f"v31 regression missing from canonical lab: {cid}"
    case = cases[cid]
    for field, tokens in fields.items():
        for token in tokens:
            assert token in case[field], f"{cid}: missing locked {field} token {token}"

signal_pack = json.loads((EVAL / "demand_friction_signals_v18.json").read_text(encoding="utf-8"))
assert "not measured search volumes" in signal_pack["purpose"].lower()
assert len(signal_pack["signals"]) == 1
signal = signal_pack["signals"][0]
assert signal["signal_id"] == "df-activity-compensation-age30-transition-v01"
assert signal["priority_band"] == "HIGH"
assert signal["demand_signal"]["score"] >= 4
assert signal["friction_signal"]["score"] >= 4
assert signal["miss_consequence"]["score"] >= 4
assert signal["current_product_coverage_gap"]["score"] >= 4
assert signal["discovery_sources"] and all("reddit.com" in url for url in signal["discovery_sources"])
assert signal["primary_sources"] and all("reddit.com" not in url for url in signal["primary_sources"])
assert all("forsakringskassan.se" in url for url in signal["primary_sources"])
truth_rule = signal["truth_rule"].lower()
assert "discovery only" in truth_rule
assert "verify" in truth_rule
assert "do not infer automatic conversion" in truth_rule

mapping_pack = json.loads((EVAL / "demand_friction_regression_map_v12.json").read_text(encoding="utf-8"))
assert len(mapping_pack["mappings"]) == 1
mapping = mapping_pack["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert mapping["regression_case_ids"] == [
    "lab-activity-compensation-turning-30-route-split-v31-01",
    "lab-activity-compensation-age30-housing-support-v31-02",
]
assert "never promise automatic conversion" in mapping["fix_or_guardrail"].lower()
assert "bostadstillägg" in mapping["fix_or_guardrail"].lower()
assert "boendetillägg" in mapping["fix_or_guardrail"].lower()

support = json.loads(SUPPORT.read_text(encoding="utf-8"))
assert support["support_id"] == "se-forsakringskassan-sjukpenning-sarskilda-fall"
assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["last_verified_at"] is None
assert support["verification"]["material_fields_verified"] == []
condition_ids = {rule["rule_id"] for rule in support["eligibility"]["conditions"]}
assert {
    "spsf.prior_activity_compensation",
    "spsf.low_or_no_sgi",
    "spsf.protected_right",
    "spsf.reduced_work_capacity",
    "spsf.insured_sweden",
} <= condition_ids

coverage = COVERAGE.read_text(encoding="utf-8")
assert "30-årsövergång" in coverage
assert "v31/v32" in coverage
assert "NEEDS_REVIEW" in coverage
assert "activity_compensation_age30" in coverage
assert "30-årsövergången har nu sannings-, regressions- och fokuserad publik handoff" in coverage
assert "saknar fortfarande fokuserad publik handoff" not in coverage

print(
    f"v31 age-30 transition: OK ({len(cases)} canonical scenarios; "
    "route split + housing-support boundary locked; truth stays NEEDS_REVIEW; v32 public focus present)"
)
