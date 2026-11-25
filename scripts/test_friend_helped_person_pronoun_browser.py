#!/usr/bin/env python3
"""Friend-target beneficiary continuity regression using the existing helped-person browser harness.

This closes one routing/ownership boundary only: when the shared router already
accepts a friend as the helped person, a nearby pronoun-owned bounded need must
stay with that beneficiary. Helper-self and target-switch controls must still
fail closed. It is browser/DOM/routing/privacy evidence, not eligibility,
physical-device behavior, human comprehension or storage E2E.
"""
from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path

import test_direct_helped_person_pronoun_browser as direct


SCENARIOS = [
    {
        "id": "sv-helper-friend-pronoun-rent",
        "text": "Jag hjälper min vän att söka bidrag. Hon har hög hyra.",
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
        "id": "sv-helper-friend-helper-self-not-reassigned",
        "text": "Jag hjälper min vän att söka bidrag. Jag behöver medicin.",
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
        "id": "sv-helper-friend-switch-not-reassigned",
        "text": "Jag hjälper min vän att söka bidrag. Min mamma har hög hyra.",
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
        "id": "ar-helper-friend-pronoun-rent",
        "lang": "ar",
        "text": "أساعد صديقي وهو طالب في البحث عن دعم مالي. هو لديه إيجار مرتفع.",
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
        "id": "fa-helper-friend-pronoun-rent",
        "lang": "fa",
        "text": "به دوستم که دانشجو است کمک می‌کنم برای کمک مالی. او اجاره بالایی دارد.",
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
    parser.add_argument("output", nargs="?", default="friend-helped-person-pronoun-browser-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    direct.base.require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")

    with tempfile.TemporaryDirectory(prefix="stod-friend-helper-pronoun-") as tmp:
        site = Path(tmp) / "site"
        index_path = direct.base.builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": direct.base.sha256(index_path),
            "privacy_routing_sha256": direct.base.sha256(site / direct.base.builder.SHELL_ROUTING_PATH),
            "concrete_need_continuity_sha256": direct.base.sha256(site / direct.base.builder.CONCRETE_NEED_CONTINUITY_PATH),
            "independent_semantic_cases": 3,
            "language_parity_variants": 2,
            "widths": list(direct.base.WIDTHS),
            "checks": len(SCENARIOS) * len(direct.base.WIDTHS),
            "passed": 0,
            "failed": 0,
            "results": [],
        }
        with direct.base.serve_site(site) as base_url, direct.base.sync_playwright() as playwright:
            browser = getattr(playwright, engine_name).launch(headless=True)
            try:
                for scenario in SCENARIOS:
                    for width in direct.base.WIDTHS:
                        try:
                            if scenario.get("lang", "sv") == "sv":
                                result = direct.base.run_case(browser, base_url, scenario, width)
                            else:
                                result = direct.base.run_localized_case(browser, base_url, scenario, width)
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
    print(f"friend helped-person pronoun browser ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
