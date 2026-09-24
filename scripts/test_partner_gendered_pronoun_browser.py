#!/usr/bin/env python3
"""Focused browser regression for gendered pronouns after an explicit spouse target.

The existing helper route already accepts Swedish `min make` and `min maka` as
partner targets. A nearby pronoun must preserve a bounded need only when the
pronoun is unambiguous from that explicit target: `min maka` -> `hon` and
`min make` -> `han`. Generic `partner`/`sambo` must not gain the same inference;
those remain fail-closed unless the existing neutral `hen` contract applies.

Only the existing coarse `need_context` tokens may cross the page boundary.
This is browser/DOM/routing/privacy evidence, not eligibility, human
comprehension, physical Safari/assistive-tech evidence or persistence E2E.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from pathlib import Path

import build_public_pilot as builder
from playwright.sync_api import sync_playwright
from test_combined_need_funding_browser import WIDTHS, run_case, serve_site


SCENARIOS = [
    {
        "id": "sv-helper-wife-pronoun-rent",
        "text": "Jag hjälper min maka att söka bidrag. Hon har hög hyra.",
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
        "id": "sv-helper-husband-pronoun-essential",
        "text": "Jag hjälper min make att söka bidrag. Han behöver läkemedel.",
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
        "id": "sv-helper-wife-intervening-female-referent-fails-closed",
        "text": "Jag hjälper min maka att söka bidrag. Hennes mamma bor nära oss. Hon behöver läkemedel.",
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
        "id": "sv-helper-husband-intervening-male-referent-fails-closed",
        "text": "Jag hjälper min make att söka bidrag. Hans pappa bor nära oss. Han har hög hyra.",
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
        "id": "sv-helper-wife-intervening-min-sister-fails-closed",
        "text": "Jag hjälper min maka att söka bidrag. Min syster bor nära oss. Hon behöver läkemedel.",
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
        "id": "sv-helper-husband-intervening-min-brother-fails-closed",
        "text": "Jag hjälper min make att söka bidrag. Min bror bor nära oss. Han har hög hyra.",
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
        "id": "sv-helper-generic-partner-hon-fails-closed",
        "text": "Jag hjälper min partner att söka bidrag. Hon har hög hyra.",
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
        "id": "sv-helper-generic-sambo-han-fails-closed",
        "text": "Jag hjälper min sambo att söka bidrag. Han behöver läkemedel.",
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
]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default="partner-gendered-pronoun-browser-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")

    with tempfile.TemporaryDirectory(prefix="stod-partner-gendered-pronoun-") as tmp:
        site = Path(tmp) / "site"
        index_path = builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": sha256(index_path),
            "privacy_routing_sha256": sha256(site / builder.SHELL_ROUTING_PATH),
            "concrete_need_continuity_sha256": sha256(site / builder.CONCRETE_NEED_CONTINUITY_PATH),
            "independent_semantic_cases": len(SCENARIOS),
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
                            result = run_case(browser, base_url, scenario, width)
                            evidence["results"].append(result)
                            evidence["passed"] += 1
                        except Exception as exc:
                            evidence["failed"] += 1
                            evidence["results"].append({
                                "id": f"{scenario['id']}-{width}",
                                "semantic_case": scenario["id"],
                                "lang": "sv",
                                "width": width,
                                "status": "failed",
                                "error": str(exc),
                            })
            finally:
                browser.close()

    Path(args.output).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"partner gendered pronoun browser ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
