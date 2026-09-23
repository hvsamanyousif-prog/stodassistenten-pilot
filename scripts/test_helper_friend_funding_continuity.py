#!/usr/bin/env python3
"""Bounded regression for helper funding scope in sv/ar/fa.

This proves only the shared browser routing contract. It does not prove
eligibility, physical-device behavior, human comprehension or persistence.
"""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

import build_public_pilot as builder
import test_relative_funding_continuity as relative
import test_shared_search_browser as shared
from playwright.sync_api import sync_playwright

CASES = [
    {"id": "sv-helper-friend-student-funding", "lang": "sv", "width": 390, "text": "Jag hjälper min vän som är student att söka bidrag"},
    {"id": "ar-helper-friend-student-funding", "lang": "ar", "width": 390, "text": "أساعد صديقي وهو طالب في البحث عن دعم مالي"},
    {"id": "fa-helper-friend-student-funding", "lang": "fa", "width": 768, "text": "به دوستم که دانشجو است کمک می‌کنم برای کمک مالی"},
    {"id": "ar-helper-spouse-student-funding", "lang": "ar", "width": 390, "text": "أساعد زوجي وهو طالب في البحث عن دعم مالي."},
    {"id": "sv-helper-help-out-mother-funding-390", "lang": "sv", "width": 390, "text": "Jag hjälper till hemma hos min mamma och söker bidrag."},
    {"id": "sv-helper-help-out-mother-funding-1280", "lang": "sv", "width": 1280, "text": "Jag hjälper till hemma hos min mamma och söker bidrag."},
    {"id": "sv-helper-help-out-sambo-funding-390", "lang": "sv", "width": 390, "text": "Jag hjälper till hemma hos min sambo och söker bidrag."},
    {"id": "sv-helper-help-out-sambo-funding-1280", "lang": "sv", "width": 1280, "text": "Jag hjälper till hemma hos min sambo och söker bidrag."},
    {"id": "sv-helper-help-out-make-funding-390", "lang": "sv", "width": 390, "text": "Jag hjälper till hemma hos min make och söker bidrag."},
    {"id": "sv-helper-help-out-make-funding-1280", "lang": "sv", "width": 1280, "text": "Jag hjälper till hemma hos min make och söker bidrag."},
    {"id": "sv-helper-help-out-maka-funding-390", "lang": "sv", "width": 390, "text": "Jag hjälper till hemma hos min maka och söker bidrag."},
    {"id": "sv-helper-help-out-maka-funding-1280", "lang": "sv", "width": 1280, "text": "Jag hjälper till hemma hos min maka och söker bidrag."},
]

MIXED_TARGET_CASES = [
    {"id": "sv-helper-own-food-sister-scholarship-390", "lang": "sv", "width": 390, "text": "Jag hjälper min syster. Jag behöver hjälp med maten och hon söker stipendium."},
    {"id": "sv-helper-own-food-sister-scholarship-1280", "lang": "sv", "width": 1280, "text": "Jag hjälper min syster. Jag behöver hjälp med maten och hon söker stipendium."},
]


def run_mixed_target_case(browser, base_url: str, case: dict) -> dict:
    page = browser.new_page(viewport={"width": case["width"], "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        page.goto(relative.start_url(base_url, case["lang"]), wait_until="load")
        page.locator("#situation").fill(case["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        shared.require(results.is_visible(), f"{case['id']}: results missing")
        shared.require(results.locator('[data-target-ownership-choice="true"]').count() == 1, f"{case['id']}: mixed fact targets were silently collapsed")

        self_route = results.locator('a[data-fact-target="self-need"]')
        shared.require(self_route.count() == 1, f"{case['id']}: own-need route missing")
        self_href = self_route.get_attribute("href") or ""
        shared.require("actor_type=private_person" in self_href, f"{case['id']}: own need did not stay with the helper: {self_href}")
        shared.require("funding_intent=" not in self_href, f"{case['id']}: sister's scholarship leaked into helper's own-need route: {self_href}")

        relative_route = results.locator('a[data-fact-target="helped-person-funding"]')
        shared.require(relative_route.count() == 1, f"{case['id']}: helped-person scholarship route missing")
        relative_href = relative_route.get_attribute("href") or ""
        shared.require("actor_type=relative" in relative_href, f"{case['id']}: helped-person role not preserved: {relative_href}")
        shared.require("funding_intent=scholarship" in relative_href, f"{case['id']}: scholarship intent not preserved for helped person: {relative_href}")
        shared.require(case["text"] not in self_href and case["text"] not in relative_href, f"{case['id']}: raw situation leaked into a route")
        shared.require(not page_errors, f"{case['id']}: JavaScript error(s): {page_errors}")
        shared.require(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), f"{case['id']}: horizontal overflow")
        return {"id": case["id"], "status": "passed", "lang": case["lang"], "width": case["width"], "self_href": self_href, "relative_href": relative_href}
    finally:
        page.close()


def main() -> int:
    root = Path(".").resolve()
    engine_name = os.environ.get("BROWSER_ENGINE", "chromium")
    output = Path(os.environ.get("EVIDENCE_PATH", f"helper-friend-funding-{engine_name}.json"))
    evidence = {"engine": engine_name, "scenario_count": len(CASES) + len(MIXED_TARGET_CASES), "passed": 0, "failed": 0, "results": []}

    with tempfile.TemporaryDirectory(prefix="stod-helper-friend-") as tmp:
        site = Path(tmp) / "site"
        builder.build(root, site)
        with shared.serve_site(site) as base_url, sync_playwright() as playwright:
            browser = getattr(playwright, engine_name).launch(headless=True)
            try:
                for case in CASES:
                    try:
                        evidence["results"].append(relative.run_helper_case(browser, base_url, case))
                        evidence["passed"] += 1
                    except Exception as exc:
                        evidence["failed"] += 1
                        evidence["results"].append({"id": case["id"], "status": "failed", "error": str(exc)})
                for case in MIXED_TARGET_CASES:
                    try:
                        evidence["results"].append(run_mixed_target_case(browser, base_url, case))
                        evidence["passed"] += 1
                    except Exception as exc:
                        evidence["failed"] += 1
                        evidence["results"].append({"id": case["id"], "status": "failed", "error": str(exc)})
            finally:
                browser.close()

    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"friend helper funding continuity ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    for result in evidence["results"]:
        if result["status"] == "failed":
            print(f"FAIL {result['id']}: {result['error']}")
    return 1 if evidence["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
