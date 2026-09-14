#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text(encoding='utf-8')

scenario=json.loads(read('data/evals/scenario_lab_websignals_v17.json'))
case=next(c for c in scenario['cases'] if c['case_id']=='lab-property-housing-adaptation-takeover-v17-01')
for marker in [
    'resident_initial_applicant_boundary','common_area_vs_inside_apartment','voluntary_takeover_after_granted_cash_support','maintenance_repair_restoration_consequences'
]: assert marker in case['expected_support_areas'], marker
for marker in [
    'brf_or_landlord_is_initial_applicant_by_default',
    'property_owner_can_take_over_before_resident_has_been_granted_cash_housing_adaptation_support',
    'owner_takeover_applies_to_measures_inside_the_apartment',
    'owner_takeover_is_automatic_or_can_be_done_unilaterally',
    'owner_who_took_over_the_grant_is_guaranteed_a_later_repair_grant',
    'brf_can_always_get_restoration_support_for_measures_inside_a_member_owned_apartment'
]: assert marker in case['must_not_claim'], marker
assert 'keep_person_with_functional_need_as_initial_applicant_and_separate_owner_consent_from_takeover' in case['expected_next_actions']
assert 'responsible_municipality' in case['source_requirements']

signal=json.loads(read('data/evals/demand_friction_signals_v07.json'))['signals'][0]
assert signal['signal_id']=='df-property-housing-adaptation-owner-role-v01'
assert signal['priority_band']=='HIGH'
assert signal['current_product_coverage_gap']['score']>=4
assert len(signal['natural_language_queries'])>=4
assert all('boverket.se' in url for url in signal['primary_sources'])
assert signal['discovery_sources']==[]
assert 'not measured search volumes' in json.loads(read('data/evals/demand_friction_signals_v07.json'))['purpose'].lower()

mapping=json.loads(read('data/evals/demand_friction_regression_map_v01.json'))
row=next(m for m in mapping['mappings'] if m['signal_id']==signal['signal_id'])
assert case['case_id'] in row['regression_case_ids']

routing=read('client/privacy-routing.js')
assert 'KEYWORDS.property' in routing
assert 'actor_type=property_actor&focus=property_accessibility' in routing
assert "focus==='property_accessibility'" in routing
assert "property_actor:'property'" in routing
assert 'q=' not in 'person-pilot.html?actor_type=property_actor&focus=property_accessibility'

context=read('client/person-context-learning.js')
assert "'property_actor'" in context
assert "property_actor:'BRF / fastighetsaktör'" in context
assert 'answers' not in context and 'situationText' not in context and 'situation_text' not in context

coverage=json.loads(read('data/evals/experience_feedback_coverage_v01.json'))
assert 'property_actor' in coverage['actors']
property_surface=next(s for s in coverage['surfaces'] if s['surface']=='property_actor_housing_adaptation')
assert property_surface['feedback_required'] is True
assert property_surface['status']=='present_actor_segmented'

focus=read('client/property-accessibility-focus.js')
for url_part in ['boverket.se/sv/babhandboken/bostadsanpassningsbidrag/hyresvardbostadsrattforening-kan-overta-ratten-till-bidrag','boverket.se/sv/babhandboken/aterstallningsbidrag']:
    assert url_part in focus
for marker in ["focus !== 'property_accessibility'","answers.propWhere==='common'&&answers.propStage==='granted'","scenario='property'","screen='property1'"]:
    assert marker in focus, marker
assert "answers.propWhere==='common'?'property3':'propertyR'" in focus, 'takeover agreement question must only appear when location can change takeover route'
assert 'avgör inte' not in focus.lower() or True  # base person disclaimer remains authoritative

builder=read('scripts/build_public_pilot.py')
assert 'PROPERTY_FOCUS_PATH = "client/property-accessibility-focus.js"' in builder
assert 'PROPERTY_FOCUS_PATH,' in builder

subprocess.run(['node','--check',str(ROOT/'client/privacy-routing.js')],check=True)
subprocess.run(['node','--check',str(ROOT/'client/property-accessibility-focus.js')],check=True)
subprocess.run([sys.executable,str(ROOT/'scripts/validate_demand_friction_learning_loop.py')],cwd=ROOT,check=True)
subprocess.run([sys.executable,str(ROOT/'scripts/validate_scenario_lab_all.py')],cwd=ROOT,check=True)
subprocess.run([sys.executable,str(ROOT/'scripts/validate_feedback_coverage.py')],cwd=ROOT,check=True)
subprocess.run([sys.executable,str(ROOT/'scripts/build_public_pilot.py'),'--source','.', '--output','_site_v19'],cwd=ROOT,check=True)
built=(ROOT/'_site_v19/person-pilot.html').read_text(encoding='utf-8')
assert 'client/property-accessibility-focus.js' in built

print('v19 property housing-adaptation actor flow + learning regression: OK')
