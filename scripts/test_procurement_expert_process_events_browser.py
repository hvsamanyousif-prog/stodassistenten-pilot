"""Focused procurement process-event browser regression.

Runs the existing procurement pilot offline in Chromium or Playwright WebKit.
No network, live storage, legal conclusion, physical Safari/iPad/iPhone, VoiceOver or TalkBack claim.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("procurement-process-events-browser.json")
ENGINE = os.environ.get("BROWSER_ENGINE", "chromium").strip().lower()
VIEWPORTS = [{"width": 320, "height": 800}, {"width": 1280, "height": 900}]

CASES = [
    {
        "id": "question-submission-vs-answer-publication",
        "text": "\n".join([
            "Frågor ska lämnas senast den 15 oktober 2026 kl 12:00.",
            "Svar på frågor publiceras senast den 20 oktober 2026 kl 17:00.",
        ]),
        "expected_categories": ["deadline", "deadline"],
        "expected_subtypes": ["clarification", "answer_publication"],
        "expected_rows": 2,
        "expect_question_conflict": False,
        "expect_answer_publication_check": True,
    },
    {
        "id": "question-submission-version-conflict",
        "text": "\n".join([
            "Rättelse 1: Frågor ska lämnas senast den 15 oktober 2026 kl 12:00.",
            "Rättelse 2: Frågor ska lämnas senast den 16 oktober 2026 kl 12:00.",
        ]),
        "expected_categories": ["deadline", "deadline"],
        "expected_subtypes": ["clarification", "clarification"],
        "expected_rows": 2,
        "expect_question_conflict": True,
        "expect_answer_publication_check": False,
    },
    {
        "id": "answer-publication-lexical-near-miss",
        "text": "Svar på frågor som inkommit senast den 15 oktober 2026 publiceras den 20 oktober 2026.",
        "expected_categories": ["deadline"],
        "expected_subtypes": ["answer_publication"],
        "expected_rows": 1,
        "expect_question_conflict": False,
        "expect_answer_publication_check": True,
    },
    {
        "id": "formal-clarification-request",
        "text": "Begäran om kompletterande upplysningar ska lämnas senast den 18 oktober 2026 kl 12:00.",
        "expected_categories": ["deadline"],
        "expected_subtypes": ["clarification"],
        "expected_rows": 1,
        "expect_question_conflict": False,
        "expect_answer_publication_check": False,
    },
    {
        "id": "formal-answer-publication-passive",
        "text": "Kompletterande upplysningar ska lämnas senast den 24 oktober 2026 kl 23:59.",
        "expected_categories": ["deadline"],
        "expected_subtypes": ["answer_publication"],
        "expected_rows": 1,
        "expect_question_conflict": False,
        "expect_answer_publication_check": True,
    },
    {
        "id": "formal-answer-publication-existing-positive",
        "text": "Kompletterande upplysningar tillhandahålls senast den 24 oktober 2026 kl 23:59.",
        "expected_categories": ["deadline"],
        "expected_subtypes": ["answer_publication"],
        "expected_rows": 1,
        "expect_question_conflict": False,
        "expect_answer_publication_check": True,
    },
    {
        "id": "answer-publication-identical-with-embedded-question-date",
        "text": "\n".join([
            "Meddelande 1: Svar på frågor som inkommit senast den 15 oktober 2026 publiceras den 20 oktober 2026 kl 17:00.",
            "Meddelande 2: Svar på frågor som inkommit senast den 15 oktober 2026 publiceras den 20 oktober 2026 kl 17:00.",
        ]),
        "expected_categories": ["deadline", "deadline"],
        "expected_subtypes": ["answer_publication", "answer_publication"],
        "expected_rows": 2,
        "expect_question_conflict": False,
        "expect_answer_publication_check": True,
        "expect_answer_conflict": False,
    },
    {
        "id": "answer-publication-version-conflict",
        "text": "\n".join([
            "Rättelse 1: Svar på frågor publiceras senast den 20 oktober 2026 kl 17:00.",
            "Rättelse 2: Svar på frågor publiceras senast den 20 oktober 2026 kl 18:00.",
        ]),
        "expected_categories": ["deadline", "deadline"],
        "expected_subtypes": ["answer_publication", "answer_publication"],
        "expected_rows": 2,
        "expect_question_conflict": False,
        "expect_answer_publication_check": True,
        "expect_answer_conflict": True,
    },
    {
        "id": "supplier-clarification-near-miss",
        "text": "Leverantören ska lämna kompletterande upplysningar i bilaga 4 senast den 18 oktober 2026.",
        "expected_categories": ["mandatory"],
        "expected_subtypes": [None],
        "expected_rows": 1,
        "expect_question_conflict": False,
        "expect_answer_publication_check": False,
    },
]


def check(ok: bool, message: str) -> None:
    if not ok:
        raise AssertionError(message)


def sha1_blob(path: Path) -> str:
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
    page.evaluate("() => { window.fetch = () => Promise.reject(new Error('Network disabled in process-event regression')); }")
    page.add_script_tag(content=(ROOT / "client/procurement-expert-pilot.js").read_text(encoding="utf-8"))
    return unexpected, errors


def run_case(page, case):
    page.locator("#startBtn").click()
    page.locator('[data-sector="construction"]').click()
    page.locator("#sourceText").fill(case["text"])
    page.locator("#analyzeBtn").click()
    expect(page.locator("#analysisCard")).to_be_visible()
    page.locator("#openReviewBtn").click()
    expect(page.locator("#requirements .req")).to_have_count(case["expected_rows"])

    sources = [el.inner_text() for el in page.locator("#requirements .source").all()]
    check(sources == [f"Källa rad {i}" for i in range(1, case["expected_rows"] + 1)],
          f'{case["id"]}: source trace changed: {sources}')
    categories = [el.input_value() for el in page.locator("[data-cat]").all()]
    check(categories == case["expected_categories"],
          f'{case["id"]}: category changed: {categories}')

    actual_subtypes = page.evaluate("() => window.ProcurementExpert.splitRequirements(document.querySelector('#sourceText').value).map(r => r.processSubtype)")
    check(actual_subtypes == case["expected_subtypes"],
          f'{case["id"]}: process event identity changed: {actual_subtypes}')

    review = page.locator("#requirements").inner_text().lower()
    overview = page.locator("#priorityOverview").inner_text().lower()
    conflict_phrase = "motstridiga datum eller klockslag för frågor/förtydliganden"
    has_conflict = conflict_phrase in review
    overview_conflict = conflict_phrase in overview
    check(has_conflict == case["expect_question_conflict"],
          f'{case["id"]}: wrong clarification-conflict state in full review')
    check(overview_conflict == case["expect_question_conflict"],
          f'{case["id"]}: wrong clarification-conflict state in calm overview')

    answer_conflict_phrase = "motstridiga datum eller klockslag för publicering av svar"
    answer_conflict = answer_conflict_phrase in review
    overview_answer_conflict = answer_conflict_phrase in overview
    expect_answer_conflict = case.get("expect_answer_conflict", False)
    check(answer_conflict == expect_answer_conflict,
          f'{case["id"]}: wrong answer-publication conflict state in full review')
    check(overview_answer_conflict == expect_answer_conflict,
          f'{case["id"]}: wrong answer-publication conflict state in calm overview')

    publication_marker = "publicering av svar"
    if case["expect_answer_publication_check"]:
        check(publication_marker in review, f'{case["id"]}: answer-publication source check missing from full review')
        check(publication_marker in overview, f'{case["id"]}: answer-publication source check hidden from calm overview')
        check("sista dag för frågor/förtydliganden kontrollerad" not in review.split("publicering av svar")[-1],
              f'{case["id"]}: answer publication still relabeled as supplier question deadline')
    else:
        check(publication_marker not in review, f'{case["id"]}: false answer-publication source check in full review')

    sizes = page.evaluate("({viewport:innerWidth,content:document.documentElement.scrollWidth})")
    check(sizes["content"] <= sizes["viewport"] + 1, f'{case["id"]}: horizontal overflow {sizes}')


results = []
browser_version = None
harness_error = None
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
    "scope": "Focused offline procurement process-event source-truth browser regression. Network disabled; no live Pages, storage, legal, physical Safari/iPad/iPhone or assistive-technology claim.",
    "engine": ENGINE,
    "browser_version": browser_version,
    "viewports": VIEWPORTS,
    "independent_cases": len(CASES),
    "expected_runs": len(VIEWPORTS) * len(CASES),
    "executed_runs": len(results),
    "harness_error": harness_error,
    "passed": sum(x["status"] == "PASS" for x in results),
    "failed": sum(x["status"] == "FAIL" for x in results),
    "results": results,
    "runtime_blob_sha1": sha1_blob(ROOT / "client/procurement-expert-pilot.js"),
}
OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False))
if harness_error or report["failed"] or report["executed_runs"] != report["expected_runs"]:
    raise SystemExit(1)
