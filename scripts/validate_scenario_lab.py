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

if len(cases) < 34:
    print(f'expected at least 34 synthetic cases across scenario packs, got {len(cases)}', file=sys.stderr)
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

# New web-signal regressions: advertised procurement search is incomplete for direct procurement,
# and a foundation registry listing is discovery metadata rather than an open grant decision.
direct_procurement = by_id.get('lab-company-web-02')
if (
    not direct_procurement
    or 'all_public_procurements_are_advertised' not in direct_procurement['must_not_claim']
    or 'direct_procurement_discovery' not in direct_procurement['expected_support_areas']
    or 'do_not_invent_unadvertised_opportunity' not in direct_procurement['expected_next_actions']
):
    print('direct procurement advertisement-coverage regression missing', file=sys.stderr)
    raise SystemExit(1)
foundation = by_id.get('lab-private-web-05')
if (
    not foundation
    or 'registry_listing_means_open_grant' not in foundation['must_not_claim']
    or 'application_route_verification' not in foundation['expected_support_areas']
    or 'relevant_foundation' not in foundation['source_requirements']
):
    print('foundation registry vs open-grant regression missing', file=sys.stderr)
    raise SystemExit(1)

# Student-finance regression: taking only the grant does not by itself preserve CSN weeks.
csn_weeks = by_id.get('lab-student-web-02')
if (
    not csn_weeks
    or 'grant_only_saves_csn_weeks' not in csn_weeks['must_not_claim']
    or 'student_finance_week_budgeting' not in csn_weeks['expected_support_areas']
    or 'check_used_and_remaining_weeks_in_csn' not in csn_weeks['expected_next_actions']
):
    print('CSN grant-only vs used-weeks regression missing', file=sys.stderr)
    raise SystemExit(1)

# Jobbpremie regression: eligibility and deadline are month-specific and household-sensitive.
jobbpremie = by_id.get('lab-private-web-06')
if (
    not jobbpremie
    or 'one_application_covers_all_jobbpremie_months' not in jobbpremie['must_not_claim']
    or 'current_household_social_assistance_is_irrelevant' not in jobbpremie['must_not_claim']
    or 'monthly_application_deadline' not in jobbpremie['expected_support_areas']
    or 'apply_month_by_month_to_forsakringskassan_within_deadline' not in jobbpremie['expected_next_actions']
):
    print('jobbpremie month/household/deadline regression missing', file=sys.stderr)
    raise SystemExit(1)

print(f'scenario lab validation: OK ({len(cases)} cases, {len(seen)} actor types, {len(packs)} packs)')
