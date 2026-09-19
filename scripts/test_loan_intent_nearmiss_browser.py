#!/usr/bin/env python3
"""Browser regression for financial-loan intent versus ordinary Swedish `låna`.

A user saying they want to borrow an object must not be routed as if they were
seeking a financial loan. Explicit financial loan language must keep working.
When the user affirms more than one funding type in the same additive request,
the start journey must ask one bounded type-changing question rather than
silently choosing by lexical priority. This is browser/DOM routing evidence,
not eligibility, model-quality, storage, or human-comprehension evidence.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlencode

import build_public_pilot as builder
from playwright.sync_api import sync_playwright


SCENARIOS = [
    {
        "id": "sv-explicit-financial-loan",
        "text": "Jag söker lån för en oväntad utgift.",
        "actor": None,
        "expect_loan": True,
    },
    {
        "id": "sv-borrow-money-is-financial",
        "text": "Jag vill låna pengar till en oväntad utgift.",
        "actor": None,
        "expect_loan": True,
    },
    {
        "id": "sv-borrow-library-book-not-financial",
        "text": "Jag vill låna en bok på biblioteket.",
        "actor": None,
        "expect_loan": False,
    },
    {
        "id": "sv-borrow-sisters-car-not-financial",
        "text": "Jag behöver låna en bil av min syster.",
        "actor": None,
        "expect_loan": False,
    },
    {
        "id": "sv-borrow-wheelchair-not-financial",
        "text": "Jag behöver låna en rullstol tillfälligt.",
        "actor": None,
        "expect_loan": False,
    },
    {
        "id": "sv-known-student-borrow-wheelchair-not-financial",
        "text": "Jag behöver låna en rullstol tillfälligt.",
        "actor": "student",
        "expect_loan": False,
    },
    {
        "id": "sv-loan-and-scholarship-asks-one-type-question",
        "lang": "sv",
        "text": "Jag söker lån och stipendium.",
        "actor": None,
        "expect_loan": False,
        "expect_intent_question": True,
        "intent_question_token": "vilken",
    },
    {
        "id": "ar-loan-and-scholarship-asks-one-type-question",
        "lang": "ar",
        "text": "أبحث عن قرض ومنحة دراسية.",
        "actor": None,
        "expect_loan": False,
        "expect_intent_question": True,
        "intent_question_token": "نوع",
        "expect_rtl": True,
    },
    {
        "id": "fa-loan-and-scholarship-asks-one-type-question",
        "lang": "fa",
        "text": "دنبال وام و بورسیه هستم.",
        "actor": None,
        "expect_loan": False,
        "expect_intent_question": True,
        "intent_question_token": "کدام",
        "expect_rtl": True,
    },
]
WIDTHS = (390, 1280)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


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


def no_horizontal_overflow(page, case_id: str) -> None:
    overflow = page.evaluate(
        "document.documentElement.scrollWidth > document.documentElement.clientWidth + 1"
    )
    require(not overflow, f"{case_id}: horizontal overflow")


def run_case(browser, base_url: str, scenario: dict, width: int) -> dict:
    case_id = f"{scenario['id']}-{width}"
    page = browser.new_page(viewport={"width": width, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        params = {"lang": scenario.get("lang", "sv")}
        if scenario["actor"]:
            params["actor_type"] = scenario["actor"]
        page.goto(f"{base_url}/index.html?{urlencode(params)}", wait_until="load")
        page.locator("#situation").fill(scenario["text"])
        page.locator("#analyzeBtn").click()

        results = page.locator("#engineResults")
        require(results.is_visible(), f"{case_id}: results did not become visible")
        loan_links = results.locator('a[data-funding-intent="loan"], a[href*="funding_intent=loan"]')
        loan_count = loan_links.count()
        all_hrefs = [href or "" for href in results.locator("a[href]").evaluate_all("els => els.map(el => el.getAttribute('href'))")]

        if scenario.get("expect_intent_question"):
            intent_questions = results.locator('[data-funding-intent-question="true"]')
            actor_questions = results.locator('[data-funding-question="true"]')
            require(intent_questions.count() == 1, f"{case_id}: expected exactly one funding-type clarification")
            require(actor_questions.count() == 0, f"{case_id}: actor question must not compete with funding-type clarification")
            question_text = intent_questions.inner_text().lower()
            require(
                scenario["intent_question_token"].lower() in question_text,
                f"{case_id}: funding-type clarification lost its purpose: {question_text!r}",
            )
            require(
                results.locator("a[data-funding-actor]").count() == 0,
                f"{case_id}: ambiguous funding request was silently routed to an actor/intention",
            )
            require(
                all("funding_intent=" not in href for href in all_hrefs),
                f"{case_id}: ambiguous funding request leaked a chosen funding_intent",
            )
        elif scenario["expect_loan"]:
            require(loan_count > 0, f"{case_id}: explicit financial loan intent was not preserved")
        else:
            require(loan_count == 0, f"{case_id}: ordinary object borrowing fabricated financial loan intent")
            require(
                all("funding_intent=loan" not in href for href in all_hrefs),
                f"{case_id}: loan intent leaked into a route",
            )

        require(
            all(scenario["text"] not in href and "situation=" not in href and "q=" not in href for href in all_hrefs),
            f"{case_id}: raw situation leaked into route",
        )
        if scenario["actor"] == "student":
            require(
                all("funding_intent=loan" not in href for href in all_hrefs),
                f"{case_id}: known actor was hijacked into a loan route",
            )
        if scenario.get("expect_rtl"):
            require(page.evaluate("document.documentElement.dir") == "rtl", f"{case_id}: RTL direction missing")
        require(not page_errors, f"{case_id}: JavaScript error(s): {page_errors}")
        no_horizontal_overflow(page, case_id)
        return {
            "id": case_id,
            "semantic_case": scenario["id"],
            "width": width,
            "status": "passed",
            "actor": scenario["actor"],
            "lang": scenario.get("lang", "sv"),
            "expect_loan": scenario["expect_loan"],
            "expect_intent_question": scenario.get("expect_intent_question", False),
            "loan_links": loan_count,
        }
    finally:
        page.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default="loan-intent-nearmiss-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")

    with tempfile.TemporaryDirectory(prefix="stod-loan-intent-") as tmp:
        site = Path(tmp) / "site"
        index_path = builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": sha256(index_path),
            "privacy_routing_sha256": sha256(site / builder.SHELL_ROUTING_PATH),
            "independent_semantic_cases": len(SCENARIOS),
            "widths": list(WIDTHS),
            "checks": len(SCENARIOS) * len(WIDTHS),
            "passed": 0,
            "failed": 0,
            "results": [],
        }
        with serve_site(site) as base_url, sync_playwright() as playwright:
            browser = getattr(playwright, engine_name).launch(headless=True)
            try:
                for scenario in SCENARIOS:
                    for width in WIDTHS:
                        try:
                            evidence["results"].append(run_case(browser, base_url, scenario, width))
                            evidence["passed"] += 1
                        except Exception as exc:
                            evidence["failed"] += 1
                            evidence["results"].append(
                                {
                                    "id": f"{scenario['id']}-{width}",
                                    "semantic_case": scenario["id"],
                                    "width": width,
                                    "status": "failed",
                                    "actor": scenario["actor"],
                                    "lang": scenario.get("lang", "sv"),
                                    "expect_loan": scenario["expect_loan"],
                                    "expect_intent_question": scenario.get("expect_intent_question", False),
                                    "error": str(exc),
                                }
                            )
            finally:
                browser.close()

    Path(args.output).write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"loan intent near-miss browser ({engine_name}): "
        f"{evidence['passed']} passed / {evidence['failed']} failed"
    )
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())