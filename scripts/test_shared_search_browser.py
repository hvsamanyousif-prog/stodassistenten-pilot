#!/usr/bin/env python3
"""Browser regression for the shared Stödassistenten start/search journey.

This is deliberately a small, public-shell oracle. It verifies routing behavior and
privacy boundaries without claiming support eligibility, live discovery, persistence,
or model quality.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright


ACTOR_HREFS = {
    "private": "actor_type=private_person",
    "study": "actor_type=student",
    "company": "actor_type=company",
    "association": "actor_type=association",
}

SCENARIOS = [
    {
        "id": "sv-money-search-320",
        "lang": "sv",
        "width": 320,
        "text": "pengar att söka",
        "expect_question": True,
        "question_token": "vem gäller det",
    },
    {
        "id": "sv-search-money-390",
        "lang": "sv",
        "width": 390,
        "text": "söka pengar",
        "expect_question": True,
        "question_token": "vem gäller det",
    },
    {
        "id": "sv-funds-768",
        "lang": "sv",
        "width": 768,
        "text": "fonder att söka",
        "expect_question": True,
        "question_token": "vem gäller det",
    },
    {
        "id": "sv-scholarship-1024",
        "lang": "sv",
        "width": 1024,
        "text": "stipendium",
        "expect_question": True,
        "question_token": "stipendium",
    },
    {
        "id": "sv-scholarship-typo-1280",
        "lang": "sv",
        "width": 1280,
        "text": "stipenium att söka",
        "expect_question": True,
        "question_token": "stipendium",
    },
    {
        "id": "sv-loan-is-not-grant",
        "lang": "sv",
        "width": 390,
        "text": "lån att söka",
        "expect_question": True,
        "question_token": "lån",
    },
    {
        "id": "sv-known-student-skips-question",
        "lang": "sv",
        "width": 768,
        "text": "jag studerar och söker stipendium",
        "expect_question": False,
        "expect_actor": "study",
    },
    {
        "id": "sv-known-company-context-skips-question",
        "lang": "sv",
        "width": 1024,
        "actor_type": "company",
        "text": "fonder att söka",
        "expect_question": False,
        "expect_actor": "company",
    },
    {
        "id": "sv-association-in-text-skips-question",
        "lang": "sv",
        "width": 1280,
        "text": "vår förening söker bidrag till ett projekt",
        "expect_question": False,
        "expect_actor": "association",
    },
    {
        "id": "sv-combined-everyday-needs-stay-open",
        "lang": "sv",
        "width": 390,
        "text": "Jag behöver hjälp med läkemedel och mat/hyra",
        "expect_question": False,
        "expect_routes": ["actor_type=private_person", "actor_type=other"],
    },
    {
        "id": "sv-procurement-remains-company",
        "lang": "sv",
        "width": 1280,
        "text": "Jag driver företag och vill hitta en offentlig upphandling",
        "expect_question": False,
        "expect_route": "actor_type=company",
    },
    {
        "id": "sv-dental-regression",
        "lang": "sv",
        "width": 320,
        "text": "Jag har ont i en tand men är orolig för kostnaden",
        "expect_question": False,
        "expect_route": "quick-help.html?mode=dental",
    },
    {
        "id": "ar-generic-funding-rtl",
        "lang": "ar",
        "width": 390,
        "text": "أبحث عن منحة أو دعم مالي",
        "expect_question": True,
        "question_token": "من",
        "expect_rtl": True,
    },
    {
        "id": "fa-scholarship-rtl",
        "lang": "fa",
        "width": 768,
        "text": "دنبال بورسیه هستم",
        "expect_question": True,
        "question_token": "بورسیه",
        "expect_rtl": True,
    },
    {
        "id": "sv-private-context-reused",
        "lang": "sv",
        "width": 1024,
        "actor_type": "private_person",
        "text": "pengar att söka",
        "expect_question": False,
        "expect_actor": "private",
    },
]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def scenario_url(index_path: Path, scenario: dict) -> str:
    query = {"lang": scenario["lang"]}
    if scenario.get("actor_type"):
        query["actor_type"] = scenario["actor_type"]
    return f"{index_path.resolve().as_uri()}?{urlencode(query)}"


def run_scenario(browser, index_path: Path, scenario: dict) -> dict:
    page = browser.new_page(viewport={"width": scenario["width"], "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        page.goto(scenario_url(index_path, scenario), wait_until="load")
        page.locator("#situation").fill(scenario["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        require(results.is_visible(), f"{scenario['id']}: results did not become visible")
        require(not page_errors, f"{scenario['id']}: JavaScript error(s): {page_errors}")

        question_count = results.locator('[data-funding-question="true"]').count()
        require(question_count <= 1, f"{scenario['id']}: more than one first funding question rendered")
        if scenario.get("expect_question"):
            require(question_count == 1, f"{scenario['id']}: expected one actor-changing funding question")
            question_text = results.locator('[data-funding-question="true"]').inner_text().lower()
            require(
                scenario["question_token"].lower() in question_text,
                f"{scenario['id']}: question did not preserve funding type/context: {question_text!r}",
            )
            options = results.locator("a[data-funding-actor]")
            require(options.count() == 4, f"{scenario['id']}: expected four actor entrances, got {options.count()}")
            option_actors = sorted(options.evaluate_all("els => els.map(el => el.dataset.fundingActor)"))
            require(
                option_actors == sorted(ACTOR_HREFS),
                f"{scenario['id']}: actor choices drifted: {option_actors}",
            )
            result_text = results.inner_text().lower()
            require("tandvård" not in result_text and "städ" not in result_text, f"{scenario['id']}: vague funding query leaked a default precise route")
        else:
            require(question_count == 0, f"{scenario['id']}: redundant actor question was shown")

        if scenario.get("expect_actor"):
            actor = scenario["expect_actor"]
            links = results.locator(f'a[href*="{ACTOR_HREFS[actor]}"]')
            require(links.count() >= 1, f"{scenario['id']}: known actor was not reused ({actor})")
            require(results.locator("a").first.get_attribute("href") == links.first.get_attribute("href"), f"{scenario['id']}: known actor route was not prioritized")

        if scenario.get("expect_route"):
            require(results.locator(f'a[href*="{scenario["expect_route"]}"]').count() >= 1, f"{scenario['id']}: expected route missing: {scenario['expect_route']}")

        for token in scenario.get("expect_routes", []):
            require(results.locator(f'a[href*="{token}"]').count() >= 1, f"{scenario['id']}: combined need route missing: {token}")

        if scenario.get("expect_rtl"):
            require(page.evaluate("document.documentElement.dir") == "rtl", f"{scenario['id']}: RTL direction missing")

        require(
            page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"),
            f"{scenario['id']}: horizontal overflow at {scenario['width']}px",
        )
        button_height = page.locator("#analyzeBtn").bounding_box()["height"]
        require(button_height >= 44, f"{scenario['id']}: primary touch target below 44px ({button_height})")

        # The public shell must never put the raw free-text situation into links.
        raw = scenario["text"]
        hrefs = results.locator("a").evaluate_all("els => els.map(el => el.getAttribute('href') || '')")
        require(all(raw not in href for href in hrefs), f"{scenario['id']}: raw situation leaked into a result URL")

        return {
            "id": scenario["id"],
            "width": scenario["width"],
            "lang": scenario["lang"],
            "status": "passed",
            "question_count": question_count,
            "hrefs": hrefs,
        }
    finally:
        page.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default="shared-search-browser-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    index_path = root / "index.html"
    require(index_path.is_file(), f"index.html not found under {root}")
    engine_name = args.engine or __import__("os").environ.get("BROWSER_ENGINE", "chromium")

    evidence = {"engine": engine_name, "scenario_count": len(SCENARIOS), "passed": 0, "failed": 0, "results": []}
    with sync_playwright() as playwright:
        browser_type = getattr(playwright, engine_name)
        browser = browser_type.launch(headless=True)
        try:
            for scenario in SCENARIOS:
                try:
                    result = run_scenario(browser, index_path, scenario)
                    evidence["passed"] += 1
                    evidence["results"].append(result)
                except Exception as exc:
                    evidence["failed"] += 1
                    evidence["results"].append({"id": scenario["id"], "status": "failed", "error": str(exc)})
        finally:
            browser.close()

    Path(args.output).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"shared search browser ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
