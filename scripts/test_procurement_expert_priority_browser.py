"""Focused calm-overview source-risk and correction-state browser regression.

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
        "required_before": ["motstridiga prisversioner", "källa rad 1", "källa rad 2"],
        "required_after": ["motstridiga prisversioner", "källa rad 1", "källa rad 2"],
        "forbidden_after": ["alla kravrader är genomgångna av dig"],
        "expect_risk_intro": True,
    },
    {
        "id": "attachment-risk-survives-manual-evidence",
        "text": "Leverantören ska uppfylla samtliga tekniska krav enligt bilaga 7.",
        "evidence_ids": ["1"],
        "required_before": ["bilagehänvisning", "källa rad 1"],
        "required_after": ["bilagehänvisning", "källa rad 1"],
        "forbidden_after": ["alla kravrader är genomgångna av dig"],
        "expect_risk_intro": True,
    },
    {
        "id": "manual-category-correction-recomputes-version-risk",
        "text": "\n".join([
            "Version 1: Kostnad SEK 1 000 000 ska redovisas.",
            "Version 2 ersätter version 1: Kostnad SEK 1 200 000 ska redovisas.",
        ]),
        "initial_categories": ["mandatory", "mandatory"],
        "category_updates": [("1", "commercial"), ("2", "commercial")],
        "evidence_ids": ["1", "2"],
        "required_after": ["motstridiga prisversioner", "källa rad 1", "källa rad 2"],
        "forbidden_after": ["alla kravrader är genomgångna av dig"],
        "expect_risk_intro": True,
        "expect_uncertain_count": 2,
    },
    {
        "id": "manual-category-correction-unchanged-value-no-conflict",
        "text": "\n".join([
            "Version 1: Kostnad SEK 1 000 000 ska redovisas.",
            "Version 2 ersätter version 1: Kostnad SEK 1 000 000 ska redovisas.",
        ]),
        "initial_categories": ["mandatory", "mandatory"],
        "category_updates": [("1", "commercial"), ("2", "commercial")],
        "evidence_ids": ["1", "2"],
        "forbidden_after": ["motstridiga prisversioner"],
        "expect_calm_after": True,
        "expect_uncertain_count": 0,
    },
    {
        "id": "same-family-med-undantag-for-remains-linked",
        "text": "\n".join([
            "Leverantören ska ha ansvarsförsäkring;",
            "Med undantag för ansvarsförsäkring som godtas som likvärdig gäller försäkringskravet enligt underlaget.",
        ]),
        "evidence_ids": ["1", "2"],
        "required_before": ["källraderna kan höra ihop", "villkor eller undantag", "källa rad 1", "källa rad 2"],
        "required_after": ["källraderna kan höra ihop", "villkor eller undantag", "källa rad 1", "källa rad 2"],
        "forbidden_after": ["alla kravrader är genomgångna av dig"],
        "expect_risk_intro": True,
        "expect_uncertain_count": 2,
    },
    {
        "id": "unrelated-med-undantag-for-does-not-contaminate-left-row",
        "text": "\n".join([
            "Leverantören ska ha ansvarsförsäkring;",
            "Med undantag för e-faktura får fakturan skickas som PDF vid betalning med betalkort.",
        ]),
        "evidence_ids": ["1"],
        "required_before": ["villkor eller undantag", "källa rad 1", "källa rad 2"],
        "required_after": ["villkor eller undantag", "källa rad 2"],
        "forbidden_after": ["källa rad 1", "källraderna kan höra ihop"],
        "expect_risk_intro": True,
        "expect_uncertain_count": 1,
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
    for required in case.get("required_before", []):
        check(required in before, f'{case["id"]}: expected source risk missing before correction/evidence marking: {required}')

    if case.get("initial_categories"):
        current = [el.input_value() for el in page.locator("[data-cat]").all()]
        check(current == case["initial_categories"], f'{case["id"]}: unexpected initial categories {current}')

    for category_id, category in case.get("category_updates", []):
        page.locator(f'[data-cat="{category_id}"]').select_option(category)

    for evidence_id in case.get("evidence_ids", []):
        page.locator(f'[data-ev="{evidence_id}"]').select_option("yes")

    overview = page.locator("#priorityOverview").inner_text().lower()
    summary = page.locator("#summary").inner_text().lower()
    for required in case.get("required_after", []):
        check(required in overview, f'{case["id"]}: expected risk missing after correction/evidence marking: {required}')
    for forbidden in case.get("forbidden_after", []):
        check(forbidden not in overview, f'{case["id"]}: forbidden calm/risk text present after correction: {forbidden}')
    if case.get("expect_risk_intro"):
        check("börja med de markerade riskerna" in overview, f'{case["id"]}: calm overview no longer directs user to unresolved source risk')
    if case.get("expect_calm_after"):
        check("alla kravrader är genomgångna av dig" in overview, f'{case["id"]}: unchanged-value control did not reach risk-free reviewed state')
    if "expect_uncertain_count" in case:
        expected = case["expect_uncertain_count"]
        check(f"{expected} osäkra/ej bedömda" in summary, f'{case["id"]}: summary does not reflect {expected} uncertain rows: {summary}')

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
    "scope": "Focused offline calm-overview source-risk retention and category-correction derived-state regression. Network disabled; manual evidence marking is not source verification. No live Pages, storage, legal, physical Safari/iPad/iPhone or assistive-technology claim.",
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
