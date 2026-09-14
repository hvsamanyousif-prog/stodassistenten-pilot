#!/usr/bin/env python3
"""Release gate for the public VAB guidance path.

This does not implement entitlement logic. It locks a privacy-preserving coarse
handoff from the shared shell into the existing person pilot, asks only facts
that can change the next step, preserves the v16 exact-hour regression, and
keeps the 12–15 truth record review-gated.
"""
from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
privacy = (ROOT / 'client' / 'privacy-routing.js').read_text(encoding='utf-8')
vab = (ROOT / 'client' / 'vab-focus.js').read_text(encoding='utf-8')
builder = (ROOT / 'scripts' / 'build_public_pilot.py').read_text(encoding='utf-8')
record = json.loads((ROOT / 'data' / 'supports' / 'se-forsakringskassan-vab-12-15.json').read_text(encoding='utf-8'))
v16 = json.loads((ROOT / 'data' / 'evals' / 'scenario_lab_websignals_v16.json').read_text(encoding='utf-8'))

for path in [ROOT / 'client' / 'privacy-routing.js', ROOT / 'client' / 'vab-focus.js']:
    check = subprocess.run(['node', '--check', str(path)], capture_output=True, text=True, check=False)
    assert check.returncode == 0, f'{path.name}: JavaScript syntax failed: {(check.stderr or check.stdout).strip()}'

# One shared shell, coarse routing only. Acute VAB must not leak raw story text
# or be confused with the extra-support family route.
assert 'KEYWORDS.vab' in privacy
for phrase in ['jag behöver vabba', 'mitt barn är sjukt', 'sjukt barn och sjukskriven']:
    assert phrase in privacy, f'missing acute VAB situation phrase: {phrase}'
assert "actor_type=relative&focus=vab" in privacy
assert "if(focus==='vab') return 'vab'" in privacy
assert "searchParams.set('q'" not in privacy, 'raw situation text must not be written into URLs'
family_keyword_block = privacy.split('KEYWORDS.family=[', 1)[1].split('];', 1)[0].lower()
assert 'vab' not in family_keyword_block, 'acute VAB must not be routed into extra-support family flow'

# The focus runtime is bounded, local-only and asks information-gain questions.
assert "focus !== 'vab'" in vab
assert "scenario = 'vab'" in vab and "screen = 'vab1'" in vab
assert "vabAge: 'Hur gammalt är barnet?'" in vab
assert 'Är du själv sjuk eller sjukskriven någon del av dagen du vill vabba?' in vab
assert 'Har du koll på de exakta timmarna du annars skulle ha arbetat' in vab
assert "if (status === 'part') return 'vab3'" in vab, 'exact-hour question must be conditional on partial sickness'
assert "answers.vabAge === 'age12_15' ? 'vab4' : 'vabR'" in vab, '12–15 path must ask the review-relevant prior-decision question'
assert 'förhandsbeslut' in vab.lower()
assert 'En dagsprocent ensam ska inte användas som säkert besked' in vab
assert 'Piloten lovar inte rätt till ersättning.' in vab
assert 'resultCard(r,i+2)' in vab, 'VAB cards must remain check/review-oriented rather than strong-match claims'
assert 'fetch(' not in vab and 'XMLHttpRequest' not in vab
assert 'localStorage' not in vab and 'sessionStorage' not in vab
assert 'searchParams.set' not in vab, 'focus runtime must not put answers into URLs'
assert '30 dagar' not in vab and '90 dagar' not in vab, 'review-gated deadline facts must not be surfaced by this runtime'

# Primary authority links are explicit; discovery/community text cannot become truth.
assert 'forsakringskassan.se/privatperson/familj-och-barn/vab-for-barn-under-12-ar' in vab
assert 'forsakringskassan.se/privatperson/familj-och-barn/vab-for-barn-som-ar-12-ar-eller-aldre' in vab
assert 'forsakringskassan.se/nyhetsarkiv/nyheter-press/2026-03-02-extra-kontroller-av-vab-under-varen' in vab

# sv/ar/fa parity remains in the same runtime, and build output includes it.
assert 'sv: {' in vab and 'ar: {' in vab and 'fa: {' in vab
assert 'VAB_FOCUS_PATH = "client/vab-focus.js"' in builder
assert 'VAB_FOCUS_PATH,' in builder

# Truth-bearing 12–15 data remains human-review gated.
verification = record.get('verification', {})
assert verification.get('status') == 'NEEDS_REVIEW'
assert verification.get('human_review_required') is True
assert verification.get('material_fields_verified') == []

# Permanent Red Team regression from the previous learning cycle must still be present.
cases = {case['case_id']: case for case in v16.get('cases', [])}
case = cases['lab-employee-partialsick-vab-v16-01']
assert 'q_which_exact_hours_are_covered_by_sick_leave_or_sickness_benefit' in case['expected_questions']
assert 'partial_sick_leave_percentage_automatically_equals_available_vab_percentage' in case['must_not_claim']
assert 'two_benefits_can_be_paid_for_the_same_hours_without_coordination' in case['must_not_claim']

# Re-run established release gates so the feature cannot become a side-car path.
subprocess.run([sys.executable, 'scripts/test_situation_engine.py'], cwd=ROOT, check=True)
subprocess.run([sys.executable, 'scripts/validate_v17_family_vab.py'], cwd=ROOT, check=True)
subprocess.run([sys.executable, 'scripts/build_public_pilot.py', '--source', '.', '--output', '_site_v18'], cwd=ROOT, check=True)
subprocess.run([sys.executable, 'scripts/test_public_pilot_build.py', '--site', '_site_v18'], cwd=ROOT, check=True)

print('v18 VAB guidance validation: OK')
