#!/usr/bin/env python3
"""Persian plural owned-company target polarity regressions.

This file adds only scenario data. It reuses the existing Stödassistenten
actor-correction browser harness, build and assertions.
"""

from __future__ import annotations

import test_actor_correction_company_browser as base


PLURAL_COMPANY_TARGET_SCENARIOS = [
    {
        "id": "fa-company-plural-target-positive",
        "lang": "fa",
        "width": 390,
        "text": "برای شرکت ما دنبال کمک مالی هستیم.",
        "expect_question": False,
        "expect_actor": "company",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-company-plural-target-excluded-asks-once",
        "lang": "fa",
        "width": 768,
        "text": "دنبال کمک مالی هستیم، اما نه برای شرکت ما.",
        "expect_question": True,
        "question_token": "چه کسی",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-company-plural-target-excluded-student-wins",
        "lang": "fa",
        "width": 1024,
        "text": "دنبال کمک مالی هستم، اما نه برای شرکت ما. من دانشجو هستم.",
        "expect_question": False,
        "expect_actor": "study",
        "reject_actor": "company",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
]


def main() -> int:
    base.SCENARIOS[:] = PLURAL_COMPANY_TARGET_SCENARIOS
    return base.main()


if __name__ == "__main__":
    raise SystemExit(main())
