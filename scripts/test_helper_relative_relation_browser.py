#!/usr/bin/env python3
"""Focused browser regression for generic relative/anhörig helper continuity.

Reuses the existing helped-person browser harness. This is browser/DOM/routing/
privacy evidence only: raw situation text must not cross the route, and only the
existing bounded need_context token may survive.

The same governed helper target must remain ownable when it is established by a
supported target phrase even if funding is explicitly rejected. That regression
stays bounded to the target grammar already accepted by the shared routing layer;
it is not a general coreference claim.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path

import test_relative_pronoun_need_browser as base


SCENARIOS = [
    {
        "id": "sv-relative-helper-funding-preserves-housing-need",
        "text": "Jag hjälper en anhörig att söka bidrag. Hon har hög hyra.",
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
        "id": "ar-relative-helper-funding-preserves-housing-need",
        "lang": "ar",
        "text": "أنا أساعد أحد أقاربي في البحث عن دعم مالي. هو لديه إيجار مرتفع.",
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
        "id": "fa-relative-helper-funding-preserves-housing-need",
        "lang": "fa",
        "text": "من به یکی از بستگانم کمک می‌کنم تا کمک مالی پیدا کند. او اجاره بالایی دارد.",
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
        "id": "sv-narstaende-helper-funding-preserves-housing-need",
        "text": "Jag hjälper en närstående att söka bidrag. Hon har hög hyra.",
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
        "id": "ar-close-person-helper-funding-preserves-housing-need",
        "lang": "ar",
        "text": "أنا أساعد شخصًا قريبًا مني في البحث عن دعم مالي. هو لديه إيجار مرتفع.",
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
        "id": "fa-close-relative-helper-funding-preserves-housing-need",
        "lang": "fa",
        "text": "من به یکی از نزدیکانم کمک می‌کنم تا کمک مالی پیدا کند. او اجاره بالایی دارد.",
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
]


REJECTED_TARGET_SCENARIOS = [
    {
        "id": "sv-rejected-funding-for-narstaende-preserves-housing-need",
        "lang": "sv",
        "text": "Jag vill inte söka bidrag för en närstående. Hon har hög hyra.",
        "actor_type": "relative",
        "need_context": {"housing"},
    },
    {
        "id": "ar-rejected-funding-for-relative-preserves-housing-need",
        "lang": "ar",
        "text": "لا أريد طلب دعم مالي لأحد أقاربي. لديه إيجار مرتفع.",
        "actor_type": "relative",
        "need_context": {"housing"},
    },
    {
        "id": "fa-rejected-funding-for-relative-preserves-housing-need",
        "lang": "fa",
        "text": "من برای یکی از نزدیکانم کمک مالی نمی‌خواهم. او اجاره بالایی دارد.",
        "actor_type": "relative",
        "need_context": {"housing"},
    },
]


def run_rejected_target_case(browser, base_url: str, scenario: dict, width: int) -> dict:
    case_id = f"{scenario['id']}-{width}"
    page = browser.new_page(viewport={"width": width, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        lang = scenario.get("lang", "sv")
        page.goto(f"{base_url}/index.html?lang={lang}", wait_until="load")
        if lang in {"ar", "fa"}:
            base.require(page.locator("html").get_attribute("dir") == "rtl", f"{case_id}: RTL direction missing")
        page.locator("#situation").fill(scenario["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        base.require(results.is_visible(), f"{case_id}: results did not become visible")
        base.require(not page_errors, f"{case_id}: JavaScript error(s): {page_errors}")
        base.require(
            results.locator('[data-funding-question="true"]').count() == 0,
            f"{case_id}: governed helper target triggered an unnecessary funding/actor clarification",
        )

        target = results.locator(f'a.route[href*="actor_type={scenario["actor_type"]}"]').first
        base.require(target.count() == 1, f"{case_id}: rejected-funding helper route missing")
        base.require(
            target.get_attribute("data-rejected-funding-helper") == "true",
            f"{case_id}: route was not marked as the governed rejected-funding helper path",
        )
        href = target.get_attribute("href") or ""
        base.require("funding_intent=" not in href, f"{case_id}: rejected funding fabricated a funding intent: {href}")
        base.require(
            base.need_context_from_url(href) == scenario["need_context"],
            f"{case_id}: helped person's bounded need was lost or fabricated: {href}",
        )
        base.require("q=" not in href and "situation=" not in href, f"{case_id}: raw situation parameter leaked into route")
        base.require(scenario["text"] not in href, f"{case_id}: raw situation text leaked into route")
        base.no_horizontal_overflow(page, case_id, "shared rejected-funding helper results")
        return {
            "id": case_id,
            "semantic_case": scenario["id"],
            "lang": lang,
            "width": width,
            "status": "passed",
            "actor_type": scenario["actor_type"],
            "funding_intent": None,
            "need_context": sorted(scenario["need_context"]),
            "route": href,
        }
    finally:
        page.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default="helper-relative-relation-browser-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    base.require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")

    with tempfile.TemporaryDirectory(prefix="stod-helper-relative-") as tmp:
        site = Path(tmp) / "site"
        index_path = base.builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": base.sha256(index_path),
            "privacy_routing_sha256": base.sha256(site / base.builder.SHELL_ROUTING_PATH),
            "concrete_need_continuity_sha256": base.sha256(site / base.builder.CONCRETE_NEED_CONTINUITY_PATH),
            "independent_semantic_cases": 3,
            "language_parity_variants": 6,
            "widths": list(base.WIDTHS),
            "checks": (len(SCENARIOS) + len(REJECTED_TARGET_SCENARIOS)) * len(base.WIDTHS),
            "passed": 0,
            "failed": 0,
            "results": [],
        }
        with base.serve_site(site) as base_url, base.sync_playwright() as playwright:
            browser = getattr(playwright, engine_name).launch(headless=True)
            try:
                for scenario in SCENARIOS:
                    for width in base.WIDTHS:
                        try:
                            if scenario.get("lang", "sv") == "sv":
                                result = base.run_case(browser, base_url, scenario, width)
                            else:
                                result = base.run_localized_case(browser, base_url, scenario, width)
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
                for scenario in REJECTED_TARGET_SCENARIOS:
                    for width in base.WIDTHS:
                        try:
                            evidence["results"].append(run_rejected_target_case(browser, base_url, scenario, width))
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
    print(f"helper relative relation browser ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
