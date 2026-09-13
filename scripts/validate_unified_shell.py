#!/usr/bin/env python3
from pathlib import Path
import sys

root = Path('index.html')
person = Path('person-pilot.html')
company = Path('company-pilot.html')
quick = Path('quick-help.html')
for p in (root, person, company, quick):
    if not p.exists():
        print(f'missing required unified-platform file: {p}', file=sys.stderr)
        raise SystemExit(1)

text = root.read_text(encoding='utf-8')
required = [
    'En Stödassistenten – flera ingångar',
    'id="situation"',
    'function classify(text)',
    'Situationsmotor',
    'Tandvård',
    'Synnedsättning',
    'Studier & ung vuxen',
    'Företag & offentlig affär',
    'Förening',
    'person-pilot.html?actor_type=',
    'company-pilot.html?actor_type=company',
    'quick-help.html?mode=dental',
    'quick-help.html?mode=vision',
    'En produkt. En intelligens. Ett sanningslager. Ett lärsystem.',
]
for marker in required:
    if marker not in text:
        print(f'missing unified-shell marker: {marker}', file=sys.stderr)
        raise SystemExit(1)

for actor in ('private_person','relative','student','employee','company','association','other'):
    if f'actor_type={actor}' not in text:
        print(f'missing unified actor route: {actor}', file=sys.stderr)
        raise SystemExit(1)

if 'fetch(' in text or 'XMLHttpRequest' in text:
    print('unified shell must not transmit situation data', file=sys.stderr)
    raise SystemExit(1)

# The preserved person pilot must still contain existing privacy and feedback behavior.
person_text = person.read_text(encoding='utf-8')
for marker in ['Stödassistenten – Pilot','FEEDBACK_ENDPOINT','Piloten sparar inte dina situationssvar centralt']:
    if marker not in person_text:
        print(f'person pilot regression marker missing: {marker}', file=sys.stderr)
        raise SystemExit(1)

print('unified platform shell validation: OK')
