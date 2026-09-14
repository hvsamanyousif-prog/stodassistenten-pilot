#!/usr/bin/env python3
"""Semantic guard for the work-injury dental-cost learning loop.

This is a product-learning/release guard, not an eligibility engine or a new
truth source. It keeps the single review-gated support record, qualitative
discovery signals, same-shell focus and permanent synthetic regressions aligned.
"""
import json
from pathlib import Path
import subprocess
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
SUPPORT = ROOT / "data" / "supports" / "se-forsakringskassan-arbetsskada-tandvard.json"
MODULE = ROOT / "client" / "work-injury-dental.js"
BUILDER = ROOT / "scripts" / "build_public_pilot.py"

support = json.loads(SUPPORT.read_text(encoding="utf-8"))
scenario_v26 = json.loads((EVAL / "scenario_lab_websignals_v26.json").read_text(encoding="utf-8"))
scenario_v27 = json.loads((EVAL / "scenario_lab_websignals_v27.json").read_text(encoding="utf-8"))
signals_v13 = json.loads((EVAL / "demand_friction_signals_v13.json").read_text(encoding="utf-8"))
signals_v14 = json.loads((EVAL / "demand_friction_signals_v14.json").read_text(encoding="utf-8"))
mapping_v07 = json.loads((EVAL / "demand_friction_regression_map_v07.json").read_text(encoding="utf-8"))
mapping_v08 = json.loads((EVAL / "demand_friction_regression_map_v08.json").read_text(encoding="utf-8"))
module = MODULE.read_text(encoding="utf-8")
builder = BUILDER.read_text(encoding="utf-8")

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

assert len(scenario_v26["cases"]) == 1
case_v26 = scenario_v26["cases"][0]
assert case_v26["case_id"] == "lab-employee-work-injury-dental-cost-v26-01"
for token in [
    "work_injury_dental_cost_reimbursement_candidate",
    "reference_price_boundary",
    "collective_agreement_insurance_kept_separate",
]:
    assert token in case_v26["expected_support_areas"], f"missing v26 support-area lock: {token}"
for token in [
    "a_workplace_incident_report_or_employer_report_automatically_proves_an_approved_work_injury",
    "every_dental_bill_after_a_work_injury_is_reimbursed_in_full",
    "afa_work_injury_insurance_applies_to_every_worker_or_requires_union_membership",
    "forsakringskassan_dental_cost_reimbursement_and_afa_compensation_are_the_same_decision",
    "the_raw_injury_story_employer_identity_exact_cost_or_health_details_should_be_put_in_the_handoff_url_or_feedback",
]:
    assert token in case_v26["must_not_claim"], f"missing v26 safety lock: {token}"
for token in [
    "q_did_injury_or_disease_arise_due_to_work_or_commute",
    "q_is_dental_treatment_necessary_due_to_that_work_injury",
    "q_is_cost_evidence_available_and_is_dentist_connected_to_forsakringskassan",
]:
    assert token in case_v26["expected_questions"], f"missing v26 information-gain question: {token}"

assert len(scenario_v27["cases"]) == 2
by_id = {case["case_id"]: case for case in scenario_v27["cases"]}
route_case = by_id["lab-employee-work-injury-dental-natural-route-v27-01"]
traffic_case = by_id["lab-employee-commute-traffic-dental-split-v27-02"]
for token in [
    "natural_language_route_to_same_person_module",
    "privacy_safe_coarse_handoff",
    "information_gain_question_order",
]:
    assert token in route_case["expected_support_areas"], f"missing v27 route lock: {token}"
for token in [
    "dental_words_plus_employment_without_an_injury_signal_are_enough_to_force_work_injury_routing",
    "the_raw_injury_story_employer_identity_exact_cost_or_health_details_should_be_put_in_the_handoff_url_or_feedback",
]:
    assert token in route_case["must_not_claim"], f"missing v27 privacy/routing lock: {token}"
for token in [
    "q_where_did_injury_occur_work_commute_other_or_unsure",
    "q_is_dental_treatment_necessary_due_to_that_injury",
    "q_is_cost_evidence_available_and_is_dentist_connected_to_forsakringskassan",
]:
    assert token in route_case["expected_questions"], f"missing v27 route question: {token}"
for token in [
    "afa_commute_traffic_exception",
    "traffic_insurance_separate_route",
    "forsakringskassan_dental_cost_route_kept_separate",
]:
    assert token in traffic_case["expected_support_areas"], f"missing commute traffic support lock: {token}"
for token in [
    "afa_collective_agreement_work_injury_insurance_covers_a_commute_traffic_accident_unchanged",
    "traffic_insurance_and_forsakringskassan_work_injury_dental_reimbursement_are_the_same_decision",
    "the_product_can_guess_which_vehicle_insurer_is_responsible_without_current_case_specific_information",
]:
    assert token in traffic_case["must_not_claim"], f"missing commute traffic safety lock: {token}"
assert "q_if_commute_was_event_a_traffic_accident" in traffic_case["expected_questions"]

assert len(signals_v13["signals"]) == 1
signal_v13 = signals_v13["signals"][0]
assert signal_v13["signal_id"] == "df-work-injury-dental-cost-v01"
assert signal_v13["priority_band"] == "HIGH"
assert "not measured search volume" in signals_v13["scoring"]["priority_rule"]
assert all("reddit.com" in u for u in signal_v13["discovery_sources"])
assert all("reddit.com" not in u for u in signal_v13["primary_sources"])
assert any("forsakringskassan.se" in u for u in signal_v13["primary_sources"])
assert any("afaforsakring.se" in u for u in signal_v13["primary_sources"])
assert "discovery" in signal_v13["truth_rule"].lower()
assert "verified" in signal_v13["truth_rule"].lower()

assert len(signals_v14["signals"]) == 1
signal_v14 = signals_v14["signals"][0]
assert signal_v14["signal_id"] == "df-commute-traffic-work-injury-dental-split-v01"
assert signal_v14["priority_band"] == "HIGH"
assert "not measured search volume" in signals_v14["scoring"]["priority_rule"]
assert all("reddit.com" in u for u in signal_v14["discovery_sources"])
assert all("reddit.com" not in u for u in signal_v14["primary_sources"])
assert any("forsakringskassan.se" in u for u in signal_v14["primary_sources"])
assert any("afaforsakring.se" in u for u in signal_v14["primary_sources"])
assert "discovery" in signal_v14["truth_rule"].lower()
assert "verify" in signal_v14["truth_rule"].lower()

assert len(mapping_v07["mappings"]) == 1
entry_v07 = mapping_v07["mappings"][0]
assert entry_v07["signal_id"] == signal_v13["signal_id"]
assert entry_v07["regression_case_ids"] == [case_v26["case_id"]]
assert "incident reporting is not benefit approval" in entry_v07["fix_or_guardrail"].lower()
assert "separate assessment" in entry_v07["fix_or_guardrail"].lower()

assert len(mapping_v08["mappings"]) == 1
entry_v08 = mapping_v08["mappings"][0]
assert entry_v08["signal_id"] == signal_v14["signal_id"]
assert entry_v08["regression_case_ids"] == [route_case["case_id"], traffic_case["case_id"]]
assert "same-shell" in entry_v08["fix_or_guardrail"].lower()
assert "traffic insurance" in entry_v08["fix_or_guardrail"].lower()
assert "without guessing" in entry_v08["fix_or_guardrail"].lower()

syntax = subprocess.run(["node", "--check", str(MODULE)], capture_output=True, text=True, check=False)
assert syntax.returncode == 0, syntax.stderr or syntax.stdout
assert "focus=work_injury_dental" in module
assert "actor_type=employee&focus=work_injury_dental&lang=" in module
assert "data-stod-work-injury-dental" in module
assert "workInjuryDentalGuidance" in module
assert "På väg till eller från jobbet" in module
assert "Var händelsen på arbetsresan en trafikolycka?" in module
assert "inte gäller vid trafikolycksfall" in module
assert "försäkringskassan" in module.lower() and "afaforsakring.se" in module.lower()
assert "fetch(" not in module and "XMLHttpRequest" not in module and "localStorage" not in module and "sessionStorage" not in module
assert "exact cost" not in module.lower()
assert "sv: {" in module and "ar: {" in module and "fa: {" in module
assert "WORK_INJURY_DENTAL_PATH = \"client/work-injury-dental.js\"" in builder
shell_runtime = builder.split("SHELL_RUNTIME_PATHS = (", 1)[1].split(")", 1)[0]
script_runtime = builder.split("SCRIPT_PATHS = (", 1)[1].split(")", 1)[0]
assert "WORK_INJURY_DENTAL_PATH" in shell_runtime
assert "WORK_INJURY_DENTAL_PATH" in script_runtime

print("work-injury dental v26-v27: OK (truth review-gated; same-shell route; commute traffic split locked)")
