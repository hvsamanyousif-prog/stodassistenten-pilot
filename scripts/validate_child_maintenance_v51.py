#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / 'data' / 'evals'
SUPPORT = ROOT / 'data' / 'supports' / 'se-forsakringskassan-underhallsstod.json'
CLIENT = ROOT / 'client' / 'child-maintenance-guidance.js'
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
    'lab-family-maintenance-unpaid-mostly-resident-v51-01': {
        'must_not_claim': [
            'separation_plus_nonpayment_proves_maintenance_support_eligibility',
            'a_fixed_support_amount_is_guaranteed',
            'the_product_can_decide_custody_registration_relationship_or_insurance_conditions',
            'underhallsbidrag_and_underhallsstod_are_the_same_payment',
        ],
    },
    'lab-family-maintenance-equal-residence-v51-02': {
        'must_not_claim': [
            'equal_residence_means_maintenance_can_never_be_relevant',
            'equal_residence_automatically_qualifies_for_maintenance_support',
            'income_difference_alone_proves_a_specific_payment_obligation_or_amount',
        ],
    },
    'lab-family-maintenance-partial-payment-v51-03': {
        'must_not_claim': [
            'partial_payment_automatically_means_the_state_pays_the_full_difference',
            'the_product_can_infer_the_correct_private_maintenance_amount',
            'a_community_example_or_previous_ai_answer_can_establish_the_payment_rule',
        ],
    },
    'lab-family-maintenance-cross-border-v51-04': {
        'must_not_claim': [
            'the_domestic_administrative_path_is_identical_for_every_country',
            'living_abroad_proves_or_excludes_maintenance_support',
            'the_product_can_infer_foreign_law_or_enforcement_from_country_name_alone',
        ],
    },
}
for cid, fields in locks.items():
    assert cid in cases, f'missing v51 scenario: {cid}'
    for field, tokens in fields.items():
        for token in tokens:
            assert token in cases[cid][field], f'{cid}: missing {field} token {token}'

signal_pack = json.loads((EVAL / 'demand_friction_signals_v34.json').read_text(encoding='utf-8'))
signal = signal_pack['signals'][0]
assert signal['signal_id'] == 'df-child-maintenance-payment-route-v01'
assert signal['priority_band'] == 'HIGH'
assert 'not measured search volumes' in signal_pack['scoring']['priority_rule']
assert 'VERIFY' in signal['truth_rule']
assert all('forsakringskassan.se' in url for url in signal['primary_sources'])
assert any('reddit.com' in url for url in signal['discovery_sources'])

mapping = json.loads((EVAL / 'demand_friction_regression_map_v28.json').read_text(encoding='utf-8'))['mappings'][0]
assert mapping['signal_id'] == signal['signal_id']
assert mapping['product_miss']
assert mapping['regression_case_ids'] == list(locks)
assert mapping['coverage_status'] == 'GUARDED_PUBLIC_ROUTE_READY_TRUTH_REMAINS_REVIEW_GATED'

support = json.loads(SUPPORT.read_text(encoding='utf-8'))
assert support['verification']['status'] == 'NEEDS_REVIEW'
assert support['verification']['human_review_required'] is True
assert support['verification']['material_fields_verified'] == []
assert support['application']['url'].startswith('https://www.forsakringskassan.se/')
assert support['benefit']['amount_text'] is None
assert support['application']['deadline_text'] is None

client = CLIENT.read_text(encoding='utf-8')
assert 'focus=child_maintenance' in client
assert "flow:'child_maintenance'" in client
assert 'maintenance_context=cross_border' in client
assert 'child_name=' not in client and 'other_parent=' not in client and 'amount=' not in client
assert 'FK_OVERVIEW_URL' in client and 'FK_SUPPORT_URL' in client and 'FK_ABROAD_URL' in client

build = BUILD.read_text(encoding='utf-8')
assert 'client/child-maintenance-guidance.js' in build, 'v51 route must be wired into the same public build'

print(f'child maintenance v51: OK ({len(cases)} canonical scenarios; truth remains review-gated)')
