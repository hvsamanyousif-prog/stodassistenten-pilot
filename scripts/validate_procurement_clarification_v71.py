#!/usr/bin/env python3
"""Fail-closed v71 guard for procurement clarification and post-submission repair.

This extends the same company pilot and canonical learning system. Generic process
help never overrides the current procurement documents, published Q&A or addenda.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"

scenario_paths = [EVAL / "scenario_lab_v01.json", *sorted(EVAL.glob("scenario_lab_websignals*.json"))]
cases = {}
for path in scenario_paths:
    pack = json.loads(path.read_text(encoding="utf-8"))
    for case in pack.get("cases", []):
        cid = case["case_id"]
        assert cid not in cases, f"duplicate scenario id: {cid}"
        cases[cid] = case

locks = {
    "lab-company-procurement-unclear-mandatory-requirement-v71-01": {
        "expected_support_areas": ["official_procurement_qna_before_deadline", "mandatory_requirement_clarification_boundary"],
        "must_not_claim": [
            "ambiguity_means_the_mandatory_requirement_can_be_ignored",
            "a_private_answer_outside_the_official_channel_controls_the_procurement",
            "post_deadline_correction_is_guaranteed",
        ],
        "expected_next_actions": [
            "use_the_official_qna_channel_in_the_current_procurement_documents_as_early_as_possible",
            "monitor_published_answers_and_addenda_before_submission",
            "if_the_requirement_still_cannot_be_met_or_evidenced_treat_it_as_a_bid_gap_instead_of_overclaiming",
        ],
    },
    "lab-company-procurement-postsubmission-missing-evidence-v71-02": {
        "expected_support_areas": ["post_submission_correction_clarification_boundary", "mandatory_requirement_fail_closed"],
        "must_not_claim": [
            "a_supplier_can_always_add_missing_mandatory_evidence_after_the_deadline",
            "the_product_can_decide_that_a_correction_or_supplement_is_legally_allowed_in_this_procurement",
            "the_buyer_must_request_a_supplement",
        ],
        "expected_next_actions": [
            "treat_post_submission_correction_clarification_or_supplementation_as_conditional_and_buyer_assessed",
            "do_not_rely_on_post_deadline_repair_as_a_bid_strategy",
        ],
    },
    "lab-company-procurement-qna-addendum-controls-v71-03": {
        "expected_support_areas": ["published_qna_and_addendum_monitoring", "latest_controlling_procurement_information"],
        "must_not_claim": [
            "the_original_interpretation_always_controls_after_an_official_change",
            "published_qna_can_be_ignored",
            "generic_stodassistenten_guidance_overrides_the_current_procurement_documents",
        ],
        "expected_next_actions": [
            "recheck_the_current_procurement_documents_published_qna_and_addenda_before_submission",
            "update_the_requirement_evidence_deadline_checklist_to_the_latest_controlling_public_information",
        ],
    },
}

for cid, fields in locks.items():
    assert cid in cases, f"v71 regression missing from canonical lab: {cid}"
    case = cases[cid]
    assert case["actor_type"] == "company", f"{cid}: must stay in shared company actor"
    assert case["source_requirements"], f"{cid}: source requirements missing"
    for field, tokens in fields.items():
        for token in tokens:
            assert token in case[field], f"{cid}: missing locked {field} token {token}"

signal_pack = json.loads((EVAL / "demand_friction_signals_v40.json").read_text(encoding="utf-8"))
assert "not measured search volumes" in signal_pack["purpose"].lower()
assert len(signal_pack["signals"]) == 1
signal = signal_pack["signals"][0]
assert signal["signal_id"] == "df-procurement-clarification-before-submission-v01"
assert signal["priority_band"] == "HIGH"
for key in ["demand_signal", "friction_signal", "miss_consequence", "current_product_coverage_gap"]:
    assert signal[key]["score"] >= 4, f"v71 signal unexpectedly weak: {key}"
assert any("fragor-och-svar-vid-upphandling" in url for url in signal["primary_sources"])
assert any("rattelse-fortydligande-och-komplettering" in url for url in signal["primary_sources"])
truth = signal["truth_rule"].lower()
assert "verify" in truth
assert "specific procurement" in truth
assert "not" in truth and "guaranteed" in truth

mapping_pack = json.loads((EVAL / "demand_friction_regression_map_v34.json").read_text(encoding="utf-8"))
assert len(mapping_pack["mappings"]) == 1
mapping = mapping_pack["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert mapping["regression_case_ids"] == list(locks)
assert "same company pilot" in mapping["fix_or_guardrail"].lower()
assert "no new generic question" in mapping["fix_or_guardrail"].lower()
assert "post-deadline" in mapping["fix_or_guardrail"].lower()

company_suite = json.loads((EVAL / "company_pilot_scenarios.json").read_text(encoding="utf-8"))
company_cases = {c["id"]: c for c in company_suite["cases"]}
case = company_cases["procurement-clarify-before-deadline-not-after"]
for marker in [
    "Frågor och svar",
    "upphandlingsverktyget",
    "förutsätt inte att en missad obligatorisk uppgift kan kompletteras efter sista anbudsdag",
    "Rättelse, förtydligande och komplettering",
]:
    assert marker in case["must_include"], f"company scenario missing v71 marker: {marker}"
assert company_suite["ui_contract"]["procurement_question_steps"] == 6
assert company_suite["ui_contract"]["free_text_description_required"] is False

html = (ROOT / "company-pilot.html").read_text(encoding="utf-8")
for marker in [
    "Oklart krav före sista anbudsdag",
    "Frågor och svar i upphandlingsverktyget",
    "publicerade frågor, svar och rättelser/tillägg",
    "förutsätt inte att en missad obligatorisk uppgift kan kompletteras efter sista anbudsdag",
    "Rättelse, förtydligande och komplettering är villkorat",
    "fragor-och-svar-vid-upphandling",
    "rattelse-fortydligande-och-komplettering",
]:
    assert marker in html, f"company product missing v71 clarification marker: {marker}"
assert "Lämna inte ett anbud om ett obligatoriskt krav inte kan styrkas; markera i stället luckan för nästa affär." not in html
for forbidden in [
    "det går alltid att komplettera efter sista anbudsdag",
    "ring upphandlaren privat",
    "ett oklart krav behöver inte uppfyllas",
]:
    assert forbidden not in html.lower(), f"unsafe procurement wording present: {forbidden}"
assert "const APP_VERSION='0.6.1'" in html

print(
    f"v71 procurement clarification: OK ({len(cases)} canonical scenarios; "
    "same company pilot keeps 6-question contract; official Q&A + post-deadline fail-closed boundary locked)"
)
