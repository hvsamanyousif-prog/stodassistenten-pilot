#!/usr/bin/env python3
"""Focused browser regression for simultaneous Persian current-role wording.

Adds only bounded scenario data and reuses the existing Stödassistenten actor-correction
browser harness. This is test evidence, not a separate routing implementation.
"""

from __future__ import annotations

import test_actor_correction_company_browser as base


EXTRA_SCENARIOS = [
    {
        "id": "fa-shaghel-student-generic-funding-asks-once-mobile",
        "lang": "fa",
        "width": 390,
        "text": "من شاغل و دانشجو هستم و به کمک مالی نیاز دارم.",
        "expect_question": True,
        "question_token": "درخواست",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-shaghel-student-generic-funding-asks-once-desktop",
        "lang": "fa",
        "width": 1280,
        "text": "من شاغل و دانشجو هستم و به کمک مالی نیاز دارم.",
        "expect_question": True,
        "question_token": "درخواست",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-karmand-student-generic-funding-control",
        "lang": "fa",
        "width": 768,
        "text": "من کارمند و دانشجو هستم و به کمک مالی نیاز دارم.",
        "expect_question": True,
        "question_token": "درخواست",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-shaghel-explicit-work-target-control",
        "lang": "fa",
        "width": 1024,
        "text": "من شاغل هستم و برای کارم کمک مالی می‌خواهم.",
        "expect_question": False,
        "expect_actor": "employee",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
]

base.SCENARIOS.extend(EXTRA_SCENARIOS)


if __name__ == "__main__":
    raise SystemExit(base.main())
