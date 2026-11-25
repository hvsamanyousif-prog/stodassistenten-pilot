"""Browser regression for the existing start-page feedback component (#179).

The unchanged application module runs against a small DOM fixture in a real
browser. Only fetch and time are controlled. This proves component behaviour,
not the assembled landing page, real HTTP/storage, physical devices or first use.
"""
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(".").resolve()
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("experience-feedback-browser.json")
ENGINE = os.environ.get("BROWSER_ENGINE", "chromium")
LANGUAGES = ("sv", "ar", "fa")
WIDTHS = (320, 1280)
MODULE = ROOT / "client/experience-learning.js"
SOURCE = MODULE.read_text()
ENDPOINT = "https://lldhnsixeyxdcxejdwmq.supabase.co/functions/v1/pilot-feedback"
FIXTURE = """<!doctype html><html><body>
<input id="situation" value="SYNTHETIC_PRIVATE_CONTEXT_NOT_FOR_FEEDBACK">
<button id="showResults" type="button">Show results</button>
<div id="engineResults" data-primary-route="general" hidden></div>
<script>
window.renderResults = () => {
  const box = document.getElementById('engineResults');
  box.innerHTML = '<h2>Results</h2><a class="route" href="https://example.invalid/next">Next step</a>';
  box.hidden = false;
};
document.getElementById('showResults').addEventListener('click', window.renderResults);
</script></body></html>"""
MOCK = """() => {
  window.audit = {mode:'ok', posts:[], pending:[]};
  window.fetch = (url, options) => {
    if (url !== ENDPOINT || options.method !== 'POST')
      throw new Error('Unexpected transport');
    audit.posts.push({payload:JSON.parse(options.body), credentials:options.credentials,
      referrerPolicy:options.referrerPolicy});
    if (audit.mode === 'deferred') return new Promise((resolve,reject) => {
      audit.pending.push(resolve);
      if (options.signal) {
        if (options.signal.aborted) return reject(new DOMException('Aborted','AbortError'));
        options.signal.addEventListener('abort',
          () => reject(new DOMException('Aborted','AbortError')), {once:true});
      }
    });
    const status = audit.mode === 'error' ? 503 : 200;
    return Promise.resolve({ok:status === 200, status});
  };
}""".replace("ENDPOINT", json.dumps(ENDPOINT))
PANEL = "[data-experience-feedback]"
SEND = PANEL + " [data-send]"
STATUS = PANEL + " [data-status]"
MESSAGES = {
    "sv": {"sent": "Tack — feedbacken är sparad.", "error": "Feedbacken kunde inte skickas just nu."},
    "ar": {"sent": "شكراً — تم حفظ الملاحظات.", "error": "تعذر إرسال الملاحظات الآن."},
    "fa": {"sent": "ممنون — بازخورد ذخیره شد.", "error": "فعلاً ارسال بازخورد ممکن نیست."},
}
results = []


def check(ok, message):
    if not ok:
        raise AssertionError(message)


def count(page):
    return page.evaluate("audit.posts.length")


def completed(page, language):
    expect(page.locator(STATUS)).to_have_text(MESSAGES[language]["sent"])
    expect(page.locator(PANEL)).to_have_attribute("aria-busy", "false")
    expect(page.locator(SEND)).to_be_disabled()


def answer(page, value="false"):
    for name in ("useful", "clear", "learned_new"):
        page.locator(PANEL + f' [data-q="{name}"] [data-v="{value}"]').click()


def payload_check(page, language, n=0):
    post = page.evaluate("(n) => audit.posts[n]", n)
    payload = post["payload"]
    check(set(payload) == {"app_version", "language", "flow", "learned_new",
                           "useful", "next_step_clear", "ratings"}, "payload field boundary")
    check(payload["app_version"] == "0.8.3", "app version changed")
    check(payload["language"] == language, "language changed")
    check(payload["flow"] == "situation_engine_general", "flow changed")
    check(all(payload[k] is False for k in ("learned_new", "useful", "next_step_clear")),
          "explicit false answers lost")
    check(payload["ratings"] == {}, "ratings changed")
    check("SYNTHETIC_PRIVATE_CONTEXT" not in json.dumps(payload), "situation leaked")
    check(post["credentials"] == "omit" and post["referrerPolicy"] == "no-referrer",
          "transport privacy boundary changed")


def unanswered_then_false(page, language):
    page.locator(SEND).click()
    check(count(page) == 0, "unanswered questions sent")
    expect(page.locator(PANEL + ' [data-q="useful"] button').first).to_be_focused()
    answer(page)
    page.locator(SEND).click()
    expect(page.locator(STATUS)).to_have_text(MESSAGES[language]["sent"])
    check(count(page) == 1, "valid all-false feedback not sent once")
    payload_check(page, language)


def pending_double_click(page, language):
    answer(page)
    page.evaluate("audit.mode='deferred'")
    page.locator(SEND).dblclick()
    check(count(page) == 1, "double click started more than one POST")
    expect(page.locator(SEND)).to_be_disabled()
    expect(page.locator(PANEL)).to_have_attribute("aria-busy", "true")
    expect(page.locator(STATUS)).to_be_empty()
    for button in page.locator(PANEL + " [data-q] button").all():
        expect(button).to_be_disabled()
    payload_check(page, language)
    page.evaluate("audit.pending[0]({ok:true,status:200})")
    completed(page, language)


def success_is_terminal(page, language):
    answer(page)
    page.locator(SEND).click()
    expect(page.locator(STATUS)).to_have_text(MESSAGES[language]["sent"])
    # Native click() respects a disabled control, unlike synthetic dispatchEvent.
    page.locator(SEND).evaluate("(button) => button.click()")
    check(count(page) == 1, "successful feedback sent again")
    expect(page.locator(SEND)).to_be_disabled()
    message = page.locator(STATUS).inner_text()
    page.locator(PANEL + ' [data-q="useful"] [data-v="true"]').evaluate("(b) => b.click()")
    check(page.locator(STATUS).inner_text() == message, "terminal message was cleared")
    payload_check(page, language)


def error_can_retry(page, language):
    answer(page)
    page.evaluate("audit.mode='error'")
    page.locator(SEND).click()
    expect(page.locator(STATUS)).to_have_text(MESSAGES[language]["error"])
    expect(page.locator(SEND)).to_be_enabled()
    for name in ("useful", "clear", "learned_new"):
        expect(page.locator(PANEL + f' [data-q="{name}"] [data-v="false"]')).to_have_attribute("aria-pressed", "true")
    page.evaluate("audit.mode='ok'")
    page.locator(SEND).click()
    completed(page, language)
    check(count(page) == 2, "explicit retry did not send once")
    check(page.evaluate("JSON.stringify(audit.posts[0])===JSON.stringify(audit.posts[1])"),
          "retry altered the answers")
    payload_check(page, language, 1)


def timeout_can_retry(page, language):
    answer(page)
    page.evaluate("audit.mode='deferred'")
    page.locator(SEND).click()
    page.clock.fast_forward(10001)
    expect(page.locator(STATUS)).to_have_text(MESSAGES[language]["error"])
    expect(page.locator(SEND)).to_be_enabled()
    page.evaluate("audit.mode='ok'")
    page.locator(SEND).click()
    completed(page, language)
    check(count(page) == 2, "timeout retry did not send once")
    payload_check(page, language, 1)


def stale_response_after_reset(page, language):
    answer(page)
    page.evaluate("audit.mode='deferred'")
    page.locator(SEND).click()
    page.locator("#showResults").click()
    expect(page.locator(PANEL)).to_be_visible()
    answer(page)
    page.evaluate("audit.pending[0]({ok:true,status:200})")
    expect(page.locator(STATUS)).to_be_empty()
    expect(page.locator(SEND)).to_be_enabled()
    page.evaluate("audit.mode='ok'")
    page.locator(SEND).click()
    completed(page, language)
    check(count(page) == 2, "new panel cannot submit independently")
    payload_check(page, language, 1)


def reset_clears_success(page, language):
    answer(page)
    page.locator(SEND).click()
    expect(page.locator(STATUS)).to_have_text(MESSAGES[language]["sent"])
    page.locator("#showResults").click()
    expect(page.locator(PANEL)).to_be_visible()
    expect(page.locator(STATUS)).to_be_empty()
    expect(page.locator(SEND)).to_be_enabled()
    page.locator(SEND).click()
    check(count(page) == 1, "new panel inherited old answers")
    answer(page)
    page.locator(SEND).click()
    completed(page, language)
    check(count(page) == 2, "new case cannot send once")
    payload_check(page, language, 1)


CASES = (
    ("unanswered-and-all-false-payload", unanswered_then_false),
    ("pending-double-click", pending_double_click),
    ("success-terminal", success_is_terminal),
    ("error-retry-preserves-answers", error_can_retry),
    ("timeout-retry", timeout_can_retry),
    ("stale-response-after-reset", stale_response_after_reset),
    ("reset-clears-success-and-answers", reset_clears_success),
)

with sync_playwright() as p:
    launch = {"headless": True}
    if ENGINE == "chromium" and os.environ.get("CHROMIUM_PATH"):
        launch["executable_path"] = os.environ["CHROMIUM_PATH"]
    browser = getattr(p, ENGINE).launch(**launch)
    version = browser.version
    for language in LANGUAGES:
        for width in WIDTHS:
            for name, fn in CASES:
                context = browser.new_context(viewport={"width": width, "height": 900})
                unexpected, errors = [], []
                context.route("**/*", lambda route: (unexpected.append(route.request.url), route.abort()))
                page = context.new_page()
                page.set_default_timeout(1000)
                page.on("pageerror", lambda error: errors.append(str(error)))
                try:
                    page.clock.install()
                    page.set_content(FIXTURE)
                    page.evaluate("(language) => {document.documentElement.lang=language;document.documentElement.dir=language==='sv'?'ltr':'rtl'}", language)
                    page.evaluate(MOCK)
                    page.add_script_tag(content=SOURCE)
                    page.locator("#showResults").click()
                    expect(page.locator(PANEL)).to_be_visible()
                    fn(page, language)
                    check(not errors, "JavaScript error: " + str(errors))
                    check(not unexpected, "external request attempted: " + str(unexpected))
                    results.append({"case": name, "language": language, "width": width, "status": "PASS"})
                except Exception as exc:
                    results.append({"case": name, "language": language, "width": width,
                                    "status": "FAIL", "error": str(exc).split("\n")[0]})
                finally:
                    context.close()
    browser.close()

try:
    checkout = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True,
                                       stderr=subprocess.DEVNULL).strip()
except (subprocess.CalledProcessError, FileNotFoundError):
    checkout = None
report = {
    "scope": "Real-browser component regression with synthetic DOM, stubbed fetch and controlled clock; NOT full landing-page, HTTP, database, physical-device or first-use proof.",
    "engine": ENGINE, "browser": version,
    "head_sha": os.environ.get("PR_HEAD"), "base_sha": os.environ.get("PR_BASE"),
    "tested_checkout_sha": checkout,
    "source_sha256": hashlib.sha256(SOURCE.encode()).hexdigest(),
    "expected": len(CASES) * len(LANGUAGES) * len(WIDTHS),
    "executed": len(results),
    "passed": sum(x["status"] == "PASS" for x in results),
    "failed": sum(x["status"] == "FAIL" for x in results),
    "results": results,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(1 if report["failed"] else 0)

