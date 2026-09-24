#!/usr/bin/env python3
"""Holdout browser regressions for assistance source truth and direct-result routing.

This reuses the registered assistance browser harness and keeps two bounded
families under test:
1. `Vet inte / vill börja brett` must keep both adult and child source paths
   reachable when the user describes basic assistance needs.
2. If the user instead says the help is mainly *other* everyday help, the
   journey must not ask the now-irrelevant weekly extent question and the
   municipal next action must be backed by the municipal/LSS authority source,
   not by a Försäkringskassan assistansersättning source.

These are browser/source-journey checks only. They do not determine
eligibility, prove persistence, human comprehension or physical-device use.
"""

from __future__ import annotations

import test_assistance_focus_source_boundary_browser as base


MUNICIPAL_LSS_SOURCE = "https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1993387-om-stod-och-service-till-vissa_sfs-1993-387/"


base.CASES = [
    {
        "id": "sv-unsure-who-source-boundary",
        "lang": "sv",
        "who": "Vet inte / vill börja brett",
        "need": "Ja – hygien, toalett, måltider, på- och avklädning, kommunikation, andning eller stöd som behövs löpande under större delen av dygnet på grund av ett medicinskt tillstånd som innebär fara för liv eller överhängande allvarlig risk för fysisk hälsa",
        "extent": "Kan vara mer än 20 timmar för grundläggande behov",
        "sources": (base.ADULT_SOURCE, base.CHILD_SOURCE),
        "tokens": ("LSS", "vuxen", "barn", "inte fastställt"),
    },
    {
        "id": "ar-unsure-who-source-boundary",
        "lang": "ar",
        "who": "لا أعرف / أريد البدء بشكل عام",
        "need": "نعم – النظافة أو المرحاض أو الوجبات أو اللباس أو التواصل أو التنفس، أو دعم يلزم بصورة متواصلة خلال معظم اليوم بسبب حالة طبية تنطوي على خطر على الحياة أو خطر وشيك وخطير على الصحة الجسدية",
        "extent": "قد تتجاوز 20 ساعة للاحتياجات الأساسية",
        "sources": (base.ADULT_SOURCE, base.CHILD_SOURCE),
        "tokens": ("LSS", "بالغ", "طفل", "لم يحدد"),
    },
    {
        "id": "fa-unsure-who-source-boundary",
        "lang": "fa",
        "who": "نمی‌دانم / گسترده شروع می‌کنم",
        "need": "بله – بهداشت، توالت، غذا، لباس، ارتباط، تنفس، یا حمایتی که به‌طور پیوسته در بیشتر ساعات شبانه‌روز به دلیل یک وضعیت پزشکی لازم است که خطر جانی یا خطر قریب‌الوقوع و جدی برای سلامت جسمی ایجاد می‌کند",
        "extent": "ممکن است بیش از ۲۰ ساعت برای نیازهای اساسی باشد",
        "sources": (base.ADULT_SOURCE, base.CHILD_SOURCE),
        "tokens": ("LSS", "بزرگسال", "کودک", "مشخص نکرده"),
    },
    {
        "id": "sv-other-help-adult-source-role",
        "lang": "sv",
        "who": "En vuxen",
        "need": "Nej – främst annan hjälp i vardagen",
        "skip_extent": True,
        "extent_prompt": "Ungefär hur omfattande tror du hjälpen är under en vanlig vecka?",
        "result_token": "Börja med kommunen och reda ut vilken stödform som passar",
    },
    {
        "id": "sv-other-help-child-source-role",
        "lang": "sv",
        "who": "Ett barn",
        "need": "Nej – främst annan hjälp i vardagen",
        "skip_extent": True,
        "extent_prompt": "Ungefär hur omfattande tror du hjälpen är under en vanlig vecka?",
        "result_token": "Börja med kommunen och reda ut vilken stödform som passar",
    },
    {
        "id": "sv-other-help-unsure-source-role",
        "lang": "sv",
        "who": "Vet inte / vill börja brett",
        "need": "Nej – främst annan hjälp i vardagen",
        "skip_extent": True,
        "extent_prompt": "Ungefär hur omfattande tror du hjälpen är under en vanlig vecka?",
        "result_token": "Börja med kommunen och reda ut vilken stödform som passar",
    },
    {
        "id": "ar-other-help-adult-source-role",
        "lang": "ar",
        "who": "شخص بالغ",
        "need": "لا – أساساً مساعدة أخرى في الحياة اليومية",
        "skip_extent": True,
        "extent_prompt": "تقريباً ما حجم المساعدة في أسبوع عادي؟",
        "result_token": "ابدأ بالبلدية وحدد نوع الدعم المناسب",
    },
    {
        "id": "ar-other-help-child-source-role",
        "lang": "ar",
        "who": "طفل",
        "need": "لا – أساساً مساعدة أخرى في الحياة اليومية",
        "skip_extent": True,
        "extent_prompt": "تقريباً ما حجم المساعدة في أسبوع عادي؟",
        "result_token": "ابدأ بالبلدية وحدد نوع الدعم المناسب",
    },
    {
        "id": "ar-other-help-unsure-source-role",
        "lang": "ar",
        "who": "لا أعرف / أريد البدء بشكل عام",
        "need": "لا – أساساً مساعدة أخرى في الحياة اليومية",
        "skip_extent": True,
        "extent_prompt": "تقريباً ما حجم المساعدة في أسبوع عادي؟",
        "result_token": "ابدأ بالبلدية وحدد نوع الدعم المناسب",
    },
    {
        "id": "fa-other-help-adult-source-role",
        "lang": "fa",
        "who": "یک بزرگسال",
        "need": "نه – بیشتر کمک دیگری در زندگی روزمره است",
        "skip_extent": True,
        "extent_prompt": "تقریباً کمک در یک هفته معمولی چقدر است؟",
        "result_token": "از شهرداری شروع کن و نوع حمایت مناسب را روشن کن",
    },
    {
        "id": "fa-other-help-child-source-role",
        "lang": "fa",
        "who": "یک کودک",
        "need": "نه – بیشتر کمک دیگری در زندگی روزمره است",
        "skip_extent": True,
        "extent_prompt": "تقریباً کمک در یک هفته معمولی چقدر است؟",
        "result_token": "از شهرداری شروع کن و نوع حمایت مناسب را روشن کن",
    },
    {
        "id": "fa-other-help-unsure-source-role",
        "lang": "fa",
        "who": "نمی‌دانم / گسترده شروع می‌کنم",
        "need": "نه – بیشتر کمک دیگری در زندگی روزمره است",
        "skip_extent": True,
        "extent_prompt": "تقریباً کمک در یک هفته معمولی چقدر است؟",
        "result_token": "از شهرداری شروع کن و نوع حمایت مناسب را روشن کن",
    },
]


_original_run_case = base.run_case


def run_case(browser, base_url: str, case: dict, width: int) -> dict:
    if case.get("skip_extent"):
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
            page.get_by_role("button", name=case["need"], exact=True).click()
            base.require(not page_errors, f"{case['id']}@{width}: JavaScript errors: {page_errors}")
            text = page.locator("body").inner_text()
            base.require(
                case["extent_prompt"] not in text,
                f"{case['id']}@{width}: irrelevant weekly-extent question still rendered",
            )
            base.require(
                case["result_token"] in text,
                f"{case['id']}@{width}: broad municipal next step not rendered directly",
            )
            base.require(
                page.locator(f'a[href="{MUNICIPAL_LSS_SOURCE}"]').count() >= 1,
                f"{case['id']}@{width}: municipal/LSS authority source missing",
            )
            for fk_source in (base.ADULT_SOURCE, base.CHILD_SOURCE):
                base.require(
                    page.locator(f'a[href="{fk_source}"]').count() == 0,
                    f"{case['id']}@{width}: Försäkringskassan assistansersättning source still controls broad municipal result",
                )
            base.require(
                page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"),
                f"{case['id']}@{width}: horizontal overflow",
            )
            return {
                "id": case["id"],
                "width": width,
                "status": "passed",
                "path": "other-help-direct-result",
                "source": MUNICIPAL_LSS_SOURCE,
            }
        finally:
            page.close()

    first_source_case = dict(case)
    first_source_case["source"] = case["sources"][0]
    result = _original_run_case(browser, base_url, first_source_case, width)

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
        page.get_by_role("button", name=case["need"], exact=True).click()
        page.get_by_role("button", name=case["extent"], exact=True).click()
        base.require(not page_errors, f"{case['id']}@{width}: JavaScript errors: {page_errors}")
        for source_url in case["sources"]:
            base.require(
                page.locator(f'a[href="{source_url}"]').count() >= 1,
                f"{case['id']}@{width}: target-specific source missing: {source_url}",
            )
        text = page.locator("body").inner_text()
        for token in case["tokens"]:
            base.require(token in text, f"{case['id']}@{width}: missing unsure-source token {token!r}")
        base.require(
            page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"),
            f"{case['id']}@{width}: horizontal overflow",
        )
        result["sources"] = list(case["sources"])
        return result
    finally:
        page.close()


base.run_case = run_case


if __name__ == "__main__":
    raise SystemExit(base.main())
