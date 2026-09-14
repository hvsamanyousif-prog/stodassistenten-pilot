#!/usr/bin/env python3
"""Permanent semantic locks for the newest Stödassistenten learned regressions.

The canonical all-pack validator already loads every scenario pack dynamically.
This guard prevents the newest safety lessons from being present by case-id only
while their actual semantics drift. It is part of the same scenario laboratory,
not a separate matcher or truth source.
"""
import json
from pathlib import Path

EVAL = Path(__file__).resolve().parents[1] / "data" / "evals"
paths = [EVAL / "scenario_lab_v01.json", *sorted(EVAL.glob("scenario_lab_websignals*.json"))]
cases = {}
for path in paths:
    pack = json.loads(path.read_text(encoding="utf-8"))
    for case in pack.get("cases", []):
        cid = case["case_id"]
        if cid in cases:
            raise AssertionError(f"duplicate scenario id: {cid}")
        cases[cid] = case

assert len(cases) >= 66, f"expected at least 66 cases after v23, got {len(cases)}"

locks = {
    "lab-young-post-study-no-job-v20-01": {
        "expected_support_areas": ["first_unemployed_day", "unemployment_insurance_separate_assessment"],
        "must_not_claim": [
            "registration_with_arbetsformedlingen_automatically_grants_a_kassa",
            "the_raw_situation_text_should_be_put_in_the_handoff_url_or_feedback",
        ],
        "expected_next_actions": [
            "if_unemployed_submit_arbetsformedlingen_registration_on_the_first_unemployed_day",
            "if_seeking_unemployment_compensation_apply_separately_to_the_relevant_a_kassa_after_registration",
        ],
    },
    "lab-relative-severe-illness-care-v21-01": {
        "expected_support_areas": [
            "near_relative_benefit_candidate",
            "life_threatening_condition_boundary",
            "foregone_work_or_replacement_benefit",
        ],
        "must_not_claim": [
            "family_relationship_alone_guarantees_near_relative_benefit",
            "ordinary_age_related_help_need_qualifies_for_near_relative_benefit",
            "the_product_can_decide_eligibility_or_amount_without_forsakringskassan_assessment",
            "the_raw_situation_text_should_be_put_in_the_handoff_url_or_feedback",
        ],
        "expected_next_actions": [
            "ask_healthcare_about_the_required_medical_statement_before_assuming_the_support_applies",
            "do_not_promote_the_existing_near_relative_support_record_from_needs_review_to_verified",
        ],
    },
    "lab-young-post-study-housing-change-v22-01": {
        "expected_support_areas": [
            "young_housing_benefit_candidate",
            "annual_income_estimation_2026",
            "income_change_reporting",
            "housing_form_check",
        ],
        "must_not_claim": [
            "one_month_income_is_enough_for_a_2026_housing_benefit_assessment",
            "starting_a_job_means_the_user_can_keep_the_same_income_estimate_without_reporting_change",
            "the_2027_monthly_income_model_applies_to_a_2026_decision",
            "the_product_can_guarantee_housing_benefit_or_a_specific_amount",
            "the_raw_situation_text_or_exact_age_should_be_put_in_the_handoff_url_or_feedback",
        ],
        "expected_next_actions": [
            "use_a_january_to_december_income_estimate_for_a_2026_decision",
            "report_known_income_or_housing_changes_to_forsakringskassan",
            "do_not_repeat_an_income_change_question_when_the_coarse_shell_context_already_establishes_that_fact",
        ],
    },
    "lab-private-basic-needs-economic-assistance-v23-01": {
        "expected_support_areas": [
            "municipal_economic_assistance_candidate",
            "individual_assessment",
            "right_to_apply_and_receive_decision",
        ],
        "must_not_claim": [
            "low_income_or_illness_alone_guarantees_economic_assistance",
            "a_simplified_trial_calculation_is_a_municipal_decision",
            "illness_alone_removes_all_activity_or_document_requirements",
            "the_product_can_guarantee_amount_or_payment_date",
            "the_raw_situation_text_exact_income_bank_data_or_health_details_should_be_put_in_the_handoff_url_or_feedback",
        ],
        "expected_questions": [
            "q_none_when_coarse_basic_need_or_housing_context_is_already_known",
        ],
        "expected_next_actions": [
            "contact_social_services_in_the_users_municipality_to_apply",
            "ask_the_municipality_which_household_housing_income_asset_and_expense_documents_are_required",
            "treat_the_socialstyrelsen_trial_calculation_as_orientation_not_a_decision",
            "do_not_block_an_application_because_the_public_pilot_is_unsure",
        ],
    },
}

for cid, fields in locks.items():
    assert cid in cases, f"new learned regression missing from canonical lab: {cid}"
    case = cases[cid]
    for field, tokens in fields.items():
        for token in tokens:
            assert token in case[field], f"{cid}: missing locked {field} token {token}"

print(f"recent learning memory: OK ({len(cases)} canonical scenarios; v20-v23 semantics locked)")
