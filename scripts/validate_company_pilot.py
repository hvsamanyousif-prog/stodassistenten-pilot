#!/usr/bin/env python3
from pathlib import Path
import re
import sys

p = Path('company-pilot.html')
if not p.exists():
    print('company-pilot.html missing', file=sys.stderr)
    raise SystemExit(1)

text = p.read_text(encoding='utf-8')

required = [
    'Företagspilot v0.1',
    'Hitta offentliga upphandlingar / lämna anbud',
    'Hitta finansiering eller företagsstöd',
    'Upphandlingsmyndigheten – Hitta affären i offentlig sektor',
    'Konkurrensverket – register över registrerade annonsdatabaser',
    'verksamt.se – Hitta rådgivning och finansiering',
    'Vi hittar inte på bidrag',
    'inte ett beslut om stöd, kvalificering eller kontrakt',
]
for marker in required:
    if marker not in text:
        print(f'missing required marker: {marker}', file=sys.stderr)
        raise SystemExit(1)

allowed_hosts = {
    'www.upphandlingsmyndigheten.se',
    'www.konkurrensverket.se',
    'verksamt.se',
}
urls = re.findall(r'href="https://([^/]+)/[^\"]*"', text)
for host in urls:
    if host not in allowed_hosts:
        print(f'unapproved external source host in company pilot: {host}', file=sys.stderr)
        raise SystemExit(1)

for forbidden in [
    'garanterat kontrakt',
    'garanterad finansiering',
    'du har rätt till bidrag',
    'ni kommer vinna',
]:
    if forbidden.lower() in text.lower():
        print(f'unsafe claim found: {forbidden}', file=sys.stderr)
        raise SystemExit(1)

if 'maxlength="500"' not in text:
    print('local company description must stay bounded', file=sys.stderr)
    raise SystemExit(1)

if 'fetch(' in text or 'XMLHttpRequest' in text:
    print('company pilot v0.1 must not transmit tester input', file=sys.stderr)
    raise SystemExit(1)

print('company pilot validation: OK')
