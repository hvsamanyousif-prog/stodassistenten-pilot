#!/usr/bin/env python3
"""Regression gate for v17 self-audit findings.

Locks two improvements into the same Stödassistenten system:
1) natural extra-support family language gets a coarse focus handoff into the
   existing guarded person/family flow, never a parallel app or raw-story URL;
2) the part-time sickness-benefit + VAB hour-overlap discovery signal remains
   mapped to a permanent synthetic regression and canonical learning gates.
"""
from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
privacy = (ROOT / 'client' / 'privacy-routing.js').read_text(encoding='utf-8')
family = (ROOT / 'client' / 'family-age-routing.js').read_text(encoding='utf-8')
builder = (ROOT / 'scripts' / 'build_public_pilot.py').read_text(encoding='utf-8')
scenario = json.loads((ROOT / 'data' / 'evals' / 'scenario_lab_websignals_v16.json').read_text(encoding='utf-8'))
signal_pack = json.loads((ROOT / 'data' / 'evals' / 'demand_friction_signals_v06.json').read_text(encoding='utf-8'))
regression_map = json.loads((ROOT / 'data' / 'evals' / 'demand_friction_regression_map_v01.json').read_text(encoding='utf-8'))

for path in [ROOT / 'client' / 'privacy-routing.js', ROOT / 'client' / 'family-age-routing.js']:
    check = subprocess.run(['node', '--check', str(path)], capture_output=True, text=True, check=False)
    assert check.returncode == 0, f'{path.name}: JavaScript syntax failed: {(check.stderr or check.stdout).strip()}'

# Root route is need-led and coarse. Bare child-language and VAB should not be
# enough to send ordinary acute-child-care stories into the extra-support flow.
assert 'KEYWORDS.family' in privacy
for phrase in ['barn behöver extra stöd', 'extra tillsyn', 'extra omvårdnad', 'stöd i skolan']:
    assert phrase in privacy, f'missing need-led family signal: {phrase}'
assert "focus=family" in privacy
assert "actor_type=relative&focus=family" in privacy
assert "if(focus==='family') return 'family'" in privacy
family_keyword_block = privacy.split('KEYWORDS.family=[', 1)[1].split('];', 1)[0].lower()
assert "'barn'" not in family_keyword_block, 'bare barn must not be a family-focus trigger'
assert 'vab' not in family_keyword_block, 'ordinary VAB must not be routed into extra-support family flow'
assert 'searchParams.set(\'q\'' not in privacy, 'raw scenario text must not be written into URL by governed routing'

# The handoff must reuse the already-guarded person family flow.
assert "params.get('focus')" in family
assert "focus === 'family'" in family
assert "start('family')" in family
assert "val !== 'yes'" in family and "go('general1')" in family
assert 'FAMILY_AGE_ROUTING_PATH = "client/family-age-routing.js"' in builder
assert 'SHELL_ROUTING_PATH = "client/privacy-routing.js"' in builder

cases = {case['case_id']: case for case in scenario.get('cases', [])}
case = cases['lab-employee-partialsick-vab-v16-01']
assert 'exact_hour_overlap' in case['expected_support_areas']
assert 'partial_sick_leave_percentage_automatically_equals_available_vab_percentage' in case['must_not_claim']
assert 'vab_is_payable_for_hours_when_parent_is_self_sick_and_reported_sick' in case['must_not_claim']
assert 'two_benefits_can_be_paid_for_the_same_hours_without_coordination' in case['must_not_claim']
assert 'q_which_exact_hours_are_covered_by_sick_leave_or_sickness_benefit' in case['expected_questions']
assert 'map_exact_sick_leave_work_and_requested_vab_hours_before_applying' in case['expected_next_actions']

signals = {item['signal_id']: item for item in signal_pack.get('signals', [])}
signal = signals['df-partialsick-vab-hours-overlap-v01']
assert signal['priority_band'] == 'HIGH'
assert signal['friction_signal']['score'] >= 4
assert signal['miss_consequence']['score'] >= 4
assert signal['current_product_coverage_gap']['score'] >= 4
assert len(signal['natural_language_queries']) >= 2
assert signal['primary_sources']

mappings = {item['signal_id']: item for item in regression_map.get('mappings', [])}
assert 'df-partialsick-vab-hours-overlap-v01' in mappings
assert 'lab-employee-partialsick-vab-v16-01' in mappings['df-partialsick-vab-hours-overlap-v01']['regression_case_ids']

# Re-run the canonical gates: v16 must not become a side-car eval system.
subprocess.run([sys.executable, 'scripts/validate_scenario_lab_all.py'], cwd=ROOT, check=True)
subprocess.run([sys.executable, 'scripts/validate_demand_friction_learning_loop.py'], cwd=ROOT, check=True)
subprocess.run([sys.executable, 'scripts/build_public_pilot.py', '--source', '.', '--output', '_site_v17'], cwd=ROOT, check=True)

print('v17 family/VAB learning regression: OK')
