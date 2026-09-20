#!/usr/bin/env python3
"""Focused browser regression for helped-person pronoun need continuity.

This reuses the existing combined need + funding browser harness. It covers the
same helper semantic family with natural pronoun continuation and explicit
subject-switch contrasts. Raw situation text must not be persisted or copied
into the destination URL; only the existing bounded need_context tokens may
cross the page boundary.

The same beneficiary facts must survive in Swedish, Arabic and Persian when the
runtime explicitly supports those languages. Translations are language-parity
variants of one semantic family, not independent holdout cases.

When the helped person's preserved need includes essential costs, the shared
journey contract also requires that the destination consume that token in the
existing bounded money question rather than merely display it.

The pronoun contract must stay closed over every target the runtime explicitly
accepts. A supported partner target may therefore continue with a nearby,
unambiguous pronoun, while an explicit switch to another beneficiary must still
fail closed instead of reassigning that person's need.

This is browser/DOM/routing/privacy evidence, not eligibility, model quality,
human comprehension, physical Safari/assistive-tech validation or storage E2E.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from pathlib import Path
from urllib.parse import urlencode

import build_public_pilot as builder
from playwright.sync_api import sync_playwright
from test_combined_need_funding_browser import (
    WIDTHS,
    choose_first,
    need_context_from_url,
    no_horizontal_overflow,
    require,
    run_case,
    serve_site,
)


SCENARIOS = [
    {
        "id": "sv-helper-mother-pronoun-rent",
        "text": "Jag hjälper min mamma att söka bidrag. Hon har hög hyra.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "Finansiering",
        "expect_general_route": False,
        "need_context": {"housing"},
        "need_copy": ("Personens bevarade behov", "Boende / hyra"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "money_stage_after_choices": 1,
        "expect_essential_confirmation": False,
        "expect_housing_skip": True,
    },
    {
        "id": "sv-helper-father-pronoun-essential-and-rent",
        "text": "Jag hjälper min pappa att söka bidrag. Han behöver läkemedel och har hög hyra.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "Finansiering",
        "expect_general_route": False,
        "need_context": {"essential_costs", "housing"},
        "need_copy": ("Personens bevarade behov", "Nödvändiga utgifter", "Boende / hyra"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "money_stage_after_choices": 1,
        "expect_essential_confirmation": True,
        "expect_housing_skip": True,
    },
    {
        "id": "sv-helper-partner-pronoun-rent",
        "text": "Jag hjälper min partner att söka bidrag. Hen har hög hyra.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "Finansiering",
        "expect_general_route": False,
        "need_context": {"housing"},
        "need_copy": ("Personens bevarade behov", "Boende / hyra"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "money_stage_after_choices": 1,
        "expect_essential_confirmation": False,
        "expect_housing_skip": True,
    },
    {
        "id": "sv-helper-child-pronoun-hon-rent",
        "text": "Jag hjälper mitt barn att söka bidrag. Hon har hög hyra.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "Finansiering",
        "expect_general_route": False,
        "need_context": {"housing"},
        "need_copy": ("Personens bevarade behov", "Boende / hyra"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "money_stage_after_choices": 1,
        "expect_essential_confirmation": False,
        "expect_housing_skip": True,
    },
    {
        "id": "sv-helper-child-pronoun-han-rent",
        "text": "Jag hjälper mitt barn att söka bidrag. Han har hög hyra.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "Finansiering",
        "expect_general_route": False,
        "need_context": {"housing"},
        "need_copy": ("Personens bevarade behov", "Boende / hyra"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "money_stage_after_choices": 1,
        "expect_essential_confirmation": False,
        "expect_housing_skip": True,
    },
    {
        "id": "sv-helper-subject-switch-not-reassigned",
        "text": "Jag hjälper min mamma att söka bidrag. Min pappa har hög hyra.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "Finansiering",
        "expect_general_route": False,
        "need_context": set(),
        "need_copy": (),
        "continue_action": "relative",
        "steps_before_result": 4,
        "money_stage_after_choices": 1,
        "expect_essential_confirmation": False,
        "expect_housing_skip": False,
    },
    {
        "id": "sv-helper-partner-to-mother-switch-not-reassigned",
        "text": "Jag hjälper min partner att söka bidrag. Min mamma har hög hyra.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "Finansiering",
        "expect_general_route": False,
        "need_context": set(),
        "need_copy": (),
        "continue_action": "relative",
        "steps_before_result": 4,
        "money_stage_after_choices": 1,
        "expect_essential_confirmation": False,
        "expect_housing_skip": False,
    },
    {
        "id": "sv-helper-child-to-mother-switch-not-reassigned",
        "text": "Jag hjälper mitt barn att söka bidrag. Min mamma har hög hyra.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "Finansiering",
        "expect_general_route": False,
        "need_context": set(),
        "need_copy": (),
        "continue_action": "relative",
        "steps_before_result": 4,
        "money_stage_after_choices": 1,
        "expect_essential_confirmation": False,
        "expect_housing_skip": False,
    },
    {
        "id": "sv-helper-child-helper-self-not-reassigned",
        "text": "Jag hjälper mitt barn att söka bidrag. Jag har själv hög hyra.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "Finansiering",
        "expect_general_route": False,
        "need_context": set(),
        "need_copy": (),
        "continue_action": "relative",
        "steps_before_result": 4,
        "money_stage_after_choices": 1,
        "expect_essential_confirmation": False,
        "expect_housing_skip": False,
    },
    {
        "id": "sv-helper-child-pronoun-helper-self-essential-not-reassigned",
        "text": "Jag hjälper mitt barn att söka bidrag. Hon mår bra och jag behöver medicin.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "Finansiering",
        "expect_general_route": False,
        "need_context": set(),
        "need_copy": (),
        "continue_action": "relative",
        "steps_before_result": 4,
        "money_stage_after_choices": 1,
        "expect_essential_confirmation": False,
        "expect_housing_skip": False,
    },
    {
        "id": "sv-helper-child-pronoun-essential-helper-possession-preserved",
        "text": "Jag hjälper mitt barn att söka bidrag. Hon behöver medicin som jag har hämtat.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "Finansiering",
        "expect_general_route": False,
        "need_context": {"essential_costs"},
        "need_copy": ("Personens bevarade behov", "Nödvändiga utgifter"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "money_stage_after_choices": 1,
        "expect_essential_confirmation": True,
        "expect_housing_skip": False,
    },
    {
        "id": "ar-helper-partner-inline-rent",
        "lang": "ar",
        "text": "أنا أساعد زوجتي التي لديها إيجار مرتفع في البحث عن دعم مالي.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تمويل",
        "need_context": {"housing"},
        "need_copy": ("احتياج الشخص المحفوظ", "السكن / الإيجار"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": True,
        "housing_question": "هل تكلفة السكن جزء كبير من ميزانيتك؟",
        "result_title": "هذه أهم الأمور التي تستحق التحقق",
    },
    {
        "id": "ar-helper-partner-pronoun-rent",
        "lang": "ar",
        "text": "أنا أساعد زوجتي في البحث عن دعم مالي. هي لديها إيجار مرتفع.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تمويل",
        "need_context": {"housing"},
        "need_copy": ("احتياج الشخص المحفوظ", "السكن / الإيجار"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": True,
        "housing_question": "هل تكلفة السكن جزء كبير من ميزانيتك؟",
        "result_title": "هذه أهم الأمور التي تستحق التحقق",
    },
    {
        "id": "ar-helper-child-pronoun-hu-rent",
        "lang": "ar",
        "text": "أنا أساعد ابني في البحث عن دعم مالي. هو لديه إيجار مرتفع.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تمويل",
        "need_context": {"housing"},
        "need_copy": ("احتياج الشخص المحفوظ", "السكن / الإيجار"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": True,
        "housing_question": "هل تكلفة السكن جزء كبير من ميزانيتك؟",
        "result_title": "هذه أهم الأمور التي تستحق التحقق",
    },
    {
        "id": "ar-helper-child-pronoun-hiya-rent",
        "lang": "ar",
        "text": "أنا أساعد ابنتي في البحث عن دعم مالي. هي لديها إيجار مرتفع.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تمويل",
        "need_context": {"housing"},
        "need_copy": ("احتياج الشخص المحفوظ", "السكن / الإيجار"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": True,
        "housing_question": "هل تكلفة السكن جزء كبير من ميزانيتك؟",
        "result_title": "هذه أهم الأمور التي تستحق التحقق",
    },
    {
        "id": "ar-helper-child-pronoun-helper-self-essential-not-reassigned",
        "lang": "ar",
        "text": "أنا أساعد ابنتي في البحث عن دعم مالي. هي بخير وأنا أحتاج إلى دواء.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تمويل",
        "need_context": set(),
        "need_copy": (),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": False,
        "housing_question": "هل تكلفة السكن جزء كبير من ميزانيتك؟",
        "result_title": "هذه أهم الأمور التي تستحق التحقق",
    },
    {
        "id": "ar-helper-child-pronoun-essential-helper-possession-preserved",
        "lang": "ar",
        "text": "أنا أساعد ابنتي في البحث عن دعم مالي. هي تحتاج إلى دواء وأنا لدي الوصفة.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تمويل",
        "need_context": {"essential_costs"},
        "need_copy": ("احتياج الشخص المحفوظ", "مصاريف ضرورية"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": False,
        "housing_question": "هل تكلفة السكن جزء كبير من ميزانيتك؟",
        "result_title": "هذه أهم الأمور التي تستحق التحقق",
    },
    {
        "id": "ar-helper-partner-to-mother-switch-not-reassigned",
        "lang": "ar",
        "text": "أنا أساعد زوجتي في البحث عن دعم مالي. أمي لديها إيجار مرتفع.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تمويل",
        "need_context": set(),
        "need_copy": (),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": False,
        "housing_question": "هل تكلفة السكن جزء كبير من ميزانيتك؟",
        "result_title": "هذه أهم الأمور التي تستحق التحقق",
    },
    {
        "id": "fa-helper-partner-inline-rent",
        "lang": "fa",
        "text": "من به همسرم که اجاره بالایی دارد برای پیدا کردن کمک مالی کمک می‌کنم.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تأمین مالی",
        "need_context": {"housing"},
        "need_copy": ("نیاز حفظ‌شدهٔ آن شخص", "مسکن / اجاره"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": True,
        "housing_question": "آیا هزینه مسکن بخش بزرگی از بودجه است؟",
        "result_title": "این موارد ارزش بررسی دارند",
    },
    {
        "id": "fa-helper-partner-pronoun-rent",
        "lang": "fa",
        "text": "من به همسرم برای پیدا کردن کمک مالی کمک می‌کنم. او اجاره بالایی دارد.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تأمین مالی",
        "need_context": {"housing"},
        "need_copy": ("نیاز حفظ‌شدهٔ آن شخص", "مسکن / اجاره"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": True,
        "housing_question": "آیا هزینه مسکن بخش بزرگی از بودجه است؟",
        "result_title": "این موارد ارزش بررسی دارند",
    },
    {
        "id": "fa-helper-child-pronoun-ou-rent",
        "lang": "fa",
        "text": "من به فرزندم برای پیدا کردن کمک مالی کمک می‌کنم. او اجاره بالایی دارد.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تأمین مالی",
        "need_context": {"housing"},
        "need_copy": ("نیاز حفظ‌شدهٔ آن شخص", "مسکن / اجاره"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": True,
        "housing_question": "آیا هزینه مسکن بخش بزرگی از بودجه است؟",
        "result_title": "این موارد ارزش بررسی دارند",
    },
    {
        "id": "fa-helper-child-pronoun-helper-self-essential-not-reassigned",
        "lang": "fa",
        "text": "من به فرزندم برای پیدا کردن کمک مالی کمک می‌کنم. او خوب است و من به دارو نیاز دارم.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تأمین مالی",
        "need_context": set(),
        "need_copy": (),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": False,
        "housing_question": "آیا هزینه مسکن بخش بزرگی از بودجه است؟",
        "result_title": "این موارد ارزش بررسی دارند",
    },
    {
        "id": "fa-helper-child-pronoun-essential-helper-possession-preserved",
        "lang": "fa",
        "text": "من به فرزندم برای پیدا کردن کمک مالی کمک می‌کنم. او به غذا نیاز دارد و من پول غذا را دارم.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تأمین مالی",
        "need_context": {"essential_costs"},
        "need_copy": ("نیاز حفظ‌شدهٔ آن شخص", "هزینه‌های ضروری"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": False,
        "housing_question": "آیا هزینه مسکن بخش بزرگی از بودجه است؟",
        "result_title": "این موارد ارزش بررسی دارند",
    },
    {
        "id": "fa-helper-child-pronoun-essential-helper-possession-comma-preserved",
        "lang": "fa",
        "text": "من به فرزندم برای پیدا کردن کمک مالی کمک می‌کنم. او به غذا نیاز دارد، من پول غذا را دارم.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تأمین مالی",
        "need_context": {"essential_costs"},
        "need_copy": ("نیاز حفظ‌شدهٔ آن شخص", "هزینه‌های ضروری"),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": False,
        "housing_question": "آیا هزینه مسکن بخش بزرگی از بودجه است؟",
        "result_title": "این موارد ارزش بررسی دارند",
    },
    {
        "id": "fa-helper-partner-to-mother-switch-not-reassigned",
        "lang": "fa",
        "text": "من به همسرم برای پیدا کردن کمک مالی کمک می‌کنم. مادرم اجاره بالایی دارد.",
        "actor_type": "relative",
        "intent": "funding",
        "context_token": "تأمین مالی",
        "need_context": set(),
        "need_copy": (),
        "continue_action": "relative",
        "steps_before_result": 4,
        "expect_housing_skip": False,
        "housing_question": "آیا هزینه مسکن بخش بزرگی از بودجه است؟",
        "result_title": "این موارد ارزش بررسی دارند",
    },
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_localized_case(browser, base_url: str, scenario: dict, width: int) -> dict:
    case_id = f"{scenario['id']}-{width}"
    page = browser.new_page(viewport={"width": width, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        lang = scenario["lang"]
        page.goto(f"{base_url}/index.html?{urlencode({'lang': lang})}", wait_until="load")
        page.locator("#situation").fill(scenario["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        require(results.is_visible(), f"{case_id}: results did not become visible")
        require(
            results.locator('[data-funding-question="true"]').count() == 0,
            f"{case_id}: explicit helper actor triggered an unnecessary actor question",
        )

        target = results.locator(
            f'a[href*="actor_type={scenario["actor_type"]}"][href*="funding_intent={scenario["intent"]}"]'
        ).first
        require(target.count() == 1, f"{case_id}: route lost helper/funding context")
        href = target.get_attribute("href") or ""
        require("q=" not in href and "situation=" not in href, f"{case_id}: raw situation parameter leaked into route: {href}")
        require(scenario["text"] not in href, f"{case_id}: raw situation text leaked into route")
        require(need_context_from_url(href) == scenario["need_context"], f"{case_id}: route need context mismatch: {href}")
        no_horizontal_overflow(page, case_id, "shared results")
        require(not page_errors, f"{case_id}: JavaScript error(s) on shared page: {page_errors}")

        target.click()
        page.wait_for_load_state("load")
        require(f"actor_type={scenario['actor_type']}" in page.url, f"{case_id}: destination lost actor context")
        require(f"funding_intent={scenario['intent']}" in page.url, f"{case_id}: destination lost funding intent")
        require(f"lang={lang}" in page.url, f"{case_id}: destination lost language context")
        require("q=" not in page.url and "situation=" not in page.url, f"{case_id}: destination URL leaked raw situation parameter")
        require(need_context_from_url(page.url) == scenario["need_context"], f"{case_id}: destination URL need context mismatch")

        context = page.locator(f'#fundingIntentContext[data-funding-intent="{scenario["intent"]}"]')
        require(context.is_visible(), f"{case_id}: destination did not consume preserved funding intent")
        require(scenario["context_token"] in context.inner_text(), f"{case_id}: destination lost localized funding context")
        actual_needs = set(filter(None, (context.get_attribute("data-need-context") or "").split(",")))
        require(actual_needs == scenario["need_context"], f"{case_id}: destination need context mismatch: {actual_needs}")
        for token in scenario["need_copy"]:
            require(token in context.inner_text(), f"{case_id}: localized preserved-need explanation missing: {token}")

        action = context.locator(f'[data-funding-continuity-action="{scenario["continue_action"]}"]')
        require(action.count() == 1, f"{case_id}: destination continuation action missing")
        action.click()
        for index in range(scenario["steps_before_result"]):
            choose_first(page, case_id, f"step {index + 1}")

        housing_question = page.get_by_text(scenario["housing_question"], exact=True)
        result_title = page.get_by_text(scenario["result_title"], exact=True)
        if scenario["expect_housing_skip"]:
            require(housing_question.count() == 0 or not housing_question.is_visible(), f"{case_id}: already-known housing need was asked again")
            require(result_title.count() == 1 and result_title.is_visible(), f"{case_id}: known housing context did not carry through to result")
        else:
            require(housing_question.count() == 1 and housing_question.is_visible(), f"{case_id}: housing was silently assumed after beneficiary switch")
            require(result_title.count() == 0 or not result_title.is_visible(), f"{case_id}: subject-switch control skipped a required question")

        no_horizontal_overflow(page, case_id, "destination journey")
        require(not page_errors, f"{case_id}: JavaScript error(s) after destination handoff: {page_errors}")
        return {
            "id": case_id,
            "semantic_case": scenario["id"],
            "lang": lang,
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
    parser.add_argument("output", nargs="?", default="relative-pronoun-need-browser-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")

    with tempfile.TemporaryDirectory(prefix="stod-relative-pronoun-need-") as tmp:
        site = Path(tmp) / "site"
        index_path = builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": sha256(index_path),
            "privacy_routing_sha256": sha256(site / builder.SHELL_ROUTING_PATH),
            "concrete_need_continuity_sha256": sha256(site / builder.CONCRETE_NEED_CONTINUITY_PATH),
            "independent_semantic_cases": 10,
            "language_parity_variants": len(SCENARIOS) - 10,
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
                            if scenario.get("lang", "sv") == "sv":
                                result = run_case(browser, base_url, scenario, width)
                            else:
                                result = run_localized_case(browser, base_url, scenario, width)
                            evidence["results"].append(result)
                            evidence["passed"] += 1
                        except Exception as exc:
                            evidence["failed"] += 1
                            evidence["results"].append({
                                "id": f"{scenario['id']}-{width}",
                                "semantic_case": scenario["id"],
                                "lang": scenario.get("lang", "sv"),
                                "width": width,
                                "status": "failed",
                                "error": str(exc),
                            })
            finally:
                browser.close()

    Path(args.output).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"relative pronoun need browser ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())