"""Offline feedback-state-machine regression for the procurement expert pilot.

No live endpoint or production storage is touched. The browser fetch is stubbed and
this test proves client-side state transitions only.

Usage:
  BROWSER_ENGINE=chromium python scripts/test_procurement_expert_feedback_state.py . feedback-state.json
  BROWSER_ENGINE=webkit   python scripts/test_procurement_expert_feedback_state.py . feedback-state.json
"""
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('procurement-feedback-state.json')
ENGINE = os.environ.get('BROWSER_ENGINE', 'chromium').strip().lower()
WIDTHS = [320, 1280]
results = []


def check(ok, message):
    if not ok:
        raise AssertionError(message)


def answer_short(page):
    for name in ['foundIssue', 'useful', 'clearNext']:
        page.locator('#' + name).select_option('yes')


def start_case(page):
    page.locator('#sampleBtn').click()
    expect(page.locator('#feedbackCard')).to_be_visible()
    answer_short(page)


def post_count(page):
    return page.evaluate('window.__feedbackAudit.posts.length')


def single_flight_then_terminal(page):
    start_case(page)
    page.evaluate("window.__feedbackAudit.mode='deferred'")
    page.evaluate("() => { const b=document.getElementById('sendFeedback'); b.click(); b.click(); }")
    check(post_count(page) == 1, f'in-flight double activation sent {post_count(page)} POSTs')
    page.evaluate("window.__feedbackAudit.resolveDeferred({ok:true,status:200})")
    expect(page.locator('#feedbackStatus')).to_have_class('status ok')
    check(page.locator('#sendFeedback').is_disabled(), 'success is not terminal: send button was re-enabled')
    page.evaluate("document.getElementById('sendFeedback').click()")
    page.wait_for_timeout(20)
    check(post_count(page) == 1, 'same successful case can POST again')


def error_retry(page):
    start_case(page)
    page.evaluate("window.__feedbackAudit.status=500")
    page.locator('#sendFeedback').click()
    expect(page.locator('#feedbackStatus')).to_have_class('status err')
    check(page.locator('#foundIssue').input_value() == 'yes', 'error cleared short-feedback answers')
    check(not page.locator('#sendFeedback').is_disabled(), 'error did not permit retry')
    page.evaluate("window.__feedbackAudit.status=200")
    page.locator('#sendFeedback').click()
    expect(page.locator('#feedbackStatus')).to_have_class('status ok')
    check(post_count(page) == 2, 'error retry did not create exactly one new POST')
    check(page.locator('#sendFeedback').is_disabled(), 'successful retry is not terminal')


def timeout_retry(page):
    start_case(page)
    page.evaluate("window.__feedbackAudit.mode='hang'")
    page.locator('#sendFeedback').click()
    expect(page.locator('#feedbackStatus')).to_have_class('status err')
    check(page.locator('#useful').input_value() == 'yes', 'timeout cleared feedback answers')
    check(not page.locator('#sendFeedback').is_disabled(), 'timeout did not permit retry')
    page.evaluate("window.__feedbackAudit.mode='normal'")
    page.locator('#sendFeedback').click()
    expect(page.locator('#feedbackStatus')).to_have_class('status ok')
    check(post_count(page) == 2, 'timeout retry did not create exactly one new POST')
    check(page.locator('#sendFeedback').is_disabled(), 'successful timeout retry is not terminal')


def stale_response_after_reset(page):
    start_case(page)
    page.evaluate("window.__feedbackAudit.mode='deferred'")
    page.locator('#sendFeedback').click()
    check(post_count(page) == 1, 'deferred old case did not start exactly one POST')
    page.locator('#clearBtn').click()
    page.locator('#sampleBtn').click()
    answer_short(page)
    check(page.locator('#feedbackStatus').inner_text() == '', 'new case inherited old feedback status')
    check(not page.locator('#sendFeedback').is_disabled(), 'new case inherited terminal/in-flight state')
    page.evaluate("window.__feedbackAudit.resolveDeferred({ok:true,status:200})")
    page.wait_for_timeout(30)
    check(page.locator('#feedbackStatus').inner_text() == '', 'stale old success mutated the new case')
    check(not page.locator('#sendFeedback').is_disabled(), 'stale old response disabled the new case')
    page.evaluate("window.__feedbackAudit.mode='normal'")
    page.locator('#sendFeedback').click()
    expect(page.locator('#feedbackStatus')).to_have_class('status ok')
    check(post_count(page) == 2, 'new case did not allow exactly one fresh POST after stale old response')


def reset_clears_terminal(page):
    start_case(page)
    page.locator('#sendFeedback').click()
    expect(page.locator('#feedbackStatus')).to_have_class('status ok')
    check(page.locator('#sendFeedback').is_disabled(), 'first success did not become terminal')
    page.locator('#clearBtn').click()
    page.locator('#sampleBtn').click()
    answer_short(page)
    check(not page.locator('#sendFeedback').is_disabled(), 'new case did not clear terminal feedback state')
    check(page.locator('#feedbackStatus').inner_text() == '', 'new case did not clear success message')
    page.locator('#sendFeedback').click()
    expect(page.locator('#feedbackStatus')).to_have_class('status ok')
    check(post_count(page) == 2, 'reset/new case did not permit one new first POST')


CASES = [
    ('single-flight-success-terminal', single_flight_then_terminal),
    ('error-retry-terminal', error_retry),
    ('timeout-retry-terminal', timeout_retry),
    ('stale-response-after-reset', stale_response_after_reset),
    ('reset-clears-terminal', reset_clears_terminal),
]

with sync_playwright() as p:
    browser_type = getattr(p, ENGINE)
    browser = browser_type.launch(headless=True)
    browser_version = browser.version
    for width in WIDTHS:
        for name, fn in CASES:
            context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
            page = context.new_page()
            page.set_default_timeout(3000)
            errors = []
            unexpected = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            context.route('**/*', lambda route: (unexpected.append(route.request.url), route.abort()))
            try:
                html = (ROOT / 'procurement-expert-pilot.html').read_text().replace('<script src="client/procurement-expert-pilot.js"></script>', '')
                page.set_content(html)
                page.evaluate("""() => {
                  const nativeSetTimeout=window.setTimeout.bind(window);
                  window.setTimeout=(fn,ms,...args)=>nativeSetTimeout(fn,ms===10000?25:ms,...args);
                  window.__feedbackAudit={posts:[],status:200,mode:'normal',resolveDeferred:null};
                  window.fetch=(url,options)=>{
                    if(!String(url).endsWith('/functions/v1/pilot-feedback')) return Promise.reject(new Error('Unexpected fetch target'));
                    window.__feedbackAudit.posts.push(JSON.parse(options.body));
                    if(window.__feedbackAudit.mode==='hang'){
                      return new Promise((resolve,reject)=>{
                        const abort=()=>reject(new DOMException('Aborted','AbortError'));
                        if(options.signal && options.signal.aborted) return abort();
                        if(options.signal) options.signal.addEventListener('abort',abort,{once:true});
                      });
                    }
                    if(window.__feedbackAudit.mode==='deferred'){
                      return new Promise(resolve=>{ window.__feedbackAudit.resolveDeferred=resolve; });
                    }
                    const status=window.__feedbackAudit.status;
                    return Promise.resolve({ok:status>=200&&status<300,status});
                  };
                }""")
                page.add_script_tag(content=(ROOT / 'client/procurement-expert-pilot.js').read_text())
                fn(page)
                check(not errors, 'JS errors: ' + str(errors))
                check(not unexpected, 'Unexpected external requests: ' + str(unexpected))
                results.append({'case': name, 'width': width, 'status': 'PASS'})
            except Exception as exc:
                results.append({'case': name, 'width': width, 'status': 'FAIL', 'error': str(exc).split('\n')[0]})
            finally:
                context.close()
    browser.close()

report = {
    'scope': 'Offline client feedback-state-machine regression. Fetch is stubbed; NOT endpoint acceptance, storage proof, live Pages or physical-device validation.',
    'engine': ENGINE,
    'browser': browser_version,
    'expected_runs': len(WIDTHS) * len(CASES),
    'executed_runs': len(results),
    'passed': sum(item['status'] == 'PASS' for item in results),
    'failed': sum(item['status'] == 'FAIL' for item in results),
    'results': results,
}
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(1 if report['failed'] else 0)
