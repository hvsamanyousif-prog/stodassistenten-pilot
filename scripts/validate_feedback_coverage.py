#!/usr/bin/env python3
import json
from pathlib import Path

matrix=json.loads(Path('data/evals/experience_feedback_coverage_v01.json').read_text(encoding='utf-8'))
for s in matrix['surfaces']:
    assert s['feedback_required'] is True, f"feedback must be required for {s['surface']}"
for actor in ['private_person','relative','student','employee','company','association','other']:
    assert actor in matrix['actors'], f'missing actor: {actor}'
assert matrix['feedback_rules']['never_send_raw_situation_text'] is True
assert matrix['feedback_rules']['feedback_is_learning_signal_not_truth'] is True

person=Path('person-pilot.html').read_text(encoding='utf-8')
company=Path('company-pilot.html').read_text(encoding='utf-8')
quick=Path('quick-help.html').read_text(encoding='utf-8')
for name,text in [('person',person),('company',company),('quick-help',quick)]:
    assert 'FEEDBACK_ENDPOINT' in text, f'{name} missing feedback endpoint'

# The shared shell feedback is injected into the built artifact by experience-learning.js.
builder=Path('scripts/build_public_pilot.py').read_text(encoding='utf-8')
assert 'client/experience-learning.js' in builder, 'shared situation engine feedback wiring missing'
script=Path('client/experience-learning.js').read_text(encoding='utf-8')
assert 'pilot-feedback' in script
assert 'situation_engine' in script
assert 'situationText' not in script and 'situation_text' not in script, 'raw situation text must not be sent in feedback'
print('feedback coverage: OK')
