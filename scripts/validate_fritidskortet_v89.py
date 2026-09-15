#!/usr/bin/env python3
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / 'data' / 'evals'
TRUTH = EVAL / 'fritidskortet_truth_guard_v89.json'
SCENARIOS = EVAL / 'scenario_lab_websignals_v89.json'
SIGNALS = EVAL / 'demand_friction_signals_v89.json'
MAPPING = EVAL / 'demand_friction_regression_map_v89.json'
SID = 'df-fritidskortet-2026-change-action-friction-v01'
PARENT_URL = 'https://www.fritidskortet.se/foralder'
REGISTER_URL = 'https://www.fritidskortet.se/sok'
EXPECTED = {
    'lab-fritidskort-cost-friction-v89-01',
    'lab-fritidskort-age6-august-change-v89-02',
    'lab-fritidskort-higher-amount-boundary-v89-03',
    'lab-fritidskort-no-eid-v89-04',
    'lab-fritidskort-provider-not-registered-v89-05',
    'lab-fritidskort-association-false-positive-v89-06',
    'lab-fritidskort-language-ar-v89-07',
    'lab-fritidskort-language-fa-v89-08',
}

def load(path):
    return json.loads(path.read_text(encoding='utf-8'))

def require(value, message):
    if not value:
        raise AssertionError(message)

def validate_truth_guard(truth):
    require(truth.get('programme') == 'Fritidskortet', 'programme drifted')
    require(truth.get('responsible_authority') == 'E-hälsomyndigheten', 'authority drifted')
    require(truth.get('truth_status') == 'NEEDS_REVIEW', 'AI must not self-promote Fritidskortet to VERIFIED')
    require(truth.get('human_review_required') is True, 'human review must remain required')
    require(truth.get('material_fields_verified') == [], 'material fields must stay unverified')
    text = json.dumps(truth, ensure_ascii=False).lower()
    for token in ['10 august 2026', 'turn 6', 'turn 16', '550', '2,500', 'bostadsbidrag', 'bostadstillägg', '30 november']:
        require(token in text, f'missing current 2026 boundary: {token}')
    require(PARENT_URL in truth.get('current_primary_sources', []), 'parent primary source missing')
    require(REGISTER_URL in truth.get('current_primary_sources', []), 'provider register source missing')
    require('paper-form route' in truth.get('guarded_current_facts', {}).get('non_eid_path', '').lower(), 'non-eID path must not dead-end')
    require('data/source_registry.json' in truth.get('promotion_gate', ''), 'canonical source-registry promotion gate missing')

truth = load(TRUTH)
scenarios = load(SCENARIOS)
signals = load(SIGNALS)
mapping = load(MAPPING)
validate_truth_guard(truth)

cases = scenarios.get('cases', [])
by_id = {case.get('case_id'): case for case in cases}
require(len(cases) == 8 and set(by_id) == EXPECTED, 'v89 must contain exactly eight deduplicated cases')
require('minimum_age_is_still_7_in_september_2026' in by_id['lab-fritidskort-age6-august-change-v89-02'].get('must_not_claim', []), 'stale age falsification missing')
require('activity_compensation_alone_means_2500' in by_id['lab-fritidskort-higher-amount-boundary-v89-03'].get('must_not_claim', []), 'higher amount inference guard missing')
require('surface_current_form_path' in by_id['lab-fritidskort-no-eid-v89-04'].get('expected_next_actions', []), 'non-eID next action missing')
require('search_official_provider_register' in by_id['lab-fritidskort-provider-not-registered-v89-05'].get('expected_next_actions', []), 'provider register action missing')
require('do_not_open_personal_parent_eligibility_flow' in by_id['lab-fritidskort-association-false-positive-v89-06'].get('expected_next_actions', []), 'association boundary missing')
require(by_id['lab-fritidskort-language-ar-v89-07'].get('language') == 'ar', 'Arabic parity missing')
require(by_id['lab-fritidskort-language-fa-v89-08'].get('language') == 'fa', 'Persian parity missing')
require(all(case.get('source_requirements') for case in cases), 'every scenario must require current source evidence')

require(len(signals.get('signals', [])) == 1, 'v89 must add one coherent signal')
signal = signals['signals'][0]
require(signal.get('signal_id') == SID and signal.get('priority_band') == 'HIGH', 'signal id/priority drifted')
require(PARENT_URL in signal.get('primary_sources', []), 'parent source missing')
require(REGISTER_URL in signal.get('primary_sources', []), 'register source missing')
require(set(signal.get('regression_case', [])) == EXPECTED, 'signal must map every regression')
require('not measured search volumes' in signals.get('purpose', '').lower(), 'qualitative demand disclaimer missing')
require('verify' in signal.get('truth_rule', '').lower() and 'do not promote' in signal.get('truth_rule', '').lower(), 'truth rule must be explicit')

require(len(mapping.get('mappings', [])) == 1, 'v89 mapping must stay single-signal')
entry = mapping['mappings'][0]
require(entry.get('signal_id') == SID, 'mapping signal drifted')
require(set(entry.get('regression_case_ids', [])) == EXPECTED, 'mapping must cover all cases')
require(entry.get('coverage_status') == 'TRUTH_AND_REGRESSION_GUARDED_V89_PUBLIC_ROUTE_PENDING', 'coverage status drifted')

# Red team: reject stale age and autonomous truth promotion.
promoted = copy.deepcopy(truth)
promoted['truth_status'] = 'VERIFIED'
try:
    validate_truth_guard(promoted)
except AssertionError:
    pass
else:
    raise AssertionError('red-team mutation: self-promoted truth guard was accepted')

stale = copy.deepcopy(truth)
stale['guarded_current_facts']['age_boundary'] = 'Children from the calendar year they turn 7 through 16.'
try:
    validate_truth_guard(stale)
except AssertionError:
    pass
else:
    raise AssertionError('red-team mutation: stale 7-year boundary was accepted')

# Fail closed: v89 intentionally does not create a normalized support record until
# source_registry + schema + human review gates can be satisfied together.
forbidden = [
    ROOT / 'fritidskort-app.html',
    ROOT / 'client' / 'fritidskort-engine.js',
    ROOT / 'data' / 'fritidskort_truth_store.json',
    ROOT / 'data' / 'supports' / 'se-fritidskortet-child-activities.json',
]
require(not any(path.exists() for path in forbidden), 'parallel or prematurely promoted Fritidskortet artifact detected')

print('v89 Fritidskortet truth-guard + demand/friction + scenario guard: OK')
print(f'signal={SID} cases={len(cases)} truth=NEEDS_REVIEW canonical_support=PENDING public_route=PENDING')
