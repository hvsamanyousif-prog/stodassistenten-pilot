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
        "lang": "sv",
        "text": "Jag är inte arbetslös, jag är pensionär med för låg pension.",
        "expect_first": "actor_type=private_person",
        "reject": "actor_type=employee",
    },
    {
        "id": "sv-not-company-explicit-private-person",
        "lang": "sv",
        "text": "Jag har inget företag, jag är privatperson.",
        "expect_first": "actor_type=private_person",
        "reject": "actor_type=company",
    },
    {
        "id": "sv-helper-mother-vision-home-support",
        "lang": "sv",
        "text": "Jag hjälper min mamma som har svårt att se och klara sig hemma.",
        "expect_first": "actor_type=relative",
        "reject": "actor_type=private_person",
    },
    {
        "id": "sv-helper-mother-no-possessive",
        "lang": "sv",
        "text": "Jag hjälper mamma som har svårt att se och klara sig hemma.",
        "expect_first": "actor_type=relative",
        "reject": "actor_type=private_person",
    },
    {
        "id": "sv-help-out-association-funding-stays-association",
        "lang": "sv",
        "text": "Jag hjälper till i vår förening och söker bidrag.",
        "expect_first": "actor_type=association",
        "reject": "actor_type=relative",
    },
    {
        "id": "sv-vague-money-to-apply-for",
        "lang": "sv",
        "text": "pengar att söka",
        "expect_first": "actor_type=private_person",
    },
    {
        "id": "sv-vague-apply-for-money",
        "lang": "sv",
        "text": "söka pengar",
        "expect_first": "actor_type=private_person",
    },
    {
        "id": "sv-vague-funds-to-apply-for",
        "lang": "sv",
        "text": "fonder att söka",
        "expect_first": "actor_type=private_person",
    },
    {
        "id": "sv-fondue-not-funding",
        "lang": "sv",
        "text": "Jag planerar en fonduekväll med vänner.",
        "expect_first": "actor_type=other",
        "reject": "actor_type=private_person",
    },
    {
        "id": "ar-not-company-explicit-private-person",
        "lang": "ar",
        "text": "ليس لدي شركة، أنا فرد.",
        "expect_first": "actor_type=private_person",
        "reject": "actor_type=company",
        "expect_rtl": True,
    },
    {
        "id": "fa-not-company-explicit-private-person",
        "lang": "fa",
        "text": "شرکت ندارم، من فرد هستم.",
        "expect_first": "actor_type=private_person",
        "reject": "actor_type=company",
        "expect_rtl": True,
    },
    {
        "id": "ar-not-company-owner-explicit-private-person",
        "lang": "ar",
        "text": "لست صاحب شركة، أنا فرد.",
        "expect_first": "actor_type=private_person",
        "reject": "actor_type=company",
        "expect_rtl": True,
    },
    {
        "id": "fa-not-company-owner-explicit-private-person",
        "lang": "fa",
        "text": "من صاحب شرکت نیستم؛ فرد هستم.",
        "expect_first": "actor_type=private_person",
        "reject": "actor_type=company",
        "expect_rtl": True,
    },
    {
        "id": "ar-company-positive-control",
        "lang": "ar",
        "text": "لدي شركة وأريد فهم مناقصة عامة.",
        "expect_first": "actor_type=company",
        "expect_rtl": True,
    },
    {
        "id": "fa-company-positive-control",
        "lang": "fa",
        "text": "شرکت دارم و می‌خواهم یک مناقصه عمومی را بفهمم.",
        "expect_first": "actor_type=company",
        "expect_rtl": True,
    },
]

WIDTHS = (390, 1280)


def run_case(browser, base_url: str, case: dict, width: int) -> dict:
    page = browser.new_page(viewport={"width": width, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        lang = case.get("lang", "sv")
        page.goto(f"{base_url}/index.html?lang={lang}", wait_until="load")
        page.locator("#situation").fill(case["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        base.require(results.is_visible(), f"{case['id']}@{width}: results not visible")
        base.require(not page_errors, f"{case['id']}@{width}: JavaScript errors: {page_errors}")

        links = results.locator("a.route")
        base.require(links.count() >= 1, f"{case['id']}@{width}: no route rendered")
        hrefs = links.evaluate_all("els => els.map(el => el.getAttribute('href') || '')")
        first_href = hrefs[0]
        base.require(case["expect_first"] in first_href, f"{case['id']}@{width}: first route {first_href!r} did not match {case['expect_first']!r}")
        if case.get("reject"):
            base.require(all(case["reject"] not in href for href in hrefs), f"{case['id']}@{width}: rejected route was rendered: {hrefs}")
        base.require(all(case["text"] not in href for href in hrefs), f"{case['id']}@{width}: raw situation leaked into URL")
        base.require(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), f"{case['id']}@{width}: horizontal overflow")
        if case.get("expect_rtl"):
            base.require(page.locator("html").get_attribute("dir") == "rtl", f"{case['id']}@{width}: RTL direction missing")
        return {"id": case["id"], "lang": lang, "width": width, "status": "passed", "first_href": first_href, "hrefs": hrefs}
    finally:
        page.close()


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
                            evidence["results"].append(run_case(browser, base_url, case, width))
                            evidence["passed"] += 1
                        except Exception as exc:
                            evidence["failed"] += 1
                            evidence["results"].append({
                                "id": case["id"],
                                "lang": case.get("lang", "sv"),
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