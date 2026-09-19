#!/usr/bin/env python3
"""Focused positive support-target regressions for actor resolution.

Reuses the existing Stödassistenten actor-correction browser harness and routing
runtime. This adds scenario data only; it is not a separate matcher or eval engine.
"""

from __future__ import annotations

import test_actor_correction_company_browser as base


SCENARIOS = [
    {
        "id": "sv-stale-company-positive-study-target-wins",
        "lang": "sv",
        "width": 390,
        "actor_type": "company",
        "text": "Jag söker stipendium för mina studier.",
        "expect_question": False,
        "expect_actor": "study",
        "reject_actor": "company",
        "expect_intent": "scholarship",
    },
    {
        "id": "ar-stale-company-positive-study-target-wins",
        "lang": "ar",
        "width": 768,
        "actor_type": "company",
        "text": "أبحث عن منحة دراسية لدراستي.",
        "expect_question": False,
        "expect_actor": "study",
        "reject_actor": "company",
        "expect_intent": "scholarship",
        "expect_rtl": True,
    },
    {
        "id": "fa-stale-company-positive-study-target-wins",
        "lang": "fa",
        "width": 1024,
        "actor_type": "company",
        "text": "برای تحصیلم بورسیه می‌خواهم.",
        "expect_question": False,
        "expect_actor": "study",
        "reject_actor": "company",
        "expect_intent": "scholarship",
        "expect_rtl": True,
    },
    {
        "id": "sv-clean-positive-study-target-routes",
        "lang": "sv",
        "width": 1280,
        "text": "Jag söker stipendium för mina studier.",
        "expect_question": False,
        "expect_actor": "study",
        "expect_intent": "scholarship",
    },
    {
        "id": "ar-clean-positive-study-target-routes",
        "lang": "ar",
        "width": 390,
        "text": "أبحث عن منحة دراسية لدراستي.",
        "expect_question": False,
        "expect_actor": "study",
        "expect_intent": "scholarship",
        "expect_rtl": True,
    },
    {
        "id": "fa-clean-positive-study-target-routes",
        "lang": "fa",
        "width": 768,
        "text": "برای تحصیلم بورسیه می‌خواهم.",
        "expect_question": False,
        "expect_actor": "study",
        "expect_intent": "scholarship",
        "expect_rtl": True,
    },
    {
        "id": "sv-stale-association-positive-employee-target-wins",
        "lang": "sv",
        "width": 1024,
        "actor_type": "association",
        "text": "Jag söker bidrag för mitt jobb.",
        "expect_question": False,
        "expect_actor": "employee",
        "reject_actor": "association",
        "expect_intent": "funding",
    },
    {
        "id": "ar-stale-association-positive-employee-target-wins",
        "lang": "ar",
        "width": 1280,
        "actor_type": "association",
        "text": "أبحث عن دعم مالي لعملي.",
        "expect_question": False,
        "expect_actor": "employee",
        "reject_actor": "association",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-stale-association-positive-employee-target-wins",
        "lang": "fa",
        "width": 390,
        "actor_type": "association",
        "text": "برای کارم کمک مالی می‌خواهم.",
        "expect_question": False,
        "expect_actor": "employee",
        "reject_actor": "association",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "sv-clean-positive-employee-target-routes",
        "lang": "sv",
        "width": 768,
        "text": "Jag söker bidrag för mitt jobb.",
        "expect_question": False,
        "expect_actor": "employee",
        "expect_intent": "funding",
    },
    {
        "id": "ar-clean-positive-employee-target-routes",
        "lang": "ar",
        "width": 1024,
        "text": "أبحث عن دعم مالي لعملي.",
        "expect_question": False,
        "expect_actor": "employee",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-clean-positive-employee-target-routes",
        "lang": "fa",
        "width": 1280,
        "text": "برای کارم کمک مالی می‌خواهم.",
        "expect_question": False,
        "expect_actor": "employee",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "sv-stale-company-generic-scholarship-preserves-company",
        "lang": "sv",
        "width": 390,
        "actor_type": "company",
        "text": "Jag söker stipendium.",
        "expect_question": False,
        "expect_actor": "company",
        "expect_intent": "scholarship",
    },
    {
        "id": "sv-stale-association-generic-funding-preserves-association",
        "lang": "sv",
        "width": 768,
        "actor_type": "association",
        "text": "Jag söker bidrag.",
        "expect_question": False,
        "expect_actor": "association",
        "expect_intent": "funding",
    },
]

base.SCENARIOS[:] = SCENARIOS


if __name__ == "__main__":
    raise SystemExit(base.main())
