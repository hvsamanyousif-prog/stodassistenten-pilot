#!/usr/bin/env python3
"""Fail-closed v37 guard for bounded worker context in the shared work-injury dental route.

This validates product routing and synthetic learning memory only. It is not an
eligibility engine and cannot promote review-gated facts to VERIFIED.
"""
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
MODULE = ROOT / "client" / "work-injury-dental.js"
SUPPORT = ROOT / "data" / "supports" / "se-forsakringskassan-arbetsskada-tandvard.json"

scenarios = json.loads((EVAL / "scenario_lab_websignals_v37.json").read_text(encoding="utf-8"))
signals = json.loads((EVAL / "demand_friction_signals_v23.json").read_text(encoding="utf-8"))
mapping = json.loads((EVAL / "demand_friction_regression_map_v17.json").read_text(encoding="utf-8"))
support = json.loads(SUPPORT.read_text(encoding="utf-8"))
module = MODULE.read_text(encoding="utf-8")

assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["material_fields_verified"] == []

assert len(scenarios["cases"]) == 2
by_id = {case["case_id"]: case for case in scenarios["cases"]}
self_case = by_id["lab-self-employed-work-injury-dental-public-handoff-v37-01"]
invoiced_case = by_id["lab-invoiced-worker-work-injury-dental-public-handoff-v37-02"]

for token in [
    "same_public_work_injury_dental_route",
    "bounded_self_employed_handoff_context",
    "fora_agreement_information_gain_before_tfa_claim",
    "statutory_and_tfa_routes_kept_separate",
]:
    assert token in self_case["expected_support_areas"], f"missing self-employed support lock: {token}"
for token in [
    "every_self_employed_person_is_automatically_covered_by_tfa",
    "self_employed_people_are_always_excluded_from_tfa",
    "a_fora_agreement_or_tfa_coverage_proves_forsakringskassan_eligibility_or_full_reimbursement",
    "the_product_should_ask_for_company_name_contract_number_exact_cost_or_raw_injury_or_health_details_to_choose_the_next_step",
]:
    assert token in self_case["must_not_claim"], f"missing self-employed safety lock: {token}"
assert "q_does_the_business_have_a_current_fora_insurance_or_ground_agreement" in self_case["expected_questions"]

for token in [
    "bounded_invoiced_worker_handoff_context",
    "invoicing_company_employer_context",
    "collective_or_private_insurance_not_inferred_from_invoicing_arrangement",
]:
    assert token in invoiced_case["expected_support_areas"], f"missing invoiced-worker support lock: {token}"
for token in [
    "an_invoiced_worker_via_a_faktureringsforetag_is_the_same_as_a_sole_trader_or_business_owner",
    "the_assignment_client_is_automatically_the_employer",
    "the_invoicing_arrangement_itself_proves_tfa_afa_or_other_collective_insurance_coverage",
]:
    assert token in invoiced_case["must_not_claim"], f"missing invoiced-worker safety lock: {token}"

assert len(signals["signals"]) == 1
signal = signals["signals"][0]
assert signal["signal_id"] == "df-work-injury-worker-context-v01"
assert signal["priority_band"] == "HIGH"
assert "not measured search volumes" in signals["purpose"]
assert signal["demand_signal"]["score"] >= 4
assert signal["friction_signal"]["score"] >= 4
assert signal["miss_consequence"]["score"] >= 4
assert signal["current_product_coverage_gap"]["score"] >= 4
assert any("forsakringskassan.se" in url for url in signal["primary_sources"])
assert any("fora.se" in url for url in signal["primary_sources"])
assert "verify" in signal["truth_rule"].lower()

assert len(mapping["mappings"]) == 1
entry = mapping["mappings"][0]
assert entry["signal_id"] == signal["signal_id"]
assert entry["regression_case_ids"] == [self_case["case_id"], invoiced_case["case_id"]]
assert "bounded work_context" in entry["fix_or_guardrail"]
assert "one work-injury dental module" in entry["fix_or_guardrail"].lower()

syntax = subprocess.run(["node", "--check", str(MODULE)], capture_output=True, text=True, check=False)
assert syntax.returncode == 0, syntax.stderr or syntax.stdout

probe = r'''
const m = require(process.argv[1]);
const out = {
  selfCtx: m.detectWorkContext('Jag driver eget och slog av en tand när jag jobbade i verksamheten.'),
  invoiceCtx: m.detectWorkContext('Jag fakturerar uppdrag via ett faktureringsföretag och skadade en tand på jobbet under uppdraget.'),
  employeeCtx: m.detectWorkContext('Jag slog av en tand på jobbet.'),
  ownAbCtx: m.detectWorkContext('Jag fakturerar kunden genom mitt eget aktiebolag och arbetar där själv.'),
  colloquialEmployerCtx: m.detectWorkContext('Mitt företag skickade mig till en kund och jag är anställd där.'),
  genericViaBolagCtx: m.detectWorkContext('Jag fakturerar kunden via bolaget men är anställd.'),
  selfDetected: m.detect('Jag driver eget och slog av en tand när jag jobbade i verksamheten.'),
  invoiceDetected: m.detect('Jag fakturerar uppdrag via ett faktureringsföretag och skadade en tand på jobbet under uppdraget.'),
  selfHref: m.handoffHref('sv', 'self_employed'),
  invoiceHref: m.handoffHref('sv', 'invoiced_worker'),
  employeeHref: m.handoffHref('sv', 'employee')
};
console.log(JSON.stringify(out));
'''
run = subprocess.run(["node", "-e", probe, str(MODULE)], capture_output=True, text=True, check=False)
assert run.returncode == 0, run.stderr or run.stdout
out = json.loads(run.stdout)
assert out["selfCtx"] == "self_employed"
assert out["invoiceCtx"] == "invoiced_worker"
assert out["employeeCtx"] == "employee"
assert out["ownAbCtx"] == "self_employed", "explicit own-company language should remain self-employed"
assert out["colloquialEmployerCtx"] == "employee", "plain 'mitt företag' must not imply business ownership"
assert out["genericViaBolagCtx"] == "employee", "generic invoicing via a company must not imply invoicing-company employment"
assert out["selfDetected"] is True
assert out["invoiceDetected"] is True
assert "actor_type=self_employed" in out["selfHref"]
assert "work_context=self_employed" in out["selfHref"]
assert "actor_type=employee" in out["invoiceHref"]
assert "work_context=invoiced_worker" in out["invoiceHref"]
assert "work_context=" not in out["employeeHref"]

for forbidden in ["company_name=", "client_name=", "contract_number=", "exact_cost=", "raw_story="]:
    assert forbidden not in module.lower(), f"forbidden raw/sensitive handoff field: {forbidden}"
assert "qFora" in module
assert "FK_EGEN_URL" in module and "FORA_URL" in module
assert "fetch(" not in module and "XMLHttpRequest" not in module
assert "localStorage" not in module and "sessionStorage" not in module
assert "sv: {" in module and "ar: {" in module and "fa: {" in module

print("work-injury worker-context v37: OK (same module; bounded context; false-positive guards; FK/Fora truth layers separated)")
