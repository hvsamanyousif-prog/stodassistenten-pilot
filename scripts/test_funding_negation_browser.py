#!/usr/bin/env python3
"""Browser regression for explicit funding-type negation across pilot languages.

A user who explicitly rejects one funding type and independently asks for
another must not be forced through a redundant funding-type clarification.
The negative type must not leak into the bounded handoff. Helper journeys also
protect target ownership: rejecting a funding type must not erase an explicitly
stated helped person's concrete need. This is browser/DOM routing evidence only;
it is not eligibility, live-opportunity, storage or human-comprehension evidence.
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

import build_public_pilot as builder
from playwright.sync_api import sync_playwright


SCENARIOS = [
    {
        "id": "sv-student-no-loan-only-scholarship",
        "lang": "sv",
        "text": "Jag är student och söker inget lån, bara stipendium.",
        "expect_intent": "scholarship",
        "reject_intent": "loan",
    },
    {
        "id": "sv-student-no-scholarship-only-loan",
        "lang": "sv",
        "text": "Jag är student och söker inget stipendium, bara lån.",
        "expect_intent": "loan",
        "reject_intent": "scholarship",
    },
    {
        "id": "sv-student-loan-and-scholarship-control",
        "lang": "sv",
        "text": "Jag är student och söker lån och stipendium.",
        "expect_clarification": True,
    },
    {
        "id": "ar-student-no-loan-only-scholarship",
        "lang": "ar",
        "text": "أنا طالب ولا أريد قرضا فقط منحة دراسية.",
        "expect_intent": "scholarship",
        "reject_intent": "loan",
    },
    {
        "id": "ar-student-no-scholarship-only-loan",
        "lang": "ar",
        "text": "أنا طالب ولا أريد منحة دراسية فقط قرضا.",
        "expect_intent": "loan",
        "reject_intent": "scholarship",
    },
    {
        "id": "ar-student-loan-and-scholarship-control",
        "lang": "ar",
        "text": "أنا طالب وأبحث عن قرض ومنحة دراسية.",
        "expect_clarification": True,
    },
    {
        "id": "fa-student-no-loan-only-scholarship",
        "lang": "fa",
        "text": "من دانشجو هستم وام نمی‌خواهم فقط بورسیه.",
        "expect_intent": "scholarship",
        "reject_intent": "loan",
    },
    {
        "id": "fa-student-no-scholarship-only-loan",
        "lang": "fa",
        "text": "من دانشجو هستم بورسیه نمی‌خواهم فقط وام.",
        "expect_intent": "loan",
        "reject_intent": "scholarship",
    },
    {
        "id": "fa-student-loan-and-scholarship-control",
        "lang": "fa",
        "text": "من دانشجو هستم وام و بورسیه می‌خواهم.",
        "expect_clarification": True,
    },
    {
        "id": "sv-helper-sister-no-scholarship-rent",
        "lang": "sv",
        "text": "Jag hjälper min syster. Hon behöver inte stipendium, hon behöver hjälp med hyran.",
        "expect_actor": "relative",
        "reject_intent": "scholarship",
        "expect_no_intent": True,
        "expect_need_context": "housing",
    },
    {
        "id": "sv-helper-sister-scholarship-control",
        "lang": "sv",
        "text": "Jag hjälper min syster. Hon behöver stipendium.",
        "expect_actor": "relative",
        "expect_intent": "scholarship",
    },
    {
        "id": "sv-helper-sister-rent-plus-scholarship-control",
        "lang": "sv",
        "text": "Jag hjälper min syster. Hon behöver hjälp med hyran och söker stipendium.",
        "expect_actor": "relative",
        "expect_intent": "scholarship",
        "expect_need_context": "housing",
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


def run_case(browser, base_url: str, scenario: dict, width: int) -> dict:
    case_id = f"{scenario['id']}-{width}"
    page = browser.new_page(viewport={"width": width, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        lang = scenario.get("lang", "sv")
        page.goto(f"{base_url}/index.html?lang={lang}", wait_until="load")
        page.locator("#situation").fill(scenario["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        require(results.is_visible(), f"{case_id}: results did not become visible")
        require(results.locator('[data-funding-question="true"]').count() == 0, f"{case_id}: known actor triggered an actor question")

        intent_questions = results.locator('[data-funding-intent-question="true"]')
        hrefs = results.locator("a[href]").evaluate_all("els => els.map(el => el.getAttribute('href') || '')")
        if scenario.get("expect_clarification"):
            require(intent_questions.count() == 1, f"{case_id}: genuinely mixed funding request did not ask one type-changing question")
            require(results.locator("a[data-funding-actor]").count() == 0, f"{case_id}: mixed funding request was silently routed")
        elif scenario.get("expect_no_intent"):
            require(intent_questions.count() == 0, f"{case_id}: explicit rejection caused a funding-type clarification")
            reject = scenario["reject_intent"]
            require(all(f"funding_intent={reject}" not in href for href in hrefs), f"{case_id}: explicitly rejected funding type leaked into a route")
            actor = scenario.get("expect_actor", "student")
            route = results.locator(f'a[href*="actor_type={actor}"]')
            require(route.count() >= 1, f"{case_id}: helped-person ownership was not preserved in the next route")
            need_context = scenario.get("expect_need_context")
            if need_context:
                actor_hrefs = route.evaluate_all("els => els.map(el => el.getAttribute('href') || '')")
                require(any(f"need_context={need_context}" in href for href in actor_hrefs), f"{case_id}: concrete helped-person need was not preserved in the bounded handoff")
        else:
            require(intent_questions.count() == 0, f"{case_id}: explicit rejection still caused a redundant funding-type clarification")
            intent = scenario["expect_intent"]
            actor = scenario.get("expect_actor", "student")
            route = results.locator(f'a[href*="actor_type={actor}"][data-funding-intent="{intent}"]')
            require(route.count() >= 1, f"{case_id}: affirmed funding type was not preserved for the known actor")
            reject = scenario.get("reject_intent")
            if reject:
                require(all(f"funding_intent={reject}" not in href for href in hrefs), f"{case_id}: explicitly rejected funding type leaked into a route")
            need_context = scenario.get("expect_need_context")
            if need_context:
                actor_hrefs = route.evaluate_all("els => els.map(el => el.getAttribute('href') || '')")
                require(any(f"need_context={need_context}" in href for href in actor_hrefs), f"{case_id}: affirmed helper funding route lost the helped person's concrete need")

        require(all(scenario["text"] not in href and "situation=" not in href and "q=" not in href for href in hrefs), f"{case_id}: raw situation leaked into route")
        require(not page_errors, f"{case_id}: JavaScript error(s): {page_errors}")
        require(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), f"{case_id}: horizontal overflow")
        return {"id": case_id, "status": "passed", "width": width, "lang": lang, "hrefs": hrefs}
    finally:
        page.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default=None)
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")
    output = args.output or os.environ.get("EVIDENCE_PATH", f"funding-negation-{engine_name}.json")

    with tempfile.TemporaryDirectory(prefix="stod-funding-negation-") as tmp:
        site = Path(tmp) / "site"
        index_path = builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": sha256(index_path),
            "privacy_routing_sha256": sha256(site / builder.SHELL_ROUTING_PATH),
            "semantic_cases": len(SCENARIOS),
            "widths": list(WIDTHS),
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
                            evidence["results"].append({"id": f"{scenario['id']}-{width}", "status": "failed", "error": str(exc)})
            finally:
                browser.close()

    Path(output).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"funding negation ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    for result in evidence["results"]:
        if result["status"] == "failed":
            print(f"FAIL {result['id']}: {result['error']}")
    return 1 if evidence["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
