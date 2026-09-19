#!/usr/bin/env python3
"""Focused browser regression for stale company actor correction.

Reuses the existing shared-search browser harness against the same public pilot build.
This is a focused regression probe, not a separate routing or matching implementation.
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


SCENARIOS = [
    {
        "id": "ar-stale-company-corrected-to-student",
        "lang": "ar",
        "width": 390,
        "actor_type": "company",
        "text": "لم أعد صاحب شركة، أنا طالب الآن وأبحث عن منحة دراسية.",
        "expect_question": False,
        "expect_actor": "study",
        "reject_actor": "company",
        "expect_intent": "scholarship",
        "expect_rtl": True,
    },
    {
        "id": "ar-stale-company-negated-without-replacement-asks-once",
        "lang": "ar",
        "width": 768,
        "actor_type": "company",
        "text": "لم أعد صاحب شركة وأبحث عن منحة دراسية.",
        "expect_question": True,
        "question_token": "منحة",
        "expect_intent": "scholarship",
        "expect_rtl": True,
    },
    {
        "id": "ar-current-company-context-remains",
        "lang": "ar",
        "width": 1024,
        "actor_type": "company",
        "text": "أنا صاحب شركة وأبحث عن تمويل.",
        "expect_question": False,
        "expect_actor": "company",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-stale-company-corrected-to-student",
        "lang": "fa",
        "width": 390,
        "actor_type": "company",
        "text": "دیگر صاحب شرکت نیستم، الان دانشجو هستم و دنبال بورسیه هستم.",
        "expect_question": False,
        "expect_actor": "study",
        "reject_actor": "company",
        "expect_intent": "scholarship",
        "expect_rtl": True,
    },
    {
        "id": "fa-stale-company-negated-without-replacement-asks-once",
        "lang": "fa",
        "width": 768,
        "actor_type": "company",
        "text": "دیگر صاحب شرکت نیستم و دنبال بورسیه هستم.",
        "expect_question": True,
        "question_token": "بورسیه",
        "expect_intent": "scholarship",
        "expect_rtl": True,
    },
    {
        "id": "fa-current-company-context-remains",
        "lang": "fa",
        "width": 1024,
        "actor_type": "company",
        "text": "شرکت من برای توسعه به کمک مالی نیاز دارد.",
        "expect_question": False,
        "expect_actor": "company",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default="actor-correction-company-browser-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    shared.require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")

    evidence = {
        "engine": engine_name,
        "artifact": "minimal public pilot build",
        "scenario_count": len(SCENARIOS),
        "passed": 0,
        "failed": 0,
        "results": [],
    }

    with tempfile.TemporaryDirectory(prefix="stod-company-correction-") as tmp:
        site = Path(tmp) / "site"
        builder.build(root, site)
        with shared.serve_site(site) as base_url, sync_playwright() as playwright:
            browser = getattr(playwright, engine_name).launch(headless=True)
            try:
                for scenario in SCENARIOS:
                    try:
                        evidence["results"].append(shared.run_scenario(browser, base_url, scenario))
                        evidence["passed"] += 1
                    except Exception as exc:
                        evidence["failed"] += 1
                        evidence["results"].append({"id": scenario["id"], "status": "failed", "error": str(exc)})
            finally:
                browser.close()

    Path(args.output).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"company actor correction ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
