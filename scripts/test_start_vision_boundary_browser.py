#!/usr/bin/env python3
"""Browser regression for bounded vision routing on the shared Stödassistenten start page.

This verifies route ranking/near-miss behavior in the built public pilot only. It does
not claim support eligibility, model quality, persistence, or physical-device evidence.
"""

from __future__ import annotations

import json
import os
import tempfile
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

import build_public_pilot as builder
from playwright.sync_api import sync_playwright


CASES = [
    {
        "id": "family-extra-supervision",
        "text": "Mitt barn behöver extra tillsyn i vardagen.",
        "expect_first": "actor_type=relative&focus=family",
        "reject": "quick-help.html?mode=vision",
    },
    {
        "id": "family-extra-supervision-adhd",
        "text": "Mitt barn behöver extra tillsyn på grund av ADHD.",
        "expect_first": "actor_type=relative&focus=family",
        "reject": "quick-help.html?mode=vision",
    },
    {
        "id": "vision-positive",
        "text": "Jag har en synnedsättning och behöver hjälpmedel.",
        "expect_first": "quick-help.html?mode=vision",
    },
    {
        "id": "synpunkt-is-not-vision",
        "text": "Jag har en synpunkt på jobbet.",
        "expect_first": "actor_type=employee",
        "reject": "quick-help.html?mode=vision",
    },
    {
        "id": "hansyn-is-not-vision",
        "text": "Jag behöver stöd på jobbet med hänsyn till arbetstider.",
        "expect_first": "actor_type=employee",
        "reject": "quick-help.html?mode=vision",
    },
]

WIDTHS = (390, 1280)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


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


def run_case(browser, base_url: str, case: dict, width: int) -> dict:
    page = browser.new_page(viewport={"width": width, "height": 900})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        page.goto(f"{base_url}/index.html?lang=sv", wait_until="load")
        page.locator("#situation").fill(case["text"])
        page.locator("#analyzeBtn").click()
        results = page.locator("#engineResults")
        require(results.is_visible(), f"{case['id']}@{width}: results not visible")
        require(not page_errors, f"{case['id']}@{width}: JavaScript errors: {page_errors}")

        links = results.locator("a.route")
        require(links.count() >= 1, f"{case['id']}@{width}: no route rendered")
        hrefs = links.evaluate_all("els => els.map(el => el.getAttribute('href') || '')")
        first_href = hrefs[0]
        require(case["expect_first"] in first_href, f"{case['id']}@{width}: first route {first_href!r} did not match {case['expect_first']!r}")
        if case.get("reject"):
            require(all(case["reject"] not in href for href in hrefs), f"{case['id']}@{width}: rejected vision route was rendered: {hrefs}")
        require(all(case["text"] not in href for href in hrefs), f"{case['id']}@{width}: raw situation leaked into URL")
        require(page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), f"{case['id']}@{width}: horizontal overflow")
        return {"id": case["id"], "width": width, "status": "passed", "first_href": first_href, "hrefs": hrefs}
    finally:
        page.close()


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", ".")).resolve()
    output = Path(os.environ.get("EVIDENCE_PATH", "start-vision-boundary-evidence.json"))
    engine_name = os.environ.get("BROWSER_ENGINE", "chromium")
    require((root / "index.html").is_file(), f"index.html not found under {root}")

    evidence = {
        "engine": engine_name,
        "independent_semantic_cases": len(CASES),
        "widths": list(WIDTHS),
        "expected_checks": len(CASES) * len(WIDTHS),
        "executed": 0,
        "passed": 0,
        "failed": 0,
        "results": [],
    }

    with tempfile.TemporaryDirectory(prefix="stod-vision-boundary-") as tmp:
        site = Path(tmp) / "site"
        builder.build(root, site)
        with serve_site(site) as base_url, sync_playwright() as playwright:
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
                            evidence["results"].append({"id": case["id"], "width": width, "status": "failed", "error": str(exc)})
            finally:
                browser.close()

    output.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"start vision boundary ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
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
