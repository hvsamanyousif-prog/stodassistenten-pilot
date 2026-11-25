#!/usr/bin/env python3
"""Browser regression for the built shared Stödassistenten start/search journey.

This is deliberately a small, public-shell oracle. It verifies routing behavior,
privacy boundaries and bounded route continuity in the same minimal artifact
shape used for Pages, without claiming support eligibility, live discovery,
persistence, or model quality.
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


ACTOR_HREFS = {
    "private": "actor_type=private_person",
    "study": "actor_type=student",
    "employee": "actor_type=employee",
    "company": "actor_type=company",
    "association": "actor_type=association",
    "relative": "actor_type=relative",
    "property_actor": "actor_type=property_actor",
}

SCENARIOS = [
    {"id": "sv-money-search-320", "lang": "sv", "width": 320, "text": "pengar att söka", "expect_question": True, "question_token": "vem gäller det", "expect_intent": "funding"},
    {"id": "sv-search-money-390", "lang": "sv", "width": 390, "text": "söka pengar", "expect_question": True, "question_token": "vem gäller det", "expect_intent": "funding"},
    {"id": "sv-funds-768", "lang": "sv", "width": 768, "text": "fonder att söka", "expect_question": True, "question_token": "vem gäller det", "expect_intent": "funding"},
    {"id": "sv-scholarship-1024", "lang": "sv", "width": 1024, "text": "stipendium", "expect_question": True, "question_token": "stipendium", "expect_intent": "scholarship"},
    {"id": "sv-scholarship-typo-1280", "lang": "sv", "width": 1280, "text": "stipenium att söka", "expect_question": True, "question_token": "stipendium", "expect_intent": "scholarship"},
    {"id": "sv-loan-is-not-grant", "lang": "sv", "width": 390, "text": "lån att söka", "expect_question": True, "question_token": "lån", "expect_intent": "loan"},
    {"id": "sv-negated-loan-affirmed-funding", "lang": "sv", "width": 390, "text": "Jag söker inte lån, jag söker bidrag.", "expect_question": True, "question_token": "vem gäller det", "expect_intent": "funding"},
    {"id": "sv-negated-scholarship-affirmed-loan", "lang": "sv", "width": 768, "text": "Jag söker inte stipendium, jag söker lån.", "expect_question": True, "question_token": "lån", "expect_intent": "loan"},
    {"id": "ar-negated-loan-affirmed-funding", "lang": "ar", "width": 390, "text": "لا أبحث عن قرض، أبحث عن دعم مالي.", "expect_question": True, "question_token": "من", "expect_intent": "funding", "expect_rtl": True},
    {"id": "fa-negated-loan-affirmed-funding", "lang": "fa", "width": 768, "text": "وام نمی‌خواهم، کمک مالی می‌خواهم.", "expect_question": True, "question_token": "چه کسی", "expect_intent": "funding", "expect_rtl": True},
    {"id": "sv-negated-loan-conjunction-affirmed-funding", "lang": "sv", "width": 390, "text": "Jag söker inte lån utan jag söker bidrag.", "expect_question": True, "question_token": "vem gäller det", "expect_intent": "funding"},
    {"id": "sv-negated-scholarship-conjunction-affirmed-loan", "lang": "sv", "width": 768, "text": "Jag söker inte stipendium utan jag söker lån.", "expect_question": True, "question_token": "lån", "expect_intent": "loan"},
    {"id": "ar-negated-loan-conjunction-affirmed-funding", "lang": "ar", "width": 390, "text": "لا أبحث عن قرض بل أبحث عن دعم مالي.", "expect_question": True, "question_token": "من", "expect_intent": "funding", "expect_rtl": True},
    {"id": "fa-negated-loan-conjunction-affirmed-funding", "lang": "fa", "width": 768, "text": "وام نمی‌خواهم بلکه کمک مالی می‌خواهم.", "expect_question": True, "question_token": "چه کسی", "expect_intent": "funding", "expect_rtl": True},
    {"id": "sv-affirmed-funding-conjunction-negated-loan", "lang": "sv", "width": 390, "text": "Jag söker bidrag men inte lån.", "expect_question": True, "question_token": "vem gäller det", "expect_intent": "funding"},
    {"id": "sv-affirmed-loan-conjunction-negated-scholarship", "lang": "sv", "width": 768, "text": "Jag söker lån men inte stipendium.", "expect_question": True, "question_token": "lån", "expect_intent": "loan"},
    {"id": "ar-affirmed-funding-conjunction-negated-loan", "lang": "ar", "width": 390, "text": "أبحث عن دعم مالي لكن ليس قرضًا.", "expect_question": True, "question_token": "من", "expect_intent": "funding", "expect_rtl": True},
    {"id": "fa-affirmed-funding-conjunction-negated-loan", "lang": "fa", "width": 768, "text": "کمک مالی می‌خواهم اما نه وام.", "expect_question": True, "question_token": "چه کسی", "expect_intent": "funding", "expect_rtl": True},
    {"id": "sv-known-student-scholarship-keeps-intent", "lang": "sv", "width": 768, "text": "jag studerar och söker stipendium", "expect_question": False, "expect_actor": "study", "expect_intent": "scholarship"},
    {"id": "sv-known-student-loan-keeps-intent", "lang": "sv", "width": 768, "text": "jag studerar och söker lån", "expect_question": False, "expect_actor": "study", "expect_intent": "loan"},
    {"id": "sv-known-company-context-skips-question", "lang": "sv", "width": 1024, "actor_type": "company", "text": "fonder att söka", "expect_question": False, "expect_actor": "company", "expect_intent": "funding"},
    {"id": "sv-association-in-text-skips-question", "lang": "sv", "width": 1280, "text": "vår förening söker bidrag till ett projekt", "expect_question": False, "expect_actor": "association", "expect_intent": "funding"},
    {"id": "sv-explicit-correction-overrides-stale-employee", "lang": "sv", "width": 390, "actor_type": "employee", "text": "Jag är inte längre anställd, jag studerar nu och söker stipendium.", "expect_question": False, "expect_actor": "study", "reject_actor": "employee", "expect_intent": "scholarship"},
    {"id": "sv-current-employee-context-remains", "lang": "sv", "width": 768, "actor_type": "employee", "text": "Som anställd söker jag stipendium", "expect_question": False, "expect_actor": "employee", "expect_intent": "scholarship"},
    {"id": "sv-simultaneous-employee-student-asks-once", "lang": "sv", "width": 1024, "actor_type": "employee", "text": "Jag är anställd och studerar och söker stipendium", "expect_question": True, "question_token": "stipendium", "expect_intent": "scholarship"},
    {"id": "ar-explicit-correction-overrides-stale-employee", "lang": "ar", "width": 390, "actor_type": "employee", "text": "لم أعد موظفًا، أنا طالب الآن وأبحث عن منحة.", "expect_question": False, "expect_actor": "study", "reject_actor": "employee", "expect_intent": "scholarship", "expect_rtl": True},
    {"id": "ar-current-employee-context-remains", "lang": "ar", "width": 768, "actor_type": "employee", "text": "أنا موظف وأبحث عن منحة", "expect_question": False, "expect_actor": "employee", "expect_intent": "scholarship", "expect_rtl": True},
    {"id": "ar-simultaneous-employee-student-asks-once", "lang": "ar", "width": 1024, "actor_type": "employee", "text": "أنا موظف وطالب وأبحث عن منحة", "expect_question": True, "question_token": "منحة", "expect_intent": "scholarship", "expect_rtl": True},
    {"id": "ar-explicit-correction-student-to-employee", "lang": "ar", "width": 390, "actor_type": "student", "text": "لم أعد طالبًا، أنا موظف الآن وأبحث عن قرض.", "expect_question": False, "expect_actor": "employee", "reject_actor": "study", "expect_intent": "loan", "expect_rtl": True},
    {"id": "fa-explicit-correction-overrides-stale-employee", "lang": "fa", "width": 390, "actor_type": "employee", "text": "دیگر کارمند نیستم، الان دانشجو هستم و دنبال بورسیه هستم.", "expect_question": False, "expect_actor": "study", "reject_actor": "employee", "expect_intent": "scholarship", "expect_rtl": True},
    {"id": "fa-current-employee-context-remains", "lang": "fa", "width": 768, "actor_type": "employee", "text": "من کارمند هستم و دنبال بورسیه هستم", "expect_question": False, "expect_actor": "employee", "expect_intent": "scholarship", "expect_rtl": True},
    {"id": "fa-simultaneous-employee-student-asks-once", "lang": "fa", "width": 1024, "actor_type": "employee", "text": "من کارمند و دانشجو هستم و دنبال بورسیه هستم", "expect_question": True, "question_token": "بورسیه", "expect_intent": "scholarship", "expect_rtl": True},
    {"id": "fa-explicit-correction-student-to-employee", "lang": "fa", "width": 390, "actor_type": "student", "text": "دیگر دانشجو نیستم، الان کارمند هستم و دنبال وام هستم.", "expect_question": False, "expect_actor": "employee", "reject_actor": "study", "expect_intent": "loan", "expect_rtl": True},
    {"id": "sv-combined-everyday-needs-stay-open", "lang": "sv", "width": 390, "text": "Jag behöver hjälp med läkemedel och mat/hyra", "expect_question": False, "expect_routes": ["actor_type=private_person", "actor_type=other"]},
    {"id": "sv-third-party-company-does-not-displace-current-needs", "lang": "sv", "width": 390, "text": "Min syster är företagare. Jag ser dåligt, är sjukskriven och har skulder.", "expect_question": False, "expect_routes": ["quick-help.html?mode=vision", "actor_type=employee", "actor_type=private_person"], "reject_route": "actor_type=company"},
    {"id": "sv-third-party-company-colleague-does-not-displace-current-needs", "lang": "sv", "width": 390, "text": "Min kollega är företagare. Jag ser dåligt, är sjukskriven och har skulder.", "expect_question": False, "expect_routes": ["quick-help.html?mode=vision", "actor_type=employee", "actor_type=private_person"], "reject_route": "actor_type=company"},
    {"id": "sv-procurement-remains-company", "lang": "sv", "width": 1280, "text": "Jag driver företag och vill hitta en offentlig upphandling", "expect_question": False, "expect_route": "actor_type=company"},
    {"id": "sv-dental-regression", "lang": "sv", "width": 320, "text": "Jag har ont i en tand men är orolig för kostnaden", "expect_question": False, "expect_route": "quick-help.html?mode=dental"},
    {"id": "sv-mouth-dental-positive", "lang": "sv", "width": 390, "text": "Jag har ont i munnen och behöver tandvård", "expect_question": False, "expect_route": "quick-help.html?mode=dental"},
    {"id": "sv-municipality-home-service-not-dental", "lang": "sv", "width": 390, "text": "Jag behöver hjälp från kommunen med hemtjänst.", "expect_question": False, "reject_route": "quick-help.html?mode=dental"},
    {"id": "sv-municipality-housing-adaptation-not-dental", "lang": "sv", "width": 1280, "text": "Jag behöver information från min kommun om bostadsanpassning.", "expect_question": False, "reject_route": "quick-help.html?mode=dental"},
    {"id": "sv-municipal-housing-support-not-dental", "lang": "sv", "width": 768, "text": "Jag söker kommunalt stöd för att anpassa min bostad.", "expect_question": False, "reject_route": "quick-help.html?mode=dental"},
    {"id": "ar-generic-funding-rtl", "lang": "ar", "width": 390, "text": "أبحث عن منحة أو دعم مالي", "expect_question": False, "expect_intent_question": True, "intent_question_token": "نوع", "expect_rtl": True},
    {"id": "ar-residence-granted-not-scholarship", "lang": "ar", "width": 390, "text": "تم منحك تصريح الإقامة. ما الخطوة التالية؟", "expect_question": False, "reject_route": "funding_intent=scholarship", "expect_rtl": True},
    {"id": "ar-residence-grant-heading-not-scholarship", "lang": "ar", "width": 768, "text": "منح تصريح الإقامة", "expect_question": False, "reject_route": "funding_intent=scholarship", "expect_rtl": True},
    {"id": "ar-scholarship-study-positive", "lang": "ar", "width": 1024, "text": "أبحث عن منحة دراسية", "expect_question": True, "question_token": "منحة", "expect_rtl": True, "expect_intent": "scholarship"},
    {"id": "ar-scholarship-study-plural-positive", "lang": "ar", "width": 1280, "text": "أبحث عن منح دراسية", "expect_question": True, "question_token": "منحة", "expect_rtl": True, "expect_intent": "scholarship"},
    {"id": "fa-scholarship-rtl", "lang": "fa", "width": 768, "text": "دنبال بورسیه هستم", "expect_question": True, "question_token": "بورسیه", "expect_rtl": True, "expect_intent": "scholarship"},
    {"id": "sv-private-context-reused", "lang": "sv", "width": 1024, "actor_type": "private_person", "text": "pengar att söka", "expect_question": False, "expect_actor": "private", "expect_intent": "funding"},
]

DESTINATION_SCENARIOS = [
    {"id": "student-scholarship-destination", "kind": "student", "text": "jag studerar och söker stipendium", "intent": "scholarship", "label": "Stipendium / bidrag"},
    {"id": "student-loan-destination", "kind": "student", "text": "jag studerar och söker lån", "intent": "loan", "label": "Lån"},
    {"id": "company-funding-destination", "kind": "company", "text": "fonder att söka", "intent": "funding"},
    {"id": "tampered-intent-fails-safe", "kind": "tampered", "intent": "not-allowlisted"},
]


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


def scenario_url(base_url: str, scenario: dict) -> str:
    query = {"lang": scenario["lang"]}
    if scenario.get("actor_type"):
        query["actor_type"] = scenario["actor_type"]
    return f"{base_url}/index.html?{urlencode(query)}"


def run_scenario(browser, base_url: str, scenario: dict) -> dict:
    page = browser.new_page(viewport={"width": scenario["width"], "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        page.goto(scenario_url(base_url, scenario), wait_until="load")
        page.locator("#situation").fill(scenario["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        require(results.is_visible(), f"{scenario['id']}: results did not become visible")
        require(not page_errors, f"{scenario['id']}: JavaScript error(s): {page_errors}")

        question_count = results.locator('[data-funding-question="true"]').count()
        intent_question_count = results.locator('[data-funding-intent-question="true"]').count()
        require(question_count <= 1, f"{scenario['id']}: more than one first funding question rendered")
        require(intent_question_count <= 1, f"{scenario['id']}: more than one funding-type clarification rendered")
        if scenario.get("expect_intent_question"):
            require(intent_question_count == 1, f"{scenario['id']}: expected one funding-type clarification")
            require(question_count == 0, f"{scenario['id']}: actor question competed with funding-type clarification")
            question_text = results.locator('[data-funding-intent-question="true"]').inner_text().lower()
            require(scenario["intent_question_token"].lower() in question_text, f"{scenario['id']}: funding-type clarification lost its purpose: {question_text!r}")
            require(results.locator("a[data-funding-actor]").count() == 0, f"{scenario['id']}: ambiguous funding request was silently routed")
            hrefs = results.locator("a[href]").evaluate_all("els => els.map(el => el.getAttribute('href') || '')")
            require(all("funding_intent=" not in href for href in hrefs), f"{scenario['id']}: ambiguous request leaked a chosen funding_intent")
        else:
            require(intent_question_count == 0, f"{scenario['id']}: unexpected funding-type clarification was shown")
            if scenario.get("expect_question"):
                require(question_count == 1, f"{scenario['id']}: expected one actor-changing funding question")
                question_text = results.locator('[data-funding-question="true"]').inner_text().lower()
                require(scenario["question_token"].lower() in question_text, f"{scenario['id']}: question lost funding type/context: {question_text!r}")
                options = results.locator("a[data-funding-actor]")
                require(options.count() == len(ACTOR_HREFS), f"{scenario['id']}: expected {len(ACTOR_HREFS)} actor entrances, got {options.count()}")
                option_actors = sorted(options.evaluate_all("els => els.map(el => el.dataset.fundingActor)"))
                require(option_actors == sorted(ACTOR_HREFS), f"{scenario['id']}: actor choices drifted: {option_actors}")
                result_text = results.inner_text().lower()
                require("tandvård" not in result_text and "städ" not in result_text, f"{scenario['id']}: vague funding query leaked a default precise route")
            else:
                require(question_count == 0, f"{scenario['id']}: redundant actor question was shown")

        if scenario.get("expect_actor"):
            actor = scenario["expect_actor"]
            links = results.locator(f'a[href*="{ACTOR_HREFS[actor]}"]')
            require(links.count() >= 1, f"{scenario['id']}: known actor was not reused ({actor})")
            require(results.locator("a").first.get_attribute("href") == links.first.get_attribute("href"), f"{scenario['id']}: known actor route was not prioritized")

        if scenario.get("reject_actor"):
            actor = scenario["reject_actor"]
            links = results.locator(f'a[href*="{ACTOR_HREFS[actor]}"]')
            require(links.count() == 0, f"{scenario['id']}: stale actor route survived explicit correction ({actor})")

        if scenario.get("expect_intent"):
            intent = scenario["expect_intent"]
            funding_links = results.locator("a[data-funding-actor]")
            require(funding_links.count() >= 1, f"{scenario['id']}: funding route missing while preserving intent")
            intents = funding_links.evaluate_all("els => els.map(el => el.dataset.fundingIntent || '')")
            require(all(value == intent for value in intents), f"{scenario['id']}: funding intent changed or disappeared: {intents}")
            hrefs_with_intent = funding_links.evaluate_all("els => els.map(el => el.getAttribute('href') || '')")
            require(all(f"funding_intent={intent}" in href for href in hrefs_with_intent), f"{scenario['id']}: allowlisted intent was not carried to the next route: {hrefs_with_intent}")

        if scenario.get("expect_route"):
            require(results.locator(f'a[href*="{scenario["expect_route"]}"]').count() >= 1, f"{scenario['id']}: expected route missing: {scenario['expect_route']}")

        if scenario.get("reject_route"):
            require(results.locator(f'a[href*="{scenario["reject_route"]}"]').count() == 0, f"{scenario['id']}: rejected route was shown: {scenario['reject_route']}")

        for token in scenario.get("expect_routes", []):
            require(results.locator(f'a[href*="{token}"]').count() >= 1, f"{scenario['id']}: combined need route missing: {token}")

        if scenario.get("expect_rtl"):
            require(page.evaluate("document.documentElement.dir") == "rtl", f"{scenario['id']}: RTL direction missing")

        require(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), f"{scenario['id']}: horizontal overflow at {scenario['width']}px")
        button_box = page.locator("#analyzeBtn").bounding_box()
        require(button_box is not None and button_box["height"] >= 44, f"{scenario['id']}: primary touch target below 44px")
        if scenario["width"] <= 390:
            for index, target in enumerate(page.locator("button.lang").all()):
                box = target.bounding_box()
                require(box is not None and box["width"] >= 44 and box["height"] >= 44, f"{scenario['id']}: language touch target {index + 1} below 44x44")

        raw = scenario["text"]
        hrefs = results.locator("a").evaluate_all("els => els.map(el => el.getAttribute('href') || '')")
        require(all(raw not in href for href in hrefs), f"{scenario['id']}: raw situation leaked into a result URL")

        return {"id": scenario["id"], "width": scenario["width"], "lang": scenario["lang"], "status": "passed", "question_count": question_count, "intent_question_count": intent_question_count, "hrefs": hrefs}
    finally:
        page.close()


def start_and_click_destination(page, base_url: str, text: str, actor_type: str, intent: str, initial_actor: str | None = None) -> str:
    query = {"lang": "sv"}
    if initial_actor:
        query["actor_type"] = initial_actor
    page.goto(f"{base_url}/index.html?{urlencode(query)}", wait_until="load")
    page.locator("#situation").fill(text)
    page.locator("#analyzeBtn").click()
    results = page.locator("#engineResults")
    route = results.locator(f'a[href*="actor_type={actor_type}"][data-funding-intent="{intent}"]').first
    require(route.count() == 1, f"destination route missing for actor={actor_type} intent={intent}")
    href = route.get_attribute("href") or ""
    require(text not in href, "raw situation leaked into destination href")
    route.click()
    page.wait_for_load_state("load")
    require(f"actor_type={actor_type}" in page.url and f"funding_intent={intent}" in page.url, "destination URL lost allowlisted task context")
    require(text not in page.url, "raw situation leaked into destination URL")
    return href


def run_destination_scenario(browser, base_url: str, scenario: dict) -> dict:
    page = browser.new_page(viewport={"width": 768, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        if scenario["kind"] == "student":
            start_and_click_destination(page, base_url, scenario["text"], "student", scenario["intent"])
            context = page.locator(f'#fundingIntentContext[data-funding-intent="{scenario["intent"]}"]')
            require(context.is_visible(), f"{scenario['id']}: person destination did not consume funding_intent")
            context_text = context.inner_text()
            require(scenario["label"] in context_text, f"{scenario['id']}: destination lost visible type distinction: {context_text!r}")
            action = context.locator('button[data-funding-continuity-action="continue"]')
            require(action.is_visible(), f"{scenario['id']}: bounded continuation action missing")
            action.click()
            main_text = page.locator("#main").inner_text()
            require("Vad beskriver din arbetssituation bäst?" not in main_text, f"{scenario['id']}: known student was asked redundant work-status question")
            require("Hur känns ekonomin efter boende och nödvändiga utgifter?" in main_text, f"{scenario['id']}: did not continue into existing student/general flow")
            require(page.locator(f'#fundingIntentContext[data-funding-intent="{scenario["intent"]}"]').is_visible(), f"{scenario['id']}: intent context disappeared after continuation")
            require(not page_errors, f"{scenario['id']}: JavaScript error(s): {page_errors}")
            return {"id": scenario["id"], "status": "passed", "destination": "person-pilot.html", "intent": scenario["intent"], "context": context_text}

        if scenario["kind"] == "company":
            start_and_click_destination(page, base_url, scenario["text"], "company", "funding", initial_actor="company")
            context = page.locator('#fundingIntentContext[data-funding-intent="funding"]')
            require(context.is_visible(), f"{scenario['id']}: company destination did not consume funding intent")
            action = page.locator('button[data-funding-continuity-action="company-funding"]')
            require(action.is_visible(), f"{scenario['id']}: company funding continuation action missing")
            require("Fortsätt med finansiering" in action.inner_text(), f"{scenario['id']}: company continuation copy drifted")
            action.click()
            main_text = page.locator("#main").inner_text()
            require("Vad vill företaget främst göra?" not in main_text, f"{scenario['id']}: redundant company goal question remained")
            require("Vilken typ av verksamhet driver ni?" in main_text, f"{scenario['id']}: company did not continue to existing sector step")
            require(page.locator('#fundingIntentContext[data-funding-intent="funding"]').is_visible(), f"{scenario['id']}: company context disappeared after continuation")
            require(not page_errors, f"{scenario['id']}: JavaScript error(s): {page_errors}")
            return {"id": scenario["id"], "status": "passed", "destination": "company-pilot.html", "intent": "funding"}

        if scenario["kind"] == "tampered":
            target = f"{base_url}/{builder.PERSON_PILOT_PATH}?actor_type=student&funding_intent={scenario['intent']}"
            page.goto(target, wait_until="load")
            require(page.locator("#fundingIntentContext").count() == 0, f"{scenario['id']}: unknown token was consumed")
            require(page.locator("#main .hero").is_visible(), f"{scenario['id']}: unknown token did not fall back to normal person flow")
            require(not page_errors, f"{scenario['id']}: JavaScript error(s): {page_errors}")
            return {"id": scenario["id"], "status": "passed", "destination": "person-pilot.html", "intent": "rejected"}

        raise AssertionError(f"unknown destination scenario kind: {scenario['kind']}")
    finally:
        page.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default="shared-search-browser-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")

    with tempfile.TemporaryDirectory(prefix="stod-shared-search-") as tmp:
        site = Path(tmp) / "site"
        index_path = builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": sha256(index_path),
            "privacy_routing_sha256": sha256(site / builder.SHELL_ROUTING_PATH),
            "funding_continuity_sha256": sha256(site / builder.FUNDING_INTENT_CONTINUITY_PATH),
            "start_scenario_count": len(SCENARIOS),
            "destination_scenario_count": len(DESTINATION_SCENARIOS),
            "scenario_count": len(SCENARIOS) + len(DESTINATION_SCENARIOS),
            "passed": 0,
            "failed": 0,
            "results": [],
        }
        with serve_site(site) as base_url, sync_playwright() as playwright:
            browser = getattr(playwright, engine_name).launch(headless=True)
            try:
                for scenario in SCENARIOS:
                    try:
                        evidence["results"].append(run_scenario(browser, base_url, scenario))
                        evidence["passed"] += 1
                    except Exception as exc:
                        evidence["failed"] += 1
                        evidence["results"].append({"id": scenario["id"], "status": "failed", "error": str(exc)})
                for scenario in DESTINATION_SCENARIOS:
                    try:
                        evidence["results"].append(run_destination_scenario(browser, base_url, scenario))
                        evidence["passed"] += 1
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