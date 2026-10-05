#!/usr/bin/env python3
"""Bounded participant-ownership regression for property-actor routing.

Reuses the existing actor-correction browser harness. These are synthetic
routing/privacy cases only; they do not assert eligibility or legal status.
"""
from __future__ import annotations

import test_actor_correction_company_browser as base

SCENARIOS = [
    {
        "id": "ar-third-party-brother-property-owner-asks-once",
        "lang": "ar",
        "width": 390,
        "text": "أخي مالك العقار وأنا أبحث عن تمويل.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "sv-third-party-brother-property-owner-asks-once",
        "lang": "sv",
        "width": 768,
        "text": "Min bror är fastighetsägare och jag söker bidrag.",
        "expect_question": True,
        "question_token": "vem",
        "expect_intent": "funding",
    },
    {
        "id": "ar-self-property-owner-positive-control",
        "lang": "ar",
        "width": 1024,
        "text": "أنا مالك العقار وأبحث عن تمويل.",
        "expect_question": False,
        "expect_actor": "property_actor",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-application-third-party-property-owner-stays-unknown",
        "lang": "ar",
        "width": 1280,
        "text": "طلبي رفضه مالك العقار وأحتاج إلى دعم مالي.",
        "expect_question": True,
        "question_token": "من",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
]

base.SCENARIOS = SCENARIOS

if __name__ == "__main__":
    raise SystemExit(base.main())
