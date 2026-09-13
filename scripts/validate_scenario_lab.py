#!/usr/bin/env python3
import json
from pathlib import Path
import sys

BASE = Path('data/evals/scenario_lab_v01.json')
EXTENSIONS = [Path('data/evals/scenario_lab_websignals_v01.json')]

for path in [BASE, *EXTENSIONS]:
    if not path.exists():
        print(f'scenario lab file missing: {path}', file=sys.stderr)
        raise SystemExit(1)

packs = [json.loads(BASE.read_text(encoding='utf-8'))]
packs.extend(json.loads(path.read_text(encoding='utf-8')) for path in EXTENSIONS)
cases = [case for pack in packs for case in pack.get('cases', [])]

required_actor_types = {
    'individual','student','older_person','person_with_disability',
    'child_via_guardian','relative','company','association',
    'employee','brf_property_actor'
}
seen = set()
ids = set()
required_fields = {
    'case_id','actor_type','story','expected_support_areas','must_not_claim',
    'expected_questions','expected_next_actions','source_requirements'
}

if len(cases) < 30:
    print(f'expected at least 30 synthetic cases across scenario packs, got {len(cases)}', file=sys.stderr)
    raise SystemExit(1)

for case in cases:
    missing = sorted(required_fields - set(case))
    if missing:
        print(f"{case.get('case_id','<no-id>')}: missing fields {missing}", file=sys.stderr)
        raise SystemExit(1)
    cid = case['case_id']
    if cid in ids:
        print(f'duplicate case_id across scenario packs: {cid}', file=sys.stderr)
        raise SystemExit(1)
    ids.add(cid)
    seen.add(case['actor_type'])
    for key in ['expected_support_areas','must_not_claim','expected_questions','expected_next_actions','source_requirements']:
        value = case[key]
        if not isinstance(value, list) or not value:
            print(f'{cid}: {key} must be a non-empty list', file=sys.stderr)
            raise SystemExit(1)
    if not case['story'].strip():
        print(f'{cid}: story empty', file=sys.stderr)
        raise SystemExit(1)
    unsafe_tokens = ['guaranteed_entitlement_true','verified_without_source','invented_grant_is_ok']
    blob = json.dumps(case, ensure_ascii=False).lower()
    if any(tok in blob for tok in unsafe_tokens):
        print(f'{cid}: unsafe scenario contract token', file=sys.stderr)
        raise SystemExit(1)

missing_actors = sorted(required_actor_types - seen)
if missing_actors:
    print(f'missing actor types: {missing_actors}', file=sys.stderr)
    raise SystemExit(1)

# Hard regression checks for the two seed scenarios supplied by the product owner.
by_id = {c['case_id']: c for c in cases}
vision = by_id.get('lab-disability-01')
if not vision or 'housing_adaptation' not in vision['expected_support_areas'] or 'Boverket' not in vision['source_requirements']:
    print('vision impairment / housing adaptation seed regression missing', file=sys.stderr)
    raise SystemExit(1)
adhd = by_id.get('lab-child-01')
if not adhd or 'school_support' not in adhd['expected_support_areas'] or 'diagnosis_required_for_school_support' not in adhd['must_not_claim']:
    print('ADHD / school support seed regression missing', file=sys.stderr)
    raise SystemExit(1)

# Permanent web-signal regressions: stale official pages must not imply an open support,
# and employment-related assistance must distinguish everyday special aids from work aids.
brf = by_id.get('lab-brf-web-01')
if not brf or 'indexed_official_page_means_open_support' not in brf['must_not_claim'] or 'support_lifecycle_verification' not in brf['expected_support_areas']:
    print('stale/closed official support page regression missing', file=sys.stderr)
    raise SystemExit(1)
work_aid = by_id.get('lab-employee-web-02')
if not work_aid or 'all_aids_use_same_scheme' not in work_aid['must_not_claim'] or 'work_assistive_device' not in work_aid['expected_support_areas']:
    print('work injury special-aid vs work-aid regression missing', file=sys.stderr)
    raise SystemExit(1)

print(f'scenario lab validation: OK ({len(cases)} cases, {len(seen)} actor types, {len(packs)} packs)')
