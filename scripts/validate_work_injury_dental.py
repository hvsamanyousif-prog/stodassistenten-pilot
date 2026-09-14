#!/usr/bin/env python3
"""Semantic guard for the v26 work-injury dental-cost learning loop.

This is a product-learning/release guard, not an eligibility engine or a new
truth source. It keeps the single review-gated support record, qualitative
discovery signal and permanent synthetic regression aligned.
"""
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
SUPPORT = ROOT / "data" / "supports" / "se-forsakringskassan-arbetsskada-tandvard.json"

support = json.loads(SUPPORT.read_text(encoding="utf-8"))
scenario = json.loads((EVAL / "scenario_lab_websignals_v26.json").read_text(encoding="utf-8"))
signals = json.loads((EVAL / "demand_friction_signals_v13.json").read_text(encoding="utf-8"))
mapping = json.loads((EVAL / "demand_friction_regression_map_v07.json").read_text(encoding="utf-8"))

assert support["support_id"] == "se-forsakringskassan-arbetsskada-tandvard"
assert support["provider"]["name"] == "Försäkringskassan"
assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["last_verified_at"] is None
assert support["verification"]["material_fields_verified"] == []
assert urlparse(support["source"]["url"]).hostname == "www.forsakringskassan.se"
assert "referenspris" in support["benefit"]["amount_text"].lower()
assert "5002" in support["application"]["next_step"]
assert "kollektivavtalad" in support["application"]["next_step"].lower()

rules = {r["rule_id"]: r for r in support["eligibility"]["conditions"]}
for rule_id in {
    "wid.work_causation",
    "wid.treatment_necessary",
    "wid.cost_evidence",
    "wid.dentist_connected",
    "wid.insured_sweden",
}:
    assert rule_id in rules, f"missing support rule: {rule_id}"

assert len(scenario["cases"]) == 1
case = scenario["cases"][0]
assert case["case_id"] == "lab-employee-work-injury-dental-cost-v26-01"
for token in [
    "work_injury_dental_cost_reimbursement_candidate",
    "reference_price_boundary",
    "collective_agreement_insurance_kept_separate",
]:
    assert token in case["expected_support_areas"], f"missing support-area lock: {token}"
for token in [
    "a_workplace_incident_report_or_employer_report_automatically_proves_an_approved_work_injury",
    "every_dental_bill_after_a_work_injury_is_reimbursed_in_full",
    "afa_work_injury_insurance_applies_to_every_worker_or_requires_union_membership",
    "forsakringskassan_dental_cost_reimbursement_and_afa_compensation_are_the_same_decision",
    "the_raw_injury_story_employer_identity_exact_cost_or_health_details_should_be_put_in_the_handoff_url_or_feedback",
]:
    assert token in case["must_not_claim"], f"missing safety lock: {token}"
for token in [
    "q_did_injury_or_disease_arise_due_to_work_or_commute",
    "q_is_dental_treatment_necessary_due_to_that_work_injury",
    "q_is_cost_evidence_available_and_is_dentist_connected_to_forsakringskassan",
]:
    assert token in case["expected_questions"], f"missing information-gain question: {token}"

assert len(signals["signals"]) == 1
signal = signals["signals"][0]
assert signal["signal_id"] == "df-work-injury-dental-cost-v01"
assert signal["priority_band"] == "HIGH"
assert "not measured search volume" in signals["scoring"]["priority_rule"]
assert all("reddit.com" in u for u in signal["discovery_sources"])
assert all("reddit.com" not in u for u in signal["primary_sources"])
assert any("forsakringskassan.se" in u for u in signal["primary_sources"])
assert any("afaforsakring.se" in u for u in signal["primary_sources"])
assert "discovery" in signal["truth_rule"].lower()
assert "verified" in signal["truth_rule"].lower()

assert len(mapping["mappings"]) == 1
entry = mapping["mappings"][0]
assert entry["signal_id"] == signal["signal_id"]
assert entry["regression_case_ids"] == [case["case_id"]]
assert "incident reporting is not benefit approval" in entry["fix_or_guardrail"].lower()
assert "separate assessment" in entry["fix_or_guardrail"].lower()

print("work-injury dental costs v26: OK (truth review-gated; discovery separated; regression locked)")
