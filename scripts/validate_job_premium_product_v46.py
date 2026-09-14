#!/usr/bin/env python3
"""Validate v46 public job-premium routing against the shared truth/learning boundaries."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLIENT = ROOT / "client" / "job-premium-guidance.js"
TEST = ROOT / "client" / "job-premium-guidance.test.cjs"
BUILD = ROOT / "scripts" / "build_public_pilot.py"
SUPPORT = ROOT / "data" / "supports" / "se-forsakringskassan-jobbpremie.json"
V45 = ROOT / "data" / "evals" / "scenario_lab_websignals_v45.json"
V46 = ROOT / "data" / "evals" / "scenario_lab_websignals_v46.json"
MAPPING = ROOT / "data" / "evals" / "demand_friction_regression_map_v23.json"

for path in [CLIENT, TEST, BUILD, SUPPORT, V45, V46, MAPPING]:
    assert path.exists(), f"missing v46 asset: {path.relative_to(ROOT)}"

client = CLIENT.read_text(encoding="utf-8")
test = TEST.read_text(encoding="utf-8")
build = BUILD.read_text(encoding="utf-8")
support = json.loads(SUPPORT.read_text(encoding="utf-8"))
v45 = json.loads(V45.read_text(encoding="utf-8"))
v46 = json.loads(V46.read_text(encoding="utf-8"))
mapping_pack = json.loads(MAPPING.read_text(encoding="utf-8"))

# Truth remains conservative: public discovery cannot self-promote material fields.
assert support["support_id"] == "se-forsakringskassan-jobbpremie"
assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["material_fields_verified"] == []

v45_ids = {case["case_id"] for case in v45["cases"]}
assert {
    "lab-private-social-assistance-to-work-job-premium-v45-01",
    "lab-private-job-premium-qualification-or-deadline-fail-closed-v45-02",
} <= v45_ids
v46_cases = {case["case_id"]: case for case in v46["cases"]}
assert set(v46_cases) == {
    "lab-private-job-premium-natural-language-public-route-v46-01",
    "lab-private-job-premium-vs-job-stimulation-v46-02",
}

route = v46_cases["lab-private-job-premium-natural-language-public-route-v46-01"]
for token in [
    "natural_language_match_proves_job_premium_eligibility",
    "the_public_route_can_calculate_or_guarantee_amount_payment_or_deadline",
    "raw_salary_employer_municipality_household_identity_or_social_assistance_story_should_be_put_in_handoff_urls_or_feedback",
]:
    assert token in route["must_not_claim"]
for token in [
    "q_received_social_assistance_every_month_july_through_december_2025",
    "q_received_employment_income_in_the_month_being_checked",
    "q_did_applicant_or_any_household_member_receive_social_assistance_in_that_month",
]:
    assert token in route["expected_questions"]

split = v46_cases["lab-private-job-premium-vs-job-stimulation-v46-02"]
for token in [
    "job_premium_and_job_stimulation_are_the_same_scheme",
    "the_product_can_tell_the_user_to_stop_social_assistance_in_order_to_create_job_premium_eligibility",
]:
    assert token in split["must_not_claim"]
assert "keep_job_premium_with_forsakringskassan_and_job_stimulation_with_the_municipal_social_assistance_context" in split["expected_next_actions"]

for url in [
    "https://www.forsakringskassan.se/privatperson/jobbpremie",
    "https://www.socialstyrelsen.se/kunskapsstod-och-regler/omraden/ekonomiskt-bistand/ekonomiskt-bistand-for-privatpersoner/jobbpremien--for-privatpersoner/",
]:
    assert url in client, f"current primary route missing: {url}"

for token in [
    "focus=job_premium",
    "actor_type=private_person",
    "flow:'job_premium'",
    "detect",
    "nextStep",
    "separate_job_stimulation",
]:
    assert token in client, f"shared v46 route contract missing: {token}"

# Public route must not become an amount/deadline calculator or leak personal case data.
for forbidden in [
    "3 750",
    "3750",
    "15 procent",
    "18 månader",
    "salary=",
    "employer=",
    "municipality=",
    "household=",
    "story=",
    "situation=",
]:
    assert forbidden not in client, f"public route crossed truth/privacy boundary: {forbidden}"

for language in ["sv", "ar", "fa"]:
    assert f"{language}:" in client
assert "ratings:{route:'job_premium'}" in client
assert "JOB_PREMIUM_GUIDANCE_PATH = \"client/job-premium-guidance.js\"" in build
assert build.count("JOB_PREMIUM_GUIDANCE_PATH,") >= 2, "job-premium guidance must ship to shell and person surface"
assert "job-premium-guidance.test.cjs" in test or "job premium guidance" in test.lower()

mapping = mapping_pack["mappings"][0]
assert mapping["signal_id"] == "df-job-premium-assistance-to-work-transition-v01"
assert set(mapping["regression_case_ids"]) == v45_ids | set(v46_cases)
assert mapping["coverage_status"] == "GUARDED_PUBLIC_ROUTE_READY_TRUTH_REMAINS_REVIEW_GATED"
assert "NEEDS_REVIEW" in mapping["truth_guardrail"]
assert "job stimulation" in mapping["fix_or_guardrail"].lower()

print("job premium v46: OK (same product, guarded public route, jobbstimulans split, truth review-gated)")
