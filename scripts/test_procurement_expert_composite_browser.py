"""Focused offline browser regression for composite and explicitly segmented source rows.

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

# Explicit sentence/semicolon boundaries and tightly bounded conjunctions whose
# right-hand sibling carries its own normative modal are semantic-segmentation
# steps. They must create independent evidence controls while preserving the
# same physical source line. Implicit shared-modal conjunctions, relation-bound
# punctuation siblings and ambiguous repeated-modal prose remain one fail-closed
# composite row.
CASES = [
    {
        'id':'four-explicit-material-clauses-segment-independently',
        'text':'Leverantören ska ha ansvarsförsäkring. Arbetsledaren ska ha minst fem års erfarenhet. Pris ska anges i bilaga 6. Sista anbudsdag är 2026-10-30 klockan 23:59.',
        'expected_rows':4,
        'expect_composite':False,
        'segmented':True,
    },
    {
        'id':'three-explicit-material-clauses-segment-independently',
        'text':'Leverantören ska ha ansvarsförsäkring. Arbetsledaren ska ha minst fem års erfarenhet. Anbudspris ska anges i SEK.',
        'expected_rows':3,
        'expect_composite':False,
        'segmented':True,
    },
    {
        'id':'semicolon-qualification-plus-deadline-segment-independently',
        'text':'Leverantören ska ha ansvarsförsäkring; sista anbudsdag är 2026-10-30 klockan 23:59.',
        'expected_rows':2,
        'expect_composite':False,
        'segmented':True,
    },
    {
        'id':'semicolon-commercial-plus-deadline-segment-independently',
        'text':'Pris ska anges i bilaga 6; sista anbudsdag är 2026-10-30 klockan 23:59.',
        'expected_rows':2,
        'expect_composite':False,
        'segmented':True,
    },
    {
        'id':'repeated-modal-insurance-plus-certificate-segment-independently',
        'text':'Leverantören ska ha ansvarsförsäkring och ska ha ISO 9001-certifikat.',
        'expected_rows':2,
        'expect_composite':False,
        'segmented':True,
    },
    {
        'id':'repeated-modal-named-roles-segment-independently',
        'text':'Arbetsledaren ska ha minst fem års erfarenhet samt projektledaren ska ha minst tre års erfarenhet.',
        'expected_rows':2,
        'expect_composite':False,
        'segmented':True,
    },
    {
        'id':'same-line-lettered-list-segments-independently',
        'text':'a) Leverantören ska ha ansvarsförsäkring b) Leverantören ska ha ISO 9001-certifikat.',
        'expected_rows':2,
        'expect_composite':False,
        'segmented':True,
    },
    {
        'id':'same-line-numbered-list-segments-independently',
        'text':'1) Pris ska anges i bilaga 6 2) Sista anbudsdag är 2026-10-30 klockan 23:59.',
        'expected_rows':2,
        'expect_composite':False,
        'segmented':True,
    },
    {'id':'same-line-numbered-alternative-stays-relational-fail-closed','text':'1) Leverantören ska ha ansvarsförsäkring 2) alternativt ska leverantören ha likvärdigt försäkringsskydd.','category':'qualification','expected_rows':1,'expect_composite':True,'expect_relation':'villkor eller undantag'},
    {'id':'semicolon-alternative-stays-relational-fail-closed','text':'Anbudet ska lämnas elektroniskt; alternativt ska anbudet lämnas enligt reservrutinen.','category':'mandatory','expected_rows':1,'expect_composite':True,'expect_relation':'villkor eller undantag'},
    {'id':'sentence-exception-stays-relational-fail-closed','text':'Leverantören ska ha ansvarsförsäkring. Om inte beställaren skriftligen medger annat ska särskilt intyg lämnas.','category':'qualification','expected_rows':1,'expect_composite':True,'expect_relation':'villkor eller undantag'},
    {'id':'shared-modal-question-plus-bid-deadline-stays-fail-closed','text':'Frågor ska lämnas senast den 20 oktober och anbud senast den 31 oktober.','category':'deadline','expected_rows':1,'expect_composite':True},
    {'id':'shared-modal-participation-application-plus-bid-deadline-stays-fail-closed','text':'Anbudsansökan ska lämnas senast den 10 oktober och anbud senast den 31 oktober.','category':'deadline','expected_rows':1,'expect_composite':True},
    {'id':'single-clause-insurance-plus-certificate-stays-fail-closed','text':'Leverantören ska ha ansvarsförsäkring och ISO 9001-certifikat.','category':'qualification','expected_rows':1,'expect_composite':True},
    {'id':'same-family-two-distinct-certificates-stay-fail-closed','text':'Leverantören ska ha ISO 9001-certifikat och ISO 14001-certifikat.','category':'qualification','expected_rows':1,'expect_composite':True},
    {'id':'same-family-two-distinct-reference-scopes-stay-fail-closed','text':'Leverantören ska ha två referensuppdrag inom markentreprenad och två referensuppdrag inom elinstallationer.','category':'qualification','expected_rows':1,'expect_composite':True},
    {'id':'single-clause-reference-plus-named-role-experience-stays-fail-closed','text':'Leverantören ska ha två referensuppdrag och en arbetsledare med minst fem års erfarenhet.','category':'qualification','expected_rows':1,'expect_composite':True},
    {'id':'same-family-two-distinct-named-role-competence-obligations-stay-fail-closed','text':'Leverantören ska ha en arbetsledare med minst fem års erfarenhet och en projektledare med minst tre års erfarenhet.','category':'qualification','expected_rows':1,'expect_composite':True},
    {'id':'single-clause-reference-plus-register-qualification-stays-fail-closed','text':'Leverantören ska ha två referensuppdrag och vara registrerad i ett aktiebolags-, handels- eller föreningsregister.','category':'qualification','expected_rows':1,'expect_composite':True},
    {'id':'single-clause-reference-plus-technical-equipment-stays-fail-closed','text':'Leverantören ska ha två referensuppdrag och förfoga över den tekniska utrustningen för uppdraget.','category':'qualification','expected_rows':1,'expect_composite':True},
    {'id':'single-clause-reference-plus-contract-performance-stays-fail-closed','text':'Leverantören ska ha två referensuppdrag och under avtalstiden kunna inställa sig inom två timmar.','category':'contract','expected_rows':1,'expect_composite':True},
    {'id':'single-clause-reference-plus-work-environment-obligation-stays-fail-closed','text':'Leverantören ska ha två referensuppdrag och under avtalstiden följa arbetsmiljöplanen.','category':'contract','expected_rows':1,'expect_composite':True},
    {'id':'single-clause-reference-plus-commercial-price-obligation-stays-fail-closed','text':'Leverantören ska ha två referensuppdrag och ange ett fast pris i prisbilaga 6.','category':'commercial','expected_rows':1,'expect_composite':True},
    {'id':'requested-description-plus-plan-stays-fail-closed','text':'Anbudet ska innehålla en metodbeskrivning och en genomförandeplan.','category':'mandatory','expected_rows':1,'expect_composite':True},
    {'id':'requested-risk-analysis-plus-plan-stays-fail-closed','text':'Anbudet ska innehålla en riskanalys och en tidplan.','category':'mandatory','expected_rows':1,'expect_composite':True},
    {'id':'requested-staff-cv-plus-reference-list-stays-fail-closed','text':'Anbudet ska innehålla CV för arbetsledaren och en lista med två referensuppdrag.','category':'qualification','expected_rows':1,'expect_composite':True},
    {'id':'descriptive-second-certificate-does-not-fabricate-cardinality','text':'Leverantören ska ha ISO 9001-certifikat och information om ISO 14001-certifikat används endast som bakgrund.','category':'qualification','expected_rows':1,'expect_composite':False},
    {'id':'descriptive-second-reference-scope-does-not-fabricate-cardinality','text':'Leverantören ska ha två referensuppdrag inom markentreprenad och information om referensuppdrag inom elinstallationer används endast som bakgrund.','category':'qualification','expected_rows':1,'expect_composite':False},
    {'id':'descriptive-second-named-role-does-not-fabricate-cardinality','text':'Leverantören ska ha en arbetsledare med minst fem års erfarenhet och projektledaren nämns endast i bakgrundsbeskrivningen.','category':'qualification','expected_rows':1,'expect_composite':False},
    {'id':'descriptive-register-outside-normative-clause-does-not-fabricate-composite','text':'Leverantören ska ha två referensuppdrag; registrering i aktiebolags-, handels- eller föreningsregister beskrivs endast som bakgrund.','category':'qualification','expected_rows':1,'expect_composite':False},
    {'id':'descriptive-technical-equipment-outside-normative-clause-does-not-fabricate-composite','text':'Leverantören ska ha två referensuppdrag; den tekniska utrustningen beskrivs endast som bakgrund.','category':'qualification','expected_rows':1,'expect_composite':False},
    {'id':'descriptive-contract-performance-outside-normative-clause-does-not-fabricate-composite','text':'Leverantören ska ha två referensuppdrag; inställelsetiden under avtalstiden beskrivs endast som bakgrund.','category':'contract','expected_rows':1,'expect_composite':False},
    {'id':'descriptive-work-environment-outside-normative-clause-does-not-fabricate-composite','text':'Leverantören ska ha två referensuppdrag; arbetsmiljöplanen under avtalstiden beskrivs endast som bakgrund.','category':'contract','expected_rows':1,'expect_composite':False},
    {'id':'descriptive-commercial-price-does-not-fabricate-composite','text':'Leverantören ska ha två referensuppdrag och information om fast pris i prisbilaga 6 används endast som bakgrund.','category':'commercial','expected_rows':1,'expect_composite':False},
    {'id':'descriptive-named-role-experience-outside-normative-clause-does-not-fabricate-composite','text':'Leverantören ska ha två referensuppdrag; information om arbetsledarens erfarenhet används endast som bakgrund.','category':'qualification','expected_rows':1,'expect_composite':False},
    {'id':'descriptive-requested-description-does-not-fabricate-composite','text':'Anbudet ska innehålla en metodbeskrivning och genomförandeplanen nämns endast i bakgrundsbeskrivningen.','category':'mandatory','expected_rows':1,'expect_composite':False},
    {'id':'background-plan-does-not-fabricate-requested-risk-analysis-composite','text':'Anbudet ska innehålla en riskanalys och information om tidplan används endast som bakgrund.','category':'mandatory','expected_rows':1,'expect_composite':False},
    {'id':'background-reference-mention-does-not-fabricate-requested-staff-composite','text':'Anbudet ska innehålla CV för arbetsledaren och information om referensuppdrag används endast som bakgrund.','category':'qualification','expected_rows':1,'expect_composite':False},
    {'id':'background-bid-date-does-not-fabricate-process-event-multiplicity','text':'Frågor ska lämnas senast den 20 oktober och anbudsdatumet den 31 oktober nämns endast som bakgrund.','category':'deadline','expected_rows':1,'expect_composite':False},
    {
        'id':'background-bid-date-does-not-fabricate-participation-process-event-multiplicity',
        'text':'Anbudsansökan ska lämnas senast den 10 oktober och information om planerad anbudsdag den 31 oktober lämnas endast som bakgrund.',
        'category':'deadline',
        'expected_rows':1,
        'expect_composite':False,
        'expect_residual_risk':'tidsfrist för anbudsansökan',
    },
    {'id':'repeated-modal-narrative-sibling-stays-fail-closed','text':'Leverantören ska ha ansvarsförsäkring och informationen ska användas som bakgrund.','category':'qualification','expected_rows':1,'expect_composite':True},
    {'id':'single-evidence-object-with-descriptive-and-does-not-fabricate-composite','text':'Leverantören ska ha ansvarsförsäkring som omfattar verksamheten och gäller från startdagen.','category':'qualification','expected_rows':1,'expect_composite':False},
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


def run_segmented_case(page, case):
    count = case['expected_rows']
    check(page.locator('[data-ev]').count() == count, f"{case['id']}: expected {count} independent evidence controls")
    check(page.locator('[data-cat]').count() == count, f"{case['id']}: expected {count} independent category controls")

    overview = page.locator('#priorityOverview').inner_text().lower()
    check('flera materiella krav' not in overview, f"{case['id']}: independently segmented clauses retained composite-row warning")
    check('källa rad 1' in overview, f"{case['id']}: physical source-line trace missing from overview")

    page.locator('#openReviewBtn').click()
    check(page.locator('#reviewDetails').get_attribute('open') is not None, f"{case['id']}: full review did not open")
    full_review = page.locator('#requirements').inner_text().lower()
    check('flera materiella krav' not in full_review, f"{case['id']}: segmented clauses retained composite warning in full review")
    check(full_review.count('källa rad 1') >= count, f"{case['id']}: not every segment preserved physical source-line trace")

    page.locator('[data-ev="1"]').select_option('yes')
    for sibling_id in range(2, count + 1):
        check(page.locator(f'[data-ev="{sibling_id}"]').input_value() == 'unknown', f"{case['id']}: evidence on first segment leaked into sibling {sibling_id}")
    overview_after = page.locator('#priorityOverview').inner_text().lower()
    summary_after = page.locator('#summary').inner_text().lower()
    check('alla kravrader är genomgångna av dig' not in overview_after, f"{case['id']}: one segment produced false calm completion")
    check('0 osäkra/ej bedömda' not in summary_after, f"{case['id']}: sibling uncertainty disappeared after one evidence mark")


def run_single_row_case(page, case):
    check(page.locator('[data-ev]').count() == 1, f"{case['id']}: physical row was unexpectedly split")
    check(page.locator('[data-cat]').first.input_value() == case['category'], f"{case['id']}: unexpected category")

    overview = page.locator('#priorityOverview').inner_text().lower()
    if case['expect_composite']:
        check('flera materiella krav' in overview, f"{case['id']}: composite risk missing from short overview")
        check('källa rad 1' in overview, f"{case['id']}: physical source trace missing")
        check('börja med de markerade riskerna' in overview, f"{case['id']}: risk is not next action")
    else:
        check('flera materiella krav' not in overview, f"{case['id']}: descriptive conjunction fabricated composite risk")
    relation = case.get('expect_relation')
    if relation:
        check(relation in overview, f"{case['id']}: relation/exception risk missing from short overview")

    page.locator('#openReviewBtn').click()
    check(page.locator('#reviewDetails').get_attribute('open') is not None, f"{case['id']}: full review did not open")
    full_review_before = page.locator('#requirements').inner_text().lower()
    if case['expect_composite']:
        check('flera materiella krav' in full_review_before, f"{case['id']}: composite risk missing from full review")
    else:
        check('flera materiella krav' not in full_review_before, f"{case['id']}: descriptive conjunction fabricated full-review composite risk")
        residual = case.get('expect_residual_risk')
        if residual:
            check(residual in full_review_before, f"{case['id']}: expected independent source-control risk disappeared")
    if relation:
        check(relation in full_review_before, f"{case['id']}: relation/exception risk missing from full review")

    page.locator('[data-ev="1"]').select_option('yes')
    overview_after = page.locator('#priorityOverview').inner_text().lower()
    summary_after = page.locator('#summary').inner_text().lower()
    if case['expect_composite']:
        check('flera materiella krav' in overview_after, f"{case['id']}: manual evidence=yes hid composite risk")
        check('alla kravrader är genomgångna av dig' not in overview_after, f"{case['id']}: false calm completion after evidence=yes")
        check('1 osäkra/ej bedömda' in summary_after, f"{case['id']}: unresolved composite row disappeared from summary")
    else:
        check('flera materiella krav' not in overview_after, f"{case['id']}: evidence=yes introduced composite risk")
        residual = case.get('expect_residual_risk')
        if residual:
            check(residual in overview_after, f"{case['id']}: legitimate source-control risk was hidden after evidence=yes")
            check('1 osäkra/ej bedömda' in summary_after, f"{case['id']}: legitimate source-control risk disappeared from summary")
        else:
            check('1 osäkra/ej bedömda' not in summary_after, f"{case['id']}: simple single-object row stayed uncertain without another risk")
    if relation:
        check(relation in overview_after, f"{case['id']}: evidence=yes hid relation/exception risk")


def run_case(page, case):
    page.locator('#startBtn').click()
    page.locator('[data-sector="construction"]').click()
    page.locator('#sourceText').fill(case['text'])
    page.locator('#analyzeBtn').click()
    expect(page.locator('#analysisCard')).to_be_visible()

    if case.get('segmented'):
        run_segmented_case(page, case)
    else:
        run_single_row_case(page, case)

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

passed = sum(1 for row in results if row['status'] == 'PASS')
failed = sum(1 for row in results if row['status'] == 'FAIL')
report = {
    'scope': 'Focused offline composite-row and bounded semantic-segmentation source-risk regression',
    'engine': ENGINE,
    'browser_version': browser_version,
    'viewports': [v['width'] for v in VIEWPORTS],
    'case_count': len(CASES),
    'segmented_case_count': sum(1 for case in CASES if case.get('segmented')),
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
print(json.dumps({k: report[k] for k in ('engine','browser_version','case_count','segmented_case_count','expected_runs','executed_runs','passed','failed','harness_error')}, ensure_ascii=False))
if harness_error or len(results) != expected_runs or failed:
    raise SystemExit(1)