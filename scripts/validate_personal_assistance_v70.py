#!/usr/bin/env python3
"""Lock v70 personal-assistance learning into the existing disability_home_support product."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
CLIENT = ROOT / "client" / "disability-home-support-guidance.js"
TEST = ROOT / "client" / "disability-home-support-guidance.test.cjs"
SUPPORT = ROOT / "data" / "supports" / "se-forsakringskassan-assistansersattning-vuxna.json"
APPENDIX = ROOT / "docs" / "PILOT_COVERAGE_MATRIX_V70_APPENDIX.md"
FEEDBACK_VALIDATOR = ROOT / "scripts" / "validate_feedback_coverage.py"

scenario = json.loads((EVAL / "scenario_lab_websignals_v70.json").read_text(encoding="utf-8"))
signal_doc = json.loads((EVAL / "demand_friction_signals_v70.json").read_text(encoding="utf-8"))
map_doc = json.loads((EVAL / "demand_friction_regression_map_v70.json").read_text(encoding="utf-8"))
support = json.loads(SUPPORT.read_text(encoding="utf-8"))
client = CLIENT.read_text(encoding="utf-8")
test = TEST.read_text(encoding="utf-8")
appendix = APPENDIX.read_text(encoding="utf-8")
feedback_validator = FEEDBACK_VALIDATOR.read_text(encoding="utf-8")

expected_ids = {
    "lab-disability-personal-assistance-explicit-v70-01",
    "lab-disability-personal-assistance-no-diagnosis-inference-v70-02",
    "lab-disability-personal-assistance-vs-healthcare-v70-03",
    "lab-disability-personal-assistance-older-boundary-v70-04",
    "lab-disability-personal-assistance-professional-false-positive-v70-05",
    "lab-disability-personal-assistance-research-false-positive-v70-06",
    "lab-disability-personal-assistance-language-ar-v70-07",
    "lab-disability-personal-assistance-language-fa-v70-08",
}
cases = {case["case_id"]: case for case in scenario.get("cases", [])}
assert set(cases) == expected_ids, f"v70 scenario ids drifted: {sorted(cases)}"
assert all(case.get("source_requirements") for case in cases.values()), "every v70 scenario needs source requirements"

assert len(signal_doc.get("signals", [])) == 1
signal = signal_doc["signals"][0]
assert signal["signal_id"] == "df-personal-assistance-state-vs-municipality-v01"
assert signal["priority_band"] == "HIGH"
assert "not measured search volumes" in signal_doc["purpose"]
assert "not measured search volumes" in signal_doc["scoring"]["priority_rule"]
assert set(signal["regression_case"]) == expected_ids
primary = " ".join(signal["primary_sources"])
assert "forsakringskassan.se" in primary and "socialstyrelsen.se" in primary
assert "verify material personal-assistance guidance" in signal["truth_rule"]

assert len(map_doc.get("mappings", [])) == 1
mapping = map_doc["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert set(mapping["regression_case_ids"]) == expected_ids
assert mapping["coverage_status"] == "GUARDED_PUBLIC_ROUTE_READY"
assert "focus=disability_home_support" in mapping["fix_or_guardrail"]
assert "support_need=personal_assistance" in mapping["fix_or_guardrail"]

# Preserve conservative truth status: this run may operationalize navigation, not promote material fields.
assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["material_fields_verified"] == []

for token in [
    "support_need",
    "personal_assistance",
    "ASSISTANCE_URL",
    "assistansersattning-for-vuxna",
    "NON_PERSONAL_ASSISTANCE",
    "flow:'disability_home_support'",
    "ratings:{route:'disability_home_support',support_need:need||'unsure'}",
]:
    assert token in client, f"v70 public route token missing: {token}"

for forbidden in [
    "diagnosis=",
    "personnummer=",
    "address=",
    "municipality=",
    "hours=",
    "assessed_hours=",
    "story=",
    "situation=",
]:
    assert forbidden not in client, f"sensitive handoff field leaked into runtime: {forbidden}"
    assert forbidden in test, f"privacy regression must explicitly test forbidden field: {forbidden}"

for token in [
    "Jag jobbar med personlig assistans",
    "Jag skriver uppsats om personlig assistans",
    "personal_assistance",
    "أحتاج مساعدة شخصية",
    "کمک شخصی",
]:
    assert token in test, f"v70 behavior regression missing: {token}"

# Self-audit: property_actor existed in the manifest/runtime but was omitted from validator loops.
assert "'property_actor'" in feedback_validator
assert "property_actor_housing_adaptation" in feedback_validator
assert "property actor feedback must preserve coarse actor context" in feedback_validator

assert "does not create a separate personal-assistance app" in appendix
assert "Feedback is a learning signal, never a truth source" in appendix
assert "NEEDS_REVIEW" in appendix
assert "property_actor" in appendix

print("personal assistance v70: OK (same disability_home_support product; source-led; truth status unchanged; feedback coverage hardened)")
