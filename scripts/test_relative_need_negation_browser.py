#!/usr/bin/env python3
"""Bounded browser regression for helped-person need polarity in Swedish.

This stays inside the existing shared start -> person destination journey. It verifies
that an explicitly rejected coarse need is not serialized as positive task state,
while a separate affirmative need and scholarship intent are preserved for the person
being helped. This is browser/DOM/routing/privacy evidence only; not eligibility,
storage, physical Safari, assistive-tech, or human-comprehension evidence.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from pathlib import Path

import build_public_pilot as builder
from playwright.sync_api import sync_playwright
from test_combined_need_funding_browser import (
    WIDTHS,
    need_context_from_url,
    no_horizontal_overflow,
    require,
    serve_site,
)


CASES = [
    {
        "id": "sv-helper-sister-negated-housing-positive-food-scholarship",
        "text": "Jag hjälper min syster. Hon behöver inte hjälp med hyran, hon behöver hjälp med maten och söker stipendium.",
        "need_context": {"essential_costs"},
    },
    {
        "id": "sv-helper-sister-negated-food-positive-housing-scholarship",
        "text": "Jag hjälper min syster. Hon behöver inte hjälp med maten, hon har hög hyra och söker stipendium.",
        "need_context": {"housing"},
    },
    {
        "id": "sv-helper-sister-positive-housing-food-scholarship-control",
        "text": "Jag hjälper min syster. Hon behöver hjälp med hyran och maten och söker stipendium.",
        "need_context": {"housing", "essential_costs"},
    },
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_case(browser, base_url: str, case: dict, width: int) -> dict:
    case_id = f"{case['id']}-{width}"
    page = browser.new_page(viewport={"width": width, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        page.goto(f"{base_url}/index.html?lang=sv", wait_until="load")
        page.locator("#situation").fill(case["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        require(results.is_visible(), f"{case_id}: results did not become visible")
        require(results.locator('[data-funding-question="true"]').count() == 0, f"{case_id}: explicit helper + scholarship context caused a redundant actor question")

        target = results.locator('a[href*="actor_type=relative"][href*="funding_intent=scholarship"]').first
        require(target.count() == 1, f"{case_id}: relative scholarship route missing")
        href = target.get_attribute("href") or ""
        require(case["text"] not in href and "q=" not in href and "situation=" not in href, f"{case_id}: raw situation leaked into route: {href}")
        actual_need = need_context_from_url(href)
        require(actual_need == case["need_context"], f"{case_id}: need polarity mismatch, expected {sorted(case['need_context'])}, got {sorted(actual_need)} in {href}")
        no_horizontal_overflow(page, case_id, "shared results")
        require(not page_errors, f"{case_id}: JavaScript errors on shared page: {page_errors}")

        target.click()
        page.wait_for_load_state("load")
        require("actor_type=relative" in page.url, f"{case_id}: destination lost helper actor")
        require("funding_intent=scholarship" in page.url, f"{case_id}: destination lost scholarship intent")
        require(need_context_from_url(page.url) == case["need_context"], f"{case_id}: destination URL changed bounded need context")
        require(case["text"] not in page.url and "q=" not in page.url and "situation=" not in page.url, f"{case_id}: destination URL leaked raw situation")

        context = page.locator('#fundingIntentContext[data-funding-intent="scholarship"]')
        require(context.is_visible(), f"{case_id}: destination did not consume scholarship context")
        destination_need = {part for part in (context.get_attribute("data-need-context") or "").split(",") if part}
        require(destination_need == case["need_context"], f"{case_id}: destination did not consume exact bounded need state: {sorted(destination_need)}")
        no_horizontal_overflow(page, case_id, "destination context")
        require(not page_errors, f"{case_id}: JavaScript errors after destination handoff: {page_errors}")

        return {
            "id": case["id"],
            "width": width,
            "status": "passed",
            "actor_type": "relative",
            "funding_intent": "scholarship",
            "need_context": sorted(case["need_context"]),
            "route": href,
        }
    finally:
        page.close()


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", ".")).resolve()
    output = Path(os.environ.get("EVIDENCE_PATH", "relative-need-negation-browser-evidence.json"))
    engine_name = os.environ.get("BROWSER_ENGINE", "chromium")
    require((root / "index.html").is_file(), f"index.html not found under {root}")

    with tempfile.TemporaryDirectory(prefix="stod-relative-need-negation-") as tmp:
        site = Path(tmp) / "site"
        index_path = builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": sha256(index_path),
            "concrete_need_continuity_sha256": sha256(site / builder.CONCRETE_NEED_CONTINUITY_PATH),
            "independent_semantic_cases": len(CASES),
            "widths": list(WIDTHS),
            "expected_checks": len(CASES) * len(WIDTHS),
            "executed": 0,
            "passed": 0,
            "failed": 0,
            "results": [],
            "limits": [
                "Bounded Swedish helper need-polarity family only.",
                "Viewport repetitions are not independent semantic cases.",
                "Playwright WebKit is not physical iPhone/iPad Safari evidence.",
            ],
        }
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
                            evidence["results"].append({
                                "id": case["id"],
                                "width": width,
                                "status": "failed",
                                "error": str(exc),
                            })
            finally:
                browser.close()

    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"relative need negation ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
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
