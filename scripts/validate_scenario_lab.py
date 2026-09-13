#!/usr/bin/env python3
import json
from pathlib import Path
import sys

BASE = Path('data/evals/scenario_lab_v01.json')
EXTENSIONS = [
    Path('data/evals/scenario_lab_websignals_v01.json'),
    Path('data/evals/scenario_lab_websignals_continuous.json'),
    Path('data/evals/scenario_lab_websignals_v05.json'),
]

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

if len(cases) < 42:
    print(f'expected at least 42 synthetic cases across scenario packs, got {len(cases)}', file=sys.stderr)
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

# Advertised procurement search is incomplete for direct procurement,
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

# Continuous web-signal regressions: student sickness protection is conditional,
# student VAB has its own study-support path, post-study SGI protection is time-sensitive,
# and riksfärdtjänst must be routed by function/purpose/payer rather than diagnosis alone.
student_sick = by_id.get('lab-student-cont-01')
if (
    not student_sick
    or 'approved_sickness_always_protects_weeks_even_if_studying' not in student_sick['must_not_claim']
    or 'student_finance_repayment_risk' not in student_sick['expected_support_areas']
    or 'check_whether_study_activity_affects_protection' not in student_sick['expected_next_actions']
):
    print('student sickness / continued-study protection regression missing', file=sys.stderr)
    raise SystemExit(1)

student_vab = by_id.get('lab-student-cont-02')
if (
    not student_vab
    or 'student_vab_requires_employment' not in student_vab['must_not_claim']
    or 'ordinary_studiemedel_and_omstallningsstudiestod_have_same_week_rules' not in student_vab['must_not_claim']
    or 'student_vab_absence_protection' not in student_vab['expected_support_areas']
):
    print('student VAB / study-support protection regression missing', file=sys.stderr)
    raise SystemExit(1)

post_study_sgi = by_id.get('lab-student-cont-03')
if (
    not post_study_sgi
    or 'sgi_is_automatically_protected_after_studies_without_action' not in post_study_sgi['must_not_claim']
    or 'sgi_protection_after_studies' not in post_study_sgi['expected_support_areas']
    or 'register_with_arbetsformedlingen_from_first_day_after_studies_if_not_working' not in post_study_sgi['expected_next_actions']
):
    print('post-study SGI first-day protection regression missing', file=sys.stderr)
    raise SystemExit(1)

riksfardtjanst = by_id.get('lab-disability-cont-01')
if (
    not riksfardtjanst
    or 'visual_impairment_diagnosis_alone_guarantees_riksfardtjanst' not in riksfardtjanst['must_not_claim']
    or 'another_public_payer_is_irrelevant' not in riksfardtjanst['must_not_claim']
    or 'riksfardtjanst' not in riksfardtjanst['expected_support_areas']
    or 'verify_trip_purpose_and_other_payer_before_recommending_application' not in riksfardtjanst['expected_next_actions']
):
    print('riksfardtjanst purpose/function/payer regression missing', file=sys.stderr)
    raise SystemExit(1)

# Caregiver-support regression: municipal support and near-relative allowance are distinct paths.
caregiver = by_id.get('lab-relative-v05-01')
if (
    not caregiver
    or 'ordinary_long_term_care_automatically_qualifies_for_narstaendepenning' not in caregiver['must_not_claim']
    or 'municipal_caregiver_support' not in caregiver['expected_support_areas']
    or 'separate_municipal_caregiver_support_from_narstaendepenning' not in caregiver['expected_next_actions']
):
    print('caregiver support vs narstaendepenning regression missing', file=sys.stderr)
    raise SystemExit(1)

# Pension housing-support regression: owning the primary home must not screen out a pensioner.
pension_home = by_id.get('lab-older-v05-01')
if (
    not pension_home
    or 'homeowners_are_excluded_from_bostadstillagg' not in pension_home['must_not_claim']
    or 'pension_housing_supplement' not in pension_home['expected_support_areas']
    or 'Pensionsmyndigheten' not in pension_home['source_requirements']
):
    print('pension housing supplement owner-home regression missing', file=sys.stderr)
    raise SystemExit(1)

# Disability/dental regression: F-dental care needs functional assessment and a regional decision.
f_dental = by_id.get('lab-disability-v05-01')
if (
    not f_dental
    or 'diagnosis_alone_guarantees_f_dental_care' not in f_dental['must_not_claim']
    or 'regional_f_dental_care' not in f_dental['expected_support_areas']
    or 'contact_region_dental_unit_for_f_dental_care_assessment' not in f_dental['expected_next_actions']
):
    print('F-dental functional/regional-decision regression missing', file=sys.stderr)
    raise SystemExit(1)

# Temporal housing-benefit regression: future 2027 monthly-income rules must not be backported to 2026.
housing_2027 = by_id.get('lab-individual-v05-01')
if (
    not housing_2027
    or '2027_monthly_income_rules_already_apply_in_2026' not in housing_2027['must_not_claim']
    or 'housing_benefit_2027_transition' not in housing_2027['expected_support_areas']
    or 'do_not_backport_future_rule_to_current_decision' not in housing_2027['expected_next_actions']
):
    print('housing benefit 2026-to-2027 transition regression missing', file=sys.stderr)
    raise SystemExit(1)

print(f'scenario lab validation: OK ({len(cases)} cases, {len(seen)} actor types, {len(packs)} packs)')
