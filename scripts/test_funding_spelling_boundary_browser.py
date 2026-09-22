#!/usr/bin/env python3
"""Focused browser regression for Swedish scholarship spelling boundaries.

This reuses the existing shared start/search browser oracle. It checks that two
bounded, common-looking misspellings still preserve scholarship intent while a
role noun that merely starts with the same letters does not fabricate an
application intent. This is browser/DOM/routing evidence only.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

import build_public_pilot as builder
import test_shared_search_browser as shared
from playwright.sync_api import sync_playwright


SCENARIOS = [
    {
        "id": "sv-scholarship-missing-n-390",
        "lang": "sv",
        "width": 390,
        "text": "stipedium att söka",
        "expect_question": True,
        "question_token": "stipendium",
        "expect_intent": "scholarship",
    },
    {
        "id": "sv-known-student-scholarship-missing-n-1280",
        "lang": "sv",
        "width": 1280,
        "text": "jag studerar och söker stipedium",
        "expect_question": False,
        "expect_actor": "study",
        "expect_intent": "scholarship",
    },
    {
        "id": "sv-stipendiat-is-not-application-intent-390",
        "lang": "sv",
        "width": 390,
        "text": "Jag är stipendiat och behöver hjälp med bostaden.",
        "expect_question": False,
        "reject_route": "funding_intent=scholarship",
    },
]


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", ".")).resolve()
    output = Path(os.environ.get("EVIDENCE_PATH", "funding-spelling-boundary-evidence.json"))
    engine_name = os.environ.get("BROWSER_ENGINE", "chromium")
    shared.require((root / "index.html").is_file(), f"index.html not found under {root}")

    evidence = {
        "engine": engine_name,
        "independent_semantic_cases": len(SCENARIOS),
        "scenario_count": len(SCENARIOS),
        "passed": 0,
        "failed": 0,
        "results": [],
        "limits": [
            "Browser/DOM/routing evidence only.",
            "Playwright WebKit is not physical iPhone/iPad Safari evidence.",
            "This is bounded spelling tolerance, not general fuzzy matching.",
        ],
    }

    with tempfile.TemporaryDirectory(prefix="stod-funding-spelling-") as tmp:
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
                        evidence["results"].append(
                            {
                                "id": scenario["id"],
                                "lang": scenario["lang"],
                                "width": scenario["width"],
                                "status": "failed",
                                "error": str(exc),
                            }
                        )
            finally:
                browser.close()

    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"funding spelling boundary ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result.get("status") == "failed":
                print(f"FAIL {result['id']}@{result['width']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
