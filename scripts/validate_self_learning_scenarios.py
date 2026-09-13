#!/usr/bin/env python3
import json
from pathlib import Path

p=Path('data/evals/self_learning_scenarios_v01.json')
data=json.loads(p.read_text(encoding='utf-8'))
cases=data.get('cases',[])
assert len(cases)>=24, f'expected at least 24 self-learning scenarios, got {len(cases)}'
ids=[c['case_id'] for c in cases]
assert len(ids)==len(set(ids)), 'duplicate case_id'
required={'actor_type','story','expected_routes','must_not_claim','experience_risks'}
for c in cases:
    missing=required-set(c)
    assert not missing, f"{c.get('case_id')} missing {sorted(missing)}"
    assert c['story'].strip(), f"{c['case_id']} empty story"
    assert c['expected_routes'], f"{c['case_id']} has no expected routes"
    assert c['must_not_claim'], f"{c['case_id']} has no safety constraints"
    assert c['experience_risks'], f"{c['case_id']} has no experience risks"
actors={c['actor_type'] for c in cases}
for actor in {'private_person','student','employee','company','association','relative','person_with_disability'}:
    assert actor in actors, f'missing actor coverage: {actor}'
rules=data.get('learning_rules',{})
assert rules.get('feedback_is_signal_not_truth') is True
assert rules.get('raw_sensitive_feedback_forbidden_in_public_evals') is True
assert rules.get('truth_changes_require_primary_source_verification') is True
print(f'self-learning scenarios: OK ({len(cases)} cases, {len(actors)} actor types)')
