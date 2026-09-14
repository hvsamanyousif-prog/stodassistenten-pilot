#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / 'data' / 'evals'
MODULE = ROOT / 'client' / 'school-support-guidance.js'
TEST = ROOT / 'client' / 'school-support-guidance.test.cjs'
SUPPORT = ROOT / 'data' / 'supports' / 'se-skolverket-extra-anpassningar-sarskilt-stod.json'
BUILD = ROOT / 'scripts' / 'build_public_pilot.py'
COVERAGE = ROOT / 'docs' / 'PILOT_COVERAGE_MATRIX.md'
BASE = EVAL / 'scenario_lab_v01.json'
V41 = EVAL / 'scenario_lab_websignals_v41.json'
SIGNALS = EVAL / 'demand_friction_signals_v26.json'
MAP = EVAL / 'demand_friction_regression_map_v20.json'

for path in [MODULE, TEST, SUPPORT, BUILD, BASE, V41, SIGNALS, MAP]:
    assert path.exists(), f'missing v41 asset: {path.relative_to(ROOT)}'

syntax = subprocess.run(['node', '--check', str(MODULE)], capture_output=True, text=True, check=False)
assert syntax.returncode == 0, syntax.stderr or syntax.stdout
runtime = subprocess.run(['node', str(TEST)], capture_output=True, text=True, check=False)
assert runtime.returncode == 0, runtime.stderr or runtime.stdout
assert 'school support guidance runtime: OK' in runtime.stdout

module = MODULE.read_text(encoding='utf-8')
assert 'KEYWORDS.school_support' in module
assert "focus=${FOCUS}" in module
assert "key === 'child'" in module and "val === 'yes'" in module
assert "key === 'extra'" in module and "val === 'school'" in module
assert "key === 'schoolState'" in module
assert 'diagnos aldrig får vara ett villkor' in module
assert 'overklagandenamnden.se' in module
assert 'skolverket.se' in module
assert "fetch(" not in module
assert 'localStorage' not in module and 'sessionStorage' not in module
assert "searchParams.set('q'" not in module
assert 'sv:' in module and 'ar:' in module and 'fa:' in module

build = BUILD.read_text(encoding='utf-8')
assert 'SCHOOL_SUPPORT_PATH = "client/school-support-guidance.js"' in build
assert 'SCHOOL_SUPPORT_PATH,' in build.split('SHELL_RUNTIME_PATHS = (', 1)[1].split(')', 1)[0]
assert 'SCHOOL_SUPPORT_PATH,' in build.split('SCRIPT_PATHS = (', 1)[1].split(')', 1)[0]

base = json.loads(BASE.read_text(encoding='utf-8'))
base_cases = {c['case_id']: c for c in base['cases']}
assert 'lab-child-01' in base_cases and 'lab-child-02' in base_cases
assert 'diagnosis_required_for_school_support' in base_cases['lab-child-01']['must_not_claim']
assert 'diagnosis_required_for_school_support' in base_cases['lab-child-02']['must_not_claim']

v41 = json.loads(V41.read_text(encoding='utf-8'))
cases = {c['case_id']: c for c in v41['cases']}
expected_ids = {
    'lab-child-school-support-no-diagnosis-v41-01',
    'lab-child-school-support-formal-decision-v41-02',
}
assert set(cases) == expected_ids
case1 = cases['lab-child-school-support-no-diagnosis-v41-01']
assert 'a_medical_or_neurodevelopmental_diagnosis_is_required_before_school_support_can_start' in case1['must_not_claim']
assert 'q_what_has_school_done_so_far' in case1['expected_questions']
assert len(case1['expected_questions']) == 2, 'v41 must not add low-information questions'
assert case1['source_requirements'] == ['Skolverket']
case2 = cases['lab-child-school-support-formal-decision-v41-02']
assert 'an_appeal_will_be_successful' in case2['must_not_claim']
assert 'Skolväsendets överklagandenämnd' in case2['source_requirements']

support = json.loads(SUPPORT.read_text(encoding='utf-8'))
assert support['support_id'] == 'se-skolverket-extra-anpassningar-sarskilt-stod'
assert support['verification']['status'] == 'NEEDS_REVIEW'
assert support['verification']['human_review_required'] is True
assert support['verification']['material_fields_verified'] == []
rules = {r['rule_id']: r for r in support['eligibility']['conditions']}
for rid in [
    'school_support.diagnosis_not_required',
    'school_support.extra_adjustments',
    'school_support.special_support_investigation',
    'school_support.action_program_appeal',
]:
    assert rid in rules
assert all(r['source_url'].startswith('https://www.skolverket.se/') or r['source_url'].startswith('https://www.overklagandenamnden.se/') for r in rules.values())
assert len(support['eligibility']['missing_information_questions']) == 1
assert support['eligibility']['missing_information_questions'][0]['question_id'] == 'school_support.current_school_response'

signals = json.loads(SIGNALS.read_text(encoding='utf-8'))
assert len(signals['signals']) == 1
signal = signals['signals'][0]
assert signal['signal_id'] == 'df-child-school-support-diagnosis-friction-v01'
assert signal['priority_band'] == 'HIGH'
assert 'not measured search volumes' in signals['scoring']['priority_rule']
assert signal['current_product_coverage_gap']['score'] == 5
assert 'discovery' in signal['truth_rule'].lower() and 'verify' in signal['truth_rule'].lower()
assert all('skolverket.se' in url or 'overklagandenamnden.se' in url for url in signal['primary_sources'])
assert any('npfguiden.se' in url for url in signal['discovery_sources'])

mapping = json.loads(MAP.read_text(encoding='utf-8'))['mappings'][0]
assert mapping['signal_id'] == signal['signal_id']
assert mapping['regression_case_ids'] == [
    'lab-child-school-support-no-diagnosis-v41-01',
    'lab-child-school-support-formal-decision-v41-02',
]
assert 'one high-information school-state question' in mapping['fix_or_guardrail']
assert 'Do not promote' in mapping['truth_guardrail']

if COVERAGE.exists():
    coverage = COVERAGE.read_text(encoding='utf-8')
    assert 'v41' in coverage and 'school' in coverage.lower(), 'coverage matrix must record the v41 public school-support path'

print('school support v41 validation: OK')
