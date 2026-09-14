#!/usr/bin/env python3
"""Guard the public severe-relative-care handoff without promoting truth status."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
runtime = (ROOT / "client" / "relative-care.js").read_text(encoding="utf-8")
builder = (ROOT / "scripts" / "build_public_pilot.py").read_text(encoding="utf-8")
matrix = (ROOT / "docs" / "PILOT_COVERAGE_MATRIX.md").read_text(encoding="utf-8")
support = json.loads((ROOT / "data" / "supports" / "se-forsakringskassan-narstaendepenning.json").read_text(encoding="utf-8"))
scenario = json.loads((ROOT / "data" / "evals" / "scenario_lab_websignals_v21.json").read_text(encoding="utf-8"))

assert "focus=relative_care" in runtime
assert "actor_type=relative" in runtime
assert "get('q')" not in runtime and 'get("q")' not in runtime
assert "raw" not in runtime.lower(), "relative-care runtime must not consume or label raw story data"
assert "RELATIVE_CARE_PATH" in builder and "client/relative-care.js" in builder
assert builder.count("RELATIVE_CARE_PATH") >= 3, "relative-care runtime must be wired to shell, person and artifact copy"
assert "relative_care" in matrix and "NEEDS_REVIEW" in matrix

assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["material_fields_verified"] == []

case = scenario["cases"][0]
assert case["case_id"] == "lab-relative-severe-illness-care-v21-01"
for token in [
    "family_relationship_alone_guarantees_near_relative_benefit",
    "ordinary_age_related_help_need_qualifies_for_near_relative_benefit",
    "the_product_can_decide_eligibility_or_amount_without_forsakringskassan_assessment",
]:
    assert token in case["must_not_claim"]
for token in [
    "q_has_healthcare_described_condition_as_life_threatening",
    "q_must_helper_refrain_from_work_a_kassa_or_parental_benefit",
]:
    assert token in case["expected_questions"]

print("relative-care guidance: OK (bounded routing + review-gated truth + v21 regression)")
