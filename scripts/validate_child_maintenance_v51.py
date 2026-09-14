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

# v11 already owns the core terminology/payment-gap regression. v51 must extend,
# not clone, that memory with public handoff + long-tail boundaries.
assert 'lab-child-maintenance-v11-01' in cases
locks = {
    'lab-family-maintenance-public-route-v51-01': {
        'must_not_claim': [
            'the_product_must_collect_all_material_eligibility_facts_before_showing_the_primary_source',
            'separation_plus_nonpayment_proves_maintenance_support_eligibility',
            'underhallsbidrag_and_underhallsstod_are_the_same_route',
            'a_fixed_support_amount_is_guaranteed',
        ],
    },
    'lab-family-maintenance-equal-residence-v51-02': {
        'must_not_claim': [
            'equal_residence_means_maintenance_can_never_be_relevant',
            'equal_residence_automatically_qualifies_for_maintenance_support',
            'income_difference_alone_proves_a_specific_payment_obligation_or_amount',
        ],
    },
    'lab-family-maintenance-cross-border-v51-03': {
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

signal_pack = json.loads((EVAL / 'demand_friction_signals_v01.json').read_text(encoding='utf-8'))
signal = next(s for s in signal_pack['signals'] if s['signal_id'] == 'df-child-maintenance-terms-v01')
assert signal['priority_band'] == 'HIGH'
assert 'not measured search volumes' in signal_pack['purpose']
assert 'VERIFY' in signal['truth_rule']
assert len(signal['primary_sources']) >= 3
assert all('forsakringskassan.se' in url for url in signal['primary_sources'])
assert any('reddit.com' in url for url in signal['discovery_sources'])
assert 'v11 canonical regression already protected' in signal['current_product_coverage_gap']['basis']

mapping_pack = json.loads((EVAL / 'demand_friction_regression_map_v01.json').read_text(encoding='utf-8'))
mapping = next(m for m in mapping_pack['mappings'] if m['signal_id'] == signal['signal_id'])
assert mapping['product_miss']
assert mapping['regression_case_ids'] == ['lab-child-maintenance-v11-01', *list(locks)]

# No second signal/mapping pack may be introduced just to rename the same need.
for path in EVAL.glob('demand_friction_signals_v*.json'):
    if path.name == 'demand_friction_signals_v01.json':
        continue
    text = path.read_text(encoding='utf-8')
    assert 'df-child-maintenance-payment-route-v01' not in text, 'duplicate maintenance signal reintroduced'

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
# The JS unit test verifies the exact generated query string. Here, guard the
# semantic cross-border contract without depending on literal string assembly.
assert 'maintenance_context' in client and 'cross_border' in client
assert 'child_name=' not in client and 'other_parent=' not in client and 'amount=' not in client
assert 'FK_OVERVIEW_URL' in client and 'FK_SUPPORT_URL' in client and 'FK_ABROAD_URL' in client

build = BUILD.read_text(encoding='utf-8')
assert 'client/child-maintenance-guidance.js' in build, 'v51 route must be wired into the same public build'

print(f'child maintenance v51: OK ({len(cases)} canonical scenarios; existing signal extended; truth remains review-gated)')
