#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / 'data' / 'evals'
MODULE = ROOT / 'client' / 'property-charging-guidance.js'
TEST = ROOT / 'client' / 'property-charging-guidance.test.cjs'
SUPPORT = ROOT / 'data' / 'supports' / 'se-naturvardsverket-ladda-bilen-forening-boende.json'
REGISTRY = ROOT / 'data' / 'source_registry.json'
BUILD = ROOT / 'scripts' / 'build_public_pilot.py'
V42 = EVAL / 'scenario_lab_websignals_v42.json'
SIGNALS = EVAL / 'demand_friction_signals_v27.json'
MAP = EVAL / 'demand_friction_regression_map_v21.json'

for path in [MODULE, TEST, SUPPORT, REGISTRY, BUILD, V42, SIGNALS, MAP]:
    assert path.exists(), f'missing v42 asset: {path.relative_to(ROOT)}'

syntax = subprocess.run(['node', '--check', str(MODULE)], capture_output=True, text=True, check=False)
assert syntax.returncode == 0, syntax.stderr or syntax.stdout
runtime = subprocess.run(['node', str(TEST)], capture_output=True, text=True, check=False)
assert runtime.returncode == 0, runtime.stderr or runtime.stdout
assert 'property charging guidance runtime: OK' in runtime.stdout

module = MODULE.read_text(encoding='utf-8')
for required in [
    "const FOCUS = 'property_charging'",
    'KEYWORDS.property_charging',
    'charging_context',
    'association_project',
    'company_project',
    'resident_request',
    'foreningar-och-boendeorganisationer',
    'fastighetsbolag-och-foretag',
    'data.riksdagen.se/dokument/sfs-1991-614.html',
]:
    assert required in module, f'missing v42 runtime contract: {required}'
assert 'property-charging-pilot.html' not in module, 'v42 must not create a parallel app'
assert 'fetch(' not in module, 'public module must not create a competing client-side truth fetcher'
assert 'localStorage' not in module and 'sessionStorage' not in module
for forbidden in ['organisation_number=', 'org_number=', 'address=', 'parking_id=', 'exact_cost=', 'vehicle_registration=', 'raw_story=']:
    assert forbidden not in module, f'forbidden public handoff field: {forbidden}'
assert 'sv:' in module and 'ar:' in module and 'fa:' in module

build = BUILD.read_text(encoding='utf-8')
assert 'PROPERTY_CHARGING_PATH = "client/property-charging-guidance.js"' in build
assert 'PROPERTY_CHARGING_PATH,' in build.split('SHELL_RUNTIME_PATHS = (', 1)[1].split(')', 1)[0]
assert 'PROPERTY_CHARGING_PATH,' in build.split('SCRIPT_PATHS = (', 1)[1].split(')', 1)[0]

v42 = json.loads(V42.read_text(encoding='utf-8'))
cases = {case['case_id']: case for case in v42['cases']}
expected_ids = {
    'lab-brf-ladda-bilen-residents-v42-01',
    'lab-property-company-ladda-bilen-start-v42-02',
    'lab-resident-own-parking-charging-right-v42-03',
}
assert set(cases) == expected_ids
assert 'q_who_will_primarily_use_association_charging' in cases['lab-brf-ladda-bilen-residents-v42-01']['expected_questions']
assert 'company_pre_start_rule_always_applies_to_resident_member_charging' in cases['lab-brf-ladda-bilen-residents-v42-01']['must_not_claim']
assert 'q_has_installation_work_started' in cases['lab-property-company-ladda-bilen-start-v42-02']['expected_questions']
assert 'support_can_be_granted_through_the_company_path_after_installation_work_has_started' in cases['lab-property-company-ladda-bilen-start-v42-02']['must_not_claim']
resident = cases['lab-resident-own-parking-charging-right-v42-03']
assert resident['expected_questions'] == ['q_is_the_requested_charging_point_for_the_residents_own_parking_space_at_or_near_the_home']
assert 'the_resident_personally_receives_the_association_ladda_bilen_grant' in resident['must_not_claim']
assert resident['source_requirements'] == ['Sveriges riksdag']

support = json.loads(SUPPORT.read_text(encoding='utf-8'))
assert support['support_id'] == 'se-naturvardsverket-ladda-bilen-forening-boende'
assert support['verification']['status'] == 'NEEDS_REVIEW'
assert support['verification']['human_review_required'] is True
assert support['verification']['material_fields_verified'] == []
assert support['source']['source_id'] == 'se-naturvardsverket-ladda-bilen-association'
rules = {r['rule_id']: r for r in support['eligibility']['conditions']}
for rid in [
    'ladda_bilen.association_applicant',
    'ladda_bilen.resident_member_level',
    'ladda_bilen.external_user_pre_start',
    'ladda_bilen.guests_de_minimis',
]:
    assert rid in rules
assert all(r['source_url'].startswith('https://www.naturvardsverket.se/') for r in rules.values())
assert len(support['eligibility']['missing_information_questions']) == 2
assert support['benefit']['kind'] == 'reimbursement'
assert support['benefit']['recurrence'] == 'one_off'

registry = json.loads(REGISTRY.read_text(encoding='utf-8'))
source_ids = {source['source_id'] for source in registry['sources']}
assert 'se-naturvardsverket-ladda-bilen-association' in source_ids
assert 'se-riksdagen-resident-charging-right' in source_ids

signals = json.loads(SIGNALS.read_text(encoding='utf-8'))
assert len(signals['signals']) == 1
signal = signals['signals'][0]
assert signal['signal_id'] == 'df-property-charging-brf-rights-v01'
assert signal['priority_band'] == 'HIGH'
assert signal['current_product_coverage_gap']['score'] == 5
assert 'not truth' in signal['truth_rule'].lower()
assert all('naturvardsverket.se' in url or 'riksdagen.se' in url for url in signal['primary_sources'])

mapping = json.loads(MAP.read_text(encoding='utf-8'))['mappings'][0]
assert mapping['signal_id'] == signal['signal_id']
assert set(mapping['regression_case_ids']) == expected_ids
assert 'No property charging app or duplicate matcher' in mapping['fix_or_guardrail']
assert 'NEEDS_REVIEW' in mapping['truth_guardrail']
assert 'raw story' in mapping['privacy_guardrail']

print('property charging v42 validation: OK')
