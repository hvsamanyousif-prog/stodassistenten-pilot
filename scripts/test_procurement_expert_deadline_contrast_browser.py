"""Contrastive procurement deadline classifier browser regression.

Uses the same procurement UI/runtime offline. This is browser/regression evidence only;
no network, storage, legal conclusion, live Pages, physical Safari/iPad/iPhone or AT claim.
"""
import hashlib
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("procurement-deadline-contrast.json")
ENGINE = os.environ.get("BROWSER_ENGINE", "chromium").strip().lower()
VIEWPORTS = [{"width": 320, "height": 800}, {"width": 1280, "height": 900}]
CASES = [
    {
        "id": "common-bid-deadline-phrase",
        "text": "Anbud ska lämnas senast den 30 oktober 2026 kl 23:59.",
        "expected_category": "deadline",
        "expected_question": "anbudsdag",
    },
    {
        "id": "dated-qualification-negative-contrast",
        "text": "Leverantören ska ha två referensuppdrag som ska vara slutförda senast den 1 september 2026.",
        "expected_category": "qualification",
        "expected_question": "referensuppdrag",
    },
    {
        "id": "anbudsgivaren-lexical-near-miss",
        "text": "Anbudsgivaren ska lämna referensbevis senast den 1 september 2026.",
        "forbidden_category": "deadline",
    },
]


def check(ok, message):
    if not ok:
        raise AssertionError(message)


def sha1_blob(path):
    data = path.read_bytes()
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def install_offline(page, context):
    unexpected = []
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    def block(route):
        unexpected.append(route.request.url)
        route.abort()
    context.route("**/*", block)
    html = (ROOT / "procurement-expert-pilot.html").read_text(encoding="utf-8")
    html = html.replace('<script src="client/procurement-expert-pilot.js"></script>', "")
    page.set_content(html)
    page.evaluate("() => { window.fetch = () => Promise.reject(new Error('Network disabled in deadline contrast regression')); }")
    page.add_script_tag(content=(ROOT / "client/procurement-expert-pilot.js").read_text(encoding="utf-8"))
    return unexpected, errors


def run_case(page, case):
    page.locator("#startBtn").click()
    page.locator('[data-sector="construction"]').click()
    page.locator("#sourceText").fill(case["text"])
    page.locator("#analyzeBtn").click()
    expect(page.locator("#analysisCard")).to_be_visible()
    page.locator("#openReviewBtn").click()
    expect(page.locator("#requirements .req")).to_have_count(1)
    check(page.locator("#requirements .source").inner_text() == "Källa rad 1", f'{case["id"]}: source position changed')
    category = page.locator("[data-cat]").input_value()
    if case.get("expected_category"):
        check(category == case["expected_category"], f'{case["id"]}: expected {case["expected_category"]}, got {category}')
    if case.get("forbidden_category"):
        check(category != case["forbidden_category"], f'{case["id"]}: lexical near-miss became {category}')
    review = page.locator("#requirements").inner_text().lower()
    if case.get("expected_question"):
        check(case["expected_question"] in review, f'{case["id"]}: expected control question missing')
    sizes = page.evaluate("({viewport:innerWidth,content:document.documentElement.scrollWidth})")
    check(sizes["content"] <= sizes["viewport"] + 1, f'{case["id"]}: horizontal overflow {sizes}')


results = []
browser_version = None
harness_error = None
expected_runs = len(VIEWPORTS) * len(CASES)
try:
    with sync_playwright() as p:
        browser_type = getattr(p, ENGINE, None)
        if browser_type is None:
            raise RuntimeError(f"Unsupported BROWSER_ENGINE={ENGINE}")
        browser = browser_type.launch(headless=True)
        browser_version = browser.version
        try:
            for viewport in VIEWPORTS:
                for case in CASES:
                    context = None
                    try:
                        context = browser.new_context(viewport=viewport, reduced_motion="reduce")
                        page = context.new_page()
                        page.set_default_timeout(3000)
                        unexpected, errors = install_offline(page, context)
                        run_case(page, case)
                        check(not errors, "JavaScript errors: " + str(errors))
                        check(not unexpected, "Unexpected external requests: " + str(unexpected))
                        results.append({"case": case["id"], "width": viewport["width"], "status": "PASS"})
                    except Exception as exc:
                        results.append({"case": case["id"], "width": viewport["width"], "status": "FAIL", "error": str(exc).split("\n")[0]})
                    finally:
                        if context is not None:
                            context.close()
        finally:
            browser.close()
except Exception as exc:
    harness_error = f"{type(exc).__name__}: {exc}"

report = {
    "scope": "Contrastive offline process-deadline browser regression; no live/storage/legal/physical-device claim.",
    "engine": ENGINE,
    "browser_version": browser_version,
    "viewports": VIEWPORTS,
    "independent_cases": len(CASES),
    "expected_runs": expected_runs,
    "executed_runs": len(results),
    "harness_error": harness_error,
    "passed": sum(x["status"] == "PASS" for x in results),
    "failed": sum(x["status"] == "FAIL" for x in results),
    "sources": {
        "procurement-expert-pilot.html": sha1_blob(ROOT / "procurement-expert-pilot.html"),
        "client/procurement-expert-pilot.js": sha1_blob(ROOT / "client/procurement-expert-pilot.js"),
    },
    "results": results,
}
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
if harness_error or len(results) != expected_runs or report["failed"]:
    sys.exit(1)
