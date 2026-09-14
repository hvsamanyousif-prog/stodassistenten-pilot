#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / 'data' / 'evals'
SUPPORT = ROOT / 'data' / 'supports' / 'se-forsakringskassan-merkostnadsersattning-vuxna.json'
CLIENT = ROOT / 'client' / 'adult-extra-costs-guidance.js'
BUILD = ROOT / 'scripts' / 'build_public_pilot.py'

paths = [EVAL / 'scenario_lab_v01.json', *sorted(EVAL.glob('scenario_lab_websignals*.json'))]
cases = {}
for path in paths:
    pack = json.loads(path.read_text(encoding='utf-8'))
    for case in pack.get('cases', []):
        cid = case['case_id']
        assert cid not in cases, f'duplicate scenario id: {cid}'
        cases[cid] = case

locks = {
    'lab-disability-adult-extra-costs-v50-01': {
        'must_not_claim': [
            'diagnosis_alone_guarantees_additional_cost_compensation',
            'all_disability_related_spending_counts_in_full',
            'ordinary_household_spending_counts_only_because_finances_are_tight',
            'the_product_can_guarantee_eligibility_amount_or_payment',
        ],
        'expected_next_actions': [
            'prepare_a_private_cost_list_with_cost_type_reason_annual_estimate_and_payer',
            'verify_each_cost_against_current_forsakringskassan_primary_guidance_without_calculating_eligibility',
        ],
    },
    'lab-disability-extra-costs-other-payer-v50-02': {
        'must_not_claim': [
            'a_cost_paid_by_region_or_municipality_can_be_counted_again_unchanged',
            'a_cost_paid_by_assistance_compensation_can_be_counted_again_as_the_same_additional_cost',
            'receiving_assistance_compensation_excludes_all_additional_cost_compensation',
        ],
    },
    'lab-disability-extra-costs-applicant-age-study-v50-03': {
        'must_not_claim': [
            'turning_18_always_means_the_person_applies_for_themselves',
            'age_alone_without_study_status_decides_the_18_to_20_applicant_route',
            'parent_application_means_automatic_entitlement',
        ],
    },
}
for cid, fields in locks.items():
    assert cid in cases, f'missing v50 scenario: {cid}'
    for field, tokens in fields.items():
        for token in tokens:
            assert token in cases[cid][field], f'{cid}: missing {field} token {token}'

signal_pack = json.loads((EVAL / 'demand_friction_signals_v33.json').read_text(encoding='utf-8'))
signal = signal_pack['signals'][0]
assert signal['signal_id'] == 'df-adult-disability-extra-costs-v01'
assert signal['priority_band'] == 'HIGH'
assert 'not measured search volumes' in signal_pack['scoring']['priority_rule']
assert 'VERIFY' in signal['truth_rule']
assert all('forsakringskassan.se' in url for url in signal['primary_sources'])

mapping = json.loads((EVAL / 'demand_friction_regression_map_v27.json').read_text(encoding='utf-8'))['mappings'][0]
assert mapping['signal_id'] == signal['signal_id']
assert mapping['product_miss']
assert mapping['regression_case_ids'] == list(locks)
assert mapping['coverage_status'] == 'GUARDED_PUBLIC_ROUTE_READY'

support = json.loads(SUPPORT.read_text(encoding='utf-8'))
assert support['verification']['status'] == 'NEEDS_REVIEW'
assert support['verification']['human_review_required'] is True
assert support['verification']['material_fields_verified'] == []
assert support['application']['url'].startswith('https://www.forsakringskassan.se/')

client = CLIENT.read_text(encoding='utf-8')
assert 'focus=adult_extra_costs' in client
assert 'flow:\'adult_extra_costs\'' in client
for forbidden in ['receipt', 'personnummer', 'exact_cost']:
    assert forbidden not in client.lower(), f'privacy-sensitive public field drifted into v50 route: {forbidden}'

build = BUILD.read_text(encoding='utf-8')
assert 'client/adult-extra-costs-guidance.js' in build, 'v50 route must be wired into the same public build'

print(f'adult extra-costs v50: OK ({len(cases)} canonical scenarios; truth remains review-gated)')
