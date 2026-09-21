"""Offline browser regression for bounded relation-leading procurement groups.

This verifies DOM/user-flow behavior in Chromium/WebKit. It is not live Pages,
physical Safari/iPhone/iPad, assistive-technology, legal or storage evidence.
"""
import hashlib
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('procurement-relation-groups-browser.json')
ENGINE = os.environ.get('BROWSER_ENGINE', 'chromium').strip().lower()
VIEWPORTS = [
    {'width': 390, 'height': 844},
    {'width': 1280, 'height': 900},
]

RELATION_CASES = [
    {
        'id': 'repeated-modal-for-det-fall-att-stays-bound',
        'text': 'Leverantören ska ha ansvarsförsäkring och för det fall att underleverantör används ska underleverantören ha ansvarsförsäkring.',
    },
    {
        'id': 'repeated-modal-for-det-fall-stays-bound',
        'text': 'Leverantören ska ha ansvarsförsäkring och för det fall underleverantör används ska underleverantören ha ansvarsförsäkring.',
    },
    {
        'id': 'semicolon-for-det-fall-stays-bound',
        'text': 'Leverantören ska ha ansvarsförsäkring; för det fall att underleverantör används ska underleverantören ha ansvarsförsäkring.',
    },
    {
        'id': 'numbered-for-det-fall-stays-bound',
        'text': '1) Leverantören ska ha ansvarsförsäkring 2) för det fall att underleverantör används ska underleverantören ha ansvarsförsäkring.',
    },
    {
        'id': 'repeated-modal-i-de-fall-stays-bound',
        'text': 'Leverantören ska ha ansvarsförsäkring och i de fall underleverantör används ska underleverantören ha ansvarsförsäkring.',
    },
    {
        'id': 'semicolon-i-de-fall-stays-bound',
        'text': 'Leverantören ska ha ansvarsförsäkring; i de fall underleverantör används ska underleverantören ha ansvarsförsäkring.',
    },
    {
        'id': 'numbered-i-de-fall-stays-bound',
        'text': '1) Leverantören ska ha ansvarsförsäkring 2) i de fall underleverantör används ska underleverantören ha ansvarsförsäkring.',
    },
    {
        'id': 'repeated-modal-annars-stays-bound',
        'text': 'Leverantören ska ha ansvarsförsäkring och annars ska leverantören ha ISO 9001-certifikat.',
    },
    {
        'id': 'semicolon-annars-stays-bound',
        'text': 'Leverantören ska ha ansvarsförsäkring; annars ska leverantören ha ISO 9001-certifikat.',
    },
    {
        'id': 'numbered-annars-stays-bound',
        'text': '1) Leverantören ska ha ansvarsförsäkring 2) annars ska leverantören ha ISO 9001-certifikat.',
    },
]

NEGATIVE_CONTROLS = [
    {
        'id': 'ordinary-temporal-context-still-segments',
        'text': 'Leverantören ska ha ansvarsförsäkring när avtalet börjar och leverantören ska ha ISO 9001-certifikat.',
    },
    {
        'id': 'independent-punctuation-still-segments',
        'text': 'Leverantören ska ha ansvarsförsäkring; leverantören ska ha ISO 9001-certifikat.',
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
    page.evaluate("() => { window.fetch = () => Promise.reject(new Error('Network disabled in relation-group regression')); }")
    page.add_script_tag(content=(ROOT / 'client/procurement-expert-pilot.js').read_text(encoding='utf-8'))
    return unexpected, errors


def start_case(page, text):
    page.locator('#startBtn').click()
    page.locator('[data-sector="construction"]').click()
    page.locator('#sourceText').fill(text)
    page.locator('#analyzeBtn').click()
    expect(page.locator('#analysisCard')).to_be_visible()


def run_relation_case(page, case):
    start_case(page, case['text'])
    check(page.locator('[data-ev]').count() == 1, f"{case['id']}: relation group was split into independent evidence controls")
    overview = page.locator('#priorityOverview').inner_text().lower()
    check('villkor eller undantag' in overview, f"{case['id']}: visible relation warning missing")
    check('flera materiella krav' in overview, f"{case['id']}: composite risk missing")
    check('källa rad 1' in overview, f"{case['id']}: source-line trace missing")
    page.locator('#openReviewBtn').click()
    full_review = page.locator('#requirements').inner_text().lower()
    check('villkor eller undantag' in full_review, f"{case['id']}: full-review relation warning missing")
    page.locator('[data-ev="1"]').select_option('yes')
    after = page.locator('#priorityOverview').inner_text().lower()
    check('villkor eller undantag' in after, f"{case['id']}: evidence=yes hid relation warning")
    check('flera materiella krav' in after, f"{case['id']}: evidence=yes hid composite risk")
    check('alla kravrader är genomgångna av dig' not in after, f"{case['id']}: false calm completion after evidence=yes")


def run_negative_control(page, case):
    start_case(page, case['text'])
    check(page.locator('[data-ev]').count() == 2, f"{case['id']}: safe independent requirements were swallowed into one group")
    overview = page.locator('#priorityOverview').inner_text().lower()
    check('flera materiella krav' not in overview, f"{case['id']}: safely segmented rows retained composite warning")
    page.locator('#openReviewBtn').click()
    expect(page.locator('#requirements')).to_be_visible()
    page.locator('[data-ev="1"]').select_option('yes')
    check(page.locator('[data-ev="2"]').input_value() == 'unknown', f"{case['id']}: first evidence mark leaked into sibling")


def run_case(page, case, relation):
    if relation:
        run_relation_case(page, case)
    else:
        run_negative_control(page, case)
    sizes = page.evaluate('({viewport:innerWidth,content:document.documentElement.scrollWidth})')
    check(sizes['content'] <= sizes['viewport'] + 1, f"{case['id']}: horizontal overflow {sizes}")


results = []
browser_version = None
harness_error = None
all_cases = [(case, True) for case in RELATION_CASES] + [(case, False) for case in NEGATIVE_CONTROLS]
expected_runs = len(VIEWPORTS) * len(all_cases)
try:
    with sync_playwright() as p:
        browser_type = getattr(p, ENGINE, None)
        if browser_type is None:
            raise RuntimeError(f'Unsupported BROWSER_ENGINE={ENGINE}')
        browser = browser_type.launch(headless=True)
        browser_version = browser.version
        try:
            for viewport in VIEWPORTS:
                for case, relation in all_cases:
                    context = None
                    try:
                        context = browser.new_context(viewport=viewport, reduced_motion='reduce')
                        page = context.new_page()
                        page.set_default_timeout(3000)
                        unexpected, errors = install_offline(page, context)
                        run_case(page, case, relation)
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

passed = sum(1 for row in results if row['status'] == 'PASS')
failed = sum(1 for row in results if row['status'] == 'FAIL')
report = {
    'scope': 'Offline bounded relation-group semantic-segmentation regression',
    'engine': ENGINE,
    'browser_version': browser_version,
    'viewports': [v['width'] for v in VIEWPORTS],
    'relation_case_count': len(RELATION_CASES),
    'negative_control_count': len(NEGATIVE_CONTROLS),
    'expected_runs': expected_runs,
    'executed_runs': len(results),
    'passed': passed,
    'failed': failed,
    'harness_error': harness_error,
    'network_mode': 'offline',
    'product_blob_sha1': sha1_blob(ROOT / 'client/procurement-expert-pilot.js'),
    'harness_blob_sha1': sha1_blob(Path(__file__)),
    'results': results,
}
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: report[k] for k in ('engine','browser_version','relation_case_count','negative_control_count','expected_runs','executed_runs','passed','failed','harness_error')}, ensure_ascii=False))
if harness_error or len(results) != expected_runs or failed:
    raise SystemExit(1)
