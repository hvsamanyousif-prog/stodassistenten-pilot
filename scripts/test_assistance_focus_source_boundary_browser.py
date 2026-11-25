#!/usr/bin/env python3
"""Browser regression for primary-source boundaries in the shared assistance journey.

The test starts from the built person journey reached by the shared start-page
assistance route and verifies that a Försäkringskassan path exposes material
source conditions that this three-question pilot has not established. It also
checks that the human-facing positive choice does not widen the medically
continuous basic-need category before the source boundary: sv/ar/fa must keep
both the continuous-most-of-day condition and the serious life/physical-health
risk condition visible before the user chooses that branch.

The same built-site regression also protects a bounded problem-first route for
the LSS 9 a § harm-prevention basic-need family. A natural-language need to
prevent physical harm, when paired with psychological-disability context, must
reach the existing disability/assistance path without requiring the user to
know the support name. An explicit denial of that harm risk must not become
positive statutory evidence and must leave a separately stated structure need
route-authoritative. Generic fear/safety wording without disability context
must not be auto-routed to statutory assistance. Only a coarse route signal may
cross the start-page handoff; the raw story must not be put in the URL.

It does not determine eligibility, persist a case, or claim physical-device
proof.
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
SOCIALSTYRELSEN_SOURCE = "https://www.socialstyrelsen.se/statistik-och-data/statistik/alla-statistikamnen/socialtjanstinsatser-till-personer-med-funktionsnedsattning/"

CASES = [
    {
        "id": "sv-adult-source-boundary",
        "lang": "sv",
        "who": "En vuxen",
        "positive_prefix": "Ja –",
        "need_facts": ("större delen av dygnet", "fara för liv", "allvarlig risk", "fysisk hälsa"),
        "extent": "Kan vara mer än 20 timmar för grundläggande behov",
        "source": ADULT_SOURCE,
        "tokens": ("LSS", "bo i Sverige", "66 år eller yngre", "inte fastställt"),
    },
    {
        "id": "sv-child-source-boundary",
        "lang": "sv",
        "who": "Ett barn",
        "positive_prefix": "Ja –",
        "need_facts": ("större delen av dygnet", "fara för liv", "allvarlig risk", "fysisk hälsa"),
        "extent": "Kan vara mer än 20 timmar för grundläggande behov",
        "source": CHILD_SOURCE,
        "tokens": ("LSS", "barnet ska bo i Sverige", "föräldraavdrag", "0–17"),
    },
    {
        "id": "ar-adult-source-boundary",
        "lang": "ar",
        "who": "شخص بالغ",
        "positive_prefix": "نعم –",
        "need_facts": ("معظم اليوم", "خطر على الحياة", "خطير", "الصحة الجسدية"),
        "extent": "قد تتجاوز 20 ساعة للاحتياجات الأساسية",
        "source": ADULT_SOURCE,
        "tokens": ("LSS", "تقيم في السويد", "66", "لم يتحقق"),
    },
    {
        "id": "ar-child-source-boundary",
        "lang": "ar",
        "who": "طفل",
        "positive_prefix": "نعم –",
        "need_facts": ("معظم اليوم", "خطر على الحياة", "خطير", "الصحة الجسدية"),
        "extent": "قد تتجاوز 20 ساعة للاحتياجات الأساسية",
        "source": CHILD_SOURCE,
        "tokens": ("LSS", "الطفل يقيم في السويد", "foräldraavdrag", "0 إلى 17"),
    },
    {
        "id": "fa-adult-source-boundary",
        "lang": "fa",
        "who": "یک بزرگسال",
        "positive_prefix": "بله –",
        "need_facts": ("بیشتر ساعات شبانه‌روز", "خطر جانی", "جدی", "سلامت جسمی"),
        "extent": "ممکن است بیش از ۲۰ ساعت برای نیازهای اساسی باشد",
        "source": ADULT_SOURCE,
        "tokens": ("LSS", "در سوئد زندگی", "۶۶ سال یا کمتر", "احراز نکرده"),
    },
    {
        "id": "fa-child-source-boundary",
        "lang": "fa",
        "who": "یک کودک",
        "positive_prefix": "بله –",
        "need_facts": ("بیشتر ساعات شبانه‌روز", "خطر جانی", "جدی", "سلامت جسمی"),
        "extent": "ممکن است بیش از ۲۰ ساعت برای نیازهای اساسی باشد",
        "source": CHILD_SOURCE,
        "tokens": ("LSS", "کودک در سوئد زندگی", "foräldraavdrag", "۰ تا ۱۷"),
    },
]

START_ROUTE_CASES = [
    {
        "id": "sv-harm-prevention-disability-route",
        "lang": "sv",
        "text": "På grund av min psykiska funktionsnedsättning behöver jag hjälp för att inte skada mig själv eller andra. Jag vet inte vad stödet heter.",
        "should_route": True,
        "expected_need": "personal_assistance",
        "source": ADULT_SOURCE,
    },
    {
        "id": "ar-harm-prevention-disability-route",
        "lang": "ar",
        "text": "بسبب إعاقتي النفسية أحتاج إلى مساعدة حتى لا أؤذي نفسي أو الآخرين. لا أعرف اسم الدعم.",
        "should_route": True,
        "expected_need": "personal_assistance",
        "source": ADULT_SOURCE,
    },
    {
        "id": "fa-harm-prevention-disability-route",
        "lang": "fa",
        "text": "به دلیل معلولیت روانی‌ام به کمک نیاز دارم تا به خودم یا دیگران آسیب نزنم. اسم این حمایت را نمی‌دانم.",
        "should_route": True,
        "expected_need": "personal_assistance",
        "source": ADULT_SOURCE,
    },
    {
        "id": "sv-denied-harm-keeps-structure-route",
        "lang": "sv",
        "text": "Jag har psykisk funktionsnedsättning men det finns ingen risk för fysisk skada. Jag behöver bara hjälp att planera vardagen.",
        "should_route": True,
        "expected_need": "structure",
        "source": SOCIALSTYRELSEN_SOURCE,
    },
    {
        "id": "ar-denied-harm-keeps-structure-route",
        "lang": "ar",
        "text": "لدي إعاقة نفسية لكن لا يوجد خطر ضرر جسدي. أحتاج فقط إلى مساعدة في تنظيم حياتي اليومية.",
        "should_route": True,
        "expected_need": "structure",
        "source": SOCIALSTYRELSEN_SOURCE,
    },
    {
        "id": "fa-denied-harm-keeps-structure-route",
        "lang": "fa",
        "text": "معلولیت روانی دارم اما هیچ خطری برای آسیب به خودم وجود ندارد. فقط برای برنامه‌ریزی زندگی روزمره به کمک نیاز دارم.",
        "should_route": True,
        "expected_need": "structure",
        "source": SOCIALSTYRELSEN_SOURCE,
    },
    {
        "id": "sv-generic-safety-no-statutory-route",
        "lang": "sv",
        "text": "Jag är rädd att jag kan skada mig själv eller andra och behöver hjälp.",
        "should_route": False,
    },
    {
        "id": "ar-generic-safety-no-statutory-route",
        "lang": "ar",
        "text": "أخاف أن أؤذي نفسي أو الآخرين وأحتاج إلى مساعدة.",
        "should_route": False,
    },
    {
        "id": "fa-generic-safety-no-statutory-route",
        "lang": "fa",
        "text": "می‌ترسم به خودم یا دیگران آسیب بزنم و کمک می‌خواهم.",
        "should_route": False,
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
    page.set_default_timeout(5000)
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        page.goto(
            f"{base_url}/person-pilot.html?actor_type=private_person&focus=assistance&lang={case['lang']}",
            wait_until="load",
        )
        page.get_by_role("button", name=case["who"], exact=True).click()

        if "positive_prefix" in case:
            positive = page.get_by_role("button").filter(has_text=case["positive_prefix"])
            require(positive.count() == 1, f"{case['id']}@{width}: expected one positive basic-needs choice")
            positive_text = positive.inner_text()
            for fact in case.get("need_facts", ()):
                require(fact in positive_text, f"{case['id']}@{width}: medical basic-need fact missing before branch: {fact!r}")
            positive.click()
        else:
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
        result = {
            "id": case["id"],
            "width": width,
            "status": "passed",
            "source": case["source"],
        }
        if case.get("need_facts"):
            result["medical_need_facts"] = list(case["need_facts"])
        return result
    finally:
        page.close()


def run_start_route_case(browser, base_url: str, case: dict, width: int) -> dict:
    page = browser.new_page(viewport={"width": width, "height": 900})
    page.set_default_timeout(5000)
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    try:
        page.goto(f"{base_url}/index.html?lang={case['lang']}", wait_until="load")
        page.locator("#situation").fill(case["text"])
        page.locator("#analyzeBtn").click()
        page.wait_for_timeout(100)
        require(not page_errors, f"{case['id']}@{width}: JavaScript errors: {page_errors}")
        route = page.locator('[data-disability-home-support-route="true"]')
        if not case["should_route"]:
            require(route.count() == 0, f"{case['id']}@{width}: generic safety text was auto-routed to statutory assistance")
            return {"id": case["id"], "width": width, "status": "passed", "route": "absent"}

        expected_need = case["expected_need"]
        require(route.count() == 1, f"{case['id']}@{width}: bounded disability route missing")
        href = route.get_attribute("href") or ""
        require("focus=disability_home_support" in href, f"{case['id']}@{width}: wrong focus in route")
        require(f"support_need={expected_need}" in href, f"{case['id']}@{width}: expected coarse need signal {expected_need!r} missing")
        for forbidden in ("q=", "story=", "situation=", "diagnosis=", "personnummer=", "address=", "hours="):
            require(forbidden not in href, f"{case['id']}@{width}: raw/sensitive story field leaked into route: {forbidden}")
        route.click()
        page.wait_for_url("**/person-pilot.html?**", wait_until="load")
        body = page.locator("body").inner_text()
        require("garanter" not in body.lower(), f"{case['id']}@{width}: guarantee language rendered")
        source = case.get("source")
        if source:
            require(page.locator(f'a[href="{source}"]').count() >= 1, f"{case['id']}@{width}: expected primary source missing")
        require(
            page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"),
            f"{case['id']}@{width}: horizontal overflow",
        )
        return {"id": case["id"], "width": width, "status": "passed", "route": href, "expected_need": expected_need}
    finally:
        page.close()


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", ".")).resolve()
    output = Path(os.environ.get("EVIDENCE_PATH", "assistance-source-boundary-evidence.json"))
    engine_name = os.environ.get("BROWSER_ENGINE", "chromium")
    require((root / "index.html").is_file(), f"index.html not found under {root}")

    expected = (len(CASES) + len(START_ROUTE_CASES)) * len(WIDTHS)
    evidence = {
        "engine": engine_name,
        "independent_semantic_cases": len(CASES) + len(START_ROUTE_CASES),
        "widths": list(WIDTHS),
        "expected_checks": expected,
        "executed": 0,
        "passed": 0,
        "failed": 0,
        "results": [],
        "claim_boundary": "browser/source-boundary and bounded problem-first routing only; not eligibility, persistence, human comprehension, or physical-device evidence",
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
                for case in START_ROUTE_CASES:
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