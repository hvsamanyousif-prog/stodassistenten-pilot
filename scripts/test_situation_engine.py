#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
index = (root / 'index.html').read_text(encoding='utf-8')
quick = (root / 'quick-help.html').read_text(encoding='utf-8')
routing = (root / 'client' / 'privacy-routing.js').read_text(encoding='utf-8')
person_context = (root / 'client' / 'person-context-learning.js').read_text(encoding='utf-8')

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
    ('assistance focus is allow-listed', "ALLOWED_PERSON_FOCUS=new Set(['assistance'])" in person_context and "focus==='assistance'" in person_context),
    ('assistance asks high-value facts', "assistWho:'Vem gäller hjälpbehovet?'" in person_context and "assistNeed:'Gäller hjälpen grundläggande vardagsbehov?'" in person_context and 'Din uppskattning är bara en vägvisare' in person_context),
    ('assistance authority split is fail-closed', '20 timmar eller mindre' in person_context and 'mer än 20 timmar' in person_context and 'En egen timuppskattning är inte samma sak som myndighetens bedömning.' in person_context),
    ('assistance uses primary authority sources', 'forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-vuxna' in person_context and 'forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-barn' in person_context),
    ('assistance results stay uncertain', "resultCard(r,i+2)" in person_context and 'Produkten avgör inte rätt till stöd.' in person_context),
]

failed = [name for name, ok in checks if not ok]
if failed:
    raise SystemExit('situation engine validation failed: ' + ', '.join(failed))
print(f'situation engine validation: OK ({len(checks)} invariants)')