#!/usr/bin/env python3
"""Bounded browser holdout for negated harm-prevention support wording.

This reuses the existing assistance source-boundary browser harness. It verifies
that explicitly saying the user does not need support to prevent physical harm
does not become positive evidence for personal assistance when the separately
stated positive need is daily structure. It does not decide eligibility or add
new routing logic.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

import build_public_pilot as builder
from test_assistance_focus_source_boundary_browser import (
    SOCIALSTYRELSEN_SOURCE,
    WIDTHS,
    require,
    run_start_route_case,
    serve_site,
)

CASES = [
    {
        "id": "sv-negated-harm-support-keeps-structure-route",
        "lang": "sv",
        "text": "Jag har psykisk funktionsnedsättning. Jag behöver inte stöd för att förebygga fysisk skada; jag behöver bara hjälp att planera vardagen.",
        "should_route": True,
        "expected_need": "structure",
        "source": SOCIALSTYRELSEN_SOURCE,
    },
    {
        "id": "ar-negated-harm-support-keeps-structure-route",
        "lang": "ar",
        "text": "لدي إعاقة نفسية. لا أحتاج إلى دعم لمنع ضرر جسدي؛ أحتاج فقط إلى مساعدة في تنظيم حياتي اليومية.",
        "should_route": True,
        "expected_need": "structure",
        "source": SOCIALSTYRELSEN_SOURCE,
    },
    {
        "id": "fa-negated-harm-support-keeps-structure-route",
        "lang": "fa",
        "text": "معلولیت روانی دارم. برای پیشگیری از آسیب به خودم کمک نمی‌خواهم؛ فقط برای برنامه‌ریزی زندگی روزمره به کمک نیاز دارم.",
        "should_route": True,
        "expected_need": "structure",
        "source": SOCIALSTYRELSEN_SOURCE,
    },
]


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", ".")).resolve()
    output = Path(os.environ.get("EVIDENCE_PATH", "assistance-harm-support-denial-evidence.json"))
    engine_name = os.environ.get("BROWSER_ENGINE", "chromium")
    require((root / "index.html").is_file(), f"index.html not found under {root}")

    expected = len(CASES) * len(WIDTHS)
    evidence = {
        "engine": engine_name,
        "independent_semantic_cases": len(CASES),
        "widths": list(WIDTHS),
        "expected_checks": expected,
        "executed": 0,
        "passed": 0,
        "failed": 0,
        "results": [],
        "claim_boundary": "bounded negated support-need routing only; not eligibility, persistence, human comprehension, or physical-device evidence",
    }

    with tempfile.TemporaryDirectory(prefix="stod-assistance-harm-support-denial-") as tmp:
        site = Path(tmp) / "site"
        builder.build(root, site)
        with serve_site(site) as base_url, sync_playwright() as playwright:
            browser = getattr(playwright, engine_name).launch(headless=True)
            try:
                for case in CASES:
                    for width in WIDTHS:
                        evidence["executed"] += 1
                        try:
                            evidence["results"].append(run_start_route_case(browser, base_url, case, width))
                            evidence["passed"] += 1
                        except Exception as exc:
                            evidence["failed"] += 1
                            evidence["results"].append({"id": case["id"], "width": width, "status": "failed", "error": str(exc)})
            finally:
                browser.close()

    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"assistance harm-support denial ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
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
