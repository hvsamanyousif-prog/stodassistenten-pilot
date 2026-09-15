#!/usr/bin/env python3
import json
from pathlib import Path

SCENARIO = Path('data/evals/scenario_lab_websignals_v55.json')
SIGNAL = Path('data/evals/demand_friction_signals_v36.json')
MAPPING = Path('data/evals/demand_friction_regression_map_v30.json')
MODULE = Path('client/disability-home-support-guidance.js')
OLDER = Path('client/older-home-support-guidance.js')
OLDER_TEST = Path('client/older-home-support-guidance.test.cjs')
BUILD = Path('scripts/build_public_pilot.py')

for path in [SCENARIO, SIGNAL, MAPPING, MODULE, OLDER, OLDER_TEST, BUILD]:
    assert path.is_file(), f'missing {path}'

scenario = json.loads(SCENARIO.read_text(encoding='utf-8'))
signal = json.loads(SIGNAL.read_text(encoding='utf-8'))
mapping = json.loads(MAPPING.read_text(encoding='utf-8'))
module = MODULE.read_text(encoding='utf-8')
older = OLDER.read_text(encoding='utf-8')
older_test = OLDER_TEST.read_text(encoding='utf-8')
build = BUILD.read_text(encoding='utf-8')

required_cases = {
    'lab-disability-home-help-not-eldercare-v55-01',
    'lab-disability-boendestod-structure-v55-02',
    'lab-disability-safety-alarm-local-v55-03',
    'lab-relative-middle-aged-parent-disability-not-older-v55-04',
}
case_ids = {case['case_id'] for case in scenario['cases']}
assert required_cases <= case_ids, 'v55 cases missing'

sig = signal['signals'][0]
assert sig['signal_id'] == 'df-disability-home-support-not-eldercare-v01'
assert sig['priority_band'] == 'HIGH'
for field in ['demand_signal','friction_signal','miss_consequence','source_fragmentation','language_accessibility_friction','steps_to_action','recurrence_signal','current_product_coverage_gap']:
    assert 1 <= sig[field]['score'] <= 5, f'invalid score {field}'
assert set(sig['regression_case']) == required_cases
assert 'not measured search volumes' in signal['purpose']
assert 'VERIFY' in sig['truth_rule']
assert sig['product_miss'].strip()

mapped = mapping['mappings'][0]
assert mapped['signal_id'] == sig['signal_id']
assert set(mapped['regression_case_ids']) == required_cases
assert mapped['coverage_status'] == 'GUARDED_PUBLIC_ROUTE_READY'
assert 'raw situation text' in mapped['privacy_guardrail']
assert 'eligibility' in mapped['truth_guardrail']

for token in [
    'disability_home_support', 'structure', 'personal_care', 'safety', 'healthcare',
    'socialtjanstinsatser-till-personer-med-funktionsnedsattning',
    'https://www.socialstyrelsen.se/kunskapsstod-och-regler/omraden/funktionshinder/',
    "flow:'disability_home_support'", "app_version:'0.5.5'",
    "focus:'disability_home_support'", 'support_need', 'aria-pressed'
]:
    assert token in module, f'module missing {token}'
for forbidden in ['personnummer:', 'diagnosis:', 'municipality:', 'raw_story:', 'address:', "get('q')", 'situationText']:
    assert forbidden not in module, f'forbidden structured/raw field in module: {forbidden}'

# v55 self-revision: parent relation is not evidence of old age.
assert 'mamma|pappa|mor|far' not in older, 'older detector must not infer old age from family relation'
assert 'Min mamma är 48' in older_test and "false, 'parent relation must not be converted into old age'" in older_test

assert build.count('DISABILITY_HOME_SUPPORT_PATH') >= 3, 'module must be wired into shared shell/person build'
assert 'client/disability-home-support-guidance.js' in build

print('disability home support v55: OK')
