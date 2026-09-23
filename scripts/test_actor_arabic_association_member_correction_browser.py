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
    {
        "id": "sv-current-association-self-positive",
        "lang": "sv",
        "width": 390,
        "text": "Jag är med i föreningen och söker bidrag.",
        "expect_question": False,
        "expect_actor": "association",
        "expect_intent": "funding",
    },
    {
        "id": "ar-current-association-self-positive",
        "lang": "ar",
        "width": 768,
        "text": "أنا عضو في جمعية وأبحث عن تمويل.",
        "expect_question": False,
        "expect_actor": "association",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-current-association-self-positive",
        "lang": "fa",
        "width": 1280,
        "text": "من عضو انجمن هستم و به کمک مالی نیاز دارم.",
        "expect_question": False,
        "expect_actor": "association",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "sv-third-party-association-membership-asks-once",
        "lang": "sv",
        "width": 1280,
        "text": "Min syster är med i föreningen och jag söker bidrag.",
        "expect_question": True,
        "question_token": "vem",
        "expect_intent": "funding",
    },
    {
        "id": "ar-third-party-association-membership-asks-once",
        "lang": "ar",
        "width": 390,
        "text": "أختي عضوة في جمعية وأنا أبحث عن تمويل.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-third-party-association-membership-asks-once",
        "lang": "fa",
        "width": 768,
        "text": "خواهرم عضو انجمن است و من به کمک مالی نیاز دارم.",
        "expect_question": True,
        "question_token": "درخواست",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "sv-mixed-self-and-third-party-association-keeps-self-role",
        "lang": "sv",
        "width": 390,
        "text": "Min syster är medlem i föreningen. Jag är också medlem i föreningen och söker bidrag.",
        "expect_question": False,
        "expect_actor": "association",
        "expect_intent": "funding",
    },
    {
        "id": "ar-mixed-self-and-third-party-association-keeps-self-role",
        "lang": "ar",
        "width": 768,
        "text": "أختي عضوة في جمعية وأنا أيضًا عضوة في الجمعية وأبحث عن تمويل.",
        "expect_question": False,
        "expect_actor": "association",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-mixed-self-and-third-party-association-keeps-self-role",
        "lang": "fa",
        "width": 1280,
        "text": "خواهرم عضو انجمن است و من هم عضو انجمن هستم و به کمک مالی نیاز دارم.",
        "expect_question": False,
        "expect_actor": "association",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
]

base.SCENARIOS.extend(EXTRA_SCENARIOS)


if __name__ == "__main__":
    raise SystemExit(base.main())
