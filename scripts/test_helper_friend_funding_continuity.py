#!/usr/bin/env python3
"""Bounded regression for friend-helper funding scope in sv/ar/fa.

This proves only the shared browser routing contract. It does not prove
eligibility, physical-device behavior, human comprehension or persistence.
"""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

import build_public_pilot as builder
import test_relative_funding_continuity as relative
import test_shared_search_browser as shared
from playwright.sync_api import sync_playwright

CASES = [
    {"id": "sv-helper-friend-student-funding", "lang": "sv", "width": 390, "text": "Jag hjälper min vän som är student att söka bidrag"},
    {"id": "ar-helper-friend-student-funding", "lang": "ar", "width": 390, "text": "أساعد صديقي وهو طالب في البحث عن دعم مالي"},
    {"id": "fa-helper-friend-student-funding", "lang": "fa", "width": 768, "text": "به دوستم که دانشجو است کمک می‌کنم برای کمک مالی"},
]


def main() -> int:
    root = Path(".").resolve()
    engine_name = os.environ.get("BROWSER_ENGINE", "chromium")
    output = Path(os.environ.get("EVIDENCE_PATH", f"helper-friend-funding-{engine_name}.json"))
    evidence = {"engine": engine_name, "scenario_count": len(CASES), "passed": 0, "failed": 0, "results": []}

    with tempfile.TemporaryDirectory(prefix="stod-helper-friend-") as tmp:
        site = Path(tmp) / "site"
        builder.build(root, site)
        with shared.serve_site(site) as base_url, sync_playwright() as playwright:
            browser = getattr(playwright, engine_name).launch(headless=True)
            try:
                for case in CASES:
                    try:
                        evidence["results"].append(relative.run_helper_case(browser, base_url, case))
                        evidence["passed"] += 1
                    except Exception as exc:
                        evidence["failed"] += 1
                        evidence["results"].append({"id": case["id"], "status": "failed", "error": str(exc)})
            finally:
                browser.close()

    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"friend helper funding continuity ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    for result in evidence["results"]:
        if result["status"] == "failed":
            print(f"FAIL {result['id']}: {result['error']}")
    return 1 if evidence["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
