#!/usr/bin/env python3
"""Arabic association-member correction regression on the shared actor harness.

Scenario-only extension of the existing Stödassistenten actor-correction browser test.
It does not implement routing or matching logic.
"""

from __future__ import annotations

import test_actor_correction_company_browser as base


EXTRA_SCENARIOS = [
    {
        "id": "ar-stale-association-member-corrected-to-student",
        "lang": "ar",
        "width": 390,
        "actor_type": "association",
        "text": "لست عضوًا في جمعية، أنا طالب الآن وأبحث عن منحة دراسية.",
        "expect_question": False,
        "expect_actor": "study",
        "reject_actor": "association",
        "expect_intent": "scholarship",
        "expect_rtl": True,
    },
    {
        "id": "ar-stale-association-member-negated-without-replacement-asks-once",
        "lang": "ar",
        "width": 1280,
        "actor_type": "association",
        "text": "لست عضوًا في جمعية وأبحث عن تمويل.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-current-association-member-context-remains",
        "lang": "ar",
        "width": 768,
        "actor_type": "association",
        "text": "أنا عضو في جمعية وأبحث عن تمويل.",
        "expect_question": False,
        "expect_actor": "association",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
]

base.SCENARIOS.extend(EXTRA_SCENARIOS)


if __name__ == "__main__":
    raise SystemExit(base.main())
