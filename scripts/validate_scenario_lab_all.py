#!/usr/bin/env python3
"""Canonical all-pack scenario gate for the single Stödassistenten learning system.

Runs the established hard-regression validator first, then verifies every
scenario_lab_websignals*.json pack so newer learning cannot silently sit
outside the common scenario-lab gate.
"""
import json
from pathlib import Path
import subprocess
import sys

subprocess.run([sys.executable, "scripts/validate_scenario_lab.py"], check=True)

paths = [
    Path("data/evals/scenario_lab_v01.json"),
    *sorted(Path("data/evals").glob("scenario_lab_websignals*.json")),
]
if len(paths) < 2:
    raise SystemExit("scenario packs missing")

required_fields = {
    "case_id", "actor_type", "story", "expected_support_areas", "must_not_claim",
    "expected_questions", "expected_next_actions", "source_requirements",
}
ids = set()
cases = []
for path in paths:
    pack = json.loads(path.read_text(encoding="utf-8"))
    for case in pack.get("cases", []):
        missing = required_fields - set(case)
        assert not missing, f"{path}: {case.get('case_id', '<no-id>')} missing {sorted(missing)}"
        cid = case["case_id"]
        assert cid not in ids, f"duplicate case_id across canonical scenario packs: {cid}"
        ids.add(cid)
        assert case["story"].strip(), f"{cid}: empty story"
        for key in [
            "expected_support_areas", "must_not_claim", "expected_questions",
            "expected_next_actions", "source_requirements",
        ]:
            assert isinstance(case[key], list) and case[key], f"{cid}: {key} must be non-empty list"
        cases.append(case)

# v15=58; v16, v17 and v18 add one case each; v19 adds the dental 67+ regression.
assert len(cases) >= 62, f"expected at least 62 cases across the single scenario system, got {len(cases)}"

required_recent = {
    "lab-individual-v06-01",
    "lab-student-housing-v07-01",
    "lab-student-housing-v07-02",
    "lab-student-activity-v08-01",
    "lab-disability-study-v08-01",
    "lab-employee-workaid-v09-01",
    "lab-employee-workaid-v09-02",
    "lab-disability-sicktravel-v10-01",
    "lab-rural-outofregion-sicktravel-v10-02",
    "lab-child-maintenance-v11-01",
    "lab-employee-partialsick-v11-01",
    "lab-personal-assistance-authority-v12-01",
    "lab-company-information-gain-v12-02",
    "lab-young-housing-irregular-income-v12-03",
    "lab-employee-varsel-transition-v13-01",
    "lab-relative-housing-representation-v13-02",
    "lab-disability-housing-tenure-v14-01",
    "lab-family-age-gate-v15-01",
    "lab-guardian-vab-12plus-v15-02",
    "lab-employee-partialsick-vab-v16-01",
    "lab-property-housing-adaptation-takeover-v17-01",
    "lab-young-housing-2027-transition-v18-01",
    "lab-older-dental-67-v19-01",
}
missing_recent = sorted(required_recent - ids)
assert not missing_recent, f"newer web-signal regressions outside canonical lab: {missing_recent}"

by_id = {c["case_id"]: c for c in cases}

# Lock safety semantics for high-impact learned misses. Values are required tokens
# in the corresponding scenario field; this keeps the common gate compact while
# preventing content drift.
locks = {
    "lab-employee-workaid-v09-01": {
        "expected_support_areas": ["authority_routing_by_employment_duration"],
        "must_not_claim": ["diagnosis_alone_guarantees_work_aid", "arbetsformedlingen_is_only_for_unemployed_people"],
        "expected_next_actions": ["route_first_12_month_need_to_arbetsformedlingen_unless_verified_exception_changes_route"],
    },
    "lab-employee-workaid-v09-02": {
        "expected_support_areas": ["preapproval_before_purchase"],
        "must_not_claim": ["buy_first_apply_later_is_safe", "retroactive_reimbursement_is_guaranteed"],
        "expected_next_actions": ["apply_or_obtain_required_decision_before_purchase_or_order"],
    },
    "lab-disability-sicktravel-v10-01": {
        "expected_support_areas": ["paratransit_boundary"],
        "must_not_claim": ["fardtjanst_permit_guarantees_free_sickness_travel", "sickness_travel_rules_are_identical_in_all_regions"],
        "expected_next_actions": ["verify_home_region_sickness_travel_rules_on_1177_or_region_source"],
    },
    "lab-rural-outofregion-sicktravel-v10-02": {
        "expected_support_areas": ["referral_route"],
        "must_not_claim": ["all_out_of_region_healthcare_travel_is_reimbursed", "travel_reimbursement_is_guaranteed_before_referral_route_is_known"],
        "expected_next_actions": ["verify_how_the_out_of_region_care_was_arranged"],
    },
    "lab-child-maintenance-v11-01": {
        "expected_support_areas": ["underhallsbidrag_vs_underhallsstod"],
        "must_not_claim": ["underhallsbidrag_and_underhallsstod_are_the_same_route", "underhallsstod_is_automatic_without_application_or_assessment"],
        "expected_next_actions": ["distinguish_parent_paid_underhallsbidrag_from_fk_underhallsstod"],
    },
    "lab-employee-partialsick-v11-01": {
        "expected_support_areas": ["work_schedule_distribution"],
        "must_not_claim": ["employer_approval_alone_is_enough_for_partial_sick_leave_schedule", "working_more_never_requires_informing_forsakringskassan"],
        "expected_next_actions": ["check_work_schedule_distribution_with_both_employer_and_forsakringskassan"],
    },
    "lab-personal-assistance-authority-v12-01": {
        "expected_support_areas": ["municipality_vs_forsakringskassan_authority"],
        "must_not_claim": ["diagnosis_alone_guarantees_personal_assistance", "user_estimated_hours_equal_assessed_basic_need_hours", "under_20_hours_means_no_support_is_possible"],
        "expected_next_actions": ["if_basic_need_help_is_below_or_unclear_20_hours_contact_municipality_for_assessment"],
    },
    "lab-company-information-gain-v12-02": {
        "expected_support_areas": ["information_gain"],
        "must_not_claim": ["procurement_readiness_questions_are_required_for_funding_only_route"],
        "expected_next_actions": ["skip_procurement_readiness_questions_for_funding_only_route"],
    },
    "lab-young-housing-irregular-income-v12-03": {
        "expected_support_areas": ["irregular_income"],
        "must_not_claim": ["one_month_income_alone_determines_annual_housing_benefit_income", "income_changes_can_always_wait_until_next_annual_application"],
        "expected_next_actions": ["report_relevant_income_or_household_changes_when_known"],
    },
    "lab-employee-varsel-transition-v13-01": {
        "expected_support_areas": ["varsel_vs_actual_unemployment"],
        "must_not_claim": ["varsel_means_already_unemployed", "union_membership_equals_a_kassa_membership"],
        "expected_next_actions": ["if_employment_ends_without_new_job_register_with_arbetsformedlingen_on_first_unemployed_day"],
    },
    "lab-relative-housing-representation-v13-02": {
        "expected_support_areas": ["authorized_relative_boundary"],
        "must_not_claim": ["helper_should_use_the_other_persons_bankid_or_credentials", "adult_child_relationship_alone_always_grants_representation_authority"],
        "expected_next_actions": ["use_helpers_own_e_identification_only_when_current_official_authorized_relative_web_route_applies"],
    },
    "lab-disability-housing-tenure-v14-01": {
        "expected_support_areas": ["tenure_and_owner_consent"],
        "must_not_claim": ["tenant_cannot_apply_for_housing_adaptation", "landlord_or_brf_is_the_applicant_by_default", "municipality_can_issue_positive_decision_without_required_written_owner_or_right_holder_consent"],
        "expected_next_actions": ["obtain_required_written_consent_and_owner_non_restoration_compensation_undertaking_before_positive_decision"],
        "source_requirements": ["Boverket"],
    },
    "lab-family-age-gate-v15-01": {
        "expected_support_areas": ["age_scope_disambiguation"],
        "must_not_claim": ["child_specific_supports_apply_unchanged_to_adult_family_member", "omvardnadsbidrag_for_child_is_a_valid_route_for_a_25_year_old"],
        "expected_next_actions": ["do_not_continue_into_child_specific_results_when_age_gate_is_not_met", "reroute_within_the_same_product_to_a_broader_adult_safe_path"],
    },
    "lab-guardian-vab-12plus-v15-02": {
        "expected_support_areas": ["30_day_application_window_from_2026_04_01"],
        "must_not_claim": ["ninety_day_rule_still_applies_to_new_vab_days_after_2026_04_01", "ordinary_sickness_for_age_12_to_15_automatically_qualifies_for_vab", "medical_documentation_is_never_needed_for_age_12_to_15"],
        "expected_next_actions": ["apply_or_check_application_status_promptly_against_the_current_30_day_rule"],
        "source_requirements": ["Forsakringskassan_current_application_deadline"],
    },
    "lab-employee-partialsick-vab-v16-01": {
        "expected_support_areas": ["exact_hour_overlap", "same_day_benefit_coordination"],
        "must_not_claim": ["partial_sick_leave_percentage_automatically_equals_available_vab_percentage", "vab_is_payable_for_hours_when_parent_is_self_sick_and_reported_sick"],
        "expected_next_actions": ["map_exact_sick_leave_work_and_requested_vab_hours_before_applying"],
    },
    "lab-property-housing-adaptation-takeover-v17-01": {
        "expected_support_areas": ["resident_initial_applicant_boundary", "voluntary_takeover_after_granted_cash_support"],
        "must_not_claim": ["brf_or_landlord_is_initial_applicant_by_default", "property_owner_can_take_over_before_resident_has_been_granted_cash_housing_adaptation_support", "owner_takeover_applies_to_measures_inside_the_apartment"],
        "expected_next_actions": ["keep_person_with_functional_need_as_initial_applicant_and_separate_owner_consent_from_takeover"],
    },
    "lab-young-housing-2027-transition-v18-01": {
        "expected_support_areas": ["decision_period_versioning", "monthly_income_reform_2027", "reform_exception_check"],
        "must_not_claim": ["monthly_income_rules_apply_to_a_2026_housing_benefit_decision", "all_existing_housing_benefit_decisions_switch_automatically_on_2027_01_01", "monthly_income_reform_applies_to_self_employed_or_foreign_income_cases_without_current_source_check"],
        "expected_next_actions": ["for_a_2026_decision_use_the_current_annual_income_estimation_route", "if_a_new_decision_will_start_from_2027_01_01_verify_the_monthly_income_rules_and_current_exceptions_then"],
    },
    "lab-older-dental-67-v19-01": {
        "expected_support_areas": ["strengthened_high_cost_protection_67_plus_2026", "reference_price", "covered_vs_excluded_measures"],
        "must_not_claim": ["strengthened_high_cost_protection_covers_the_entire_dental_invoice", "examinations_xrays_and_preventive_care_are_always_included_in_the_10_percent_rule", "patient_pays_10_percent_of_any_clinic_price_regardless_of_reference_price", "the_previous_high_cost_protection_disappeared_in_2026"],
        "expected_next_actions": ["ask_dental_provider_for_itemized_treatment_plan_with_clinic_price_reference_price_and_which_measures_use_strengthened_support", "use_current_tlv_rules_or_reference_prices_before_claiming_coverage_or_cost_for_a_specific_measure"],
        "source_requirements": ["Forsakringskassan_current_strengthened_dental_high_cost_protection_2026", "TLV_current_2026_dental_support_rules_and_reference_prices"],
    },
}

for cid, field_locks in locks.items():
    case = by_id[cid]
    for field, tokens in field_locks.items():
        for token in tokens:
            assert token in case[field], f"{cid}: missing locked {field} token {token}"

print(f"canonical scenario lab: OK ({len(cases)} cases across {len(paths)} packs)")
