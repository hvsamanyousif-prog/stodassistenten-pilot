#!/usr/bin/env python3
"""Focused browser regression for actor × funding-intent continuity.

Reuses the shared-search Pages build, loopback HTTP transport and start-route
helper. These cases prove bounded route continuity only; they do not prove
eligibility, live discovery, physical Safari/iPad behavior or persisted feedback.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path

import build_public_pilot as builder
import test_shared_search_browser as shared
from playwright.sync_api import sync_playwright


CASES = [
    {
        "id": "private-funding-destination",
        "kind": "private",
        "text": "pengar att söka",
        "actor": "private_person",
        "intent": "funding",
        "label": "Finansiering",
    },
    {
        "id": "private-loan-destination",
        "kind": "private",
        "text": "lån att söka",
        "actor": "private_person",
        "intent": "loan",
        "label": "Lån",
        "result_marker": "Lån kostar pengar",
        "action_marker": "Konsumentverkets vägledning",
        "source_marker": "konsumentverket.se/ekonomi/lana-pengar",
        "forbidden_marker": "Stiftelser och stipendier",
    },
    {
        "id": "private-scholarship-destination",
        "kind": "private",
        "text": "stipendium",
        "actor": "private_person",
        "intent": "scholarship",
        "label": "Stipendium / bidrag",
        "result_marker": "Stiftelser och stipendier",
        "action_marker": "aktuella stiftelsen",
        "source_marker": "stiftelser.lansstyrelsen.se",
        "forbidden_marker": "Lån kostar pengar",
    },
    {
        "id": "association-funding-destination",
        "kind": "association",
        "text": "vår förening söker bidrag till ett projekt",
        "actor": "association",
        "intent": "funding",
        "label": "Finansiering",
    },
    {
        "id": "association-scholarship-destination",
        "kind": "association",
        "text": "vår förening söker stipendium",
        "actor": "association",
        "intent": "scholarship",
        "label": "Stipendium / bidrag",
        "result_marker": "Föreningsbidrag kräver en aktuell utlysning",
        "action_marker": "MUCF:s aktuella bidrag",
        "source_marker": "mucf.se/bidrag",
        "forbidden_marker": "Offentliga upphandlingar",
    },
    {
        "id": "student-loan-destination",
        "kind": "student",
        "text": "jag studerar och söker lån",
        "actor": "student",
        "intent": "loan",
        "label": "Lån",
        "result_marker": "Studiemedel: bidrag och studielån",
        "action_marker": "kontrollera lånedelen",
        "source_marker": "csn.se/bidrag-och-lan/studiestod.html",
        "forbidden_marker": "Stipendier söks hos den aktuella stiftelsen",
    },
    {
        "id": "student-scholarship-destination",
        "kind": "student",
        "text": "jag studerar och söker stipendium",
        "actor": "student",
        "intent": "scholarship",
        "label": "Stipendium / bidrag",
        "result_marker": "Stipendier söks hos den aktuella stiftelsen",
        "action_marker": "kontakta stiftelsen",
        "source_marker": "stiftelser.lansstyrelsen.se",
        "forbidden_marker": "Studiemedel: bidrag och studielån",
    },
    {
        "id": "company-loan-destination",
        "kind": "company",
        "text": "lån att söka",
        "actor": "company",
        "intent": "loan",
        "label": "Lån / företagsfinansiering",
        "result_marker": "Lån är inte bidrag",
        "action_marker": "officiella lånevägledningen",
        "source_marker": "verksamt.se/node/229",
        "forbidden_marker": "Bidrag och stöd kräver en aktuell primär utlysning",
    },
    {
        "id": "company-scholarship-destination",
        "kind": "company",
        "text": "stipendium",
        "actor": "company",
        "intent": "scholarship",
        "label": "Bidrag / företagsstöd",
        "result_marker": "Bidrag och stöd kräver en aktuell primär utlysning",
        "action_marker": "aktuell bidrags-/stödutlysning",
        "source_marker": "verksamt.se/finansiering-radgivning/offentlig-finansiering",
        "forbidden_marker": "Lån är inte bidrag",
    },
]


def typed_result_signature(page, case: dict, actor_label: str) -> str:
    result = page.locator(f'[data-funding-intent-result="{case["intent"]}"]')
    plan = page.locator(f'[data-funding-intent-action-plan="{case["intent"]}"]')
    shared.require(result.is_visible(), f"{case['id']}: typed {actor_label} funding result missing")
    shared.require(plan.is_visible(), f"{case['id']}: typed {actor_label} next-action plan missing")
    result_text = result.inner_text()
    plan_text = plan.inner_text()
    shared.require(case["result_marker"] in result_text, f"{case['id']}: result did not preserve {actor_label} funding type")
    shared.require(case["action_marker"] in plan_text, f"{case['id']}: next action did not preserve {actor_label} funding type")
    shared.require(case["forbidden_marker"] not in result_text, f"{case['id']}: opposite {actor_label} funding type leaked into result")
    source_hrefs = result.locator("a.source").evaluate_all("els => els.map(e => e.href)")
    shared.require(any(case["source_marker"] in href for href in source_hrefs), f"{case['id']}: expected official {actor_label} source missing: {source_hrefs}")
    return "\n".join([result_text, plan_text, "|".join(sorted(source_hrefs))])


def student_to_results(page, case: dict) -> str:
    action = page.locator('[data-funding-continuity-action="continue"]')
    shared.require(action.is_visible(), f"{case['id']}: student continuation action missing")
    action.click()
    shared.require("Hur känns ekonomin" in page.locator("#main").inner_text(), f"{case['id']}: student did not skip redundant study question")
    page.get_by_text("Okej just nu", exact=True).click()
    page.get_by_text("Nej", exact=True).click()
    page.get_by_text("Nej", exact=True).click()
    page.get_by_text("Nej", exact=True).click()
    shared.require("Det här är värt att kontrollera först" in page.locator("#main").inner_text(), f"{case['id']}: student did not reach results")
    return typed_result_signature(page, case, "student")


def run_case(browser, base_url: str, case: dict) -> dict:
    page = browser.new_page(viewport={"width": 768, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        shared.start_and_click_destination(
            page,
            base_url,
            case["text"],
            case["actor"],
            case["intent"],
        )
        context = page.locator(
            f'#fundingIntentContext[data-funding-intent="{case["intent"]}"]'
        )
        shared.require(context.is_visible(), f"{case['id']}: destination did not consume funding intent")
        context_text = context.inner_text()
        shared.require(case["label"] in context_text, f"{case['id']}: visible intent distinction missing: {context_text!r}")
        actionable_signature = None

        if case["kind"] == "private":
            action = context.locator('[data-funding-continuity-action="private"]')
            shared.require(action.is_visible(), f"{case['id']}: private continuation action missing")
            action.click()
            main_text = page.locator("#main").inner_text()
            shared.require("Vem gäller det" not in main_text, f"{case['id']}: actor was asked again")
            if case.get("result_marker"):
                shared.require("Det här är värt att kontrollera först" in main_text, f"{case['id']}: typed private intent did not reach an actionable result directly")
                shared.require("Vad beskriver din arbetssituation bäst?" not in main_text, f"{case['id']}: known private funding type triggered unrelated work profiling")
                actionable_signature = typed_result_signature(page, case, "private")
            else:
                shared.require("Vad beskriver din arbetssituation bäst?" in main_text, f"{case['id']}: did not continue to the existing private/general flow")
                shared.require(page.locator('#fundingIntentContext[data-funding-intent="funding"]').is_visible(), f"{case['id']}: funding context disappeared after continuation")

        elif case["kind"] == "association":
            action = context.locator('[data-funding-continuity-action="association-funding"]')
            shared.require(action.is_visible(), f"{case['id']}: association continuation action missing")
            action.click()
            main_text = page.locator("#main").inner_text()
            shared.require("Det här är värt att kontrollera först" in main_text, f"{case['id']}: association did not continue into existing result flow")
            shared.require("Vad gäller det?" not in main_text and "Vad behöver ni hjälp med?" not in main_text, f"{case['id']}: known association/funding context was asked again")
            shared.require("Offentliga upphandlingar" not in main_text, f"{case['id']}: funding handoff mixed in procurement contracts")
            shared.require(page.locator(f'#fundingIntentContext[data-funding-intent="{case["intent"]}"]').is_visible(), f"{case['id']}: association funding context disappeared")
            if case.get("result_marker"):
                actionable_signature = typed_result_signature(page, case, "association")

        elif case["kind"] == "student":
            actionable_signature = student_to_results(page, case)

        elif case["kind"] == "company":
            action = page.locator('[data-funding-continuity-action="company-funding"]')
            shared.require(action.is_visible(), f"{case['id']}: company continuation action missing")
            action.click()
            main_text = page.locator("#main").inner_text()
            shared.require("Vad vill företaget främst göra?" not in main_text, f"{case['id']}: redundant company goal question remained")
            shared.require("Vilken typ av verksamhet driver ni?" in main_text, f"{case['id']}: company did not continue to existing sector step")
            shared.require(page.locator(f'#fundingIntentContext[data-funding-intent="{case["intent"]}"]').is_visible(), f"{case['id']}: company intent context disappeared")

            page.get_by_text("Konsult / tjänster", exact=True).click()
            result = page.locator(f'[data-funding-intent-result="{case["intent"]}"]')
            plan = page.locator(f'[data-funding-intent-action-plan="{case["intent"]}"]')
            shared.require(result.is_visible(), f"{case['id']}: typed funding result missing after sector selection")
            shared.require(plan.is_visible(), f"{case['id']}: typed action plan missing after sector selection")
            result_text = result.inner_text()
            plan_text = plan.inner_text()
            shared.require(case["result_marker"] in result_text, f"{case['id']}: result did not preserve funding type")
            shared.require(case["action_marker"] in plan_text, f"{case['id']}: next action did not preserve funding type")
            shared.require(case["forbidden_marker"] not in result_text, f"{case['id']}: opposite funding type leaked into result")
            source_hrefs = result.locator("a.source").evaluate_all("els => els.map(e => e.href)")
            shared.require(any(case["source_marker"] in href for href in source_hrefs), f"{case['id']}: expected official source route missing: {source_hrefs}")
            actionable_signature = "\n".join([result_text, plan_text, "|".join(sorted(source_hrefs))])

        shared.require(not page_errors, f"{case['id']}: JavaScript error(s): {page_errors}")
        shared.require(case["text"] not in page.url, f"{case['id']}: raw situation leaked into destination URL")
        result = {
            "id": case["id"],
            "status": "passed",
            "destination": page.url.split("?")[0].split("/")[-1],
            "actor": case["actor"],
            "intent": case["intent"],
            "context": context_text,
        }
        if actionable_signature is not None:
            result["actionable_signature"] = actionable_signature
        return result
    finally:
        page.close()


def compare_actionable_signatures(evidence: dict, actor: str, comparison_id: str) -> None:
    actor_results = {
        result.get("intent"): result
        for result in evidence["results"]
        if result.get("status") == "passed" and result.get("actor") == actor
    }
    try:
        loan_signature = actor_results["loan"]["actionable_signature"]
        scholarship_signature = actor_results["scholarship"]["actionable_signature"]
        shared.require(loan_signature != scholarship_signature, f"{actor} loan and scholarship collapsed to the same actionable result")
        evidence["results"].append({"id": comparison_id, "status": "passed"})
        evidence["passed"] += 1
    except Exception as exc:
        evidence["failed"] += 1
        evidence["results"].append({"id": comparison_id, "status": "failed", "error": str(exc)})


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default="funding-continuity-browser-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    shared.require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")

    with tempfile.TemporaryDirectory(prefix="stod-funding-continuity-") as tmp:
        site = Path(tmp) / "site"
        index_path = builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": shared.sha256(index_path),
            "funding_continuity_sha256": shared.sha256(site / builder.FUNDING_INTENT_CONTINUITY_PATH),
            "scenario_count": len(CASES),
            "comparison_count": 3,
            "passed": 0,
            "failed": 0,
            "results": [],
        }
        with shared.serve_site(site) as base_url, sync_playwright() as playwright:
            browser = getattr(playwright, engine_name).launch(headless=True)
            try:
                for case in CASES:
                    try:
                        evidence["results"].append(run_case(browser, base_url, case))
                        evidence["passed"] += 1
                    except Exception as exc:
                        evidence["failed"] += 1
                        evidence["results"].append({"id": case["id"], "status": "failed", "error": str(exc)})

                compare_actionable_signatures(
                    evidence,
                    "private_person",
                    "private-loan-vs-scholarship-actionable-distinction",
                )
                compare_actionable_signatures(
                    evidence,
                    "student",
                    "student-loan-vs-scholarship-actionable-distinction",
                )
                compare_actionable_signatures(
                    evidence,
                    "company",
                    "company-loan-vs-scholarship-actionable-distinction",
                )
            finally:
                browser.close()

    Path(args.output).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"funding continuity browser ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())