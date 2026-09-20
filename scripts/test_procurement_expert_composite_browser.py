"""Focused offline browser regression for composite physical source rows.

Offline Chromium/WebKit evidence only. Network is disabled. A manual evidence mark is
not source verification. This is not live Pages, physical Safari/iPad/iPhone,
assistive-technology, legal or storage evidence.
"""
import hashlib
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('procurement-composite-browser.json')
ENGINE = os.environ.get('BROWSER_ENGINE', 'chromium').strip().lower()
VIEWPORTS = [
    {'width': 320, 'height': 800},
    {'width': 1280, 'height': 900},
]
CASES = [
    {
        'id': 'four-material-clauses-stay-fail-closed',
        'text': 'Leverantören ska ha ansvarsförsäkring. Arbetsledaren ska ha minst fem års erfarenhet. Pris ska anges i bilaga 6. Sista anbudsdag är 2026-10-30 klockan 23:59.',
        'category': 'deadline',
        'expect_composite': True,
    },
    {
        'id': 'three-material-clauses-stay-fail-closed',
        'text': 'Leverantören ska ha ansvarsförsäkring. Arbetsledaren ska ha minst fem års erfarenhet. Anbudspris ska anges i SEK.',
        'category': 'commercial',
        'expect_composite': True,
    },
    {
        'id': 'semicolon-qualification-plus-deadline-stays-fail-closed',
        'text': 'Leverantören ska ha ansvarsförsäkring; sista anbudsdag är 2026-10-30 klockan 23:59.',
        'category': 'deadline',
        'expect_composite': True,
    },
    {
        'id': 'semicolon-commercial-plus-deadline-stays-fail-closed',
        'text': 'Pris ska anges i bilaga 6; sista anbudsdag är 2026-10-30 klockan 23:59.',
        'category': 'deadline',
        'expect_composite': True,
    },
    {
        'id': 'single-clause-insurance-plus-certificate-stays-fail-closed',
        'text': 'Leverantören ska ha ansvarsförsäkring och ISO 9001-certifikat.',
        'category': 'qualification',
        'expect_composite': True,
    },
    {
        'id': 'same-family-two-distinct-certificates-stay-fail-closed',
        'text': 'Leverantören ska ha ISO 9001-certifikat och ISO 14001-certifikat.',
        'category': 'qualification',
        'expect_composite': True,
    },
    {
        'id': 'same-family-two-distinct-reference-scopes-stay-fail-closed',
        'text': 'Leverantören ska ha två referensuppdrag inom markentreprenad och två referensuppdrag inom elinstallationer.',
        'category': 'qualification',
        'expect_composite': True,
    },
    {
        'id': 'single-clause-reference-plus-named-role-experience-stays-fail-closed',
        'text': 'Leverantören ska ha två referensuppdrag och en arbetsledare med minst fem års erfarenhet.',
        'category': 'qualification',
        'expect_composite': True,
    },
    {
        'id': 'same-family-two-distinct-named-role-competence-obligations-stay-fail-closed',
        'text': 'Leverantören ska ha en arbetsledare med minst fem års erfarenhet och en projektledare med minst tre års erfarenhet.',
        'category': 'qualification',
        'expect_composite': True,
    },
    {
        'id': 'single-clause-reference-plus-register-qualification-stays-fail-closed',
        'text': 'Leverantören ska ha två referensuppdrag och vara registrerad i ett aktiebolags-, handels- eller föreningsregister.',
        'category': 'qualification',
        'expect_composite': True,
    },
    {
        'id': 'single-clause-reference-plus-technical-equipment-stays-fail-closed',
        'text': 'Leverantören ska ha två referensuppdrag och förfoga över den tekniska utrustningen för uppdraget.',
        'category': 'qualification',
        'expect_composite': True,
    },
    {
        'id': 'single-clause-reference-plus-contract-performance-stays-fail-closed',
        'text': 'Leverantören ska ha två referensuppdrag och under avtalstiden kunna inställa sig inom två timmar.',
        'category': 'contract',
        'expect_composite': True,
    },
    {
        'id': 'single-clause-reference-plus-work-environment-obligation-stays-fail-closed',
        'text': 'Leverantören ska ha två referensuppdrag och under avtalstiden följa arbetsmiljöplanen.',
        'category': 'contract',
        'expect_composite': True,
    },
    {
        'id': 'descriptive-second-certificate-does-not-fabricate-cardinality',
        'text': 'Leverantören ska ha ISO 9001-certifikat och information om ISO 14001-certifikat används endast som bakgrund.',
        'category': 'qualification',
        'expect_composite': False,
    },
    {
        'id': 'descriptive-second-reference-scope-does-not-fabricate-cardinality',
        'text': 'Leverantören ska ha två referensuppdrag inom markentreprenad och information om referensuppdrag inom elinstallationer används endast som bakgrund.',
        'category': 'qualification',
        'expect_composite': False,
    },
    {
        'id': 'descriptive-second-named-role-does-not-fabricate-cardinality',
        'text': 'Leverantören ska ha en arbetsledare med minst fem års erfarenhet och projektledaren nämns endast i bakgrundsbeskrivningen.',
        'category': 'qualification',
        'expect_composite': False,
    },
    {
        'id': 'descriptive-register-outside-normative-clause-does-not-fabricate-composite',
        'text': 'Leverantören ska ha två referensuppdrag; registrering i aktiebolags-, handels- eller föreningsregister beskrivs endast som bakgrund.',
        'category': 'qualification',
        'expect_composite': False,
    },
    {
        'id': 'descriptive-technical-equipment-outside-normative-clause-does-not-fabricate-composite',
        'text': 'Leverantören ska ha två referensuppdrag; den tekniska utrustningen beskrivs endast som bakgrund.',
        'category': 'qualification',
        'expect_composite': False,
    },
    {
        'id': 'descriptive-contract-performance-outside-normative-clause-does-not-fabricate-composite',
        'text': 'Leverantören ska ha två referensuppdrag; inställelsetiden under avtalstiden beskrivs endast som bakgrund.',
        'category': 'contract',
        'expect_composite': False,
    },
    {
        'id': 'descriptive-work-environment-outside-normative-clause-does-not-fabricate-composite',
        'text': 'Leverantören ska ha två referensuppdrag; arbetsmiljöplanen under avtalstiden beskrivs endast som bakgrund.',
        'category': 'contract',
        'expect_composite': False,
    },
    {
        'id': 'descriptive-named-role-experience-outside-normative-clause-does-not-fabricate-composite',
        'text': 'Leverantören ska ha två referensuppdrag; information om arbetsledarens erfarenhet används endast som bakgrund.',
        'category': 'qualification',
        'expect_composite': False,
    },
    {
        'id': 'single-evidence-object-with-descriptive-and-does-not-fabricate-composite',
        'text': 'Leverantören ska ha ansvarsförsäkring som omfattar verksamheten och gäller från startdagen.',
        'category': 'qualification',
        'expect_composite': False,
    },
]


def check(ok, message):
    if not ok:
        raise AssertionError(message)


def sha1_blob(path):
    data = path.read_bytes()
    return hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()


def install_offline(page, context):
    unexpected = []
    errors = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))

    def block(route):
        unexpected.append(route.request.url)
        route.abort()

    context.route('**/*', block)
    html = (ROOT / 'procurement-expert-pilot.html').read_text(encoding='utf-8')
    html = html.replace('<script src="client/procurement-expert-pilot.js"></script>', '')
    page.set_content(html)
    page.evaluate("() => { window.fetch = () => Promise.reject(new Error('Network disabled in composite-row regression')); }")
    page.add_script_tag(content=(ROOT / 'client/procurement-expert-pilot.js').read_text(encoding='utf-8'))
    return unexpected, errors


def run_case(page, case):
    page.locator('#startBtn').click()
    page.locator('[data-sector="construction"]').click()
    page.locator('#sourceText').fill(case['text'])
    page.locator('#analyzeBtn').click()
    expect(page.locator('#analysisCard')).to_be_visible()

    check(page.locator('[data-ev]').count() == 1, f"{case['id']}: physical row was unexpectedly split")
    check(page.locator('[data-cat]').first.input_value() == case['category'], f"{case['id']}: unexpected category")

    overview = page.locator('#priorityOverview').inner_text().lower()
    if case['expect_composite']:
        check('flera materiella krav' in overview, f"{case['id']}: composite risk missing from short overview")
        check('källa rad 1' in overview, f"{case['id']}: physical source trace missing")
        check('börja med de markerade riskerna' in overview, f"{case['id']}: risk is not next action")
    else:
        check('flera materiella krav' not in overview, f"{case['id']}: descriptive conjunction fabricated composite risk")

    page.locator('#openReviewBtn').click()
    check(page.locator('#reviewDetails').get_attribute('open') is not None, f"{case['id']}: full review did not open")
    full_review_before = page.locator('#requirements').inner_text().lower()
    if case['expect_composite']:
        check('flera materiella krav' in full_review_before, f"{case['id']}: composite risk missing from full review")
    else:
        check('flera materiella krav' not in full_review_before, f"{case['id']}: descriptive conjunction fabricated full-review composite risk")

    page.locator('[data-ev="1"]').select_option('yes')
    overview_after = page.locator('#priorityOverview').inner_text().lower()
    summary_after = page.locator('#summary').inner_text().lower()
    if case['expect_composite']:
        check('flera materiella krav' in overview_after, f"{case['id']}: manual evidence=yes hid composite risk")
        check('alla kravrader är genomgångna av dig' not in overview_after, f"{case['id']}: false calm completion after evidence=yes")
        check('1 osäkra/ej bedömda' in summary_after, f"{case['id']}: unresolved composite row disappeared from summary")
    else:
        check('flera materiella krav' not in overview_after, f"{case['id']}: evidence=yes introduced composite risk")
        check('1 osäkra/ej bedömda' not in summary_after, f"{case['id']}: simple single-object row stayed uncertain without another risk")

    sizes = page.evaluate('({viewport:innerWidth,content:document.documentElement.scrollWidth})')
    check(sizes['content'] <= sizes['viewport'] + 1, f"{case['id']}: horizontal overflow {sizes}")


results = []
browser_version = None
harness_error = None
expected_runs = len(VIEWPORTS) * len(CASES)
try:
    with sync_playwright() as p:
        browser_type = getattr(p, ENGINE, None)
        if browser_type is None:
            raise RuntimeError(f'Unsupported BROWSER_ENGINE={ENGINE}')
        browser = browser_type.launch(headless=True)
        browser_version = browser.version
        try:
            for viewport in VIEWPORTS:
                for case in CASES:
                    context = None
                    try:
                        context = browser.new_context(viewport=viewport, reduced_motion='reduce')
                        page = context.new_page()
                        page.set_default_timeout(3000)
                        unexpected, errors = install_offline(page, context)
                        run_case(page, case)
                        check(not errors, 'JavaScript errors: ' + str(errors))
                        check(not unexpected, 'Unexpected external requests: ' + str(unexpected))
                        results.append({'case': case['id'], 'width': viewport['width'], 'status': 'PASS'})
                    except Exception as exc:
                        results.append({'case': case['id'], 'width': viewport['width'], 'status': 'FAIL', 'error': str(exc).split('\n')[0]})
                    finally:
                        if context is not None:
                            context.close()
        finally:
            browser.close()
except Exception as exc:
    harness_error = f'{type(exc).__name__}: {exc}'

report = {
    'scope': 'Focused offline composite physical-row source-risk regression. Network disabled; manual evidence marking is not source verification. No live Pages, storage, legal, physical Safari/iPad/iPhone or assistive-technology claim.',
    'engine': ENGINE,
    'browser_version': browser_version,
    'viewports': VIEWPORTS,
    'independent_cases': len(CASES),
    'expected_runs': expected_runs,
    'executed_runs': len(results),
    'harness_error': harness_error,
    'passed': sum(x['status'] == 'PASS' for x in results),
    'failed': sum(x['status'] == 'FAIL' for x in results),
    'sources': {
        'procurement-expert-pilot.html': sha1_blob(ROOT / 'procurement-expert-pilot.html'),
        'client/procurement-expert-pilot.js': sha1_blob(ROOT / 'client/procurement-expert-pilot.js'),
    },
    'results': results,
}
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
if harness_error or len(results) != expected_runs or report['failed']:
    sys.exit(1)
