#!/usr/bin/env python3
"""Canonical all-pack scenario gate for the single Stödassistenten learning system.

Runs the established hard-regression validator first, then verifies every scenario_lab_websignals*.json
pack so newer web-signal regressions cannot silently sit outside the common scenario-lab gate.
"""
import json
from pathlib import Path
import subprocess
import sys

subprocess.run([sys.executable, 'scripts/validate_scenario_lab.py'], check=True)

paths = [Path('data/evals/scenario_lab_v01.json'), *sorted(Path('data/evals').glob('scenario_lab_websignals*.json'))]
if len(paths) < 2:
    raise SystemExit('scenario packs missing')

required_fields = {
    'case_id','actor_type','story','expected_support_areas','must_not_claim',
    'expected_questions','expected_next_actions','source_requirements'
}
ids = set()
cases = []
for path in paths:
    pack = json.loads(path.read_text(encoding='utf-8'))
    for case in pack.get('cases', []):
        missing = required_fields - set(case)
        assert not missing, f'{path}: {case.get("case_id", "<no-id>")} missing {sorted(missing)}'
        cid = case['case_id']
        assert cid not in ids, f'duplicate case_id across canonical scenario packs: {cid}'
        ids.add(cid)
        assert case['story'].strip(), f'{cid}: empty story'
        for key in ['expected_support_areas','must_not_claim','expected_questions','expected_next_actions','source_requirements']:
            assert isinstance(case[key], list) and case[key], f'{cid}: {key} must be non-empty list'
        cases.append(case)

# 42 cases were already in the legacy canonical gate. v06-v08 add 5 and v09 adds 2.
assert len(cases) >= 49, f'expected at least 49 cases across the single scenario system, got {len(cases)}'

required_recent = {
    'lab-individual-v06-01',
    'lab-student-housing-v07-01',
    'lab-student-housing-v07-02',
    'lab-student-activity-v08-01',
    'lab-disability-study-v08-01',
    'lab-employee-workaid-v09-01',
    'lab-employee-workaid-v09-02',
}
missing_recent = sorted(required_recent - ids)
assert not missing_recent, f'newer web-signal regressions outside canonical lab: {missing_recent}'

by_id = {c['case_id']: c for c in cases}
first = by_id['lab-employee-workaid-v09-01']
assert 'authority_routing_by_employment_duration' in first['expected_support_areas']
assert 'diagnosis_alone_guarantees_work_aid' in first['must_not_claim']
assert 'arbetsformedlingen_is_only_for_unemployed_people' in first['must_not_claim']
assert 'route_first_12_month_need_to_arbetsformedlingen_unless_verified_exception_changes_route' in first['expected_next_actions']

second = by_id['lab-employee-workaid-v09-02']
assert 'preapproval_before_purchase' in second['expected_support_areas']
assert 'buy_first_apply_later_is_safe' in second['must_not_claim']
assert 'retroactive_reimbursement_is_guaranteed' in second['must_not_claim']
assert 'apply_or_obtain_required_decision_before_purchase_or_order' in second['expected_next_actions']

print(f'canonical scenario lab: OK ({len(cases)} cases across {len(paths)} packs)')
