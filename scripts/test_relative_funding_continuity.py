#!/usr/bin/env python3
"""Focused regression for governed actor continuity in the shared funding journey.

This reuses the existing public-build and Playwright harness. It proves only
bounded navigation/context behavior; it does not prove eligibility, live
discovery, physical Safari/iPad behavior or feedback persistence.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path
from urllib.parse import urlencode

import build_public_pilot as builder
import test_shared_search_browser as shared
from playwright.sync_api import sync_playwright


HELPER_CASES = [
    {"id": "sv-explicit-helper-funding", "lang": "sv", "width": 390, "text": "Jag hjälper min mamma att söka bidrag"},
    {"id": "ar-explicit-helper-funding", "lang": "ar", "width": 390, "text": "أساعد أمي في البحث عن دعم مالي"},
    {"id": "fa-explicit-helper-funding", "lang": "fa", "width": 768, "text": "به مادرم کمک می‌کنم برای کمک مالی جست‌وجو کند"},
    {"id": "sv-helper-child-student-funding", "lang": "sv", "width": 390, "text": "Jag hjälper min son som är student att söka bidrag"},
    {"id": "ar-helper-child-student-funding", "lang": "ar", "width": 390, "text": "أساعد ابني الطالب في البحث عن دعم مالي"},
    {"id": "fa-helper-child-student-funding", "lang": "fa", "width": 768, "text": "به پسرم که دانشجو است کمک می‌کنم برای کمک مالی"},
]

RELATIVE_DESTINATION_CASES = [
    {"id": "sv-relative-destination", "lang": "sv", "marker": "hjälper"},
    {"id": "ar-relative-destination", "lang": "ar", "marker": "تساعد"},
    {"id": "fa-relative-destination", "lang": "fa", "marker": "کمک"},
]

KNOWN_ACTOR_CASES = [
    {"id": "sv-known-employee-context-reused", "actor_type": "employee", "data_actor": "employee"},
    {"id": "sv-known-property-context-reused", "actor_type": "property_actor", "data_actor": "property_actor"},
]

NATURAL_ACTOR_CASES = [
    {"id": "sv-natural-property-funding", "text": "Vi är en BRF och söker bidrag", "actor_type": "property_actor", "data_actor": "property_actor"},
]

BOUNDED_DESTINATION_CASES = [
    {"id": "sv-employee-funding-destination", "actor_type": "employee", "marker": "anställd"},
    {"id": "sv-property-funding-destination", "actor_type": "property_actor", "marker": "fastighets"},
]

GOVERNED_ACTORS = ["private", "study", "employee", "company", "association", "relative", "property_actor"]


def start_url(base_url: str, lang: str, actor_type: str | None = None) -> str:
    query = {"lang": lang}
    if actor_type:
        query["actor_type"] = actor_type
    return f"{base_url}/index.html?{urlencode(query)}"


def assert_actor_route(results, case_id: str, raw_text: str, actor_type: str, data_actor: str) -> str:
    route = results.locator(f'a[data-funding-actor="{data_actor}"]')
    shared.require(route.count() == 1, f"{case_id}: governed actor route missing ({data_actor})")
    href = route.get_attribute("href") or ""
    shared.require(f"actor_type={actor_type}" in href, f"{case_id}: actor role not preserved in href: {href}")
    shared.require("funding_intent=funding" in href, f"{case_id}: funding intent not preserved: {href}")
    shared.require(raw_text not in href, f"{case_id}: raw situation leaked into governed actor route")
    return href


def assert_relative_route(results, case_id: str, raw_text: str) -> str:
    return assert_actor_route(results, case_id, raw_text, "relative", "relative")


def run_helper_case(browser, base_url: str, case: dict) -> dict:
    page = browser.new_page(viewport={"width": case["width"], "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        page.goto(start_url(base_url, case["lang"]), wait_until="load")
        page.locator("#situation").fill(case["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        shared.require(results.is_visible(), f"{case['id']}: results missing")
        shared.require(results.locator('[data-funding-question="true"]').count() == 0, f"{case['id']}: explicit helper role caused a redundant actor question")
        href = assert_relative_route(results, case["id"], case["text"])
        shared.require(not page_errors, f"{case['id']}: JavaScript error(s): {page_errors}")
        shared.require(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), f"{case['id']}: horizontal overflow")
        if case["lang"] in {"ar", "fa"}:
            shared.require(page.evaluate("document.documentElement.dir") == "rtl", f"{case['id']}: RTL direction missing")
        return {"id": case["id"], "status": "passed", "lang": case["lang"], "width": case["width"], "href": href}
    finally:
        page.close()


def run_known_relative_case(browser, base_url: str) -> dict:
    case_id = "sv-known-relative-context-reused"
    raw_text = "pengar att söka"
    page = browser.new_page(viewport={"width": 1024, "height": 900})
    try:
        page.goto(start_url(base_url, "sv", "relative"), wait_until="load")
        page.locator("#situation").fill(raw_text)
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        shared.require(results.locator('[data-funding-question="true"]').count() == 0, f"{case_id}: known helper role was asked again")
        href = assert_relative_route(results, case_id, raw_text)
        return {"id": case_id, "status": "passed", "href": href}
    finally:
        page.close()


def run_vague_choice_case(browser, base_url: str) -> dict:
    case_id = "sv-vague-funding-offers-governed-actors"
    page = browser.new_page(viewport={"width": 320, "height": 900})
    try:
        page.goto(start_url(base_url, "sv"), wait_until="load")
        page.locator("#situation").fill("pengar att söka")
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        shared.require(results.locator('[data-funding-question="true"]').count() == 1, f"{case_id}: expected exactly one path-changing actor question")
        actors = sorted(results.locator("a[data-funding-actor]").evaluate_all("els => els.map(el => el.dataset.fundingActor)"))
        shared.require(actors == sorted(GOVERNED_ACTORS), f"{case_id}: actor choices narrowed the product actor universe: {actors}")
        assert_relative_route(results, case_id, "pengar att söka")
        return {"id": case_id, "status": "passed", "actors": actors}
    finally:
        page.close()


def run_relative_destination_case(browser, base_url: str, case: dict) -> dict:
    page = browser.new_page(viewport={"width": 768, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        target = f"{base_url}/{builder.PERSON_PILOT_PATH}?{urlencode({'lang': case['lang'], 'actor_type': 'relative', 'funding_intent': 'funding'})}"
        page.goto(target, wait_until="load")
        context = page.locator('#fundingIntentContext[data-funding-intent="funding"]')
        shared.require(context.is_visible(), f"{case['id']}: relative destination did not consume funding intent")
        context_text = context.inner_text()
        shared.require(case["marker"] in context_text, f"{case['id']}: helper semantics missing from context: {context_text!r}")
        action = context.locator('[data-funding-continuity-action="relative"]')
        shared.require(action.is_visible(), f"{case['id']}: helper continuation action missing")
        action.click()
        shared.require(page.locator('#fundingIntentContext[data-funding-intent="funding"]').is_visible(), f"{case['id']}: funding context disappeared after helper continuation")
        main_text = page.locator("#main").inner_text()
        if case["lang"] == "sv":
            shared.require("Vad beskriver din arbetssituation bäst?" in main_text, f"{case['id']}: helper did not reach the first existing path-changing situation question")
            shared.require("Du hjälper någon annan" in main_text, f"{case['id']}: base helper-role guidance disappeared")
        shared.require(not page_errors, f"{case['id']}: JavaScript error(s): {page_errors}")
        return {"id": case["id"], "status": "passed", "lang": case["lang"], "context": context_text}
    finally:
        page.close()


def run_known_actor_case(browser, base_url: str, case: dict) -> dict:
    raw_text = "pengar att söka"
    page = browser.new_page(viewport={"width": 1024, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        page.goto(start_url(base_url, "sv", case["actor_type"]), wait_until="load")
        page.locator("#situation").fill(raw_text)
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        shared.require(results.locator('[data-funding-question="true"]').count() == 0, f"{case['id']}: known actor context was discarded")
        href = assert_actor_route(results, case["id"], raw_text, case["actor_type"], case["data_actor"])
        shared.require(not page_errors, f"{case['id']}: JavaScript error(s): {page_errors}")
        return {"id": case["id"], "status": "passed", "href": href}
    finally:
        page.close()


def run_natural_actor_case(browser, base_url: str, case: dict) -> dict:
    page = browser.new_page(viewport={"width": 390, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        page.goto(start_url(base_url, "sv"), wait_until="load")
        page.locator("#situation").fill(case["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        shared.require(results.locator('[data-funding-question="true"]').count() == 0, f"{case['id']}: explicit product actor was replaced by a generic actor question")
        href = assert_actor_route(results, case["id"], case["text"], case["actor_type"], case["data_actor"])
        shared.require(not page_errors, f"{case['id']}: JavaScript error(s): {page_errors}")
        return {"id": case["id"], "status": "passed", "href": href}
    finally:
        page.close()


def run_bounded_destination_case(browser, base_url: str, case: dict) -> dict:
    page = browser.new_page(viewport={"width": 768, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        target = f"{base_url}/{builder.PERSON_PILOT_PATH}?{urlencode({'lang': 'sv', 'actor_type': case['actor_type'], 'funding_intent': 'funding'})}"
        page.goto(target, wait_until="load")
        context = page.locator('#fundingIntentContext[data-funding-intent="funding"][data-funding-state="unsupported"]')
        shared.require(context.is_visible(), f"{case['id']}: unsupported actor×funding destination did not fail closed explicitly")
        context_text = context.inner_text().lower()
        shared.require(case["marker"] in context_text, f"{case['id']}: actor context disappeared from bounded destination: {context_text!r}")
        shared.require("inte verifierad" in context_text or "ingen verifierad" in context_text, f"{case['id']}: destination did not disclose capability boundary")
        shared.require(context.locator('[data-funding-continuity-action]').count() == 0, f"{case['id']}: unsupported destination rendered a pretend continuation action")
        shared.require(not page_errors, f"{case['id']}: JavaScript error(s): {page_errors}")
        return {"id": case["id"], "status": "passed", "actor_type": case["actor_type"], "state": "unsupported", "context": context_text}
    finally:
        page.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default="relative-funding-continuity.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    shared.require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")
    scenario_count = len(HELPER_CASES) + len(RELATIVE_DESTINATION_CASES) + len(KNOWN_ACTOR_CASES) + len(NATURAL_ACTOR_CASES) + len(BOUNDED_DESTINATION_CASES) + 2
    evidence = {"engine": engine_name, "scenario_count": scenario_count, "passed": 0, "failed": 0, "results": []}

    with tempfile.TemporaryDirectory(prefix="stod-relative-funding-") as tmp:
        site = Path(tmp) / "site"
        builder.build(root, site)
        with shared.serve_site(site) as base_url, sync_playwright() as playwright:
            browser = getattr(playwright, engine_name).launch(headless=True)
            try:
                for case in HELPER_CASES:
                    try:
                        evidence["results"].append(run_helper_case(browser, base_url, case))
                        evidence["passed"] += 1
                    except Exception as exc:
                        evidence["failed"] += 1
                        evidence["results"].append({"id": case["id"], "status": "failed", "error": str(exc)})
                for fn, case_id in [(run_known_relative_case, "sv-known-relative-context-reused"), (run_vague_choice_case, "sv-vague-funding-offers-governed-actors")]:
                    try:
                        evidence["results"].append(fn(browser, base_url))
                        evidence["passed"] += 1
                    except Exception as exc:
                        evidence["failed"] += 1
                        evidence["results"].append({"id": case_id, "status": "failed", "error": str(exc)})
                for case in RELATIVE_DESTINATION_CASES:
                    try:
                        evidence["results"].append(run_relative_destination_case(browser, base_url, case))
                        evidence["passed"] += 1
                    except Exception as exc:
                        evidence["failed"] += 1
                        evidence["results"].append({"id": case["id"], "status": "failed", "error": str(exc)})
                for case in KNOWN_ACTOR_CASES:
                    try:
                        evidence["results"].append(run_known_actor_case(browser, base_url, case))
                        evidence["passed"] += 1
                    except Exception as exc:
                        evidence["failed"] += 1
                        evidence["results"].append({"id": case["id"], "status": "failed", "error": str(exc)})
                for case in NATURAL_ACTOR_CASES:
                    try:
                        evidence["results"].append(run_natural_actor_case(browser, base_url, case))
                        evidence["passed"] += 1
                    except Exception as exc:
                        evidence["failed"] += 1
                        evidence["results"].append({"id": case["id"], "status": "failed", "error": str(exc)})
                for case in BOUNDED_DESTINATION_CASES:
                    try:
                        evidence["results"].append(run_bounded_destination_case(browser, base_url, case))
                        evidence["passed"] += 1
                    except Exception as exc:
                        evidence["failed"] += 1
                        evidence["results"].append({"id": case["id"], "status": "failed", "error": str(exc)})
            finally:
                browser.close()

    Path(args.output).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"governed actor funding continuity ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
