#!/usr/bin/env python3
"""Browser regression for bounded Swedish `hyra` semantics on the shared start page.

The shared shell must not let the verb "hyra" (rent an object) inject an economy
route when another known route already explains the sentence, while preserving
ordinary noun phrases that do describe rent pressure. The same scenario family
also covers the natural standalone no-match journey: object rental without
another known signal must fail closed instead of fabricating economy/work
relevance. This is routing/UX evidence only; it does not claim eligibility.
"""

from __future__ import annotations

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
        "id": "rent-car-is-not-economy",
        "text": "Jag behöver hyra en bil till jobbet.",
        "expect_economy": False,
    },
    {
        "id": "rent-trailer-is-not-economy",
        "text": "Mitt företag behöver hyra ett släp.",
        "expect_economy": False,
    },
    {
        "id": "standalone-rent-car-fails-closed",
        "text": "Jag behöver hyra en bil till helgen.",
        "expect_economy": False,
        "expect_no_match": True,
    },
    {
        "id": "standalone-rent-trailer-fails-closed",
        "text": "Jag behöver hyra ett släp till helgen.",
        "expect_economy": False,
        "expect_no_match": True,
    },
    {
        "id": "high-rent-is-economy",
        "text": "Jag har hög hyra och behöver hjälp.",
        "expect_economy": True,
    },
    {
        "id": "pay-rent-is-economy",
        "text": "Jag har svårt att betala hyran.",
        "expect_economy": True,
    },
    {
        "id": "combined-essentials-rent-stays-economy",
        "text": "Jag behöver hjälp med läkemedel och mat/hyra.",
        "expect_economy": True,
    },
]
WIDTHS = [390, 1280]
FALLBACK_COPY = "Jag behöver en sak till för att välja rätt väg. Välj det som ligger närmast:"


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
    page = browser.new_page(viewport={"width": width, "height": 900})
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    case_id = f"{scenario['id']}-{width}"
    try:
        page.goto(f"{base_url}/index.html?lang=sv", wait_until="load")
        page.locator("#situation").fill(scenario["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        require(results.is_visible(), f"{case_id}: result panel did not open")
        require(not errors, f"{case_id}: JavaScript error(s): {errors}")

        economy_links = results.locator('a[href*="actor_type=private_person"]')
        if scenario["expect_economy"]:
            require(economy_links.count() >= 1, f"{case_id}: genuine rent pressure lost the economy route")
        else:
            require(economy_links.count() == 0, f"{case_id}: object-rental verb incorrectly produced the economy route")

        hrefs = results.locator("a").evaluate_all("els => els.map(el => el.getAttribute('href') || '')")
        if scenario.get("expect_no_match"):
            interpretation = results.locator(".interpret").inner_text().strip()
            require(interpretation == FALLBACK_COPY, f"{case_id}: no-match copy presented domain routes as matches: {interpretation!r}")
            require(len(hrefs) == 1, f"{case_id}: standalone no-match should expose one generic route, got {hrefs}")
            require("actor_type=other" in hrefs[0], f"{case_id}: standalone no-match did not lead to the generic route: {hrefs}")
            require(all("actor_type=employee" not in href for href in hrefs), f"{case_id}: standalone object rental fabricated a work route")

        require(all(scenario["text"] not in href for href in hrefs), f"{case_id}: raw situation leaked into result URL")
        require(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), f"{case_id}: horizontal overflow")

        return {
            "id": case_id,
            "semantic_case": scenario["id"],
            "width": width,
            "status": "passed",
            "expect_economy": scenario["expect_economy"],
            "expect_no_match": bool(scenario.get("expect_no_match")),
            "hrefs": hrefs,
        }
    finally:
        page.close()


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("repo_root", nargs="?", default=".")
    parser.add_argument("evidence", nargs="?", default="start-economy-hyra-evidence.json")
    args = parser.parse_args()

    repo = Path(args.repo_root).resolve()
    evidence_path = Path(args.evidence).resolve()
    engine = os.environ.get("BROWSER_ENGINE", "chromium").strip().lower()
    if engine not in {"chromium", "webkit"}:
        raise SystemExit(f"unsupported BROWSER_ENGINE={engine}")

    with tempfile.TemporaryDirectory(prefix="stod-start-hyra-") as tmp:
        site = Path(tmp) / "site"
        builder.build(repo, site)
        built_index = site / "index.html"
        require(built_index.exists(), "public build did not produce index.html")

        with serve_site(site) as base_url, sync_playwright() as playwright:
            browser_type = getattr(playwright, engine)
            browser = browser_type.launch(headless=True)
            try:
                cases = [run_case(browser, base_url, scenario, width) for scenario in SCENARIOS for width in WIDTHS]
            finally:
                browser.close()

        evidence = {
            "status": "passed",
            "browser_engine": engine,
            "independent_semantic_cases": len(SCENARIOS),
            "viewport_repetitions_per_case": len(WIDTHS),
            "physical_checks": len(cases),
            "built_index_sha256": sha256(built_index),
            "cases": cases,
            "limits": [
                "Browser/DOM/routing evidence only.",
                "Viewport repetition is not an independent semantic case.",
                "Playwright WebKit is not physical iPhone/iPad Safari evidence.",
            ],
        }
        evidence_path.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(evidence, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
