#!/usr/bin/env python3
"""Focused inventory coverage for authoritative start-page keyword containment.

This extends the existing shared-search browser oracle. It does not create a new
matcher or product path; it reuses the same built public artifact and
`test_shared_search_browser.run_scenario` assertions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from pathlib import Path

import build_public_pilot as builder
import test_shared_search_browser as shared
from playwright.sync_api import sync_playwright


SCENARIOS = [
    {
        "id": "sv-standard-procurement-not-dental",
        "lang": "sv",
        "width": 390,
        "text": "standardkrav i en upphandling",
        "expect_question": False,
        "expect_actor": "company",
        "reject_route": "quick-help.html?mode=dental",
    },
    {
        "id": "sv-bare-tand-positive",
        "lang": "sv",
        "width": 1280,
        "text": "Jag har ont i en tand",
        "expect_question": False,
        "expect_route": "quick-help.html?mode=dental",
    },
    {
        "id": "sv-advice-not-economy",
        "lang": "sv",
        "width": 390,
        "text": "Jag behöver råd om hur jag söker skolstöd.",
        "expect_question": False,
        "reject_route": "actor_type=private_person",
        "expect_route": "actor_type=other",
    },
    {
        "id": "sv-cannot-afford-positive",
        "lang": "sv",
        "width": 1280,
        "text": "Jag har inte råd med mat den här månaden.",
        "expect_question": False,
        "expect_route": "actor_type=private_person",
    },
    {
        "id": "sv-collaboration-not-work",
        "lang": "sv",
        "width": 390,
        "text": "Jag behöver hjälp med ett samarbete mellan två grupper.",
        "expect_question": False,
        "reject_actor": "employee",
        "expect_route": "actor_type=other",
    },
    {
        "id": "sv-work-noun-positive",
        "lang": "sv",
        "width": 1280,
        "text": "Jag behöver hjälp med arbetet.",
        "expect_question": False,
        "expect_route": "actor_type=employee",
    },
    {
        "id": "sv-difficult-not-work",
        "lang": "sv",
        "width": 390,
        "text": "Det är jobbigt att förstå vilket stöd som passar.",
        "expect_question": False,
        "reject_actor": "employee",
        "expect_route": "actor_type=other",
    },
    {
        "id": "sv-job-positive",
        "lang": "sv",
        "width": 1280,
        "text": "Jag behöver hjälp med jobbet.",
        "expect_question": False,
        "expect_route": "actor_type=employee",
    },
    {
        "id": "ar-surgery-not-work",
        "lang": "ar",
        "width": 390,
        "text": "أحتاج مساعدة لفهم عملية جراحية.",
        "expect_question": False,
        "reject_actor": "employee",
        "expect_route": "actor_type=other",
        "expect_rtl": True,
    },
    {
        "id": "ar-work-positive",
        "lang": "ar",
        "width": 1280,
        "text": "أنا موظف وأحتاج مساعدة في العمل.",
        "expect_question": False,
        "expect_actor": "employee",
        "expect_rtl": True,
    },
    {
        "id": "fa-solution-not-work",
        "lang": "fa",
        "width": 390,
        "text": "به یک راهکار ساده برای مشکل روزمره نیاز دارم.",
        "expect_question": False,
        "reject_actor": "employee",
        "expect_route": "actor_type=other",
        "expect_rtl": True,
    },
    {
        "id": "fa-work-positive",
        "lang": "fa",
        "width": 1280,
        "text": "من کارمند هستم و برای کار به راهنمایی نیاز دارم.",
        "expect_question": False,
        "expect_actor": "employee",
        "expect_rtl": True,
    },
    {
        "id": "ar-frankly-funding-not-vision",
        "lang": "ar",
        "width": 390,
        "text": "بصراحة، أحتاج إلى دعم مالي.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "reject_route": "quick-help.html?mode=vision",
        "expect_rtl": True,
    },
    {
        "id": "ar-vision-positive",
        "lang": "ar",
        "width": 1280,
        "text": "لدي ضعف في البصر وأحتاج إلى مساعدة.",
        "expect_question": False,
        "expect_route": "quick-help.html?mode=vision",
        "expect_rtl": True,
    },
    {
        "id": "fa-opinion-funding-not-vision",
        "lang": "fa",
        "width": 390,
        "text": "به نظر من به کمک مالی نیاز دارم.",
        "expect_question": True,
        "question_token": "چه کسی",
        "expect_intent": "funding",
        "reject_route": "quick-help.html?mode=vision",
        "expect_rtl": True,
    },
    {
        "id": "fa-vision-positive",
        "lang": "fa",
        "width": 1280,
        "text": "بینایی من ضعیف است و به کمک نیاز دارم.",
        "expect_question": False,
        "expect_route": "quick-help.html?mode=vision",
        "expect_rtl": True,
    },
    {
        "id": "ar-asylum-seeker-not-student",
        "lang": "ar",
        "width": 390,
        "text": "أنا طالب اللجوء وأبحث عن دعم مالي.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-student-positive",
        "lang": "ar",
        "width": 1280,
        "text": "أنا طالب وأبحث عن دعم مالي للدراسة.",
        "expect_question": False,
        "expect_actor": "study",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-property-actor-specificity",
        "lang": "ar",
        "width": 390,
        "text": "نحن جمعية سكنية ونبحث عن تمويل لتكييف مدخل المبنى.",
        "expect_question": False,
        "expect_actor": "property_actor",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-generic-association-remains-generic",
        "lang": "ar",
        "width": 1280,
        "text": "نحن جمعية ونبحث عن تمويل لمشروع.",
        "expect_question": False,
        "expect_actor": "association",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-financial-assistance-funding-asks-actor",
        "lang": "ar",
        "width": 390,
        "text": "أحتاج إلى مساعدة مالية.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "reject_actor": "private_person",
        "expect_rtl": True,
    },
    {
        "id": "fa-participate-not-company",
        "lang": "fa",
        "width": 390,
        "text": "برای شرکت در برنامه توانبخشی به راهنمایی نیاز دارم.",
        "expect_question": False,
        "reject_route": "company-pilot.html?actor_type=company",
        "expect_route": "actor_type=other",
        "expect_rtl": True,
    },
    {
        "id": "fa-company-positive",
        "lang": "fa",
        "width": 1280,
        "text": "شرکت من برای یک مناقصه عمومی به راهنمایی نیاز دارد.",
        "expect_question": False,
        "expect_actor": "company",
        "expect_rtl": True,
    },
    {
        "id": "ar-third-party-company-not-self-company",
        "lang": "ar",
        "width": 390,
        "text": "أحتاج دعما بسبب مشكلة مع شركة التأمين.",
        "expect_question": False,
        "reject_actor": "company",
        "expect_route": "actor_type=other",
        "expect_rtl": True,
    },
    {
        "id": "ar-third-party-company-funding-asks-actor",
        "lang": "ar",
        "width": 390,
        "text": "أحتاج دعما ماليا بسبب مشكلة مع شركة الكهرباء.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-self-company-positive",
        "lang": "ar",
        "width": 1280,
        "text": "لدي شركة وأبحث عن دعم مالي.",
        "expect_question": False,
        "expect_actor": "company",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default=None)
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")
    output = args.output or os.environ.get("EVIDENCE_PATH", f"shared-search-keyword-inventory-{engine_name}.json")

    with tempfile.TemporaryDirectory(prefix="stod-keyword-inventory-") as tmp:
        site = Path(tmp) / "site"
        index_path = builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": sha256(index_path),
            "privacy_routing_sha256": sha256(site / builder.SHELL_ROUTING_PATH),
            "independent_semantic_cases": len(SCENARIOS),
            "passed": 0,
            "failed": 0,
            "results": [],
        }
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

    Path(output).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"shared search keyword inventory ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    for result in evidence["results"]:
        if result["status"] == "failed":
            print(f"FAIL {result['id']}: {result['error']}")
    return 1 if evidence["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
