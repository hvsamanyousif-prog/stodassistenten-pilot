#!/usr/bin/env python3
"""Canonical demand/friction -> regression learning-loop gate.

This validator joins all versioned qualitative demand/friction signal packs to the
single scenario laboratory. Signals are discovery/prioritization evidence only;
they must never become an eligibility or VERIFIED truth source.
"""
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / 'data' / 'evals'
SIGNAL_PATHS = sorted(EVAL.glob('demand_friction_signals_v*.json'))
MAP_PATH = EVAL / 'demand_friction_regression_map_v01.json'

assert len(SIGNAL_PATHS) >= 2, 'expected versioned demand/friction signal packs'
assert MAP_PATH.exists(), 'demand/friction regression map missing'

required_signal = {
    'signal_id', 'actor_types', 'natural_language_queries', 'demand_signal',
    'friction_signal', 'miss_consequence', 'source_fragmentation',
    'language_accessibility_friction', 'steps_to_action', 'recurrence_signal',
    'current_product_coverage_gap', 'priority_band', 'discovery_sources',
    'primary_sources', 'recommended_learning_action', 'truth_rule'
}
score_fields = [
    'demand_signal', 'friction_signal', 'miss_consequence', 'source_fragmentation',
    'language_accessibility_friction', 'steps_to_action', 'recurrence_signal',
    'current_product_coverage_gap'
]
allowed_bands = {'LOW', 'MEDIUM', 'MEDIUM_HIGH', 'HIGH'}

signals = {}
serialized_packs = []
for path in SIGNAL_PATHS:
    pack = json.loads(path.read_text(encoding='utf-8'))
    purpose = str(pack.get('purpose', '')).lower()
    assert 'not measured search volumes' in purpose, f'{path.name}: must disclaim measured search volume'
    for signal in pack.get('signals', []):
        missing = required_signal - set(signal)
        assert not missing, f"{path.name}: {signal.get('signal_id', '<no-id>')} missing {sorted(missing)}"
        sid = signal['signal_id']
        assert sid not in signals, f'duplicate signal_id across packs: {sid}'
        signals[sid] = signal
        assert signal['actor_types'], f'{sid}: actor_types empty'
        assert len(signal['natural_language_queries']) >= 2, f'{sid}: needs multiple natural-language queries'
        for key in score_fields:
            item = signal[key]
            assert set(item) >= {'score', 'basis'}, f'{sid}: {key} needs score+basis'
            assert isinstance(item['score'], int) and 1 <= item['score'] <= 5, f'{sid}: {key} score outside 1-5'
            assert str(item['basis']).strip(), f'{sid}: {key} basis empty'
        assert signal['priority_band'] in allowed_bands, f'{sid}: invalid priority band'
        assert signal['primary_sources'], f'{sid}: primary_sources empty'
        for url in [*signal['primary_sources'], *signal['discovery_sources']]:
            parsed = urlparse(url)
            assert parsed.scheme == 'https' and parsed.netloc, f'{sid}: invalid source URL {url}'
        truth_rule = signal['truth_rule'].lower()
        assert 'verify' in truth_rule or 'do not' in truth_rule, f'{sid}: verification boundary missing'
        assert str(signal['recommended_learning_action']).strip(), f'{sid}: learning action empty'
    serialized_packs.append(json.dumps(pack, ensure_ascii=False).lower())

assert len(signals) >= 5, f'first demand/friction version requires at least 5 prioritized needs, got {len(signals)}'
assert sum(s['priority_band'] == 'HIGH' for s in signals.values()) >= 3, 'expected multiple high-priority weak-link signals'

for text in serialized_packs:
    for forbidden_key in ['"username"', '"user_name"', '"person_name"', '"raw_story"', '"raw_post"', '"email"', '"phone"']:
        assert forbidden_key not in text, f'forbidden identity/raw-community field: {forbidden_key}'

for signal in signals.values():
    if signal['priority_band'] == 'HIGH':
        assert signal['demand_signal']['score'] >= 4
        assert signal['friction_signal']['score'] >= 4
        assert signal['miss_consequence']['score'] >= 4
        assert signal['current_product_coverage_gap']['score'] >= 4

scenario_paths = [EVAL / 'scenario_lab_v01.json', *sorted(EVAL.glob('scenario_lab_websignals*.json'))]
scenario_ids = set()
for path in scenario_paths:
    pack = json.loads(path.read_text(encoding='utf-8'))
    for case in pack.get('cases', []):
        cid = case.get('case_id')
        assert cid, f'{path.name}: scenario without case_id'
        assert cid not in scenario_ids, f'duplicate scenario case id: {cid}'
        scenario_ids.add(cid)

mapping_pack = json.loads(MAP_PATH.read_text(encoding='utf-8'))
mappings = {}
for mapping in mapping_pack.get('mappings', []):
    required = {'signal_id', 'product_miss', 'fix_or_guardrail', 'regression_case_ids'}
    missing = required - set(mapping)
    assert not missing, f"mapping {mapping.get('signal_id', '<no-id>')} missing {sorted(missing)}"
    sid = mapping['signal_id']
    assert sid not in mappings, f'duplicate mapping: {sid}'
    mappings[sid] = mapping
    assert str(mapping['product_miss']).strip(), f'{sid}: product_miss empty'
    assert str(mapping['fix_or_guardrail']).strip(), f'{sid}: fix_or_guardrail empty'
    refs = mapping['regression_case_ids']
    assert isinstance(refs, list) and refs, f'{sid}: no permanent regression refs'
    unknown = sorted(set(refs) - scenario_ids)
    assert not unknown, f'{sid}: unknown regression refs {unknown}'

missing_maps = sorted(set(signals) - set(mappings))
unknown_maps = sorted(set(mappings) - set(signals))
assert not missing_maps, f'signals without permanent regression mapping: {missing_maps}'
assert not unknown_maps, f'mappings without demand/friction signal: {unknown_maps}'

required_links = {
    'df-child-maintenance-terms-v01': 'lab-child-maintenance-v11-01',
    'df-partial-sick-leave-scheduling-v01': 'lab-employee-partialsick-v11-01',
    'df-personal-assistance-authority-split-v01': 'lab-personal-assistance-authority-v12-01',
    'df-company-procurement-too-many-steps-v01': 'lab-company-information-gain-v12-02',
    'df-young-housing-benefit-income-change-v01': 'lab-student-housing-v07-02',
}
for sid, cid in required_links.items():
    assert sid in mappings, f'critical signal mapping missing: {sid}'
    assert cid in mappings[sid]['regression_case_ids'], f'{sid}: expected permanent regression {cid}'

print(
    'demand/friction learning loop: OK '
    f'({len(signals)} signals -> {sum(len(m["regression_case_ids"]) for m in mappings.values())} regression links; '
    f'{len(scenario_ids)} canonical scenarios available)'
)
