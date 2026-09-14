#!/usr/bin/env python3
"""Permanent semantic locks for the newest Stödassistenten learned regressions.

The canonical all-pack validator already loads every scenario pack dynamically.
This guard prevents the newest safety lessons from being present by case-id only
while their actual semantics drift. It is part of the same scenario laboratory,
not a separate matcher or truth source.
"""
import json
from pathlib import Path

EVAL = Path(__file__).resolve().parents[1] / "data" / "evals"
paths = [EVAL / "scenario_lab_v01.json", *sorted(EVAL.glob("scenario_lab_websignals*.json"))]
cases = {}
for path in paths:
    pack = json.loads(path.read_text(encoding="utf-8"))
    for case in pack.get("cases", []):
        cid = case["case_id"]
        if cid in cases:
            raise AssertionError(f"duplicate scenario id: {cid}")
        cases[cid] = case

assert len(cases) >= 64, f"expected at least 64 cases after v21, got {len(cases)}"

locks = {
    "lab-young-post-study-no-job-v20-01": {
        "expected_support_areas": ["first_unemployed_day", "unemployment_insurance_separate_assessment"],
        "must_not_claim": [
            "registration_with_arbetsformedlingen_automatically_grants_a_kassa",
            "the_raw_situation_text_should_be_put_in_the_handoff_url_or_feedback",
        ],
        "expected_next_actions": [
            "if_unemployed_submit_arbetsformedlingen_registration_on_the_first_unemployed_day",
            "if_seeking_unemployment_compensation_apply_separately_to_the_relevant_a_kassa_after_registration",
        ],
    },
    "lab-relative-severe-illness-care-v21-01": {
        "expected_support_areas": [
            "near_relative_benefit_candidate",
            "life_threatening_condition_boundary",
            "foregone_work_or_replacement_benefit",
        ],
        "must_not_claim": [
            "family_relationship_alone_guarantees_near_relative_benefit",
            "ordinary_age_related_help_need_qualifies_for_near_relative_benefit",
            "the_product_can_decide_eligibility_or_amount_without_forsakringskassan_assessment",
            "the_raw_situation_text_should_be_put_in_the_handoff_url_or_feedback",
        ],
        "expected_next_actions": [
            "ask_healthcare_about_the_required_medical_statement_before_assuming_the_support_applies",
            "do_not_promote_the_existing_near_relative_support_record_from_needs_review_to_verified",
        ],
    },
}

for cid, fields in locks.items():
    assert cid in cases, f"new learned regression missing from canonical lab: {cid}"
    case = cases[cid]
    for field, tokens in fields.items():
        for token in tokens:
            assert token in case[field], f"{cid}: missing locked {field} token {token}"

print(f"recent learning memory: OK ({len(cases)} canonical scenarios; v20-v21 semantics locked)")
