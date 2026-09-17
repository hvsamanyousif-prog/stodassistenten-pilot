#!/usr/bin/env python3
"""Browser regression for preserving a concrete need together with funding intent.

The shared start page must not make a user choose between describing the real
problem and saying that they are looking for funding. When both are explicit,
the handoff may carry only bounded, non-free-text need context that the existing
destination can consume. Raw situation text must never be copied into the URL.

This is browser/DOM evidence for the public pilot build. It does not prove
eligibility, a live opportunity, persistence, model quality or human
comprehension.
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
from urllib.parse import parse_qs, urlencode, urlparse

import build_public_pilot as builder
from playwright.sync_api import sync_playwright


SCENARIOS = [
    {
        "id": "sv-household-need-plus-funding",
        "text": "Jag behöver hjälp med läkemedel och hyra och söker bidrag.",
        "actor_type": "private_person",
        "intent": "funding",
        "context_token": "Finansiering",
        "expect_general_route": True,
        "need_context": {"essential_costs", "housing"},
        "need_copy": ("Nödvändiga utgifter", "Boende / hyra"),
        "continue_action": "private",
        "steps_before_result": 4,
        "expect_housing_skip": True,
    },
    {
        "id": "sv-student-rent-plus-scholarship",
        "text": "Jag studerar och behöver hjälp med hyran och söker stipendium.",
        "actor_type": "student",
        "intent": "scholarship",
        "context_token": "Stipendium / bidrag",
        "expect_general_route": False,
        "need_context": {"housing"},
        "need_copy": ("Boende / hyra",),
        "continue_action": "continue",
        "steps_before_result": 3,
        "expect_housing_skip": True,
    },
    {
        "id": "sv-student-scholarship-without-concrete-need",
        "text": "Jag studerar och söker stipendium.",
        "actor_type": "student",
        "intent": "scholarship",
        "context_token": "Stipendium / bidrag",
        "expect_general_route": False,
        "need_context": set(),
        "need_copy": (),
        "continue_action": "continue",
        "steps_before_result": 3,
        "expect_housing_skip": False,
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


def no_horizontal_overflow(page, scenario_id: str, stage: str) -> None:
    overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    require(not overflow, f"{scenario_id}: horizontal overflow at {stage}")


def need_context_from_url(url: str) -> set[str]:
    params = parse_qs(urlparse(url).query)
    raw = params.get("need_context", [""])[0]
    return {part for part in raw.split(",") if part}


def choose_first(page, case_id: str, stage: str) -> None:
    choices = page.locator("#main button.choice")
    require(choices.count() > 0, f"{case_id}: no question choice available at {stage}")
    choices.first.click()


def run_destination_journey(page, scenario: dict, case_id: str) -> None:
    context = page.locator(f'#fundingIntentContext[data-funding-intent="{scenario["intent"]}"]')
    require(context.is_visible(), f"{case_id}: destination did not consume preserved funding intent")
    require(scenario["context_token"] in context.inner_text(), f"{case_id}: destination lost visible funding-type distinction")

    need_context = set(filter(None, (context.get_attribute("data-need-context") or "").split(",")))
    require(need_context == scenario["need_context"], f"{case_id}: destination need context mismatch: {need_context}")
    for token in scenario["need_copy"]:
        require(token in context.inner_text(), f"{case_id}: destination did not explain preserved need context: {token}")

    action = context.locator(f'[data-funding-continuity-action="{scenario["continue_action"]}"]')
    require(action.count() == 1, f"{case_id}: destination continuation action missing")
    action.click()

    for index in range(scenario["steps_before_result"]):
        choose_first(page, case_id, f"step {index + 1}")

    housing_question = page.get_by_text("Är boendekostnaden en stor del av ekonomin?", exact=True)
    result_title = page.get_by_text("Det här är värt att kontrollera först", exact=True)
    if scenario["expect_housing_skip"]:
        require(housing_question.count() == 0 or not housing_question.is_visible(), f"{case_id}: already-known housing need was asked again")
        require(result_title.count() == 1 and result_title.is_visible(), f"{case_id}: known housing context did not carry through to result")
        result_context = page.locator(f'#fundingIntentContext[data-funding-intent="{scenario["intent"]}"]')
        require(set(filter(None, (result_context.get_attribute("data-need-context") or "").split(","))) == scenario["need_context"], f"{case_id}: result lost bounded need context")
    else:
        require(housing_question.count() == 1 and housing_question.is_visible(), f"{case_id}: housing was silently assumed without explicit concrete need")
        require(result_title.count() == 0 or not result_title.is_visible(), f"{case_id}: no-need control skipped a required question")


def run_case(browser, base_url: str, scenario: dict, width: int) -> dict:
    case_id = f"{scenario['id']}-{width}"
    page = browser.new_page(viewport={"width": width, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        page.goto(f"{base_url}/index.html?{urlencode({'lang': 'sv'})}", wait_until="load")
        page.locator("#situation").fill(scenario["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        require(results.is_visible(), f"{case_id}: results did not become visible")
        require(results.locator('[data-funding-question="true"]').count() == 0, f"{case_id}: known actor/concrete context triggered an unnecessary actor question")

        target = results.locator(
            f'a[href*="actor_type={scenario["actor_type"]}"][href*="funding_intent={scenario["intent"]}"]'
        ).first
        require(target.count() == 1, f"{case_id}: route lost funding intent")
        href = target.get_attribute("href") or ""
        require("q=" not in href and "situation=" not in href, f"{case_id}: raw situation parameter leaked into route: {href}")
        require(scenario["text"] not in href, f"{case_id}: raw situation text leaked into route")
        require(need_context_from_url(href) == scenario["need_context"], f"{case_id}: route lost or fabricated bounded need context: {href}")

        if scenario.get("expect_general_route"):
            require(results.locator('a[href*="actor_type=other"]').count() >= 1, f"{case_id}: combined need lost the broad alternative route")

        no_horizontal_overflow(page, case_id, "shared results")
        require(not page_errors, f"{case_id}: JavaScript error(s) on shared page: {page_errors}")

        target.click()
        page.wait_for_load_state("load")
        require(f"actor_type={scenario['actor_type']}" in page.url, f"{case_id}: destination lost actor context")
        require(f"funding_intent={scenario['intent']}" in page.url, f"{case_id}: destination lost funding intent")
        require("q=" not in page.url and "situation=" not in page.url, f"{case_id}: destination URL leaked raw situation parameter")
        require(need_context_from_url(page.url) == scenario["need_context"], f"{case_id}: destination URL lost or fabricated bounded need context")

        run_destination_journey(page, scenario, case_id)
        no_horizontal_overflow(page, case_id, "destination journey")
        require(not page_errors, f"{case_id}: JavaScript error(s) after destination handoff: {page_errors}")

        return {
            "id": case_id,
            "semantic_case": scenario["id"],
            "width": width,
            "status": "passed",
            "actor_type": scenario["actor_type"],
            "funding_intent": scenario["intent"],
            "need_context": sorted(scenario["need_context"]),
            "route": href,
        }
    finally:
        page.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default="combined-need-funding-browser-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")

    with tempfile.TemporaryDirectory(prefix="stod-combined-need-funding-") as tmp:
        site = Path(tmp) / "site"
        index_path = builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": sha256(index_path),
            "privacy_routing_sha256": sha256(site / builder.SHELL_ROUTING_PATH),
            "funding_continuity_sha256": sha256(site / builder.FUNDING_INTENT_CONTINUITY_PATH),
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
                            evidence["results"].append({
                                "id": f"{scenario['id']}-{width}",
                                "semantic_case": scenario["id"],
                                "width": width,
                                "status": "failed",
                                "error": str(exc),
                            })
            finally:
                browser.close()

    Path(args.output).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"combined need + funding browser ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
