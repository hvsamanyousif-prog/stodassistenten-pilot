#!/usr/bin/env python3
"""Red Team gate for young housing-benefit truth and 2027 transition semantics."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SUPPORT = ROOT / "data" / "supports" / "se-forsakringskassan-bostadsbidrag-unga.json"
SCENARIO = ROOT / "data" / "evals" / "scenario_lab_websignals_v18.json"
OLDER = ROOT / "data" / "evals" / "scenario_lab_websignals_v12.json"

support = json.loads(SUPPORT.read_text(encoding="utf-8"))
scenario = json.loads(SCENARIO.read_text(encoding="utf-8"))
older = json.loads(OLDER.read_text(encoding="utf-8"))

verification = support["verification"]
assert verification["status"] == "NEEDS_REVIEW"
assert verification["human_review_required"] is True
assert verification["last_verified_at"] is None
assert verification["material_fields_verified"] == []
assert support["lifecycle"]["valid_to"] is None, "2027 calculation reform must not be modelled as support expiry"

rules = {
    rule["rule_id"]: rule
    for rule in support["eligibility"]["conditions"] + support["eligibility"]["exclusions"]
}
annual = rules["bhyoung.annual_income_basis_2026"]
transition = rules["bhyoung.monthly_income_transition_2027"]
lodger = rules["bhyoung.lodger_exclusion"]

assert "hela året" in annual["value"]
assert "en enskild månads inkomst" in annual["notes"].lower()
assert "1 januari 2027" in transition["value"]
assert "endast beslut" in transition["value"].lower()
assert "pågående beslutet löper ut" in transition["value"].lower()
assert "egenföretagare" in transition["notes"].lower()
assert "inkomst från utlandet" in transition["notes"].lower()
assert "bostadsbidrag-nya-regler-fran-1-januari-2027" in transition["source_url"]
assert lodger["value"] == "lodger"

questions = {q["question_id"]: q for q in support["eligibility"]["missing_information_questions"]}
assert "bhyoung.decision_period" in questions
assert "bhyoung.2027_exception" in questions
assert "egenföretagare" in questions["bhyoung.2027_exception"]["prompt"].lower()

application = support["application"]
assert "2026-beslut" in application["next_step"]
assert "nytt beslut 2027" in application["next_step"]
assert "undantag" in application["next_step"].lower()
assert "bara lämnas från och med den månad ansökan görs" in application["deadline_text"]

cases = {case["case_id"]: case for case in scenario["cases"]}
case = cases["lab-young-housing-2027-transition-v18-01"]
required_forbidden = {
    "monthly_income_rules_apply_to_a_2026_housing_benefit_decision",
    "one_autumn_month_income_is_sufficient_for_the_2026_annual_income_estimate",
    "all_existing_housing_benefit_decisions_switch_automatically_on_2027_01_01",
    "known_2026_income_changes_do_not_need_to_be_reported_because_rules_change_in_2027",
    "monthly_income_reform_applies_to_self_employed_or_foreign_income_cases_without_current_source_check",
    "the_2027_reform_guarantees_no_repayment_or_a_specific_benefit_amount",
}
assert required_forbidden <= set(case["must_not_claim"])
required_actions = {
    "for_a_2026_decision_use_the_current_annual_income_estimation_route",
    "report_known_income_housing_or_household_changes_under_current_rules",
    "if_a_new_decision_will_start_from_2027_01_01_verify_the_monthly_income_rules_and_current_exceptions_then",
    "do_not_treat_2027_01_01_as_an_automatic_mid_decision_switch_for_existing_housing_benefit",
    "do_not_apply_the_monthly_income_reform_to_an_excluded_group_without_current_primary_source_support",
}
assert required_actions <= set(case["expected_next_actions"])
assert "q_if_2027_check_self_employment_or_foreign_income_exception" in case["expected_questions"]
assert len(case["source_requirements"]) >= 2

older_cases = {case["case_id"]: case for case in older["cases"]}
prior = older_cases["lab-young-housing-irregular-income-v12-03"]
assert "one_month_income_alone_determines_annual_housing_benefit_income" in prior["must_not_claim"]
assert "report_relevant_income_or_household_changes_when_known" in prior["expected_next_actions"]

print("young housing-benefit transition: OK (truth record + old/new regressions fail closed)")
