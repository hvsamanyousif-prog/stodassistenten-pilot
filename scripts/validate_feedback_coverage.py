#!/usr/bin/env python3
import json
from pathlib import Path

matrix=json.loads(Path('data/evals/experience_feedback_coverage_v01.json').read_text(encoding='utf-8'))
for s in matrix['surfaces']:
    assert s['feedback_required'] is True, f"feedback must be required for {s['surface']}"
    assert s['status'].startswith('present'), f"feedback coverage is not implemented for {s['surface']}"
for actor in ['private_person','relative','student','employee','company','association','other']:
    assert actor in matrix['actors'], f'missing actor: {actor}'
rules=matrix['feedback_rules']
assert rules['never_send_raw_situation_text'] is True
assert rules['raw_situation_text_must_not_appear_in_navigation_url'] is True
assert rules['coarse_flow_segmentation_required'] is True
assert rules['feedback_is_learning_signal_not_truth'] is True

person=Path('person-pilot.html').read_text(encoding='utf-8')
company=Path('company-pilot.html').read_text(encoding='utf-8')
for name,text in [('person',person),('company',company)]:
    assert 'FEEDBACK_ENDPOINT' in text, f'{name} missing feedback endpoint'

builder=Path('scripts/build_public_pilot.py').read_text(encoding='utf-8')
for path in ['client/privacy-routing.js','client/experience-learning.js','client/quick-help-feedback.js']:
    assert path in builder, f'public build is missing governed runtime: {path}'

shell_feedback=Path('client/experience-learning.js').read_text(encoding='utf-8')
assert 'pilot-feedback' in shell_feedback
assert 'situation_engine_' in shell_feedback
assert 'primaryRoute' in shell_feedback
assert 'situationText' not in shell_feedback and 'situation_text' not in shell_feedback

quick_feedback=Path('client/quick-help-feedback.js').read_text(encoding='utf-8')
assert 'pilot-feedback' in quick_feedback
assert 'quick_' in quick_feedback
assert "get('q')" not in quick_feedback and 'situationText' not in quick_feedback and 'situation_text' not in quick_feedback

routing=Path('client/privacy-routing.js').read_text(encoding='utf-8')
assert "searchParams.delete('q')" in routing, 'raw situation query must be removed before navigation'
assert "searchParams.set('need'" in routing, 'quick-help handoff must retain only a coarse need token'
assert 'fetch(' not in routing, 'privacy router must not transmit situation data'

print('feedback coverage + privacy routing: OK')
