#!/usr/bin/env python3
from pathlib import Path
import re
import sys

root = Path('index.html')
person = Path('person-pilot.html')
company = Path('company-pilot.html')
for p in (root, person, company):
    if not p.exists():
        print(f'missing required unified-platform file: {p}', file=sys.stderr)
        raise SystemExit(1)

text = root.read_text(encoding='utf-8')
required = [
    'En Stödassistenten – flera ingångar',
    'Jag söker för mig själv',
    'Jag hjälper någon',
    'Student / ung vuxen',
    'Anställd',
    'Företag',
    'Förening',
    'actor_type=',
    'person-pilot.html',
    'company-pilot.html',
    'En produkt. Ett sanningslager. Ett lärsystem.',
]
for marker in required:
    if marker not in text:
        print(f'missing unified-shell marker: {marker}', file=sys.stderr)
        raise SystemExit(1)

actors = set(re.findall(r"entry\('([^']+)'", text))
expected = {'private_person','relative','student','employee','company','association','other'}
if actors != expected:
    print(f'actor entry mismatch: got {sorted(actors)} expected {sorted(expected)}', file=sys.stderr)
    raise SystemExit(1)

if 'fetch(' in text or 'XMLHttpRequest' in text:
    print('unified shell must not transmit situation data', file=sys.stderr)
    raise SystemExit(1)

if 'company-pilot.html' not in text or "actor==='company'" not in text:
    print('company module must route from common shell', file=sys.stderr)
    raise SystemExit(1)

# The preserved person pilot must still contain existing privacy and feedback behavior.
person_text = person.read_text(encoding='utf-8')
for marker in ['Stödassistenten – Pilot','FEEDBACK_ENDPOINT','Piloten sparar inte dina situationssvar centralt']:
    if marker not in person_text:
        print(f'person pilot regression marker missing: {marker}', file=sys.stderr)
        raise SystemExit(1)

print('unified platform shell validation: OK')
