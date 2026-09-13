#!/usr/bin/env python3
import json
from pathlib import Path

path=Path('data/evals/scenario_lab_websignals_v06.json')
pack=json.loads(path.read_text(encoding='utf-8'))
assert pack['schema_version']=='0.1.0'
assert len(pack.get('cases',[]))==1
case=pack['cases'][0]
assert case['case_id']=='lab-individual-v06-01'
assert case['actor_type']=='individual'
assert 'municipal_budget_debt_counselling' in case['expected_support_areas']
assert 'debt_restructuring_screening' in case['expected_support_areas']
assert 'municipal_counsellor_grants_debt_restructuring' in case['must_not_claim']
assert 'existing_kronofogden_case_is_required_for_municipal_counselling' in case['must_not_claim']
assert 'contact_municipal_budget_and_debt_counselling_early' in case['expected_next_actions']
assert 'Konsumentverket' in case['source_requirements'] and 'Kronofogden' in case['source_requirements']
required={'case_id','actor_type','story','expected_support_areas','must_not_claim','expected_questions','expected_next_actions','source_requirements'}
assert not (required-set(case)), 'required scenario fields missing'
for key in ['expected_support_areas','must_not_claim','expected_questions','expected_next_actions','source_requirements']:
    assert isinstance(case[key],list) and case[key], f'{key} must be non-empty'
ids=[]
for other in Path('data/evals').glob('scenario_lab*.json'):
    data=json.loads(other.read_text(encoding='utf-8'))
    ids.extend(c.get('case_id') for c in data.get('cases',[]) if c.get('case_id'))
assert ids.count(case['case_id'])==1, 'v06 case_id duplicates an existing scenario'
print('websignal v06 debt-counselling regression: OK')
