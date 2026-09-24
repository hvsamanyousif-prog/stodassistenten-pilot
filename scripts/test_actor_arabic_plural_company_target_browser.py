#!/usr/bin/env python3
"""Arabic plural owned-company target polarity regressions.

This file adds only scenario data. It reuses the existing Stödassistenten
actor-correction browser harness, build and assertions.
"""

from __future__ import annotations

import test_actor_correction_company_browser as base


PLURAL_COMPANY_TARGET_SCENARIOS = [
    {
        "id": "ar-company-plural-target-positive",
        "lang": "ar",
        "width": 390,
        "text": "أبحث عن دعم مالي لشركتنا.",
        "expect_question": False,
        "expect_actor": "company",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-company-plural-target-excluded-asks-once",
        "lang": "ar",
        "width": 768,
        "text": "أبحث عن دعم مالي، لكن ليس لشركتنا.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-company-plural-target-excluded-student-wins",
        "lang": "ar",
        "width": 1024,
        "text": "أبحث عن دعم مالي، لكن ليس لشركتنا. أنا طالب.",
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
