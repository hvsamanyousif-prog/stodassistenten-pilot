"""Contract for short-feedback meaning in the procurement expert pilot.

This checks the existing structured payload contract only. It is not endpoint,
storage, AI-quality or user-study evidence.
"""
from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'procurement-expert-pilot.html').read_text(encoding='utf-8')

expected_question = 'Lärde du dig något nytt?'
legacy_question = 'Hittade du ett verkligt produktfel?'

if expected_question not in html:
    raise AssertionError('Short feedback UI does not express learned_new semantics')
if legacy_question in html:
    raise AssertionError('Legacy product-error wording still overloads learned_new')

node = subprocess.run(
    [
        'node',
        '-e',
        "const p=require('./client/procurement-expert-pilot.js');"
        "process.stdout.write(JSON.stringify(p.buildFeedbackPayload(true,true,true,{})));",
    ],
    cwd=ROOT,
    check=True,
    capture_output=True,
    text=True,
)
payload = json.loads(node.stdout)
expected_fields = {
    'app_version', 'language', 'flow', 'learned_new', 'useful',
    'next_step_clear', 'ratings'
}
if set(payload) != expected_fields:
    raise AssertionError(f'Unexpected feedback fields: {sorted(payload)}')
if payload['learned_new'] is not True:
    raise AssertionError('Yes to the learned-new question must serialize as learned_new=true')
if payload['ratings'] != {}:
    raise AssertionError('Short feedback must not fabricate detailed ratings')

print('feedback semantics contract: PASS')
