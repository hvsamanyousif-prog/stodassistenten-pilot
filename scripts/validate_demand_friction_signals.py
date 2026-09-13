#!/usr/bin/env python3
"""Fail-closed validation for qualitative demand/friction discovery signals.

This artifact prioritizes eval/retrieval work only. It must not be mistaken for
search-volume measurement, eligibility evidence, or a VERIFIED truth source.
"""
import json
from pathlib import Path
from urllib.parse import urlparse

PATH = Path('data/evals/demand_friction_signals_v01.json')
pack = json.loads(PATH.read_text(encoding='utf-8'))
signals = pack.get('signals', [])
assert len(signals) >= 3, 'expected at least three demand/friction signals'
assert 'not measured search volumes' in pack.get('purpose', ''), 'purpose must disclaim measured search volume'

required = {
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
ids = set()
for signal in signals:
    missing = required - set(signal)
    assert not missing, f"{signal.get('signal_id', '<no-id>')}: missing {sorted(missing)}"
    sid = signal['signal_id']
    assert sid not in ids, f'duplicate signal_id: {sid}'
    ids.add(sid)
    assert signal['actor_types'], f'{sid}: actor_types empty'
    assert len(signal['natural_language_queries']) >= 2, f'{sid}: needs multiple natural-language queries'
    for key in score_fields:
        item = signal[key]
        assert set(item) >= {'score', 'basis'}, f'{sid}: {key} needs score+basis'
        assert isinstance(item['score'], int) and 1 <= item['score'] <= 5, f'{sid}: {key} score outside 1-5'
        assert str(item['basis']).strip(), f'{sid}: {key} basis empty'
    assert signal['priority_band'] in {'LOW', 'MEDIUM', 'MEDIUM_HIGH', 'HIGH'}, f'{sid}: invalid priority band'
    assert signal['primary_sources'], f'{sid}: primary_sources empty'
    for url in [*signal['primary_sources'], *signal['discovery_sources']]:
        parsed = urlparse(url)
        assert parsed.scheme == 'https' and parsed.netloc, f'{sid}: non-https or invalid source URL {url}'
    rule = signal['truth_rule'].lower()
    assert 'verify' in rule or 'do not' in rule, f'{sid}: truth rule must preserve verification boundary'

# Public evals must not carry copied identities or raw community narratives.
serialized = json.dumps(pack, ensure_ascii=False).lower()
for forbidden_key in ['"username"', '"user_name"', '"person_name"', '"raw_story"', '"raw_post"', '"email"', '"phone"']:
    assert forbidden_key not in serialized, f'forbidden identity/raw-community field: {forbidden_key}'

# A high-priority signal must actually combine high need/friction/consequence with a material coverage gap.
for signal in signals:
    if signal['priority_band'] == 'HIGH':
        assert signal['demand_signal']['score'] >= 4
        assert signal['friction_signal']['score'] >= 4
        assert signal['miss_consequence']['score'] >= 4
        assert signal['current_product_coverage_gap']['score'] >= 4

print(f'demand/friction signal validation: OK ({len(signals)} signals)')
