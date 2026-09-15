"""Offline candidate DOM/JavaScript browser audit. No network navigation or production writes.
Usage: python scripts/test_procurement_expert_browser.py PATH_TO_REPO_OR_CANDIDATE [OUTPUT_JSON]
Requires Playwright + a Chromium binary (CHROMIUM_PATH can override the system default).
"""
import hashlib
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('procurement-browser-audit.json')
results = []


def check(ok, message):
    if not ok:
        raise AssertionError(message)


def custom(page, text, sector='construction'):
    page.locator('#startBtn').click()
    if sector:
        page.locator(f'[data-sector="{sector}"]').click()
    page.locator('#sourceText').fill(text)
    page.locator('#analyzeBtn').click()
    expect(page.locator('#analysisCard')).to_be_visible()


def rate(page):
    for el in page.locator('[data-score]').all():
        el.select_option('4')
    for name in ['foundIssue', 'useful', 'clearNext']:
        page.locator('#' + name).select_option('yes')


# Independent synthetic procurement scenarios. These expected results are written as
# procurement-review outcomes, not generated from the implementation regexes.
sector_scenarios = {
    'construction': {
        'text': '\n'.join([
            '3.1 Leverantören ska ha genomfört minst två referensuppdrag av liknande art.',
            '4.1 Anbudsgivaren ska inneha ansvarsförsäkring enligt bilaga 2.',
            '6.1 Tilldelning sker enligt bästa förhållandet mellan pris och kvalitet.',
            '9.1 Sista anbudsdag är 2026-10-30 klockan 23:59.',
        ]),
        'expected': ['qualification', 'mandatory', 'award', 'deadline'],
    },
    'cleaning': {
        'text': '\n'.join([
            'Leverantören ska ha minst två dokumenterade referensuppdrag inom lokalvård.',
            'Daglig städning ska utföras enligt hygienkraven i kravspecifikationen.',
            'Samtliga priser anges i prisbilaga 3.',
            'Under avtalstiden gäller vite vid utebliven kvalitetsrapportering.',
        ]),
        'expected': ['qualification', 'mandatory', 'commercial', 'contract'],
    },
    'consulting': {
        'text': '\n'.join([
            'Anbudsgivaren ska ha dokumenterad teknisk och yrkesmässig kapacitet.',
            'Intervjun utvärderas och kan ge maximalt 20 poäng.',
            'Timpris ska anges i prisbilagan.',
            'Frågor om underlaget ska lämnas senast den 20 oktober.',
        ]),
        'expected': ['qualification', 'award', 'commercial', 'deadline'],
    },
    'property': {
        'text': '\n'.join([
            'Leverantören ska ha två relevanta referensuppdrag inom fastighetsdrift.',
            'Under avtalstiden gäller vite enligt kontraktsbilagan.',
            'Fast pris ska anges för planerat underhåll.',
            'Anbud ska vara beställaren tillhanda senast den 31 oktober klockan 23:59.',
        ]),
        'expected': ['qualification', 'contract', 'commercial', 'deadline'],
    },
}


def sector_case(sector):
    def run(page, network):
        scenario = sector_scenarios[sector]
        custom(page, scenario['text'], sector)
        actual = [el.input_value() for el in page.locator('[data-cat]').all()]
        check(actual == scenario['expected'], f'{sector}: expected {scenario["expected"]}, got {actual}')
        expect(page.locator('#feedbackCard')).to_be_visible()
    return run


def sample(page, network):
    page.locator('#sampleBtn').click()
    expect(page.locator('#requirements .req')).to_have_count(9)
    check(not page.locator('#draft').is_visible(), 'Draft should stay collapsed initially')


def own_input_no_default_sector(page, network):
    page.locator('#startBtn').click()
    check(page.locator('#sectorGrid .choice.active').count() == 0, 'Own-input flow must not pretend construction is selected')
    page.locator('#sourceText').fill('Anbudet ska innehålla ett undertecknat intyg.')
    page.locator('#analyzeBtn').click()
    expect(page.locator('#analysisCard')).to_be_visible()


def source_line(page, network):
    custom(page, 'Rubrik\n\nLeverantören ska ha två referensuppdrag.')
    row = page.locator('#requirements .req').filter(has_text='Leverantören ska ha två referensuppdrag.')
    check(row.locator('.source').inner_text().endswith('3'), 'Original line 3 is displayed as ' + row.locator('.source').inner_text())


def all_rows(page, network):
    custom(page, '\n'.join(f'{i}. Anbudet ska innehålla dokument {i}.' for i in range(1, 82)))
    count = page.locator('#requirements .req').count()
    message = page.locator('#analysisCard').inner_text().lower()
    warning = any(word in message for word in ['trunker', 'avkort', 'för långt', 'för många rader', 'gräns på'])
    check(count == 81 or warning, f'{count}/81 rows, no truncation warning')


def long_paragraph(page, network):
    text = 'Leverantören ska redovisa sin metod. ' + ('Detta stycke innehåller fortsatt kravtext och kontext. ' * 18)
    custom(page, text)
    expect(page.locator('#requirements .req')).to_have_count(1)
    row_text = page.locator('#requirements .req').first.inner_text().lower()
    check('långt stycke' in row_text, 'Long paragraph is not explicitly flagged for manual split/review')
    sizes = page.evaluate('({viewport:innerWidth,content:document.documentElement.scrollWidth})')
    check(sizes['content'] <= sizes['viewport'] + 1, f'Long paragraph causes horizontal overflow: {sizes}')


def attachment_reference(page, network):
    custom(page, 'Bilaga 7 innehåller samtliga obligatoriska tekniska krav.')
    row_text = page.locator('#requirements .req').first.inner_text().lower()
    check('bilagehänvisning' in row_text, 'Attachment reference is not visibly flagged as unanalyzed source context')


def conditional_requirement(page, network):
    custom(page, 'Leverantören ska lämna intyg, men kravet gäller inte om beställaren godkänner likvärdigt bevis.')
    row_text = page.locator('#requirements .req').first.inner_text().lower()
    check('villkor eller undantag' in row_text, 'Conditional/exception wording is not visibly flagged')


def unknown_requirement(page, network):
    custom(page, 'Se vidare i handlingarna för relevant information.')
    check(page.locator('[data-cat]').first.input_value() == 'uncertain', 'Unknown material is not classified uncertain')
    check('osäker' in page.locator('#requirements .req').first.inner_text().lower(), 'Unknown row lacks visible uncertainty label')


def edit_and_reanalyse(page, network):
    custom(page, 'Anbudet ska innehålla ett undertecknat intyg.')
    page.locator('#editSourceBtn').click()
    check(page.evaluate("document.activeElement && document.activeElement.id") == 'sourceText', 'Edit action does not return focus to source')
    page.locator('#sourceText').fill('Timpris ska anges i prisbilagan.')
    expect(page.locator('#analysisCard')).to_be_hidden()
    page.locator('#analyzeBtn').click()
    expect(page.locator('#analysisCard')).to_be_visible()
    check(page.locator('#requirements').inner_text().find('Timpris') >= 0, 'Reanalysis did not use changed source')
    check(page.locator('#requirements').inner_text().find('undertecknat intyg') < 0, 'Old source survives reanalysis')


def restart(page, network):
    page.locator('#sampleBtn').click(); rate(page)
    page.locator('#restartBtn').click()
    check(page.locator('#sourceText').input_value() == '', 'Restart keeps source text')
    expect(page.locator('#analysisCard')).to_be_hidden()
    expect(page.locator('#feedbackCard')).to_be_hidden()
    check(page.locator('#sectorGrid .choice.active').count() == 0, 'Restart keeps old sector selection')
    check(page.evaluate("document.activeElement && document.activeElement.id") == 'sourceText', 'Restart does not return focus to source')


def price_missing(page, network):
    custom(page, 'Anbudet ska innehålla ifylld prisbilaga.')
    page.locator('[data-ev]').first.select_option('missing')
    check(page.locator('#summary .okbox').count() == 0, 'Missing explicitly required price attachment receives positive summary')


def not_applicable(page, network):
    custom(page, 'Anbudet ska innehålla ett undertecknat intyg.')
    page.locator('[data-ev]').first.select_option('na')
    check(page.locator('#summary .okbox').count() == 0, 'Unjustified not-applicable bypasses unresolved status')


def focus(page, network):
    page.locator('#sampleBtn').click()
    page.locator('[data-ev]').first.focus()
    page.locator('[data-ev]').first.select_option('missing')
    check(page.evaluate("document.activeElement && document.activeElement.getAttribute('data-ev')") == '1', 'Focus lost when evidence changes')


def width(page, network):
    page.locator('#sampleBtn').click()
    sizes = page.evaluate('({viewport:innerWidth,content:document.documentElement.scrollWidth})')
    check(sizes['content'] <= sizes['viewport'] + 1, f'Horizontal overflow: {sizes}')


def feedback_success(page, network):
    page.locator('#sampleBtn').click(); rate(page)
    page.locator('#sendFeedback').click()
    expect(page.locator('#feedbackStatus')).to_have_class('status ok')
    check(len(page.evaluate('window.__auditNetwork.posts')) == 1, 'Expected one mocked POST')
    body = page.evaluate('window.__auditNetwork.posts')[0]
    check(set(body) == {'app_version', 'language', 'flow', 'learned_new', 'useful', 'next_step_clear', 'ratings'}, 'Unexpected feedback fields')
    check(all(isinstance(v, int) and 1 <= v <= 5 for v in body['ratings'].values()), 'Ratings not bounded')
    check(len(body['ratings']) <= 20, 'Too many ratings')


def feedback_failure_retry(page, network):
    page.evaluate('window.__auditNetwork.status=500')
    page.locator('#sampleBtn').click(); rate(page)
    page.locator('#sendFeedback').click()
    expect(page.locator('#feedbackStatus')).to_have_class('status err')
    check(page.locator('[data-score]').first.input_value() == '4', 'Ratings lost after failure')
    page.evaluate('window.__auditNetwork.status=200')
    page.locator('#sendFeedback').click()
    expect(page.locator('#feedbackStatus')).to_have_class('status ok')
    check(len(page.evaluate('window.__auditNetwork.posts')) == 2, 'Retry did not issue exactly one new POST')


def feedback_timeout_retry(page, network):
    page.evaluate("window.__auditNetwork.mode='hang'")
    page.locator('#sampleBtn').click(); rate(page)
    page.locator('#sendFeedback').click()
    expect(page.locator('#feedbackStatus')).to_have_class('status err')
    check(page.locator('[data-score]').first.input_value() == '4', 'Ratings lost after timeout')
    check(not page.locator('#sendFeedback').is_disabled(), 'Send remains disabled after timeout')
    page.evaluate("window.__auditNetwork.mode='normal'")
    page.locator('#sendFeedback').click()
    expect(page.locator('#feedbackStatus')).to_have_class('status ok')
    check(len(page.evaluate('window.__auditNetwork.posts')) == 2, 'Timeout retry did not create expected second POST')


def reset(page, network):
    page.locator('#sampleBtn').click(); rate(page)
    page.locator('#clearBtn').click()
    page.locator('#sampleBtn').click()
    values = [el.input_value() for el in page.locator('[data-score]').all()]
    check(not any(values), 'New test inherits ratings from previous test: ' + str(values))
    check(all(page.locator('#' + n).input_value() == '' for n in ['foundIssue', 'useful', 'clearNext']), 'Old answers remain')


def double_send(page, network):
    page.locator('#sampleBtn').click(); rate(page)
    page.evaluate("() => {const b=document.getElementById('sendFeedback');b.click();b.click();}")
    expect(page.locator('#feedbackStatus')).to_have_class('status ok')
    page.wait_for_timeout(100)
    check(len(page.evaluate('window.__auditNetwork.posts')) == 1, f'Double activation sends {len(page.evaluate("window.__auditNetwork.posts"))} POSTs')


def unassessed(page, network):
    page.locator('#sampleBtn').click()
    options = page.locator('[data-score]').first.locator('option').all_text_contents()
    check(any(('ej bedömt' in x.lower() or 'kan inte bedöma' in x.lower()) for x in options), 'No explicit not-assessed option in mandatory scorecard')


def escaped_input(page, network):
    custom(page, '<img src=x onerror="window.__audit_xss=true"> Produkten ska uppfylla kravspecifikationen.')
    check(page.evaluate('window.__audit_xss === undefined'), 'Raw HTML executed')
    check(page.locator('#requirements img').count() == 0, 'Untrusted HTML inserted')


cases = [('sector-' + k, sector_case(k)) for k in sector_scenarios]
cases += [
    ('sample', sample),
    ('own-input-no-default-sector', own_input_no_default_sector),
    ('source-line', source_line),
    ('no-silent-truncation', all_rows),
    ('long-paragraph-visible-risk', long_paragraph),
    ('attachment-reference-visible-risk', attachment_reference),
    ('conditional-visible-risk', conditional_requirement),
    ('unknown-visible-risk', unknown_requirement),
    ('edit-and-reanalyse', edit_and_reanalyse),
    ('restart-flow', restart),
    ('missing-price', price_missing),
    ('unjustified-na', not_applicable),
    ('evidence-focus', focus),
    ('no-horizontal-overflow', width),
    ('feedback-mocked-success', feedback_success),
    ('feedback-mocked-error-retry', feedback_failure_retry),
    ('feedback-timeout-retry', feedback_timeout_retry),
    ('reset-feedback', reset),
    ('feedback-single-flight', double_send),
    ('feedback-not-assessed', unassessed),
    ('untrusted-text', escaped_input),
]

try:
    with sync_playwright() as p:
        binary = os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium')
        kwargs = {'headless': True}
        if Path(binary).is_file():
            kwargs['executable_path'] = binary
        browser = p.chromium.launch(**kwargs)
        version = browser.version
        for viewport in [{'width': 1280, 'height': 900}, {'width': 390, 'height': 844}]:
            for name, fn in cases:
                context = browser.new_context(viewport=viewport, reduced_motion='reduce')
                page = context.new_page(); page.set_default_timeout(2500)
                network = {'posts': [], 'status': 200, 'unexpected': []}; errors = []
                page.on('pageerror', lambda e: errors.append(str(e)))

                def handle(route):
                    network['unexpected'].append(route.request.url)
                    route.abort()

                context.route('**/*', handle)
                try:
                    html = (ROOT / 'procurement-expert-pilot.html').read_text().replace('<script src="client/procurement-expert-pilot.js"></script>', '')
                    page.set_content(html)
                    page.evaluate("""() => {
                      window.__auditNetwork={posts:[],status:200,mode:'normal'};
                      const nativeSetTimeout=window.setTimeout.bind(window);
                      window.setTimeout=(fn,ms,...args)=>nativeSetTimeout(fn,ms===10000?25:ms,...args);
                      window.fetch=(url, options) => {
                        if (!String(url).endsWith('/functions/v1/pilot-feedback')) return Promise.reject(new Error('Unexpected fetch target'));
                        window.__auditNetwork.posts.push(JSON.parse(options.body));
                        if(window.__auditNetwork.mode==='hang'){
                          return new Promise((resolve,reject)=>{
                            const abort=()=>reject(new DOMException('Aborted','AbortError'));
                            if(options.signal && options.signal.aborted) return abort();
                            if(options.signal) options.signal.addEventListener('abort',abort,{once:true});
                          });
                        }
                        const status=window.__auditNetwork.status;
                        return Promise.resolve({ok:status>=200 && status<300,status});
                      };
                    }""")
                    page.add_script_tag(content=(ROOT / 'client/procurement-expert-pilot.js').read_text())
                    fn(page, network)
                    check(not errors, 'JS errors: ' + str(errors))
                    check(not network['unexpected'], 'Unexpected external requests')
                    results.append({'case': name, 'width': viewport['width'], 'status': 'PASS'})
                except Exception as e:
                    results.append({'case': name, 'width': viewport['width'], 'status': 'FAIL', 'error': str(e).split('\n')[0]})
                finally:
                    context.close()
        browser.close()
finally:
    pass

report = {
    'scope': 'Offline browser DOM/JS interactions on candidate files with recorded Git blob hashes. Feedback fetch is stubbed. NOT live Pages, asset loading, HTTP/CORS, production storage or complete procurement-case verification.',
    'browser': version,
    'sources': {},
    'passed': sum(x['status'] == 'PASS' for x in results),
    'failed': sum(x['status'] == 'FAIL' for x in results),
    'results': results,
}
for path in ['procurement-expert-pilot.html', 'client/procurement-expert-pilot.js']:
    data = (ROOT / path).read_bytes()
    report['sources'][path] = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(1 if report['failed'] else 0)
