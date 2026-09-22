#!/usr/bin/env python3
"""Browser regression for concrete-need and funding lexical boundaries.

The shared start page must keep vague funding language in the funding handoff when
near-miss words such as `synpunkt`, `standard` or object-rental `hyra`/Arabic-Persian rent
lexemes are present, while preserving genuine concrete family/housing needs. Ordinary
words that merely begin like a funding term, or a past funding receipt mentioned only as
background, must not fabricate a current funding intent.
This is browser/DOM/routing evidence only; it does not claim eligibility,
persistence, model quality, or physical-device evidence.
"""

from __future__ import annotations

import json
import os
import tempfile
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

import build_public_pilot as builder
from playwright.sync_api import sync_playwright


CASES = [
    {
        "id": "funding-synpunkt-is-not-concrete-vision",
        "text": "Jag söker bidrag och vill lämna en synpunkt.",
        "expect_question": True,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
        "reject": "quick-help.html?mode=vision",
    },
    {
        "id": "funding-standard-is-not-concrete-dental",
        "text": "Jag söker bidrag och vill veta vilken standard som krävs.",
        "expect_question": True,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
        "reject": "quick-help.html?mode=dental",
    },
    {
        "id": "funding-material-is-not-concrete-food",
        "text": "Jag söker bidrag till material för en aktivitet.",
        "expect_question": True,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
    },
    {
        "id": "fondue-is-not-funding",
        "text": "Jag letar efter ett fonduerecept till helgen.",
        "expect_question": False,
        "reject_intent": "funding_intent=",
    },
    {
        "id": "fond-workplace-is-not-funding",
        "text": "Jag arbetar på en fond och behöver hjälp med hyran.",
        "expect_question": False,
        "reject_intent": "funding_intent=",
    },
    {
        "id": "past-stipendium-receipt-is-not-current-intent",
        "text": "Förra året fick jag stipendium. Nu har jag hög hyra.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_need": "need_context=housing",
        "reject_intent": "funding_intent=",
    },
    {
        "id": "already-received-stipendium-is-not-current-intent",
        "text": "Jag har redan fått stipendium. Nu har jag hög hyra.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_need": "need_context=housing",
        "reject_intent": "funding_intent=",
    },
    {
        "id": "past-stipendium-application-is-not-current-intent",
        "text": "Förra året sökte jag stipendium. Nu har jag hög hyra.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_need": "need_context=housing",
        "reject_intent": "funding_intent=",
    },
    {
        "id": "past-student-loan-is-not-current-application-intent",
        "text": "Förra året hade jag studielån. Nu har jag hög hyra.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_need": "need_context=housing",
        "reject_intent": "funding_intent=",
    },
    {
        "id": "explicit-student-loan-application-remains-loan-intent",
        "text": "Jag söker studielån för mina studier.",
        "expect_question": False,
        "expect_first": "actor_type=student",
        "expect_intent": "funding_intent=loan",
    },
    {
        "id": "existing-student-loan-repayment-is-not-new-application-intent",
        "text": "Jag har studielån och behöver hjälp med återbetalningen.",
        "expect_question": False,
        "reject_intent": "funding_intent=",
    },
    {
        "id": "fonder-att-soka-remains-funding",
        "text": "Jag har hög hyra och söker fonder att söka.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
        "expect_need": "need_context=housing",
    },
    {
        "id": "vilka-fonder-kan-jag-soka-is-funding",
        "text": "Jag har hög hyra. Vilka fonder kan jag söka?",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
        "expect_need": "need_context=housing",
    },
    {
        "id": "vilka-bidrag-kan-jag-soka-is-funding",
        "text": "Jag har hög hyra. Vilka bidrag kan jag söka?",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
        "expect_need": "need_context=housing",
    },
    {
        "id": "vilka-pengar-kan-jag-soka-is-funding",
        "text": "Jag har hög hyra. Vilka pengar kan jag söka?",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
        "expect_need": "need_context=housing",
    },
    {
        "id": "funding-rent-car-is-not-concrete-housing",
        "text": "Jag söker bidrag och behöver hyra en bil.",
        "expect_question": True,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
        "reject_need": "need_context=housing",
    },
    {
        "id": "ar-funding-car-rental-is-not-concrete-housing",
        "lang": "ar",
        "text": "أبحث عن تمويل لإيجار سيارة.",
        "expect_question": True,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
        "reject_need": "need_context=housing",
    },
    {
        "id": "fa-funding-car-rental-is-not-concrete-housing",
        "lang": "fa",
        "text": "برای اجاره خودرو دنبال بودجه هستم.",
        "expect_question": True,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
        "reject_need": "need_context=housing",
    },
    {
        "id": "ar-funding-high-rent-remains-concrete-housing",
        "lang": "ar",
        "text": "لدي إيجار مرتفع وأبحث عن تمويل.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
        "expect_need": "need_context=housing",
    },
    {
        "id": "fa-funding-high-rent-remains-concrete-housing",
        "lang": "fa",
        "text": "اجاره گران دارم و دنبال بودجه هستم.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
        "expect_need": "need_context=housing",
    },
    {
        "id": "funding-extra-supervision-remains-concrete-family",
        "text": "Mitt barn behöver extra tillsyn och jag söker bidrag.",
        "expect_question": False,
        "expect_first": "actor_type=relative&focus=family",
        "expect_intent": "funding_intent=funding",
        "reject": "quick-help.html?mode=vision",
    },
    {
        "id": "funding-high-rent-remains-concrete-housing",
        "text": "Jag har hög hyra och söker bidrag.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=funding",
        "expect_need": "need_context=housing",
    },
]

WIDTHS = (390, 1280)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        return


@contextmanager
def serve_site(site: Path):
    handler = partial(QuietHandler, directory=str(site))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def run_case(browser, base_url: str, case: dict, width: int) -> dict:
    page = browser.new_page(viewport={"width": width, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        lang = case.get("lang", "sv")
        page.goto(f"{base_url}/index.html?lang={lang}", wait_until="load")
        page.locator("#situation").fill(case["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        require(results.is_visible(), f"{case['id']}@{width}: results not visible")
        require(not page_errors, f"{case['id']}@{width}: JavaScript errors: {page_errors}")
        if lang in {"ar", "fa"}:
            require(page.locator("html").get_attribute("dir") == "rtl", f"{case['id']}@{width}: RTL direction missing")

        question_count = results.locator('[data-funding-question="true"]').count()
        expected_question_count = 1 if case["expect_question"] else 0
        require(question_count == expected_question_count, f"{case['id']}@{width}: expected funding question count {expected_question_count}, got {question_count}")

        links = results.locator("a.route")
        require(links.count() >= 1, f"{case['id']}@{width}: no route rendered")
        hrefs = links.evaluate_all("els => els.map(el => el.getAttribute('href') || '')")
        first_href = hrefs[0]
        if case.get("expect_first"):
            require(case["expect_first"] in first_href, f"{case['id']}@{width}: first route {first_href!r} did not match {case['expect_first']!r}")
        if case.get("expect_intent"):
            require(case["expect_intent"] in first_href, f"{case['id']}@{width}: funding intent was not preserved in first route: {first_href!r}")
        if case.get("reject_intent"):
            require(all(case["reject_intent"] not in href for href in hrefs), f"{case['id']}@{width}: false funding intent rendered: {hrefs}")
        if case.get("expect_need"):
            require(case["expect_need"] in first_href, f"{case['id']}@{width}: concrete need was not preserved in first route: {first_href!r}")
        if case.get("reject_need"):
            require(all(case["reject_need"] not in href for href in hrefs), f"{case['id']}@{width}: false concrete need rendered: {hrefs}")
        if case.get("reject"):
            require(all(case["reject"] not in href for href in hrefs), f"{case['id']}@{width}: rejected route rendered: {hrefs}")

        require(all(case["text"] not in href for href in hrefs), f"{case['id']}@{width}: raw situation leaked into URL")
        require(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), f"{case['id']}@{width}: horizontal overflow")
        return {
            "id": case["id"],
            "lang": lang,
            "width": width,
            "status": "passed",
            "question_count": question_count,
            "first_href": first_href,
            "hrefs": hrefs,
        }
    finally:
        page.close()


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", ".")).resolve()
    output = Path(os.environ.get("EVIDENCE_PATH", "funding-concrete-need-boundary-evidence.json"))
    engine_name = os.environ.get("BROWSER_ENGINE", "chromium")
    require((root / "index.html").is_file(), f"index.html not found under {root}")

    evidence = {
        "engine": engine_name,
        "independent_semantic_cases": len(CASES),
        "widths": list(WIDTHS),
        "expected_checks": len(CASES) * len(WIDTHS),
        "executed": 0,
        "passed": 0,
        "failed": 0,
        "results": [],
        "limits": [
            "Browser/DOM/routing evidence only.",
            "Language and viewport repetitions are not independent semantic cases.",
            "Playwright WebKit is not physical iPhone/iPad Safari evidence.",
        ],
    }

    with tempfile.TemporaryDirectory(prefix="stod-funding-concrete-boundary-") as tmp:
        site = Path(tmp) / "site"
        builder.build(root, site)
        with serve_site(site) as base_url, sync_playwright() as playwright:
            browser = getattr(playwright, engine_name).launch(headless=True)
            try:
                for case in CASES:
                    for width in WIDTHS:
                        evidence["executed"] += 1
                        try:
                            evidence["results"].append(run_case(browser, base_url, case, width))
                            evidence["passed"] += 1
                        except Exception as exc:
                            evidence["failed"] += 1
                            evidence["results"].append({"id": case["id"], "lang": case.get("lang", "sv"), "width": width, "status": "failed", "error": str(exc)})
            finally:
                browser.close()

    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"funding concrete-need boundary ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["executed"] != evidence["expected_checks"]:
        print(f"FAIL harness count: expected {evidence['expected_checks']}, executed {evidence['executed']}")
        return 1
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}@{result['width']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
