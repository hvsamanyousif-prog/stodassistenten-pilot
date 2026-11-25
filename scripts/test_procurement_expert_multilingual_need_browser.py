#!/usr/bin/env python3
"""Browser regression for bounded concrete-need continuity in Arabic and Persian.

The public start page must preserve a stated housing or essential-household-cost
need together with an already clear student/funding intent without sending raw
situation text between pages. Lexical near-misses such as renting a car must not
be promoted to housing context. This is browser/DOM routing evidence, not
eligibility, model-quality, persistence, or human-comprehension evidence.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import parse_qs, urlencode, urlparse

import build_public_pilot as builder
from playwright.sync_api import sync_playwright


SCENARIOS = [
    {
        "id": "ar-student-high-rent-scholarship",
        "lang": "ar",
        "text": "أنا طالب وأدرس ولدي إيجار مرتفع وأبحث عن منحة.",
        "intent": "scholarship",
        "need_context": {"housing"},
        "need_copy": "السكن / الإيجار",
        "essential_ack": None,
    },
    {
        "id": "ar-student-car-rental-not-housing",
        "lang": "ar",
        "text": "أنا طالب وأدرس وأبحث عن تمويل لإيجار سيارة.",
        "intent": "funding",
        "need_context": set(),
        "need_copy": None,
        "essential_ack": None,
    },
    {
        "id": "ar-student-electricity-bill-scholarship",
        "lang": "ar",
        "text": "أنا طالب وأدرس ولدي صعوبة في دفع فاتورة الكهرباء وأبحث عن منحة.",
        "intent": "scholarship",
        "need_context": {"essential_costs"},
        "need_copy": "مصاريف ضرورية",
        "essential_ack": "ذكرت مصاريف ضرورية",
    },
    {
        "id": "fa-student-high-rent-scholarship",
        "lang": "fa",
        "text": "دانشجو هستم و اجاره بالایی دارم و دنبال بورسیه هستم.",
        "intent": "scholarship",
        "need_context": {"housing"},
        "need_copy": "مسکن / اجاره",
        "essential_ack": None,
    },
    {
        "id": "fa-student-car-rental-not-housing",
        "lang": "fa",
        "text": "دانشجو هستم و برای اجاره خودرو دنبال بودجه هستم.",
        "intent": "funding",
        "need_context": set(),
        "need_copy": None,
        "essential_ack": None,
    },
    {
        "id": "fa-student-electricity-bill-scholarship",
        "lang": "fa",
        "text": "دانشجو هستم و برای پرداخت قبض برق مشکل دارم و دنبال بورسیه هستم.",
        "intent": "scholarship",
        "need_context": {"essential_costs"},
        "need_copy": "هزینه‌های ضروری",
        "essential_ack": "هزینه‌های ضروری را ذکر کردید",
    },
]
WIDTHS = (390, 1280)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        return


@contextmanager
def serve_site(site: Path):
    handler = partial(QuietHandler, directory=str(site))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def need_context_from_url(url: str) -> set[str]:
    params = parse_qs(urlparse(url).query)
    raw = params.get("need_context", [""])[0]
    return {part for part in raw.split(",") if part}


def no_horizontal_overflow(page, case_id: str, stage: str) -> None:
    overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    require(not overflow, f"{case_id}: horizontal overflow at {stage}")


def run_case(browser, base_url: str, scenario: dict, width: int) -> dict:
    case_id = f"{scenario['id']}-{width}"
    page = browser.new_page(viewport={"width": width, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        page.goto(f"{base_url}/index.html?{urlencode({'lang': scenario['lang']})}", wait_until="load")
        require(page.locator("html").get_attribute("dir") == "rtl", f"{case_id}: RTL direction was not active")
        page.locator("#situation").fill(scenario["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        require(results.is_visible(), f"{case_id}: results did not become visible")

        target = results.locator(
            f'a[href*="actor_type=student"][href*="funding_intent={scenario["intent"]}"]'
        ).first
        require(target.count() == 1, f"{case_id}: student/funding route missing")
        href = target.get_attribute("href") or ""
        require("q=" not in href and "situation=" not in href, f"{case_id}: raw situation parameter leaked into route")
        require(scenario["text"] not in href, f"{case_id}: raw situation text leaked into route")
        require(need_context_from_url(href) == scenario["need_context"], f"{case_id}: bounded need mismatch in route: {href}")
        no_horizontal_overflow(page, case_id, "shared results")
        require(not page_errors, f"{case_id}: JavaScript error(s) on shared page: {page_errors}")

        target.click()
        page.wait_for_load_state("load")
        require(f"lang={scenario['lang']}" in page.url, f"{case_id}: language context was lost")
        require("actor_type=student" in page.url, f"{case_id}: actor context was lost")
        require(f"funding_intent={scenario['intent']}" in page.url, f"{case_id}: funding intent was lost")
        require(need_context_from_url(page.url) == scenario["need_context"], f"{case_id}: bounded need mismatch at destination")

        context = page.locator(f'#fundingIntentContext[data-funding-intent="{scenario["intent"]}"]')
        require(context.count() == 1 and context.is_visible(), f"{case_id}: destination funding context missing")
        actual = set(filter(None, (context.get_attribute("data-need-context") or "").split(",")))
        require(actual == scenario["need_context"], f"{case_id}: destination need context mismatch: {actual}")
        if scenario["need_copy"]:
            require(scenario["need_copy"] in context.inner_text(), f"{case_id}: localized preserved-need copy missing")
        else:
            require(context.locator('[data-preserved-needs="true"]').count() == 0, f"{case_id}: near-miss fabricated a preserved need")

        if scenario["essential_ack"]:
            action = context.locator('[data-funding-continuity-action="continue"]')
            require(action.count() == 1, f"{case_id}: student continuation action missing")
            action.click()
            confirmation = page.locator('[data-essential-costs-confirmation="true"]')
            require(confirmation.count() == 1 and confirmation.is_visible(), f"{case_id}: essential-cost token was not consumed")
            require(scenario["essential_ack"] in confirmation.inner_text(), f"{case_id}: localized essential-cost confirmation missing")

        no_horizontal_overflow(page, case_id, "destination")
        require(not page_errors, f"{case_id}: JavaScript error(s) after handoff: {page_errors}")
        return {
            "id": case_id,
            "semantic_case": scenario["id"],
            "lang": scenario["lang"],
            "width": width,
            "status": "passed",
            "funding_intent": scenario["intent"],
            "need_context": sorted(scenario["need_context"]),
            "route": href,
        }
    finally:
        page.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("output", nargs="?", default="multilingual-need-browser-evidence.json")
    parser.add_argument("--engine", choices=("chromium", "webkit"), default=None)
    args = parser.parse_args()

    root = Path(args.root).resolve()
    require((root / "index.html").is_file(), f"index.html not found under {root}")
    engine_name = args.engine or os.environ.get("BROWSER_ENGINE", "chromium")

    with tempfile.TemporaryDirectory(prefix="stod-multilingual-need-") as tmp:
        site = Path(tmp) / "site"
        index_path = builder.build(root, site)
        evidence = {
            "engine": engine_name,
            "artifact": "minimal public pilot build",
            "artifact_transport": "loopback-http",
            "built_index_sha256": sha256(index_path),
            "privacy_routing_sha256": sha256(site / builder.SHELL_ROUTING_PATH),
            "funding_continuity_sha256": sha256(site / builder.FUNDING_INTENT_CONTINUITY_PATH),
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
                            evidence["results"].append(run_case(browser, base_url, scenario, width))
                            evidence["passed"] += 1
                        except Exception as exc:
                            evidence["failed"] += 1
                            evidence["results"].append({
                                "id": f"{scenario['id']}-{width}",
                                "semantic_case": scenario["id"],
                                "lang": scenario["lang"],
                                "width": width,
                                "status": "failed",
                                "error": str(exc),
                            })
            finally:
                browser.close()

    Path(args.output).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"multilingual bounded need browser ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
    if evidence["failed"]:
        for result in evidence["results"]:
            if result["status"] == "failed":
                print(f"FAIL {result['id']}: {result['error']}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
