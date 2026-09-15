#!/usr/bin/env python3
import json
from pathlib import Path

matrix=json.loads(Path('data/evals/experience_feedback_coverage_v01.json').read_text(encoding='utf-8'))
for s in matrix['surfaces']:
    assert s['feedback_required'] is True, f"feedback must be required for {s['surface']}"
    assert s['status'].startswith('present'), f"feedback coverage is not implemented for {s['surface']}"
for actor in ['private_person','relative','student','employee','company','association','property_actor','other']:
    assert actor in matrix['actors'], f'missing actor: {actor}'
rules=matrix['feedback_rules']
assert rules['never_send_raw_situation_text'] is True
assert rules['raw_situation_text_must_not_appear_in_navigation_url'] is True
assert rules['coarse_flow_segmentation_required'] is True
assert rules['actor_context_segmentation_required_for_shared_person_module'] is True
assert rules['feedback_is_learning_signal_not_truth'] is True
assert rules['incomplete_submission_must_explain_required_answers'] is True
assert rules['answer_controls_must_expose_pressed_state'] is True
person_surface=next(s for s in matrix['surfaces'] if s['surface']=='person_module')
assert person_surface['status']=='present_actor_segmented', 'person feedback must preserve coarse actor context'
shell_surface=next(s for s in matrix['surfaces'] if s['surface']=='shared_situation_engine')
assert shell_surface['status']=='present_segmented_accessible', 'shared situation feedback must expose accessible completion state'
property_surface=next(s for s in matrix['surfaces'] if s['surface']=='property_actor_housing_adaptation')
assert property_surface['status']=='present_actor_segmented', 'property actor feedback must preserve coarse actor context'

person=Path('person-pilot.html').read_text(encoding='utf-8')
company=Path('company-pilot.html').read_text(encoding='utf-8')
for name,text in [('person',person),('company',company)]:
    assert 'FEEDBACK_ENDPOINT' in text, f'{name} missing feedback endpoint'

builder=Path('scripts/build_public_pilot.py').read_text(encoding='utf-8')
for path in ['client/privacy-routing.js','client/experience-learning.js','client/quick-help-feedback.js','client/person-context-learning.js']:
    assert path in builder, f'public build is missing governed runtime: {path}'

shell_feedback=Path('client/experience-learning.js').read_text(encoding='utf-8')
assert 'pilot-feedback' in shell_feedback
assert 'situation_engine_' in shell_feedback
assert 'primaryRoute' in shell_feedback
assert 'situationText' not in shell_feedback and 'situation_text' not in shell_feedback
for marker in ["needAnswers:'Svara på de tre frågorna ovan innan du skickar.'","needAnswers:'أجب عن الأسئلة الثلاثة أعلاه قبل الإرسال.'","needAnswers:'پیش از ارسال به هر سه پرسش بالا پاسخ دهید.'"]:
    assert marker in shell_feedback, f'localized incomplete-feedback explanation missing: {marker}'
assert "status.textContent=c('needAnswers')" in shell_feedback, 'incomplete shared feedback must not fail silently'
assert 'aria-pressed="false"' in shell_feedback, 'feedback choices need an initial pressed state'
assert 'firstButton.focus()' in shell_feedback, 'incomplete feedback should return focus to the first unanswered control'

quick_feedback=Path('client/quick-help-feedback.js').read_text(encoding='utf-8')
assert 'pilot-feedback' in quick_feedback
assert 'quick_' in quick_feedback
assert "get('q')" not in quick_feedback and 'situationText' not in quick_feedback and 'situation_text' not in quick_feedback

routing=Path('client/privacy-routing.js').read_text(encoding='utf-8')
assert "searchParams.delete('q')" in routing, 'raw situation query must be removed before navigation'
assert "searchParams.set('need'" in routing, 'quick-help handoff must retain only a coarse need token'
assert 'fetch(' not in routing, 'privacy router must not transmit situation data'

person_context=Path('client/person-context-learning.js').read_text(encoding='utf-8')
assert "get('actor_type')" in person_context, 'person runtime must preserve actor entry context'
assert "ALLOWED_PERSON_ACTORS" in person_context, 'person actor context must use a bounded canonical allow-list'
for actor in ['private_person','relative','student','employee','association','property_actor','other']:
    assert f"'{actor}'" in person_context, f'person actor allow-list missing: {actor}'
assert "ALLOWED_PERSON_ACTORS.has(sanitizedActor)?sanitizedActor:'other'" in person_context, 'unknown person actor values must collapse to other'
assert "data.flow=`${actor}_${flow}`" in person_context, 'person feedback must segment by canonical actor without sensitive answers'
for marker in ["heading:'Din ingång'","heading:'مدخلك'","heading:'ورودی شما'"]:
    assert marker in person_context, f'localized actor heading missing: {marker}'
assert 'answers' not in person_context and 'situationText' not in person_context and 'situation_text' not in person_context
assert "pilot.textContent!==actorLabel" in person_context, 'actor label patch must not self-trigger endlessly'
assert "actorEyebrow.textContent!==heading" in person_context, 'localized eyebrow patch must be idempotent'

print('feedback coverage + privacy routing + canonical actor context incl property_actor + accessible completion: OK')
