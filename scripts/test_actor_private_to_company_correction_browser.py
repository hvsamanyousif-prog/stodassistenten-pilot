#!/usr/bin/env python3
"""Bounded browser regression for correcting a private-person target to a company.

Reuses the existing actor-correction browser harness. This file contains scenario
oracles only; it does not implement routing logic.
"""

from __future__ import annotations

import test_actor_correction_company_browser as base


SCENARIOS = [
    {
        "id": "ar-clean-start-non-private-company-target",
        "lang": "ar",
        "width": 390,
        "text": "هذا الطلب ليس لفرد، بل لشركتي. أبحث عن دعم مالي.",
        "expect_question": False,
        "expect_actor": "company",
        "reject_actor": "private",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "ar-stale-private-corrected-to-company-target",
        "lang": "ar",
        "width": 1280,
        "actor_type": "private_person",
        "text": "هذا الطلب ليس لفرد، بل لشركتي. أبحث عن دعم مالي.",
        "expect_question": False,
        "expect_actor": "company",
        "reject_actor": "private",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-clean-start-non-private-company-target",
        "lang": "fa",
        "width": 390,
        "text": "این درخواست شخصی نیست؛ شرکت من به کمک مالی نیاز دارد.",
        "expect_question": False,
        "expect_actor": "company",
        "reject_actor": "private",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
    {
        "id": "fa-stale-private-corrected-to-company-target",
        "lang": "fa",
        "width": 1280,
        "actor_type": "private_person",
        "text": "این درخواست شخصی نیست؛ شرکت من به کمک مالی نیاز دارد.",
        "expect_question": False,
        "expect_actor": "company",
        "reject_actor": "private",
        "expect_intent": "funding",
        "expect_rtl": True,
    },
]


def main() -> int:
    base.SCENARIOS[:] = SCENARIOS
    return base.main()


if __name__ == "__main__":
    raise SystemExit(main())
