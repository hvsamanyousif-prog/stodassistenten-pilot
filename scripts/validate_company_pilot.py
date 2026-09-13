#!/usr/bin/env python3
from pathlib import Path
import re
import sys

FEEDBACK_ENDPOINT = 'https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback'
FORBIDDEN_PAYLOAD_FIELDS = ('description', 'sector', 'geography', 'capacity', 'references', 'docs')
TRUTHFUL_PRIVACY_MARKER = 'Dina situationssvar och företagsbeskrivningen stannar i webbläsaren.'
LEGACY_MISLEADING_MARKER = 'Dina svar i den här v0.1-sidan stannar i webbläsaren och skickas inte till Stödassistenten.'


class ValidationError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise ValidationError(message)


def validate(text):
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
        require(marker in text, f'missing required marker: {marker}')

    allowed_hosts = {
        'www.upphandlingsmyndigheten.se',
        'www.konkurrensverket.se',
        'verksamt.se',
    }
    urls = re.findall(r'href="https://([^/]+)/[^\"]*"', text)
    for host in urls:
        require(host in allowed_hosts, f'unapproved external source host in company pilot: {host}')

    for forbidden in [
        'garanterat kontrakt',
        'garanterad finansiering',
        'du har rätt till bidrag',
        'ni kommer vinna',
    ]:
        require(forbidden.lower() not in text.lower(), f'unsafe claim found: {forbidden}')

    require('maxlength="500"' in text, 'local company description must stay bounded')
    require(TRUTHFUL_PRIVACY_MARKER in text, 'company pilot must distinguish local situation data from optional product feedback')
    require(LEGACY_MISLEADING_MARKER not in text, 'misleading blanket privacy claim must not remain when product feedback can be sent')

    require(
        f"const FEEDBACK_ENDPOINT='{FEEDBACK_ENDPOINT}';" in text,
        'company feedback may only target the approved existing pilot feedback endpoint',
    )
    require(text.count('fetch(') == 1, 'company pilot may only perform one narrowly scoped network request')
    require('fetch(FEEDBACK_ENDPOINT' in text, 'company network request must use the approved feedback endpoint constant')
    require('XMLHttpRequest' not in text, 'unexpected XMLHttpRequest network path')
    for marker in ("credentials:'omit'", "referrerPolicy:'no-referrer'", "cache:'no-store'"):
        require(marker in text, f'company feedback request missing privacy control: {marker}')

    function_start = text.find('async function submitCompanyFeedback()')
    require(function_start >= 0, 'submitCompanyFeedback function missing')
    payload_start = text.find('const payload={app_version:APP_VERSION', function_start)
    payload_end = text.find('};try', payload_start)
    require(payload_start >= 0 and payload_end > payload_start, 'company feedback payload could not be isolated')
    payload = text[payload_start:payload_end]

    for forbidden in FORBIDDEN_PAYLOAD_FIELDS:
        require(forbidden not in payload, f'company feedback must not send {forbidden}')
    for marker in (
        "flow:'company'",
        'learned_new:feedback.new',
        'useful:feedback.useful',
        'next_step_clear:feedback.clear',
        'ratings:feedback.ratings',
    ):
        require(marker in payload, f'company feedback payload missing expected product metric: {marker}')


def expect_rejected(mutated_text, label):
    try:
        validate(mutated_text)
    except ValidationError:
        return
    raise AssertionError(f'red-team mutation was not rejected: {label}')


p = Path('company-pilot.html')
if not p.exists():
    print('company-pilot.html missing', file=sys.stderr)
    raise SystemExit(1)

text = p.read_text(encoding='utf-8')
try:
    validate(text)
except ValidationError as exc:
    print(str(exc), file=sys.stderr)
    raise SystemExit(1)

payload_marker = 'const payload={app_version:APP_VERSION,'
expect_rejected(
    text.replace(payload_marker, payload_marker + 'description:state.description,', 1),
    'sensitive company description exfiltration',
)
expect_rejected(
    text.replace("credentials:'omit'", "credentials:'include'", 1),
    'credentialed feedback request',
)
expect_rejected(
    text.replace(TRUTHFUL_PRIVACY_MARKER, LEGACY_MISLEADING_MARKER, 1),
    'misleading privacy disclosure',
)

print('company pilot validation + feedback privacy red-team: OK')
