#!/usr/bin/env python3
import json
from pathlib import Path

SCENARIO = Path('data/evals/scenario_lab_websignals_v53.json')
SIGNAL = Path('data/evals/demand_friction_signals_v35.json')
MAPPING = Path('data/evals/demand_friction_regression_map_v29.json')
MODULE = Path('client/older-home-support-guidance.js')
BUILD = Path('scripts/build_public_pilot.py')

for path in [SCENARIO, SIGNAL, MAPPING, MODULE, BUILD]:
    assert path.is_file(), f'missing {path}'

scenario = json.loads(SCENARIO.read_text(encoding='utf-8'))
signal = json.loads(SIGNAL.read_text(encoding='utf-8'))
mapping = json.loads(MAPPING.read_text(encoding='utf-8'))
module = MODULE.read_text(encoding='utf-8')
build = BUILD.read_text(encoding='utf-8')

case_ids = {case['case_id'] for case in scenario['cases']}
required_cases = {
    'lab-older-home-support-daily-living-v53-01',
    'lab-older-home-support-vs-home-healthcare-v53-02',
    'lab-relative-older-needs-support-not-caregiver-benefit-v53-03',
    'lab-older-local-process-no-universal-bistandsprovning-v53-04',
}
assert required_cases <= case_ids, 'v53 cases missing'

sig = signal['signals'][0]
assert sig['signal_id'] == 'df-older-home-support-care-vs-healthcare-v01'
assert sig['priority_band'] == 'HIGH'
for field in ['demand_signal', 'friction_signal', 'miss_consequence', 'source_fragmentation', 'language_accessibility_friction', 'steps_to_action', 'recurrence_signal', 'current_product_coverage_gap']:
    assert 1 <= sig[field]['score'] <= 5, f'invalid score {field}'
assert set(sig['regression_case']) == required_cases
assert 'not measured search volumes' in signal['purpose']
assert 'VERIFY' in sig['truth_rule']
assert 'product_miss' in sig and sig['product_miss'].strip()

mapped = mapping['mappings'][0]
assert mapped['signal_id'] == sig['signal_id']
assert set(mapped['regression_case_ids']) == required_cases
assert mapped['coverage_status'] == 'GUARDED_PUBLIC_ROUTE_READY'
assert 'raw situation text' in mapped['privacy_guardrail']
assert 'individual needs assessment' in mapped['truth_guardrail']

for token in [
    'older_home_support', 'social_care', 'healthcare', 'both',
    'https://www.socialstyrelsen.se/stod-i-livet/aldre/',
    'https://www.1177.se/sa-fungerar-varden/olika-vardformer/aldreomsorg/',
    'socialtjanstlag-2025400_sfs-2025-400',
    "flow:'older_home_support'", "app_version:'0.5.3'",
    "focus: 'older_home_support'", "support_need",
]:
    assert token in module, f'module missing {token}'

for forbidden in ['personnummer:', 'diagnosis:', 'municipality:', 'raw_story:', 'address:']:
    assert forbidden not in module, f'forbidden structured field in module: {forbidden}'

assert build.count('OLDER_HOME_SUPPORT_PATH') >= 3, 'module must be wired into shell and person build'
assert 'client/older-home-support-guidance.js' in build

print('older home support v53: OK')
