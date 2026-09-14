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

assert len(cases) >= 71, f"expected at least 71 cases after v27, got {len(cases)}"

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
        "expected_questions": ["q_none_when_coarse_basic_need_or_housing_context_is_already_known"],
        "expected_next_actions": [
            "contact_social_services_in_the_users_municipality_to_apply",
            "ask_the_municipality_which_household_housing_income_asset_and_expense_documents_are_required",
            "treat_the_socialstyrelsen_trial_calculation_as_orientation_not_a_decision",
            "do_not_block_an_application_because_the_public_pilot_is_unsure",
        ],
    },
    "lab-private-economic-assistance-municipal-route-v24-01": {
        "expected_support_areas": [
            "national_economic_assistance_truth_record",
            "municipality_identity_resolution",
            "municipality_primary_route_verification",
            "non_eid_fallback_when_needed",
        ],
        "must_not_claim": [
            "a_guessed_municipality_domain_or_search_result_is_a_verified_application_route",
            "a_stale_or_changed_local_link_is_current",
            "a_verified_local_route_proves_eligibility_for_economic_assistance",
            "lack_of_bankid_means_the_person_cannot_apply",
            "municipality_specific_application_details_should_be_copied_into_a_parallel_support_truth_record",
        ],
        "expected_next_actions": [
            "resolve_municipality_name_and_code_against_current_scb_identity_data",
            "preserve_socialstyrelsen_as_the_national_economic_assistance_truth_source",
            "show_a_direct_local_route_only_when_currently_verified_from_a_municipality_primary_source",
            "if_route_is_stale_changed_or_unknown_fall_back_to_contacting_the_municipal_social_services_or_current_municipality_site",
        ],
    },
    "lab-employee-preventive-treatment-work-v25-01": {
        "expected_support_areas": [
            "preventive_sickness_benefit_candidate",
            "doctor_ordered_medical_treatment_or_rehabilitation",
            "treatment_plan_approval",
            "per_ocassion_work_absence_threshold",
        ],
        "must_not_claim": [
            "an_ordinary_single_healthcare_visit_automatically_qualifies_for_preventive_sickness_benefit",
            "diagnosis_or_treatment_name_alone_proves_eligibility",
            "treatment_plan_approval_guarantees_payment_for_every_treatment_ocassion",
            "the_product_can_guarantee_eligibility_amount_or_payment_date",
            "the_raw_situation_text_health_details_or_exact_schedule_should_be_put_in_the_handoff_url_or_feedback",
        ],
        "expected_questions": [
            "q_is_medical_treatment_or_rehabilitation_doctor_ordered_to_prevent_or_shorten_disease",
            "q_does_treatment_and_relevant_travel_require_at_least_one_quarter_of_daily_work_time_per_ocassion",
            "q_has_forsakringskassan_approved_the_treatment_plan",
        ],
        "expected_next_actions": [
            "if_plan_is_not_approved_apply_to_forsakringskassan_for_treatment_plan_approval_before_claiming_treatment_ocassions",
            "after_plan_approval_use_the_current_forsakringskassan_route_to_claim_actual_treatment_ocassions_without_promising_eligibility_or_amount",
            "if_the_route_does_not_fit_keep_ordinary_sickness_benefit_employer_rehabilitation_and_other_paths_separate",
        ],
    },
    "lab-employee-work-injury-dental-cost-v26-01": {
        "expected_support_areas": [
            "work_injury_dental_cost_reimbursement_candidate",
            "reference_price_boundary",
            "collective_agreement_insurance_kept_separate",
        ],
        "must_not_claim": [
            "a_workplace_incident_report_or_employer_report_automatically_proves_an_approved_work_injury",
            "every_dental_bill_after_a_work_injury_is_reimbursed_in_full",
            "afa_work_injury_insurance_applies_to_every_worker_or_requires_union_membership",
            "forsakringskassan_dental_cost_reimbursement_and_afa_compensation_are_the_same_decision",
            "the_raw_injury_story_employer_identity_exact_cost_or_health_details_should_be_put_in_the_handoff_url_or_feedback",
        ],
        "expected_questions": [
            "q_did_injury_or_disease_arise_due_to_work_or_commute",
            "q_is_dental_treatment_necessary_due_to_that_work_injury",
            "q_is_cost_evidence_available_and_is_dentist_connected_to_forsakringskassan",
        ],
        "expected_next_actions": [
            "collect_cost_proposal_receipt_or_invoice_and_confirm_the_dentist_is_connected_to_forsakringskassan",
            "use_the_current_forsakringskassan_work_injury_cost_route_or_form_5002_without_promising_approval_or_full_reimbursement",
            "check_collective_agreement_work_injury_insurance_separately_with_employer_union_or_afa_when_relevant_without_assuming_coverage",
        ],
    },
    "lab-employee-work-injury-dental-natural-route-v27-01": {
        "expected_support_areas": [
            "natural_language_route_to_same_person_module",
            "privacy_safe_coarse_handoff",
            "information_gain_question_order",
        ],
        "must_not_claim": [
            "dental_words_plus_employment_without_an_injury_signal_are_enough_to_force_work_injury_routing",
            "the_raw_injury_story_employer_identity_exact_cost_or_health_details_should_be_put_in_the_handoff_url_or_feedback",
        ],
        "expected_questions": [
            "q_where_did_injury_occur_work_commute_other_or_unsure",
            "q_is_dental_treatment_necessary_due_to_that_injury",
            "q_is_cost_evidence_available_and_is_dentist_connected_to_forsakringskassan",
        ],
        "expected_next_actions": [
            "route_only_explicit_dental_injury_plus_work_or_commute_context_to_the_bounded_same_person_focus",
            "use_the_current_forsakringskassan_work_injury_cost_route_without_promising_approval_or_full_reimbursement",
        ],
    },
    "lab-employee-commute-traffic-dental-split-v27-02": {
        "expected_support_areas": [
            "commute_work_injury_boundary",
            "forsakringskassan_dental_cost_route_kept_separate",
            "afa_commute_traffic_exception",
            "traffic_insurance_separate_route",
        ],
        "must_not_claim": [
            "a_commute_traffic_accident_automatically_proves_eligibility_for_forsakringskassan_dental_cost_reimbursement",
            "afa_collective_agreement_work_injury_insurance_covers_a_commute_traffic_accident_unchanged",
            "traffic_insurance_and_forsakringskassan_work_injury_dental_reimbursement_are_the_same_decision",
            "the_product_can_guess_which_vehicle_insurer_is_responsible_without_current_case_specific_information",
        ],
        "expected_questions": [
            "q_where_did_injury_occur_work_commute_other_or_unsure",
            "q_if_commute_was_event_a_traffic_accident",
        ],
        "expected_next_actions": [
            "for_forsakringskassan_keep_the_commute_dental_cost_route_subject_to_current_conditions_and_individual_assessment",
            "for_a_commute_traffic_accident_do_not_recommend_afa_work_injury_insurance_as_if_it_applied_unchanged",
            "check_the_relevant_traffic_insurance_route_separately_without_guessing_responsible_insurer",
        ],
    },
}

for cid, fields in locks.items():
    assert cid in cases, f"new learned regression missing from canonical lab: {cid}"
    case = cases[cid]
    for field, tokens in fields.items():
        for token in tokens:
            assert token in case[field], f"{cid}: missing locked {field} token {token}"

print(f"recent learning memory: OK ({len(cases)} canonical scenarios; v20-v27 semantics locked)")
