#!/usr/bin/env python3
"""Focused browser regression for generic helped-person pronoun continuity.

Reuses the existing helped-person browser harness. This is browser/DOM/routing/
privacy evidence only: raw situation text must not cross the route, and only the
existing bounded need_context token may survive.
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
        "id": "sv-helper-person-pronoun-hon-rent",
        "text": "Personen jag hjälper söker bidrag. Hon har hög hyra.",
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
        "id": "sv-helper-person-pronoun-hen-control",
        "text": "Personen jag hjälper söker bidrag. Hen har hög hyra.",
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
        "id": "ar-helper-person-pronoun-hu-rent",
        "lang": "ar",
        "text": "الشخص الذي أساعده يبحث عن دعم مالي. هو لديه إيجار مرتفع.",
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
        "id": "ar-helper-child-pronoun-hu-control",
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
        "id": "fa-helper-person-pronoun-ou-rent",
        "lang": "fa",
        "text": "فردی که کمک می‌کنم دنبال کمک مالی است. او اجاره بالایی دارد.",
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
        "id": "fa-helper-child-pronoun-ou-control",
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
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default="generic-helped-person-pronoun-browser-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    base.require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")

    with tempfile.TemporaryDirectory(prefix="stod-generic-person-pronoun-") as tmp:
        site = Path(tmp) / "site"
        index_path = base.builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": base.sha256(index_path),
            "privacy_routing_sha256": base.sha256(site / base.builder.SHELL_ROUTING_PATH),
            "concrete_need_continuity_sha256": base.sha256(site / base.builder.CONCRETE_NEED_CONTINUITY_PATH),
            "independent_semantic_cases": 2,
            "language_parity_variants": 4,
            "widths": list(base.WIDTHS),
            "checks": len(SCENARIOS) * len(base.WIDTHS),
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
            finally:
                browser.close()

    Path(args.output).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"generic helped-person pronoun browser ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
