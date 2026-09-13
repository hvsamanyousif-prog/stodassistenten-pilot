#!/usr/bin/env python3
import json
from pathlib import Path

PATH = Path('data/evals/scenario_lab_websignals_v08.json')


def require(condition, message):
    if not condition:
        raise AssertionError(message)


data = json.loads(PATH.read_text(encoding='utf-8'))
cases = {case['case_id']: case for case in data['cases']}
require(len(cases) == 2, 'v08 must contain exactly two deduplicated activity-support cases')

terms = cases['lab-student-activity-v08-01']
for token in (
    'aktivitetsstod_equals_aktivitetsersattning',
    'a_kassa_exhaustion_automatically_creates_aktivitetsstod',
    'unemployment_alone_creates_aktivitetsersattning',
):
    require(token in terms['must_not_claim'], f'missing terminology regression: {token}')
require('benefit_terminology_disambiguation' in terms['expected_support_areas'], 'benefit-name disambiguation must be explicit')
require('q_arbetsformedlingen_program_decision' in terms['expected_questions'], 'program status must be checked before aktivitetsstöd guidance')
require('do_not_route_to_disability_benefit_from_unemployment_alone' in terms['expected_next_actions'], 'unemployment must not be misrouted to aktivitetsersättning')

study = cases['lab-disability-study-v08-01']
for token in (
    'all_aktivitetsersattning_must_always_be_fully_dormant_when_studying',
    'old_pre_2026_study_rule_is_current_without_verification',
    'prövotid_is_automatic_without_conditions_or_application',
):
    require(token in study['must_not_claim'], f'missing current-study-rule regression: {token}')
require('current_rule_verification' in study['expected_support_areas'], 'current 2026 rule verification must be explicit')
require('compare_prövotid_with_dormant_or_partial_benefit_path' in study['expected_next_actions'], 'study paths must be compared, not collapsed')

for case in cases.values():
    require('Försäkringskassan' in case['source_requirements'], 'truth-bearing activity-benefit guidance must require Försäkringskassan')
    require(case['story'].strip(), 'scenario story must not be empty')
    for key in ('expected_support_areas','must_not_claim','expected_questions','expected_next_actions','source_requirements'):
        require(isinstance(case[key], list) and case[key], f'{case["case_id"]}: {key} must be a non-empty list')

print('websignal v08 validation: OK')
