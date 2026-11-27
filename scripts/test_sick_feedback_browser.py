"""#179: actual built person-pilot page, browser fetch stub, no HTTP/storage proof."""
import hashlib
import json
import os
import subprocess
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

SITE = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2])
ENGINE = os.environ.get('BROWSER_ENGINE', 'chromium')
FLOWS = (
    ('employee_sick', 'employee_sick', 'sickPay', 'v52', 'employee-sick-guidance.js', False),
    ('unemployed_sick', 'unemployed_sick', 'program', 'v49', 'unemployed-sick-guidance.js', False),
    ('work_context', 'employee_sick&work_context=invoiced_worker', None, 'v64', 'employee-sick-work-context-extension.js', True),
)
KEYS = ('learned_new', 'useful', 'next_step_clear')
MESSAGES = {
    'sv': ('Feedbacken kunde inte skickas just nu.', 'Tack! Endast strukturerad produktfeedback skickades.', 'Tack! Feedbacken är sparad.'),
    'ar': ('تعذر إرسال الملاحظات الآن.', 'شكراً! أرسلنا فقط ملاحظات منتج منظمة.', 'شكراً! تم حفظ الملاحظات.'),
    'fa': ('ارسال بازخورد اکنون ممکن نیست.', 'سپاس! فقط بازخورد ساختاریافته محصول ارسال شد.', 'ممنون! بازخورد ذخیره شد.'),
}
STUB = """(() => {
  const original = window.fetch.bind(window);
  window.feedbackAudit = {mode:'ok', calls:[], pending:[]};
  window.fetch = (url, options) => {
    if (!String(url).endsWith('/functions/v1/pilot-feedback')) return original(url, options);
    const a = window.feedbackAudit;
    a.calls.push({method:options.method, payload:JSON.parse(options.body)});
    if (a.mode === 'pending') return new Promise(resolve => a.pending.push(resolve));
    if (a.mode === 'reject') return Promise.reject(new Error('synthetic offline failure'));
    return Promise.resolve({ok:a.mode === 'ok', status:a.mode === 'ok' ? 200 : 503});
  };
})();"""

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def require(ok, reason):
    if not ok:
        raise AssertionError(reason)

def run_case(page, base, row, lang, case):
    name, focus, question, version, filename, extension = row
    send = page.locator('[data-send-work-context-feedback]' if extension else '[data-send-feedback]')
    status = page.locator('[data-work-context-feedback-status]' if extension else '[data-feedback-status]')
    error, sent, extended_sent = MESSAGES[lang]
    if extension:
        sent = extended_sent
        if lang == 'fa':
            error = 'فعلاً ارسال بازخورد ممکن نیست.'
    def start():
        page.goto(f'{base}/person-pilot.html?focus={focus}&lang={lang}', wait_until='load')
        if question:
            page.locator(f'input[name="{question}"][value="unsure"]').check()
        expect(send).to_be_visible()
        require(page.locator('html').get_attribute('lang') == lang, 'language not selected')
        require(page.locator('html').get_attribute('dir') == ('ltr' if lang == 'sv' else 'rtl'), 'direction not selected')
    def answer(values):
        for key, value in zip(KEYS, values):
            page.locator(f'input[name="{key}"][value="{value}"]').check()
    def calls():
        return page.evaluate('feedbackAudit.calls')
    def mode(value):
        page.evaluate('(v) => {feedbackAudit.mode=v}', value)
    def expected(values):
        return {'method':'POST', 'payload':{'app_version':version, 'language':lang,
                'flow':'unemployed_sick' if name == 'unemployed_sick' else 'employee_sick',
                **dict(zip(KEYS, [v == 'yes' for v in values])), 'ratings':{}}}
    def one(values):
        require(calls() == [expected(values)], 'not exactly one minimal explicit-boolean payload')
    start()
    mixed = ('no', 'yes', 'no')
    if case == 'empty':
        send.click()
        require(calls() == [], 'empty POST')
    elif case == 'partial':
        answer(('no',))
        send.click()
        require(calls() == [], 'partial POST')
    elif case == 'all_false':
        values = ('no', 'no', 'no')
        answer(values); send.click(); one(values)
        expect(status).to_have_text(sent)
    elif case == 'pending_and_terminal':
        answer(mixed); mode('pending')
        send.evaluate('(b) => {b.click(); b.click()}')
        one(mixed)
        expect(send).to_be_disabled()
        for key in KEYS:
            for radio in page.locator(f'input[name="{key}"]').all():
                expect(radio).to_be_disabled()
        expect(status).not_to_have_text(sent)
        page.evaluate('feedbackAudit.pending[0]({ok:true,status:200})')
        expect(status).to_have_text(sent)
        send.evaluate('(b) => b.click()')
        one(mixed)
        expect(send).to_be_disabled()
    elif case in ('http_error_retry', 'rejection_retry'):
        answer(mixed); mode('error' if case == 'http_error_retry' else 'reject')
        send.click(); one(mixed)
        expect(status).to_have_text(error)
        expect(send).to_be_enabled()
        for key, value in zip(KEYS, mixed):
            expect(page.locator(f'input[name="{key}"][value="{value}"]')).to_be_checked()
        mode('ok'); send.click()
        expect(status).to_have_text(sent)
        require(calls() == [expected(mixed), expected(mixed)], 'retry lost answers or duplicated POST')
    elif case == 'reset':
        answer(mixed); send.click(); one(mixed)
        expect(status).to_have_text(sent)
        start()
        expect(status).to_be_empty(); expect(send).to_be_enabled()
        for key in KEYS:
            require(page.locator(f'input[name="{key}"]:checked').count() == 0, 'reset retained answer')
        send.click(); require(calls() == [], 'reset sent unanswered POST')
    else:
        raise AssertionError('unknown scenario')

CASES = ('empty', 'partial', 'all_false', 'pending_and_terminal', 'http_error_retry', 'rejection_retry', 'reset')
server = ThreadingHTTPServer(('127.0.0.1', 0), lambda *a, **kw: Quiet(*a, directory=str(SITE), **kw))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
results = []
try:
    with sync_playwright() as p:
        browser = getattr(p, ENGINE).launch(headless=True)
        browser_version = browser.version
        for row in FLOWS:
            for lang in ('sv', 'ar', 'fa'):
                for case in CASES:
                    ctx = browser.new_context(viewport={'width':390,'height':900}, service_workers='block')
                    ctx.add_init_script(STUB)
                    ctx.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
                    page = ctx.new_page(); page.set_default_timeout(2500)
                    errors = []
                    page.on('pageerror', lambda exc: errors.append(str(exc)))
                    result = {'flow':row[0], 'language':lang, 'case':case}
                    try:
                        run_case(page, base, row, lang, case)
                        require(not errors, 'uncaught JS error: ' + str(errors))
                        result['status'] = 'PASS'
                    except Exception as exc:
                        result.update(status='FAIL', detail=str(exc)[:1000])
                    finally:
                        ctx.close(); results.append(result)
        browser.close()
finally:
    server.shutdown(); server.server_close()
report = {'scope':'built full page, real browser, controlled fetch; no real HTTP/storage or physical device',
          'head_sha':os.environ.get('PR_HEAD'), 'base_sha':os.environ.get('PR_BASE'),
          'tested_checkout_sha':subprocess.check_output(['git','rev-parse','HEAD'], text=True).strip(),
          'engine':ENGINE, 'browser_version':browser_version,
          'built_sha256':{row[4]:hashlib.sha256((SITE/'client'/row[4]).read_bytes()).hexdigest() for row in FLOWS},
          'expected':len(FLOWS)*3*len(CASES), 'executed':len(results),
          'passed':sum(r['status']=='PASS' for r in results), 'results':results}
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(0 if report['passed']==report['expected'] else 1)
