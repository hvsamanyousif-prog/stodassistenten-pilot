#!/usr/bin/env python3
"""Fail-closed v75 guard for natural-language breadth in the shared bereavement route."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "client" / "bereavement-guidance.js"
TEST = ROOT / "client" / "bereavement-guidance.test.cjs"
SCENARIOS = ROOT / "data" / "evals" / "scenario_lab_websignals_v75.json"
SIGNALS = ROOT / "data" / "evals" / "demand_friction_signals_v75.json"
MAP = ROOT / "data" / "evals" / "demand_friction_regression_map_v75.json"
COVERAGE = ROOT / "docs" / "PILOT_COVERAGE_MATRIX_V75_APPENDIX.md"
BUILD = ROOT / "scripts" / "build_public_pilot.py"

for path in [MODULE, TEST, SCENARIOS, SIGNALS, MAP, COVERAGE, BUILD]:
    assert path.is_file(), f"missing v75 artifact: {path.relative_to(ROOT)}"

module = MODULE.read_text(encoding="utf-8")
for token in [
    "focus:'bereavement'",
    "bereavement_context",
    "gått\\s+bort",
    "bror|syster|syskon",
    "أخي|أختي",
    "برادرم|خواهرم",
    "'gått bort'",
    "'gick bort'",
]:
    assert token in module, f"v75 runtime missing token: {token}"

for forbidden in [
    "personnummer=",
    "raw_story=",
    "cause_of_death=",
    "assets=",
    "debts=",
    "will=",
    "death_certificate=",
]:
    assert forbidden not in module.lower(), f"v75 forbidden public handoff field: {forbidden}"

# Permanent behavioral assertions live in the same runtime test.
test = TEST.read_text(encoding="utf-8")
for phrase in [
    "Min bror har gått bort",
    "Min syster har gått bort",
    "Min vän har gått bort",
    "Min bror gick bort till affären och kom tillbaka.",
    "توفي أخي",
    "خواهرم فوت کرده است",
]:
    assert phrase in test, f"v75 test missing phrase: {phrase}"

pack = json.loads(SCENARIOS.read_text(encoding="utf-8"))
required = {
    "lab-bereavement-sibling-euphemism-v75-01",
    "lab-bereavement-sister-practical-v75-02",
    "lab-bereavement-friend-overview-v75-03",
    "lab-bereavement-motion-false-positive-v75-04",
    "lab-bereavement-sibling-language-ar-v75-05",
    "lab-bereavement-sibling-language-fa-v75-06",
}
ids = {case["case_id"] for case in pack["cases"]}
assert required <= ids, f"v75 scenarios missing {sorted(required - ids)}"
by_id = {case["case_id"]: case for case in pack["cases"]}
assert "sibling_relationship_proves_survivor_benefit_entitlement" in by_id["lab-bereavement-sibling-euphemism-v75-01"]["must_not_claim"]
assert "friend_is_automatically_dodsbodelagare" in by_id["lab-bereavement-friend-overview-v75-03"]["must_not_claim"]
assert "a_death_occurred" in by_id["lab-bereavement-motion-false-positive-v75-04"]["must_not_claim"]

sigpack = json.loads(SIGNALS.read_text(encoding="utf-8"))
assert len(sigpack["signals"]) == 1
signal = sigpack["signals"][0]
assert signal["signal_id"] == "df-bereavement-euphemism-relation-breadth-v01"
assert signal["priority_band"] == "HIGH"
assert signal["current_product_coverage_gap"]["score"] >= 4
assert "not measured search volumes" in sigpack["purpose"].lower()
assert signal["product_miss"].strip()
assert "verify" in signal["truth_rule"].lower()
assert "discovery" in signal["truth_rule"].lower()

mapping = json.loads(MAP.read_text(encoding="utf-8"))["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert set(mapping["regression_case_ids"]) == required
assert "focus=bereavement" in mapping["fix_or_guardrail"]
assert "fail closed" in mapping["fix_or_guardrail"].lower()
assert mapping["product_miss"].strip()

coverage = COVERAGE.read_text(encoding="utf-8")
for token in [
    "Append-only",
    "focus=bereavement",
    "gått bort",
    "sibling/friend",
    "Fail-closed",
    "structured feedback",
    "discovery only",
]:
    assert token.lower() in coverage.lower(), f"v75 coverage appendix missing: {token}"

build = BUILD.read_text(encoding="utf-8")
assert 'BEREAVEMENT_GUIDANCE_PATH = "client/bereavement-guidance.js"' in build
assert build.count("BEREAVEMENT_GUIDANCE_PATH,") >= 2, "v75 must ship the same bereavement runtime on shared surfaces"

subprocess.run(["node", "--check", str(MODULE)], cwd=ROOT, check=True)
subprocess.run(["node", str(TEST)], cwd=ROOT, check=True)
subprocess.run([sys.executable, str(ROOT / "scripts" / "validate_scenario_lab_all.py")], cwd=ROOT, check=True)
subprocess.run([sys.executable, str(ROOT / "scripts" / "validate_demand_friction_learning_loop.py")], cwd=ROOT, check=True)
print("bereavement natural-language breadth v75: OK")
