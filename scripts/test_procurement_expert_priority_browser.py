"""Focused calm-overview source-risk retention browser regression.

Exercises the existing procurement pilot offline in Chromium or Playwright WebKit.
This is UI/source-risk evidence only: no network, storage, legal conclusion, live Pages,
physical Safari/iPad/iPhone or assistive-technology claim.
"""
import hashlib
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("procurement-priority-browser.json")
ENGINE = os.environ.get("BROWSER_ENGINE", "chromium").strip().lower()
VIEWPORTS = [
    {"width": 320, "height": 800},
    {"width": 1280, "height": 900},
]
CASES = [
    {
        "id": "version-risk-survives-manual-evidence",
        "text": "\n".join([
            "Version 1: Fast pris ska anges i bilaga 6.",
            "Version 2 ersätter version 1: Timpris ska anges i bilaga 9.",
        ]),
        "evidence_ids": ["1", "2"],
        "required": ["motstridiga prisversioner", "källa rad 1", "källa rad 2"],
    },
    {
        "id": "attachment-risk-survives-manual-evidence",
        "text": "Leverantören ska uppfylla samtliga tekniska krav enligt bilaga 7.",
        "evidence_ids": ["1"],
        "required": ["bilagehänvisning", "källa rad 1"],
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
    page.evaluate("() => { window.fetch = () => Promise.reject(new Error('Network disabled in priority regression')); }")
    page.add_script_tag(content=(ROOT / "client/procurement-expert-pilot.js").read_text(encoding="utf-8"))
    return unexpected, errors


def run_case(page, case):
    page.locator("#startBtn").click()
    page.locator('[data-sector="construction"]').click()
    page.locator("#sourceText").fill(case["text"])
    page.locator("#analyzeBtn").click()
    expect(page.locator("#analysisCard")).to_be_visible()
    page.locator("#openReviewBtn").click()
    check(page.locator("#reviewDetails").get_attribute("open") is not None, f'{case["id"]}: full review did not open')

    before = page.locator("#priorityOverview").inner_text().lower()
    for required in case["required"]:
        check(required in before, f'{case["id"]}: expected source risk missing before evidence marking: {required}')

    for evidence_id in case["evidence_ids"]:
        page.locator(f'[data-ev="{evidence_id}"]').select_option("yes")

    overview = page.locator("#priorityOverview").inner_text().lower()
    for required in case["required"]:
        check(required in overview, f'{case["id"]}: unresolved source risk disappeared after manual evidence marking: {required}')
    check("alla kravrader är genomgångna av dig" not in overview, f'{case["id"]}: calm overview became falsely reassuring while source risk remains')
    check("börja med de markerade riskerna" in overview, f'{case["id"]}: calm overview no longer directs user to unresolved source risk')

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
    "scope": "Focused offline calm-overview source-risk retention regression. Network disabled; manual evidence marking is not source verification. No live Pages, storage, legal, physical Safari/iPad/iPhone or assistive-technology claim.",
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
