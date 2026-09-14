#!/usr/bin/env python3
"""Semantic memory extension for Stodassistenten v28-v29.

The common scenario lab dynamically loads all packs, while the older recent-memory
validator currently stops at v27. This guard closes that drift without creating a
new matcher or truth layer: v28 foundation discovery and v29 worker-context
boundaries remain part of the same canonical learning system.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
SUPPORT = ROOT / "data" / "supports" / "se-forsakringskassan-arbetsskada-tandvard.json"

paths = [EVAL / "scenario_lab_v01.json", *sorted(EVAL.glob("scenario_lab_websignals*.json"))]
cases = {}
for path in paths:
    pack = json.loads(path.read_text(encoding="utf-8"))
    for case in pack.get("cases", []):
        cid = case["case_id"]
        assert cid not in cases, f"duplicate scenario id: {cid}"
        cases[cid] = case

assert len(cases) >= 75, f"expected at least 75 canonical scenarios after v29, got {len(cases)}"

locks = {
    "lab-private-foundation-discovery-boundary-v28-01": {
        "expected_support_areas": ["foundation_registry_candidate_discovery", "current_application_state_verification"],
        "must_not_claim": [
            "registered_active_foundation_means_an_application_is_open_now",
            "foundation_purpose_text_alone_proves_user_eligibility",
            "board_member_auditor_or_signatory_details_should_be_republished_as_product_contact_data",
        ],
        "expected_next_actions": [
            "for_each_candidate_verify_current_application_documents_period_target_group_and_submission_route_with_the_foundation_primary_source",
        ],
    },
    "lab-association-foundation-open-window-v28-02": {
        "expected_support_areas": ["open_planned_expired_state_requires_primary_source", "privacy_safe_source_handling"],
        "must_not_claim": [
            "registry_presence_equals_active_funding_call",
            "purpose_similarity_equals_fit_or_eligibility",
            "an_old_application_page_proves_a_current_deadline",
        ],
        "expected_next_actions": [
            "mark_unknown_or_stale_application_state_for_review_instead_of_guessing_open",
        ],
    },
    "lab-self-employed-work-injury-dental-v29-01": {
        "expected_support_areas": [
            "work_injury_dental_cost_reimbursement_candidate",
            "self_employed_social_insurance_boundary",
            "afa_not_assumed_automatic",
            "business_or_private_insurance_kept_separate",
        ],
        "must_not_claim": [
            "self_employment_automatically_excludes_the_person_from_forsakringskassan_work_injury_dental_cost_route",
            "afa_collective_agreement_work_injury_insurance_applies_automatically_to_every_self_employed_person",
            "business_registration_f_tax_or_company_form_alone_proves_work_injury_or_insurance_coverage",
            "the_product_can_guarantee_full_dental_reimbursement_or_a_specific_amount",
        ],
        "expected_questions": [
            "q_did_injury_or_disease_arise_due_to_work_or_commute",
            "q_is_dental_treatment_necessary_due_to_that_work_injury",
            "q_is_cost_evidence_available_and_is_dentist_connected_to_forsakringskassan",
        ],
        "expected_next_actions": [
            "check_the_current_forsakringskassan_work_injury_dental_cost_route_without_inventing_an_employee_only_gate",
            "check_actual_business_or_private_accident_insurance_separately_without_assuming_afa_coverage",
        ],
    },
    "lab-invoiced-worker-work-injury-dental-v29-02": {
        "expected_support_areas": [
            "invoicing_company_employer_responsibility",
            "egenanstalld_vs_sole_trader_disambiguation",
            "insurance_routes_kept_separate",
        ],
        "must_not_claim": [
            "egenanstalld_via_an_invoicing_company_is_the_same_as_sole_trader_or_own_company",
            "the_client_that_bought_the_assignment_is_automatically_the_employer",
            "invoicing_company_employer_responsibility_automatically_proves_forsakringskassan_eligibility",
            "afa_coverage_is_guaranteed_only_because_an_invoicing_company_is_the_employer",
        ],
        "expected_questions": [
            "q_is_the_work_invoiced_through_an_invoicing_company_that_pays_salary",
            "q_did_the_injury_arise_during_the_work_assignment_or_commute",
        ],
        "expected_next_actions": [
            "treat_the_invoicing_company_as_the_employer_context_when_current_forsakringskassan_guidance_applies",
            "verify_actual_collective_agreement_or_insurance_coverage_instead_of_inferring_it_from_egenanstallning",
        ],
    },
}

for cid, fields in locks.items():
    assert cid in cases, f"learned regression missing from canonical lab: {cid}"
    case = cases[cid]
    for field, tokens in fields.items():
        for token in tokens:
            assert token in case[field], f"{cid}: missing locked {field} token {token}"

signal_pack = json.loads((EVAL / "demand_friction_signals_v16.json").read_text(encoding="utf-8"))
assert len(signal_pack["signals"]) == 1
signal = signal_pack["signals"][0]
assert signal["signal_id"] == "df-self-employed-work-injury-insurance-context-v01"
assert signal["priority_band"] == "HIGH"
assert "not measured search volume" in signal_pack["scoring"]["priority_rule"]
assert all("reddit.com" in url for url in signal["discovery_sources"])
assert all("reddit.com" not in url for url in signal["primary_sources"])
assert "discovery" in signal["truth_rule"].lower()
assert "verify" in signal["truth_rule"].lower()
assert any("forsakringskassan.se" in url for url in signal["primary_sources"])
assert any("verksamt.se" in url for url in signal["primary_sources"])
assert any("afaforsakring.se" in url for url in signal["primary_sources"])

mapping_pack = json.loads((EVAL / "demand_friction_regression_map_v10.json").read_text(encoding="utf-8"))
assert len(mapping_pack["mappings"]) == 1
mapping = mapping_pack["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert mapping["regression_case_ids"] == [
    "lab-self-employed-work-injury-dental-v29-01",
    "lab-invoiced-worker-work-injury-dental-v29-02",
]
assert "automatic afa" in mapping["fix_or_guardrail"].lower()
assert "employer context" in mapping["fix_or_guardrail"].lower()

support = json.loads(SUPPORT.read_text(encoding="utf-8"))
assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["material_fields_verified"] == []

print(f"latest learning memory: OK ({len(cases)} canonical scenarios; v28-v29 semantics locked; truth stays review-gated)")
