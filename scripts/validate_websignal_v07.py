#!/usr/bin/env python3
import json
from pathlib import Path

PATH = Path('data/evals/scenario_lab_websignals_v07.json')

def require(condition, message):
    if not condition:
        raise AssertionError(message)

data = json.loads(PATH.read_text(encoding='utf-8'))
cases = {case['case_id']: case for case in data['cases']}
require(len(cases) == 2, 'v07 must contain exactly two deduplicated housing-benefit cases')

lodger = cases['lab-student-housing-v07-01']
for token in ('lodger_status_equals_second_hand_tenancy','student_status_alone_creates_entitlement'):
    require(token in lodger['must_not_claim'], f'missing lodger regression: {token}')
require('q_housing_form' in lodger['expected_questions'], 'housing form must be asked before guidance')

change = cases['lab-student-housing-v07-02']
for token in ('household_changes_can_wait_until_next_application','youth_housing_benefit_is_retroactive_before_application_month'):
    require(token in change['must_not_claim'], f'missing change-reporting regression: {token}')
require('report_household_and_income_changes_directly' in change['expected_next_actions'], 'change reporting must be an explicit next action')

for case in cases.values():
    require(case['actor_type'] == 'student', 'v07 cases must stay scoped to discovered student housing confusion')
    require('Försäkringskassan' in case['source_requirements'], 'truth-bearing housing rules must require Försäkringskassan')

print('websignal v07 validation: OK')
