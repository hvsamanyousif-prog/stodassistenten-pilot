#!/usr/bin/env python3
"""Browser regression for primary-source boundaries in the shared assistance journey.

The test verifies that a user who reaches the Försäkringskassan path is shown
material source conditions that this three-question pilot has not established.
It does not determine eligibility, persist a case, or claim physical-device proof.
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


ADULT_SOURCE = "https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-vuxna"
CHILD_SOURCE = "https://www.forsakringskassan.se/privatperson/vuxen-med-funktionsnedsattning/assistansersattning/assistansersattning-for-barn"

CASES = [
    {
        "id": "sv-adult-source-boundary",
        "lang": "sv",
        "who": "En vuxen",
        "need": "Ja – hygien, toalett, måltider, på- och avklädning, kommunikation, andning eller löpande medicinskt stöd",
        "extent": "Kan vara mer än 20 timmar för grundläggande behov",
        "source": ADULT_SOURCE,
        "tokens": ("LSS", "bo i Sverige", "66 år eller yngre", "inte fastställt"),
    },
    {
        "id": "sv-child-source-boundary",
        "lang": "sv",
        "who": "Ett barn",
        "need": "Ja – hygien, toalett, måltider, på- och avklädning, kommunikation, andning eller löpande medicinskt stöd",
        "extent": "Kan vara mer än 20 timmar för grundläggande behov",
        "source": CHILD_SOURCE,
        "tokens": ("LSS", "barnet ska bo i Sverige", "föräldraavdrag", "0–17"),
    },
    {
        "id": "ar-adult-source-boundary",
        "lang": "ar",
        "who": "شخص بالغ",
        "need": "نعم – النظافة أو المرحاض أو الوجبات أو اللباس أو التواصل أو التنفس أو دعم طبي مستمر",
        "extent": "قد تتجاوز 20 ساعة للاحتياجات الأساسية",
        "source": ADULT_SOURCE,
        "tokens": ("LSS", "تقيم في السويد", "66", "لم يتحقق"),
    },
    {
        "id": "ar-child-source-boundary",
        "lang": "ar",
        "who": "طفل",
        "need": "نعم – النظافة أو المرحاض أو الوجبات أو اللباس أو التواصل أو التنفس أو دعم طبي مستمر",
        "extent": "قد تتجاوز 20 ساعة للاحتياجات الأساسية",
        "source": CHILD_SOURCE,
        "tokens": ("LSS", "الطفل يقيم في السويد", "foräldraavdrag", "0 إلى 17"),
    },
    {
        "id": "fa-adult-source-boundary",
        "lang": "fa",
        "who": "یک بزرگسال",
        "need": "بله – بهداشت، توالت، غذا، لباس، ارتباط، تنفس یا حمایت پزشکی مستمر",
        "extent": "ممکن است بیش از ۲۰ ساعت برای نیازهای اساسی باشد",
        "source": ADULT_SOURCE,
        "tokens": ("LSS", "در سوئد زندگی", "۶۶ سال یا کمتر", "احراز نکرده"),
    },
    {
        "id": "fa-child-source-boundary",
        "lang": "fa",
        "who": "یک کودک",
        "need": "بله – بهداشت، توالت، غذا، لباس، ارتباط، تنفس یا حمایت پزشکی مستمر",
        "extent": "ممکن است بیش از ۲۰ ساعت برای نیازهای اساسی باشد",
        "source": CHILD_SOURCE,
        "tokens": ("LSS", "کودک در سوئد زندگی", "foräldraavdrag", "۰ تا ۱۷"),
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
        page.goto(f"{base_url}/index.html?lang={case['lang']}&focus=assistance", wait_until="load")
        page.get_by_role("button", name=case["who"], exact=True).click()
        page.get_by_role("button", name=case["need"], exact=True).click()
        page.get_by_role("button", name=case["extent"], exact=True).click()

        require(not page_errors, f"{case['id']}@{width}: JavaScript errors: {page_errors}")
        source = page.locator(f'a[href="{case["source"]}"]')
        require(source.count() >= 1, f"{case['id']}@{width}: controlling source link missing")
        text = page.locator("body").inner_text()
        for token in case["tokens"]:
            require(token in text, f"{case['id']}@{width}: missing source-boundary token {token!r}")
        lowered = text.lower()
        require("garanter" not in lowered, f"{case['id']}@{width}: guarantee language rendered")
        require(
            page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"),
            f"{case['id']}@{width}: horizontal overflow",
        )
        return {"id": case["id"], "width": width, "status": "passed", "source": case["source"]}
    finally:
        page.close()


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", ".")).resolve()
    output = Path(os.environ.get("EVIDENCE_PATH", "assistance-source-boundary-evidence.json"))
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
        "claim_boundary": "browser/source-boundary only; not eligibility, persistence, human comprehension, or physical-device evidence",
    }

    with tempfile.TemporaryDirectory(prefix="stod-assistance-source-boundary-") as tmp:
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
    print(f"assistance source boundary ({engine_name}): {evidence['passed']} passed / {evidence['failed']} failed")
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
