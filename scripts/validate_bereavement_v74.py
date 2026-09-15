#!/usr/bin/env python3
"""Fail-closed v74 guard for bereavement first-action routing in the shared product."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "client" / "bereavement-guidance.js"
TEST = ROOT / "client" / "bereavement-guidance.test.cjs"
SCENARIOS = ROOT / "data" / "evals" / "scenario_lab_websignals_v74.json"
SIGNALS = ROOT / "data" / "evals" / "demand_friction_signals_v74.json"
MAP = ROOT / "data" / "evals" / "demand_friction_regression_map_v74.json"
BUILD = ROOT / "scripts" / "build_public_pilot.py"
COVERAGE = ROOT / "docs" / "PILOT_COVERAGE_MATRIX_V74_APPENDIX.md"
REGISTRY = ROOT / "data" / "source_registry.json"
UNIVERSE = ROOT / "data" / "source_universe.json"

for path in [MODULE, TEST, SCENARIOS, SIGNALS, MAP, BUILD, COVERAGE, REGISTRY, UNIVERSE]:
    assert path.is_file(), f"missing v74 artifact: {path.relative_to(ROOT)}"

module = MODULE.read_text(encoding="utf-8")
for token in [
    "focus:'bereavement'",
    "bereavement_context",
    "partner_support",
    "child_support",
    "practical",
    "work_related",
    "overview",
    "AFTER_GUIDE_URL",
    "PM_SURVIVOR_URL",
    "PM_WORK_URL",
    "SKV_DEATH_URL",
]:
    assert token in module, f"v74 runtime missing token: {token}"

for forbidden in [
    "personnummer=",
    "raw_story=",
    "cause_of_death=",
    "assets=",
    "debts=",
    "will=",
    "death_certificate=",
]:
    assert forbidden not in module.lower(), f"v74 forbidden public handoff field: {forbidden}"

# The overview choice must not reuse the unresolved 'unsure' value and trap the user.
assert "['overview',x.unsure]" in module, "overview choice must resolve the uncertainty question"
assert "overview:[x.unsureTitle" in module, "overview result must have a terminal safe result"

pack = json.loads(SCENARIOS.read_text(encoding="utf-8"))
required = {
    "lab-bereavement-partner-first-action-v74-01",
    "lab-bereavement-child-parent-v74-02",
    "lab-bereavement-practical-estate-v74-03",
    "lab-bereavement-work-related-v74-04",
    "lab-bereavement-vague-relative-v74-05",
    "lab-bereavement-professional-false-positive-v74-06",
    "lab-bereavement-language-ar-v74-07",
    "lab-bereavement-language-fa-v74-08",
}
ids = {case["case_id"] for case in pack["cases"]}
assert required <= ids, f"v74 scenarios missing {sorted(required - ids)}"
by_id = {case["case_id"]: case for case in pack["cases"]}
assert "relationship_alone_proves_survivor_benefit_entitlement" in by_id["lab-bereavement-partner-first-action-v74-01"]["must_not_claim"]
assert "user_is_automatically_authorized_to_act_for_estate" in by_id["lab-bereavement-practical-estate-v74-03"]["must_not_claim"]
assert "death_is_automatically_accepted_as_work_injury" in by_id["lab-bereavement-work-related-v74-04"]["must_not_claim"]
assert "user_has_personally_lost_a_relative" in by_id["lab-bereavement-professional-false-positive-v74-06"]["must_not_claim"]

sigpack = json.loads(SIGNALS.read_text(encoding="utf-8"))
assert len(sigpack["signals"]) == 1
signal = sigpack["signals"][0]
assert signal["signal_id"] == "df-bereavement-first-action-v01"
assert signal["priority_band"] == "HIGH"
assert signal["current_product_coverage_gap"]["score"] >= 4
assert "not measured search volumes" in sigpack["purpose"].lower()
assert signal["product_miss"].strip()
assert "verify" in signal["truth_rule"].lower()
assert "community" in signal["truth_rule"].lower()

mapping = json.loads(MAP.read_text(encoding="utf-8"))["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert set(mapping["regression_case_ids"]) == required
assert "focus=bereavement" in mapping["fix_or_guardrail"]
assert mapping["product_miss"].strip()

# Reuse the SAME canonical truth/source universe instead of making a bereavement registry.
registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
registry_by_id = {item["source_id"]: item for item in registry["sources"]}
pension_source = registry_by_id["se-pensionsmyndigheten-pensioner-support"]
assert pension_source["source_verification_status"] == "SOURCE_VERIFIED"
assert "survivor_support" in pension_source["coverage"]

universe = json.loads(UNIVERSE.read_text(encoding="utf-8"))
national = next(item for item in universe["families"] if item["family_id"] == "se-national-benefit-catalog-discovery")
assert "se-pensionsmyndigheten-pensioner-support" in national["source_registry_refs"]
assert "catalog_presence_equals_user_eligibility" in national["prohibited_promotions"]
assert national["review_required"] is True

build = BUILD.read_text(encoding="utf-8")
assert 'BEREAVEMENT_GUIDANCE_PATH = "client/bereavement-guidance.js"' in build
assert build.count("BEREAVEMENT_GUIDANCE_PATH,") >= 2, "v74 runtime must ship in shell and person build paths"

coverage = COVERAGE.read_text(encoding="utf-8")
for token in [
    "Append-only",
    "focus=bereavement",
    "partner_support",
    "child_support",
    "work_related",
    "overview",
    "structured anonymous feedback",
    "Community questions",
]:
    assert token.lower() in coverage.lower(), f"v74 coverage appendix missing: {token}"

subprocess.run(["node", "--check", str(MODULE)], cwd=ROOT, check=True)
subprocess.run(["node", str(TEST)], cwd=ROOT, check=True)
subprocess.run([sys.executable, str(ROOT / "scripts" / "validate_scenario_lab_all.py")], cwd=ROOT, check=True)
subprocess.run([sys.executable, str(ROOT / "scripts" / "validate_demand_friction_learning_loop.py")], cwd=ROOT, check=True)
print("bereavement first-action v74: OK")
