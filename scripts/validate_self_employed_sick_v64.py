#!/usr/bin/env python3
"""Fail-closed v64 guard for company-form routing inside the shared sickness capability."""
from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "client" / "employee-sick-work-context-extension.js"
TEST = ROOT / "client" / "employee-sick-work-context-extension.test.cjs"
SCENARIOS = ROOT / "data" / "evals" / "scenario_lab_websignals_v64.json"
SIGNALS = ROOT / "data" / "evals" / "demand_friction_signals_v64.json"
MAP = ROOT / "data" / "evals" / "demand_friction_regression_map_v64.json"
BUILD = ROOT / "scripts" / "build_public_pilot.py"

for path in [MODULE, TEST, SCENARIOS, SIGNALS, MAP, BUILD]:
    assert path.is_file(), f"missing v64 artifact: {path.relative_to(ROOT)}"

module = MODULE.read_text(encoding="utf-8")
for token in [
    "focus', 'employee_sick'",
    "work_context",
    "business_form",
    "self_employed",
    "combined_employment",
    "invoiced_worker",
    "limited_company",
    "sole_partnership",
    "FK_SELECTOR_URL",
    "FK_LIMITED_URL",
    "FK_SOLE_URL",
    "FK_COMBINED_URL",
    "FK_INVOICED_URL",
]:
    assert token in module, f"v64 runtime missing token: {token}"

for forbidden in ["company_name=", "orgnr=", "diagnosis=", "salary=", "income=", "sgi=", "raw_story="]:
    assert forbidden not in module.lower(), f"v64 runtime contains forbidden public handoff field: {forbidden}"

scenario_pack = json.loads(SCENARIOS.read_text(encoding="utf-8"))
case_ids = {case["case_id"] for case in scenario_pack["cases"]}
required_cases = {
    "lab-self-employed-sick-sole-trader-v64-01",
    "lab-self-employed-sick-own-limited-company-v64-02",
    "lab-self-employed-sick-unknown-form-v64-03",
    "lab-combined-worker-sick-v64-04",
    "lab-invoiced-worker-sick-v64-05",
    "lab-company-employer-sick-employee-false-positive-v64-06",
    "lab-self-employed-sick-language-ar-v64-07",
    "lab-self-employed-sick-language-fa-v64-08",
}
assert required_cases <= case_ids, f"v64 scenario pack missing {sorted(required_cases - case_ids)}"

by_id = {case["case_id"]: case for case in scenario_pack["cases"]}
assert "ask_only_whether_the_business_is_own_limited_company_or_sole_trader_partnership_before_route_selection" in by_id["lab-self-employed-sick-unknown-form-v64-03"]["expected_questions"]
assert "company_owner_is_the_sick_person" in by_id["lab-company-employer-sick-employee-false-positive-v64-06"]["must_not_claim"]
assert "arabic_changes_company_form_semantics" in by_id["lab-self-employed-sick-language-ar-v64-07"]["must_not_claim"]
assert "persian_changes_company_form_semantics" in by_id["lab-self-employed-sick-language-fa-v64-08"]["must_not_claim"]

signal_pack = json.loads(SIGNALS.read_text(encoding="utf-8"))
assert len(signal_pack["signals"]) == 1
signal = signal_pack["signals"][0]
assert signal["signal_id"] == "df-self-employed-sickness-company-form-v01"
assert signal["priority_band"] == "HIGH"
assert signal["current_product_coverage_gap"]["score"] >= 4
assert "not measured search volumes" in signal_pack["purpose"].lower()
assert "verify" in signal["truth_rule"].lower()
assert "product_miss" in signal and signal["product_miss"].strip()

mapping_pack = json.loads(MAP.read_text(encoding="utf-8"))
assert len(mapping_pack["mappings"]) == 1
mapping = mapping_pack["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert set(mapping["regression_case_ids"]) == required_cases
assert mapping["product_miss"].strip()
assert "focus=employee_sick" in mapping["fix_or_guardrail"]

build = BUILD.read_text(encoding="utf-8")
assert 'EMPLOYEE_SICK_WORK_CONTEXT_PATH = "client/employee-sick-work-context-extension.js"' in build
assert build.count("EMPLOYEE_SICK_WORK_CONTEXT_PATH,") >= 2, "extension must be wired to both shell and person build lists"

subprocess.run(["node", str(TEST)], cwd=ROOT, check=True)
subprocess.run([sys.executable, str(ROOT / "scripts" / "validate_scenario_lab_all.py")], cwd=ROOT, check=True)
subprocess.run([sys.executable, str(ROOT / "scripts" / "validate_demand_friction_learning_loop.py")], cwd=ROOT, check=True)

print("self-employed sickness v64: OK")
