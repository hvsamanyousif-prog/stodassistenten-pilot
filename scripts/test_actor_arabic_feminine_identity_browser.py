#!/usr/bin/env python3
"""Arabic feminine current-role regressions on the existing actor-correction harness.

This file contains scenario data only. It reuses the same Stödassistenten public build,
browser assertions and routing runtime from test_actor_correction_company_browser.
"""

from __future__ import annotations

import test_actor_correction_company_browser as base


EXTRA_SCENARIOS = [
    {
        "id": "ar-feminine-student-overrides-stale-company",
        "lang": "ar",
        "width": 390,
        "actor_type": "company",
        "text": "أنا طالبة الآن وأبحث عن منحة دراسية.",
        "expect_question": False,
        "expect_actor": "study",
        "reject_actor": "company",
        "expect_intent": "scholarship",
        "expect_rtl": True,
    },
    {
        "id": "ar-feminine-student-clean-start",
        "lang": "ar",
        "width": 1280,
        "text": "أنا طالبة الآن وأبحث عن منحة دراسية.",
        "expect_question": False,
        "expect_actor": "study",
        "expect_intent": "scholarship",
        "expect_rtl": True,
    },
    {
        "id": "ar-feminine-employee-overrides-stale-company",
        "lang": "ar",
        "width": 390,
        "actor_type": "company",
        "text": "أنا موظفة الآن وأبحث عن دعم مالي.",
        "expect_question": False,
        "expect_actor": "employee",
        "reject_actor": "company",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-feminine-employee-clean-start",
        "lang": "ar",
        "width": 1280,
        "text": "أنا موظفة الآن وأبحث عن دعم مالي.",
        "expect_question": False,
        "expect_actor": "employee",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-third-party-daughter-student-does-not-become-self-study",
        "lang": "ar",
        "width": 768,
        "text": "ابنتي طالبة الآن. أبحث عن دعم مالي.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-third-party-sister-employee-does-not-become-self-employee",
        "lang": "ar",
        "width": 1024,
        "text": "أختي موظفة الآن. أبحث عن دعم مالي.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-feminine-company-owner-no-longer-rejects-stale-company",
        "lang": "ar",
        "width": 390,
        "actor_type": "company",
        "text": "لم أعد صاحبة شركة وأبحث عن تمويل.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-feminine-company-owner-not-rejects-stale-company",
        "lang": "ar",
        "width": 1280,
        "actor_type": "company",
        "text": "لست صاحبة شركة وأبحث عن تمويل.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-feminine-company-owner-overrides-stale-study",
        "lang": "ar",
        "width": 390,
        "actor_type": "study",
        "text": "أنا صاحبة شركة وأبحث عن تمويل.",
        "expect_question": False,
        "expect_actor": "company",
        "reject_actor": "study",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-feminine-company-owner-clean-start",
        "lang": "ar",
        "width": 1280,
        "text": "أنا صاحبة شركة وأبحث عن تمويل.",
        "expect_question": False,
        "expect_actor": "company",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-masculine-company-owner-control",
        "lang": "ar",
        "width": 768,
        "actor_type": "study",
        "text": "أنا صاحب شركة وأبحث عن تمويل.",
        "expect_question": False,
        "expect_actor": "company",
        "reject_actor": "study",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-third-party-sister-company-owner-does-not-become-self-company",
        "lang": "ar",
        "width": 1024,
        "text": "أختي صاحبة شركة. أبحث عن دعم مالي.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
]

base.SCENARIOS.extend(EXTRA_SCENARIOS)


if __name__ == "__main__":
    raise SystemExit(base.main())
