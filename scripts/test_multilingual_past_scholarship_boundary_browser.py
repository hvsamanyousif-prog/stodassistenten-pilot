#!/usr/bin/env python3
"""Bounded browser regression for past-vs-current scholarship intent in ar/fa.

This stays inside the existing shared start/funding route. It verifies that an explicit
past scholarship mention is background while a current scholarship search remains an
active scholarship intent. Browser/DOM/routing evidence only; not eligibility, storage,
physical Safari, or human-comprehension evidence.
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
        "id": "ar-past-scholarship-is-not-current-intent",
        "lang": "ar",
        "text": "حصلت على منحة العام الماضي. الآن لدي إيجار مرتفع.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_need": "need_context=housing",
        "reject_intent": "funding_intent=",
    },
    {
        "id": "fa-past-scholarship-is-not-current-intent",
        "lang": "fa",
        "text": "سال گذشته بورسیه گرفتم. الان اجاره بالایی دارم.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_need": "need_context=housing",
        "reject_intent": "funding_intent=",
    },
    {
        "id": "ar-current-scholarship-remains-current-intent",
        "lang": "ar",
        "text": "أبحث عن منحة",
        "expect_question": True,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=scholarship",
    },
    {
        "id": "fa-current-scholarship-remains-current-intent",
        "lang": "fa",
        "text": "دنبال بورسیه هستم",
        "expect_question": True,
        "expect_first": "actor_type=private_person",
        "expect_intent": "funding_intent=scholarship",
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
        page.goto(f"{base_url}/index.html?lang={case['lang']}", wait_until="load")
        page.locator("#situation").fill(case["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        require(results.is_visible(), f"{case['id']}@{width}: results not visible")
        require(not page_errors, f"{case['id']}@{width}: JavaScript errors: {page_errors}")
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
        if case.get("expect_need"):
            require(case["expect_need"] in first_href, f"{case['id']}@{width}: housing need not preserved: {first_href!r}")
        if case.get("expect_intent"):
            require(case["expect_intent"] in first_href, f"{case['id']}@{width}: current scholarship intent not preserved: {first_href!r}")
        if case.get("reject_intent"):
            require(all(case["reject_intent"] not in href for href in hrefs), f"{case['id']}@{width}: false current funding intent rendered: {hrefs}")

        require(all(case["text"] not in href for href in hrefs), f"{case['id']}@{width}: raw situation leaked into URL")
        require(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), f"{case['id']}@{width}: horizontal overflow")
        return {"id": case["id"], "lang": case["lang"], "width": width, "status": "passed", "question_count": question_count, "first_href": first_href, "hrefs": hrefs}
    finally:
        page.close()


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", ".")).resolve()
    output = Path(os.environ.get("EVIDENCE_PATH", "multilingual-past-scholarship-boundary-evidence.json"))
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
            "Viewport repetitions are not independent semantic cases.",
            "Playwright WebKit is not physical iPhone/iPad Safari evidence.",
        ],
    }

    with tempfile.TemporaryDirectory(prefix="stod-past-scholarship-boundary-") as tmp:
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
                            evidence["results"].append({"id": case["id"], "lang": case["lang"], "width": width, "status": "failed", "error": str(exc)})
            finally:
                browser.close()

    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"multilingual past-scholarship boundary ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
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
