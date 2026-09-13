#!/usr/bin/env python3
"""Canonical all-pack scenario gate for the single Stödassistenten learning system.

Runs the established hard-regression validator first, then verifies every scenario_lab_websignals*.json
pack so newer web-signal regressions cannot silently sit outside the common scenario-lab gate.
"""
import json
from pathlib import Path
import subprocess
import sys

subprocess.run([sys.executable, 'scripts/validate_scenario_lab.py'], check=True)

paths = [Path('data/evals/scenario_lab_v01.json'), *sorted(Path('data/evals').glob('scenario_lab_websignals*.json'))]
if len(paths) < 2:
    raise SystemExit('scenario packs missing')

required_fields = {
    'case_id','actor_type','story','expected_support_areas','must_not_claim',
    'expected_questions','expected_next_actions','source_requirements'
}
ids = set()
cases = []
for path in paths:
    pack = json.loads(path.read_text(encoding='utf-8'))
    for case in pack.get('cases', []):
        missing = required_fields - set(case)
        assert not missing, f'{path}: {case.get("case_id", "<no-id>")} missing {sorted(missing)}'
        cid = case['case_id']
        assert cid not in ids, f'duplicate case_id across canonical scenario packs: {cid}'
        ids.add(cid)
        assert case['story'].strip(), f'{cid}: empty story'
        for key in ['expected_support_areas','must_not_claim','expected_questions','expected_next_actions','source_requirements']:
            assert isinstance(case[key], list) and case[key], f'{cid}: {key} must be non-empty list'
        cases.append(case)

# 55 cases were present after v13. v14 adds one tenure/consent regression.
assert len(cases) >= 56, f'expected at least 56 cases across the single scenario system, got {len(cases)}'

required_recent = {
    'lab-individual-v06-01',
    'lab-student-housing-v07-01',
    'lab-student-housing-v07-02',
    'lab-student-activity-v08-01',
    'lab-disability-study-v08-01',
    'lab-employee-workaid-v09-01',
    'lab-employee-workaid-v09-02',
    'lab-disability-sicktravel-v10-01',
    'lab-rural-outofregion-sicktravel-v10-02',
    'lab-child-maintenance-v11-01',
    'lab-employee-partialsick-v11-01',
    'lab-personal-assistance-authority-v12-01',
    'lab-company-information-gain-v12-02',
    'lab-young-housing-irregular-income-v12-03',
    'lab-employee-varsel-transition-v13-01',
    'lab-relative-housing-representation-v13-02',
    'lab-disability-housing-tenure-v14-01',
}
missing_recent = sorted(required_recent - ids)
assert not missing_recent, f'newer web-signal regressions outside canonical lab: {missing_recent}'

by_id = {c['case_id']: c for c in cases}
first = by_id['lab-employee-workaid-v09-01']
assert 'authority_routing_by_employment_duration' in first['expected_support_areas']
assert 'diagnosis_alone_guarantees_work_aid' in first['must_not_claim']
assert 'arbetsformedlingen_is_only_for_unemployed_people' in first['must_not_claim']
assert 'route_first_12_month_need_to_arbetsformedlingen_unless_verified_exception_changes_route' in first['expected_next_actions']

second = by_id['lab-employee-workaid-v09-02']
assert 'preapproval_before_purchase' in second['expected_support_areas']
assert 'buy_first_apply_later_is_safe' in second['must_not_claim']
assert 'retroactive_reimbursement_is_guaranteed' in second['must_not_claim']
assert 'apply_or_obtain_required_decision_before_purchase_or_order' in second['expected_next_actions']

sicktravel = by_id['lab-disability-sicktravel-v10-01']
assert 'paratransit_boundary' in sicktravel['expected_support_areas']
assert 'fardtjanst_permit_guarantees_free_sickness_travel' in sicktravel['must_not_claim']
assert 'sickness_travel_rules_are_identical_in_all_regions' in sicktravel['must_not_claim']
assert 'verify_home_region_sickness_travel_rules_on_1177_or_region_source' in sicktravel['expected_next_actions']

out_of_region = by_id['lab-rural-outofregion-sicktravel-v10-02']
assert 'referral_route' in out_of_region['expected_support_areas']
assert 'all_out_of_region_healthcare_travel_is_reimbursed' in out_of_region['must_not_claim']
assert 'travel_reimbursement_is_guaranteed_before_referral_route_is_known' in out_of_region['must_not_claim']
assert 'verify_how_the_out_of_region_care_was_arranged' in out_of_region['expected_next_actions']

maintenance = by_id['lab-child-maintenance-v11-01']
assert 'underhallsbidrag_vs_underhallsstod' in maintenance['expected_support_areas']
assert 'underhallsbidrag_and_underhallsstod_are_the_same_route' in maintenance['must_not_claim']
assert 'underhallsstod_is_automatic_without_application_or_assessment' in maintenance['must_not_claim']
assert 'distinguish_parent_paid_underhallsbidrag_from_fk_underhallsstod' in maintenance['expected_next_actions']

partial_sick = by_id['lab-employee-partialsick-v11-01']
assert 'work_schedule_distribution' in partial_sick['expected_support_areas']
assert 'employer_approval_alone_is_enough_for_partial_sick_leave_schedule' in partial_sick['must_not_claim']
assert 'working_more_never_requires_informing_forsakringskassan' in partial_sick['must_not_claim']
assert 'check_work_schedule_distribution_with_both_employer_and_forsakringskassan' in partial_sick['expected_next_actions']

# v12 introduced three high-impact learning signals. Lock their safety content, not just their IDs.
personal_assistance = by_id['lab-personal-assistance-authority-v12-01']
assert 'municipality_vs_forsakringskassan_authority' in personal_assistance['expected_support_areas']
assert 'diagnosis_alone_guarantees_personal_assistance' in personal_assistance['must_not_claim']
assert 'user_estimated_hours_equal_assessed_basic_need_hours' in personal_assistance['must_not_claim']
assert 'under_20_hours_means_no_support_is_possible' in personal_assistance['must_not_claim']
assert 'if_basic_need_help_is_below_or_unclear_20_hours_contact_municipality_for_assessment' in personal_assistance['expected_next_actions']

company_information_gain = by_id['lab-company-information-gain-v12-02']
assert 'information_gain' in company_information_gain['expected_support_areas']
assert 'procurement_readiness_questions_are_required_for_funding_only_route' in company_information_gain['must_not_claim']
assert 'skip_procurement_readiness_questions_for_funding_only_route' in company_information_gain['expected_next_actions']

young_housing = by_id['lab-young-housing-irregular-income-v12-03']
assert 'irregular_income' in young_housing['expected_support_areas']
assert 'one_month_income_alone_determines_annual_housing_benefit_income' in young_housing['must_not_claim']
assert 'income_changes_can_always_wait_until_next_annual_application' in young_housing['must_not_claim']
assert 'report_relevant_income_or_household_changes_when_known' in young_housing['expected_next_actions']

varsel = by_id['lab-employee-varsel-transition-v13-01']
assert 'varsel_vs_actual_unemployment' in varsel['expected_support_areas']
assert 'varsel_means_already_unemployed' in varsel['must_not_claim']
assert 'union_membership_equals_a_kassa_membership' in varsel['must_not_claim']
assert 'if_employment_ends_without_new_job_register_with_arbetsformedlingen_on_first_unemployed_day' in varsel['expected_next_actions']

representation = by_id['lab-relative-housing-representation-v13-02']
assert 'authorized_relative_boundary' in representation['expected_support_areas']
assert 'helper_should_use_the_other_persons_bankid_or_credentials' in representation['must_not_claim']
assert 'adult_child_relationship_alone_always_grants_representation_authority' in representation['must_not_claim']
assert 'use_helpers_own_e_identification_only_when_current_official_authorized_relative_web_route_applies' in representation['expected_next_actions']

housing_tenure = by_id['lab-disability-housing-tenure-v14-01']
assert 'tenure_and_owner_consent' in housing_tenure['expected_support_areas']
assert 'tenant_cannot_apply_for_housing_adaptation' in housing_tenure['must_not_claim']
assert 'landlord_or_brf_is_the_applicant_by_default' in housing_tenure['must_not_claim']
assert 'municipality_can_issue_positive_decision_without_required_written_owner_or_right_holder_consent' in housing_tenure['must_not_claim']
assert 'obtain_required_written_consent_and_owner_non_restoration_compensation_undertaking_before_positive_decision' in housing_tenure['expected_next_actions']
assert 'Boverket' in housing_tenure['source_requirements']

print(f'canonical scenario lab: OK ({len(cases)} cases across {len(paths)} packs)')
