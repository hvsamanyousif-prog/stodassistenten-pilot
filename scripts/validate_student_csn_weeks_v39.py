#!/usr/bin/env python3
"""Lock v39 student CSN week/summer learning into the single canonical system."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
SUPPORT = ROOT / "data" / "supports" / "se-csn-studiemedel-veckor-sommar.json"
REGISTRY = ROOT / "data" / "source_registry.json"
WORKFLOW = ROOT / ".github" / "workflows" / "latest-learning-memory.yml"

scenario = json.loads((EVAL / "scenario_lab_websignals_v39.json").read_text(encoding="utf-8"))
cases = {c["case_id"]: c for c in scenario.get("cases", [])}
expected_ids = {
    "lab-student-csn-remaining-weeks-v39-01",
    "lab-student-csn-summer-course-v39-02",
}
assert set(cases) == expected_ids, f"v39 scenario ids drifted: {sorted(cases)}"

remaining = cases["lab-student-csn-remaining-weeks-v39-01"]
for token in [
    "all_students_have_one_shared_240_week_limit_regardless_of_education_level",
    "part_time_calendar_weeks_always_consume_the_same_number_of_full_time_equivalent_weeks",
    "the_product_can_know_remaining_weeks_without_current_csn_account_data",
    "the_new_support_record_can_be_promoted_to_verified_by_automation",
]:
    assert token in remaining["must_not_claim"], f"remaining-week guard missing: {token}"
for token in [
    "q_which_education_level_applies",
    "q_what_study_pace_and_calendar_period_is_planned",
]:
    assert token in remaining["expected_questions"], f"information-gain question missing: {token}"
assert "check_remaining_used_and_available_weeks_on_csn_mina_sidor_instead_of_inferring_from_memory" in remaining["expected_next_actions"]

summer = cases["lab-student-csn-summer-course-v39-02"]
for token in [
    "admission_to_any_summer_course_automatically_guarantees_student_finance_for_the_whole_summer",
    "self_study_without_registered_eligible_summer_study_is_enough_for_student_finance",
    "summer_studies_with_student_finance_do_not_use_available_student_finance_weeks",
    "reddit_forums_or_search_snippets_are_truth_sources",
]:
    assert token in summer["must_not_claim"], f"summer guard missing: {token}"
assert "q_is_planned_study_at_least_fifty_percent_for_at_least_three_consecutive_weeks" in summer["expected_questions"]
assert "do_not_promise_amount_duration_or_eligibility" in summer["expected_next_actions"]

all_scenario_urls = []
for item in scenario.get("verified_signal_patterns", []):
    all_scenario_urls.extend(item.get("primary_sources", []))
assert all_scenario_urls and all("csn.se" in url for url in all_scenario_urls), "v39 verified patterns must be CSN-primary-source grounded"

signals = json.loads((EVAL / "demand_friction_signals_v25.json").read_text(encoding="utf-8"))
assert "not measured search volumes" in signals["purpose"]
assert "not measured search volumes" in signals["scoring"]["priority_rule"]
assert len(signals["signals"]) == 1
signal = signals["signals"][0]
assert signal["signal_id"] == "df-student-csn-weeks-summer-v01"
assert signal["priority_band"] == "HIGH"
for key in ["demand_signal", "friction_signal", "miss_consequence", "current_product_coverage_gap"]:
    assert signal[key]["score"] >= 4, f"HIGH signal weakened: {key}"
assert all("reddit.com" in url for url in signal["discovery_sources"]), "community sources must remain discovery-only"
assert all("reddit.com" not in url and "csn.se" in url for url in signal["primary_sources"]), "truth sources must remain CSN primary sources"
assert "discovery" in signal["truth_rule"].lower() and "verify" in signal["truth_rule"].lower()
assert "no focused public student-finance handoff" in signal["current_product_coverage_gap"]["basis"].lower()

mapping = json.loads((EVAL / "demand_friction_regression_map_v19.json").read_text(encoding="utf-8"))
assert len(mapping["mappings"]) == 1
mapped = mapping["mappings"][0]
assert mapped["signal_id"] == signal["signal_id"]
assert mapped["regression_case_ids"] == [
    "lab-student-csn-remaining-weeks-v39-01",
    "lab-student-csn-summer-course-v39-02",
]
assert "truth and regression first" in mapped["fix_or_guardrail"].lower()
assert "same person shell" in mapped["fix_or_guardrail"].lower()
assert "personal csn account balance" in mapped["privacy_guardrail"].lower()

support = json.loads(SUPPORT.read_text(encoding="utf-8"))
assert support["support_id"] == "se-csn-studiemedel-veckor-sommar"
assert support["source"]["source_id"] == "se-csn-grants-loans"
assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["material_fields_verified"] == []
rule_ids = {r["rule_id"] for r in support["eligibility"]["conditions"]}
for rid in [
    "csnweeks.education_level_limit",
    "csnweeks.study_pace",
    "csnweeks.remaining_mina_sidor",
    "csnweeks.summer_minimum",
    "csnweeks.summer_counts_used",
]:
    assert rid in rule_ids, f"review-gated CSN rule missing: {rid}"

registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
registry_sources = {s["source_id"]: s for s in registry["sources"]}
assert "se-csn-grants-loans" in registry_sources
csn_source = registry_sources["se-csn-grants-loans"]
assert csn_source["source_verification_status"] == "SOURCE_VERIFIED"
assert csn_source["owner"].startswith("Centrala studiestödsnämnden")
assert support["verification"]["status"] != "VERIFIED", "verified source metadata must not auto-promote material support facts"

workflow = WORKFLOW.read_text(encoding="utf-8")
assert "python scripts/validate_student_csn_weeks_v39.py" in workflow, "v39 validator must run in Latest learning memory"

print("student CSN v39: OK (same learning system; primary-source grounded; support remains NEEDS_REVIEW)")
