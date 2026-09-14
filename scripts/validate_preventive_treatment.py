#!/usr/bin/env python3
"""Guard the public preventive-treatment handoff without promoting truth status."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
runtime_path = ROOT / "client" / "preventive-treatment.js"
runtime = runtime_path.read_text(encoding="utf-8")
builder = (ROOT / "scripts" / "build_public_pilot.py").read_text(encoding="utf-8")
matrix = (ROOT / "docs" / "PILOT_COVERAGE_MATRIX.md").read_text(encoding="utf-8")
support = json.loads((ROOT / "data" / "supports" / "se-forsakringskassan-forebyggande-sjukpenning.json").read_text(encoding="utf-8"))
scenario = json.loads((ROOT / "data" / "evals" / "scenario_lab_websignals_v25.json").read_text(encoding="utf-8"))

syntax = subprocess.run(["node", "--check", str(runtime_path)], capture_output=True, text=True, check=False)
assert syntax.returncode == 0, (syntax.stderr or syntax.stdout).strip()

assert "focus=preventive_treatment" in runtime
assert "actor_type=employee" in runtime
assert "get('q')" not in runtime and 'get("q")' not in runtime
assert "raw_situation" not in runtime and "raw_story" not in runtime
assert "PREVENTIVE_TREATMENT_PATH" in builder and "client/preventive-treatment.js" in builder
assert builder.count("PREVENTIVE_TREATMENT_PATH") >= 3, "preventive-treatment runtime must be wired to shell, person and artifact copy"
assert "preventive_treatment" in matrix and "NEEDS_REVIEW" in matrix

for token in [
    "behandling", "rehabilitering", "arbetstid", "psykologbehandling", "fysioterapi"
]:
    assert token in runtime.lower(), f"natural-language discovery token missing: {token}"
for token in [
    "Är detta en planerad medicinsk behandling eller rehabilitering som är ordinerad av läkare",
    "minst ungefär en fjärdedel av din dagliga arbetstid per tillfälle",
    "Har Försäkringskassan redan godkänt behandlingsplanen?",
    "Ett godkännande av planen är inte ett löfte om ersättning för varje tillfälle.",
    "piloten lovar inte rätt eller belopp",
]:
    assert token in runtime, f"information-gain or uncertainty guard missing: {token}"
assert "forsakringskassan.se/privatperson/sjuk-eller-skadad/forebyggande-sjukpenning-rehabilitering-eller-planerad-vard" in runtime

assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["material_fields_verified"] == []

case = scenario["cases"][0]
assert case["case_id"] == "lab-employee-preventive-treatment-work-v25-01"
for token in [
    "an_ordinary_single_healthcare_visit_automatically_qualifies_for_preventive_sickness_benefit",
    "diagnosis_or_treatment_name_alone_proves_eligibility",
    "treatment_plan_approval_guarantees_payment_for_every_treatment_ocassion",
    "the_product_can_guarantee_eligibility_amount_or_payment_date",
]:
    assert token in case["must_not_claim"]
for token in [
    "q_is_medical_treatment_or_rehabilitation_doctor_ordered_to_prevent_or_shorten_disease",
    "q_does_treatment_and_relevant_travel_require_at_least_one_quarter_of_daily_work_time_per_ocassion",
    "q_has_forsakringskassan_approved_the_treatment_plan",
]:
    assert token in case["expected_questions"]

print("preventive-treatment guidance: OK (bounded routing + information gain + review-gated truth + v25 regression)")
