#!/usr/bin/env python3
"""Bounded browser regression for existing-loan repayment vs current loan intent.

This reuses the shared funding/concrete-need browser harness. It proves only that
Arabic and Persian language variants can distinguish an already-existing loan
that is being repaid from a current request to search for a new loan, while
preserving a concrete housing need. It does not prove eligibility, credit advice,
physical-device behavior, or persisted feedback.
"""

from __future__ import annotations

import test_funding_concrete_need_boundary_browser as base


base.CASES = [
    {
        "id": "ar-existing-loan-repayment-is-not-current-loan-intent",
        "lang": "ar",
        "text": "لدي قرض وأسدد القرض الآن. لدي إيجار مرتفع.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_need": "need_context=housing",
        "reject_intent": "funding_intent=",
    },
    {
        "id": "fa-existing-loan-repayment-is-not-current-loan-intent",
        "lang": "fa",
        "text": "وام دارم و در حال بازپرداخت آن هستم. اجاره سنگین دارم.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_need": "need_context=housing",
        "reject_intent": "funding_intent=",
    },
    {
        "id": "ar-current-loan-search-remains-current-loan-intent",
        "lang": "ar",
        "text": "أبحث عن قرض. لدي إيجار مرتفع.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_need": "need_context=housing",
        "expect_intent": "funding_intent=loan",
    },
    {
        "id": "fa-current-loan-search-remains-current-loan-intent",
        "lang": "fa",
        "text": "دنبال وام هستم. اجاره سنگین دارم.",
        "expect_question": False,
        "expect_first": "actor_type=private_person",
        "expect_need": "need_context=housing",
        "expect_intent": "funding_intent=loan",
    },
]


if __name__ == "__main__":
    raise SystemExit(base.main())
