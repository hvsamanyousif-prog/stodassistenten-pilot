#!/usr/bin/env python3
"""Browser regression for route-supported direct helped-person targets.

This reuses the existing helped-person browser harness. It verifies that when the
shared router already treats an explicit surface as a helper target, the bounded
beneficiary continuity layer establishes the same helped person before a nearby
compatible pronoun-owned need is carried forward. Raw situation text must never
cross the route; only the existing bounded need_context categories may survive.

This is browser/DOM/routing/privacy evidence, not eligibility, model quality,
human comprehension, physical Safari/assistive-tech validation or storage E2E.
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
        "id": "sv-helper-direct-henne-pronoun-rent",
        "text": "Jag hjälper henne att söka bidrag. Hon har hög hyra.",
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
        "id": "sv-helper-direct-honom-pronoun-essential",
        "text": "Jag hjälper honom att söka bidrag. Han behöver medicin.",
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
        "id": "sv-helper-direct-helper-self-not-reassigned",
        "text": "Jag hjälper henne att söka bidrag. Jag behöver medicin.",
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
        "id": "sv-helper-direct-switch-not-reassigned",
        "text": "Jag hjälper henne att söka bidrag. Min mamma har hög hyra.",
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
        "id": "ar-helper-on-behalf-person-pronoun-rent",
        "lang": "ar",
        "text": "أبحث عن دعم مالي نيابة عن شخص. هو لديه إيجار مرتفع.",
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
        "id": "ar-helper-on-behalf-person-helper-self-not-reassigned",
        "lang": "ar",
        "text": "أبحث عن دعم مالي نيابة عن شخص. أنا أحتاج إلى دواء.",
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
        "id": "fa-helper-baraye-ou-pronoun-rent",
        "lang": "fa",
        "text": "برای او دنبال کمک مالی هستم. او اجاره بالایی دارد.",
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
        "id": "fa-helper-baraye-ou-helper-self-not-reassigned",
        "lang": "fa",
        "text": "برای او دنبال کمک مالی هستم. من به دارو نیاز دارم.",
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
        "id": "fa-helper-baraye-ou-switch-not-reassigned",
        "lang": "fa",
        "text": "برای او دنبال کمک مالی هستم. مادرم اجاره بالایی دارد.",
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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default="direct-helped-person-pronoun-browser-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    base.require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")

    with tempfile.TemporaryDirectory(prefix="stod-direct-helper-pronoun-") as tmp:
        site = Path(tmp) / "site"
        index_path = base.builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": base.sha256(index_path),
            "privacy_routing_sha256": base.sha256(site / base.builder.SHELL_ROUTING_PATH),
            "concrete_need_continuity_sha256": base.sha256(site / base.builder.CONCRETE_NEED_CONTINUITY_PATH),
            "independent_semantic_cases": 6,
            "language_parity_variants": 3,
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
    print(f"direct helped-person pronoun browser ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
