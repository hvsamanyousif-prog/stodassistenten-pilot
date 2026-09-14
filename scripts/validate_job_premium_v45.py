#!/usr/bin/env python3
"""Guard v45 job-premium transition semantics in the single Stodassistenten learning system."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
SUPPORT = ROOT / "data" / "supports" / "se-forsakringskassan-jobbpremie.json"
SCENARIOS = EVAL / "scenario_lab_websignals_v45.json"
SIGNALS = EVAL / "demand_friction_signals_v29.json"
MAPPING = EVAL / "demand_friction_regression_map_v23.json"

for path in [SUPPORT, SCENARIOS, SIGNALS, MAPPING]:
    assert path.exists(), f"missing v45 asset: {path.relative_to(ROOT)}"

# Same product: no new job-premium application or alternate truth store.
for forbidden_path in [
    ROOT / "job-premium.html",
    ROOT / "jobbpremie.html",
    ROOT / "client" / "job-premium-app.js",
    ROOT / "data" / "job-premium-truth.json",
]:
    assert not forbidden_path.exists(), f"v45 must not create parallel product/truth asset: {forbidden_path.relative_to(ROOT)}"

support = json.loads(SUPPORT.read_text(encoding="utf-8"))
assert support["support_id"] == "se-forsakringskassan-jobbpremie"
assert support["provider"]["name"] == "Försäkringskassan"
assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["material_fields_verified"] == []
assert support["source"]["url"] == "https://www.forsakringskassan.se/privatperson/jobbpremie"
rule_ids = {rule["rule_id"] for rule in support["eligibility"]["conditions"]}
for required_rule in [
    "jp.assistance_2025_h2",
    "jp.salary_current_month",
    "jp.no_current_social_assistance",
    "jp.no_household_social_assistance",
]:
    assert required_rule in rule_ids, f"job premium support missing route-changing rule: {required_rule}"
assert "3 kalendermånader" in support["application"]["deadline_text"]
assert support["lifecycle"]["valid_from"] == "2026-03-01"

pack = json.loads(SCENARIOS.read_text(encoding="utf-8"))
cases = {case["case_id"]: case for case in pack["cases"]}
expected_ids = {
    "lab-private-social-assistance-to-work-job-premium-v45-01",
    "lab-private-job-premium-qualification-or-deadline-fail-closed-v45-02",
}
assert set(cases) == expected_ids

transition = cases["lab-private-social-assistance-to-work-job-premium-v45-01"]
for token in [
    "having_received_social_assistance_at_some_point_in_2025_proves_job_premium_eligibility",
    "the_employment_must_be_new_for_job_premium_to_be_relevant",
    "part_time_employment_is_automatically_excluded",
    "job_premium_is_the_same_as_municipal_social_assistance",
]:
    assert token in transition["must_not_claim"]
for token in [
    "q_received_social_assistance_every_month_july_through_december_2025",
    "q_received_employment_income_in_the_month_being_claimed",
    "q_did_applicant_or_any_household_member_receive_social_assistance_in_that_month",
]:
    assert token in transition["expected_questions"]
assert "keep_municipal_social_assistance_and_state_job_premium_as_separate_decisions" in transition["expected_next_actions"]

fail_closed = cases["lab-private-job-premium-qualification-or-deadline-fail-closed-v45-02"]
for token in [
    "long_term_or_repeated_social_assistance_is_equivalent_to_receiving_it_every_month_july_through_december_2025",
    "an_application_for_any_old_salary_month_is_still_open",
    "the_three_calendar_month_rule_can_be_replaced_by_a_rough_ninety_day_estimate",
    "municipal_or_ai_memory_should_be_used_to_guess_missing_historical_payment_months",
]:
    assert token in fail_closed["must_not_claim"]
assert "q_exact_calendar_month_the_job_premium_claim_would_cover" in fail_closed["expected_questions"]
assert "if_the_deadline_or_qualification_fact_is_uncertain_fail_closed_to_forsakringskassan_guidance_or_contact" in fail_closed["expected_next_actions"]

signals = json.loads(SIGNALS.read_text(encoding="utf-8"))
assert "not measured search volumes" in signals["scoring"]["priority_rule"]
assert len(signals["signals"]) == 1
signal = signals["signals"][0]
assert signal["signal_id"] == "df-job-premium-assistance-to-work-transition-v01"
assert signal["priority_band"] == "HIGH"
assert signal["current_product_coverage_gap"]["score"] == 5
assert signal["friction_signal"]["score"] == 5
assert signal["miss_consequence"]["score"] == 5
assert any("forsakringskassan.se/privatperson/jobbpremie" in url for url in signal["primary_sources"])
assert any("socialstyrelsen.se" in url for url in signal["primary_sources"])
assert "discovery" in signal["truth_rule"].lower()
assert "verify" in signal["truth_rule"].lower()
assert "not measured search volume" in signal["demand_signal"]["basis"]

mapping_pack = json.loads(MAPPING.read_text(encoding="utf-8"))
assert len(mapping_pack["mappings"]) == 1
mapping = mapping_pack["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert expected_ids <= set(mapping["regression_case_ids"]), "v45 regressions must remain mapped after later product learning"
assert "NEEDS_REVIEW" in mapping["truth_guardrail"]
assert mapping["coverage_status"] in {
    "REGRESSION_AND_SIGNAL_READY_PUBLIC_ROUTE_GAP_REMAINS",
    "GUARDED_PUBLIC_ROUTE_READY_TRUTH_REMAINS_REVIEW_GATED",
}
assert "one Stödassistenten" in mapping["fix_or_guardrail"]

print("job-premium v45 validation: OK (transition/deadline regressions retained + demand/friction signal + review-gated truth)")
