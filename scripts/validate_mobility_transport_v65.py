#!/usr/bin/env python3
"""Fail-closed v65 guard for mobility transport routing in the shared public product."""
from __future__ import annotations
import json
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
MODULE=ROOT/'client'/'mobility-transport-guidance.js'
TEST=ROOT/'client'/'mobility-transport-guidance.test.cjs'
SCENARIOS=ROOT/'data'/'evals'/'scenario_lab_websignals_v65.json'
SIGNALS=ROOT/'data'/'evals'/'demand_friction_signals_v65.json'
MAP=ROOT/'data'/'evals'/'demand_friction_regression_map_v65.json'
BUILD=ROOT/'scripts'/'build_public_pilot.py'
COVERAGE=ROOT/'docs'/'PILOT_COVERAGE_MATRIX_V65_APPENDIX.md'
for path in [MODULE,TEST,SCENARIOS,SIGNALS,MAP,BUILD,COVERAGE]: assert path.is_file(),f'missing v65 artifact: {path.relative_to(ROOT)}'

module=MODULE.read_text(encoding='utf-8')
for token in ["focus:'mobility_transport'","trip_purpose","healthcare","daily","long_private","GUIDE_1177_URL","FARDTJanst_LAW_URL","RIKSFARDTJanst_LAW_URL","SICK_TRAVEL_LAW_URL"]: assert token in module,f'v65 runtime missing token: {token}'
for forbidden in ['personnummer=','diagnosis=','address=','destination=','appointment=','travel_date=','permit_number=','raw_story=']: assert forbidden not in module.lower(),f'v65 forbidden public handoff field: {forbidden}'

pack=json.loads(SCENARIOS.read_text(encoding='utf-8'))
required={f'lab-mobility-{x}' for x in []}
required={
'lab-mobility-healthcare-trip-v65-01','lab-mobility-daily-fardtjanst-v65-02','lab-mobility-riksfardtjanst-long-private-v65-03','lab-mobility-mixed-purpose-v65-04','lab-mobility-work-context-false-positive-v65-05','lab-mobility-language-ar-v65-06','lab-mobility-language-fa-v65-07'}
ids={c['case_id'] for c in pack['cases']};assert required<=ids,f'v65 scenarios missing {sorted(required-ids)}'
by={c['case_id']:c for c in pack['cases']}
assert 'fardtjanst_is_automatically_the_right_healthcare_transport' in by['lab-mobility-healthcare-trip-v65-01']['must_not_claim']
assert 'ordinary_fardtjanst_permit_is_always_required_for_riksfardtjanst' in by['lab-mobility-riksfardtjanst-long-private-v65-03']['must_not_claim']
assert 'employee_personally_needs_fardtjanst' in by['lab-mobility-work-context-false-positive-v65-05']['must_not_claim']

sigpack=json.loads(SIGNALS.read_text(encoding='utf-8'));assert len(sigpack['signals'])==1
sig=sigpack['signals'][0];assert sig['signal_id']=='df-mobility-sicktravel-fardtjanst-riks-v01';assert sig['priority_band']=='HIGH';assert sig['current_product_coverage_gap']['score']>=4;assert 'not measured search volumes' in sigpack['purpose'].lower();assert sig['product_miss'].strip();assert 'verify' in sig['truth_rule'].lower()
mp=json.loads(MAP.read_text(encoding='utf-8'))['mappings'][0];assert mp['signal_id']==sig['signal_id'];assert set(mp['regression_case_ids'])==required;assert 'focus=mobility_transport' in mp['fix_or_guardrail']

build=BUILD.read_text(encoding='utf-8');assert 'MOBILITY_TRANSPORT_PATH = "client/mobility-transport-guidance.js"' in build;assert build.count('MOBILITY_TRANSPORT_PATH,')>=2
coverage=COVERAGE.read_text(encoding='utf-8');
for token in ['append-only','focus=mobility_transport','trip_purpose=healthcare|daily|long_private|multiple','sjukresa','färdtjänst','riksfärdtjänst']: assert token in coverage

subprocess.run(['node',str(TEST)],cwd=ROOT,check=True)
subprocess.run([sys.executable,str(ROOT/'scripts'/'validate_scenario_lab_all.py')],cwd=ROOT,check=True)
subprocess.run([sys.executable,str(ROOT/'scripts'/'validate_demand_friction_learning_loop.py')],cwd=ROOT,check=True)
print('mobility transport v65: OK')
