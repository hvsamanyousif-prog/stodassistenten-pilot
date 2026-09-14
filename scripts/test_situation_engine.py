#!/usr/bin/env python3
from pathlib import Path
import json
import subprocess

root = Path(__file__).resolve().parents[1]
index = (root / 'index.html').read_text(encoding='utf-8')
quick = (root / 'quick-help.html').read_text(encoding='utf-8')
person = (root / 'person-pilot.html').read_text(encoding='utf-8')
routing = (root / 'client' / 'privacy-routing.js').read_text(encoding='utf-8')
assistance = (root / 'client' / 'assistance-focus.js').read_text(encoding='utf-8')
family_age = (root / 'client' / 'family-age-routing.js').read_text(encoding='utf-8')
housing = (root / 'client' / 'housing-adaptation-guidance.js').read_text(encoding='utf-8')
builder = (root / 'scripts' / 'build_public_pilot.py').read_text(encoding='utf-8')
v14 = json.loads((root / 'data' / 'evals' / 'scenario_lab_websignals_v14.json').read_text(encoding='utf-8'))
v15 = json.loads((root / 'data' / 'evals' / 'scenario_lab_websignals_v15.json').read_text(encoding='utf-8'))
housing_record = json.loads((root / 'data' / 'supports' / 'se-boverket-bostadsanpassningsbidrag.json').read_text(encoding='utf-8'))

housing_syntax = subprocess.run(
    ['node', '--check', str(root / 'client' / 'housing-adaptation-guidance.js')],
    capture_output=True,
    text=True,
    check=False,
)
family_age_syntax = subprocess.run(
    ['node', '--check', str(root / 'client' / 'family-age-routing.js')],
    capture_output=True,
    text=True,
    check=False,
)

checks = [
    ('situation composer', 'id="situation"' in index and 'function classify(text)' in index),
    ('local privacy promise', 'analyseras lokalt' in index and 'skickas inte' in index),
    ('safe-by-construction handoff', "searchParams.set('q'" not in index and 'function coarseNeed(mode,text)' in index and "searchParams.set('need'" in index),
    ('guided handoff consumes coarse need', "const need=P.get('need')" in quick),
    ('engine offers routes', "dental:['Tandvård'" in index and "vision:['Synnedsättning'" in index),
    ('same platform deep links', 'person-pilot.html?actor_type=' in index and 'company-pilot.html?actor_type=company' in index),
    ('language direction', "document.documentElement.dir=rtl?'rtl':'ltr'" in index),
    ('guided dental needs', "cost:['Jag är orolig för kostnaden'" in quick and "care:['Jag har besvär och behöver tandvård'" in quick),
    ('guided vision activities', "home:['Hemma i bostaden'" in quick and "tech:['Läsa, mobil, dator eller annan teknik'" in quick and "work:['Arbete eller studier'" in quick),
    ('no old binary dental gate', 'Finns ett konkret behov av tandvård?' not in quick),
    ('source-first dental', 'forsakringskassan.se/privatperson/tandvard/tandvardsstod' in quick and '1177.se/sjukdomar--besvar/mun-och-tander/tander/tandvark/' in quick),
    ('source-first vision', '1177.se/undersokning-behandling/hjalpmedel/syn/synhjalpmedel/' in quick and 'boverket.se/sv/babhandboken/bostadsanpassningsbidrag/' in quick),
    ('accessibility baseline', 'class="skip"' in index and 'aria-live="polite"' in quick and ':focus-visible' in index and ':focus-visible' in quick),
    ('natural assistance route', 'KEYWORDS.assistance' in routing and 'hjälp med hygien' in routing and 'hjälp med påklädning' in routing and 'focus=assistance' in routing),
    ('assistance is need-led not diagnosis-led', 'adhd' not in routing.lower() and 'autism' not in routing.lower() and 'diagnos' not in routing.lower()),
    ('assistance focus is bounded', "focus!=='assistance'" in assistance and "params.get('focus')" in assistance),
    ('assistance asks high-value facts', "assistWho:'Vem gäller hjälpbehovet?'" in assistance and "assistNeed:'Gäller hjälpen grundläggande vardagsbehov?'" in assistance and 'Din uppskattning är bara en vägvisare' in assistance),
    ('assistance authority split is fail-closed', '20 timmar eller mindre' in assistance and 'mer än 20 timmar' in assistance and 'En egen timuppskattning är inte samma sak som myndighetens bedömning.' in assistance),
    ('assistance uses primary authority sources', 'forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-vuxna' in assistance and 'forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-barn' in assistance),
    ('assistance results stay uncertain', "resultCard(r,i+2)" in assistance and 'Produkten avgör inte rätt till stöd.' in assistance),
    ('assistance stays in same person module', 'ASSISTANCE_FOCUS_PATH = "client/assistance-focus.js"' in builder and 'ASSISTANCE_FOCUS_PATH,' in builder),
    ('family source flow contains a real age question', "if(screen==='family1')" in person and "'childAge'" in person and "'child','no'" in person and "'child','unsure'" in person),
    ('family age guard javascript syntax', family_age_syntax.returncode == 0),
    ('family age gate changes the route', "key === 'child'" in family_age and "scenario === 'family'" in family_age and "val !== 'yes'" in family_age and "scenario = 'general'" in family_age and "go('general1')" in family_age),
    ('family age gate preserves answer but blocks child results', "answers[key] = val" in family_age and "return originalChooseAnswer(key, val, next)" in family_age),
    ('family age guard stays in same person module', 'FAMILY_AGE_ROUTING_PATH = "client/family-age-routing.js"' in builder and 'FAMILY_AGE_ROUTING_PATH,' in builder),
    ('family age permanent regression remains locked', any(case.get('case_id') == 'lab-family-age-gate-v15-01' for case in v15.get('cases', []))),
    ('housing guidance javascript syntax', housing_syntax.returncode == 0),
    ('housing guidance is narrowly gated', "mode !== 'vision'" in housing and "need !== 'home'" in housing),
    ('housing guidance asks information-gain facts', 'Är detta bostaden där personen bor permanent?' in housing and 'Hur ser ägande- eller nyttjanderätten ut?' in housing and 'Finns de skriftliga medgivanden som behövs?' in housing),
    ('housing guidance preserves applicant route', 'Personen med funktionsnedsättning är sökande' in housing and 'Hyresrätt eller delat kontrakt utesluter inte vägen.' in housing),
    ('housing guidance is fail-closed on consent', 'Ett positivt beslut kan inte fattas innan nödvändiga skriftliga medgivanden finns' in housing and 'Medgivande är inte samma sak som rätt till bidrag.' in housing),
    ('housing guidance handles second hand separately', "tenure === 'secondhand'" in housing and 'Andrahandsboende kan kräva en särskild bedömning av hur långvarig upplåtelsen är.' in housing),
    ('housing guidance is source-grounded', 'vem-ska-ansoka/' in housing and 'dar-sokanden-bor-permanent/' in housing and 'Fastighetsagarens-medgivande/' in housing and 'guide-for-handlaggning/ansokan/' in housing),
    ('housing guidance remains local-only', "fetch(" not in housing and 'XMLHttpRequest' not in housing and 'localStorage' not in housing and 'sessionStorage' not in housing and "setAttribute('data-local-only', 'true')" in housing),
    ('housing guidance has sv ar fa parity', 'sv: {' in housing and 'ar: {' in housing and 'fa: {' in housing and "document.documentElement.lang" in housing),
    ('housing guidance keeps state across own mutations', 'if (existing) return;' in housing and 'if (existing) {\n      existing.remove();\n    }\n    cards.appendChild(buildGuide());' not in housing),
    ('housing guidance stays in same quick-help module', 'HOUSING_GUIDANCE_PATH = "client/housing-adaptation-guidance.js"' in builder and 'QUICK_RUNTIME_PATHS = (QUICK_LEARNING_PATH, QUICK_GUIDANCE_PATH, HOUSING_GUIDANCE_PATH)' in builder),
    ('housing permanent regression remains locked', any(case.get('case_id') == 'lab-disability-housing-tenure-v14-01' for case in v14.get('cases', []))),
    ('housing truth remains review-gated', housing_record.get('verification', {}).get('status') == 'NEEDS_REVIEW' and housing_record.get('verification', {}).get('human_review_required') is True and housing_record.get('verification', {}).get('material_fields_verified') == []),
]

failed = [name for name, ok in checks if not ok]
if failed:
    detail = ''
    if housing_syntax.returncode:
        detail += ' | housing node --check: ' + (housing_syntax.stderr or housing_syntax.stdout).strip()
    if family_age_syntax.returncode:
        detail += ' | family age node --check: ' + (family_age_syntax.stderr or family_age_syntax.stdout).strip()
    raise SystemExit('situation engine validation failed: ' + ', '.join(failed) + detail)
print(f'situation engine validation: OK ({len(checks)} invariants)')
