#!/usr/bin/env python3
"""Exact-head browser falsifier for bounded challenger residuals on the shared start page.

These cases are known development cases from Scenario Lab #52, not blind holdouts.
They reuse the existing public-pilot build and start-page browser oracle. The
assertions are defined before execution and intentionally test only routing
behavior/privacy/layout, not eligibility, model quality, human comprehension or
physical-device accessibility.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

import test_start_vision_boundary_browser as base
from playwright.sync_api import sync_playwright


CASES = [
    {
        "id": "sv-not-unemployed-retired-low-pension",
        "text": "Jag är inte arbetslös, jag är pensionär med för låg pension.",
        "expect_first": "actor_type=private_person",
        "reject": "actor_type=employee",
    },
    {
        "id": "sv-not-company-explicit-private-person",
        "text": "Jag har inget företag, jag är privatperson.",
        "expect_first": "actor_type=private_person",
        "reject": "actor_type=company",
    },
]

WIDTHS = (390, 1280)


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", ".")).resolve()
    output = Path(os.environ.get("EVIDENCE_PATH", "challenger-start-residuals-evidence.json"))
    engine_name = os.environ.get("BROWSER_ENGINE", "chromium")
    base.require((root / "index.html").is_file(), f"index.html not found under {root}")

    evidence = {
        "engine": engine_name,
        "known_development_cases": len(CASES),
        "widths": list(WIDTHS),
        "expected_checks": len(CASES) * len(WIDTHS),
        "executed": 0,
        "passed": 0,
        "failed": 0,
        "results": [],
    }

    with tempfile.TemporaryDirectory(prefix="stod-challenger-start-") as tmp:
        site = Path(tmp) / "site"
        base.builder.build(root, site)
        with base.serve_site(site) as base_url, sync_playwright() as playwright:
            browser = getattr(playwright, engine_name).launch(headless=True)
            try:
                for case in CASES:
                    for width in WIDTHS:
                        evidence["executed"] += 1
                        try:
                            evidence["results"].append(base.run_case(browser, base_url, case, width))
                            evidence["passed"] += 1
                        except Exception as exc:
                            evidence["failed"] += 1
                            evidence["results"].append({
                                "id": case["id"],
                                "width": width,
                                "status": "failed",
                                "error": str(exc),
                            })
            finally:
                browser.close()

    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"challenger start residuals ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["executed"] != evidence["expected_checks"]:
        print(f"FAIL harness count: expected {evidence['expected_checks']}, executed {evidence['executed']}")
        return 1
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}@{result['width']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
