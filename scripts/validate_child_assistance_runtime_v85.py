#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "client/child-assistance-context-extension.js"
BUILD = ROOT / "scripts/build_public_pilot.py"
SCENARIOS = ROOT / "data/evals/scenario_lab_websignals_v85.json"
SIGNALS = ROOT / "data/evals/demand_friction_signals_v85.json"
MAPPING = ROOT / "data/evals/demand_friction_regression_map_v85.json"
CONTRACT = ROOT / "config/situation_session_contract.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"v85 validation failed: {message}")


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def main() -> int:
    js = JS.read_text(encoding="utf-8")
    build = BUILD.read_text(encoding="utf-8")
    scenarios = json.loads(SCENARIOS.read_text(encoding="utf-8"))
    signals = json.loads(SIGNALS.read_text(encoding="utf-8"))
    mapping = json.loads(MAPPING.read_text(encoding="utf-8"))
    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))

    require("child-assistance-context-extension.js" in build, "shared public build must include the v85 extension")
    require("support_for" in js and "CHILD_URL" in js and "ADULT_URL" in js, "runtime must preserve coarse child/adult context and distinct primary sources")
    require("jobbar|arbetar" in js and "barn|unga" in js, "professional false-positive guard missing")
    require(
        "raw story" in js or "coarse child/adult" in js or "coarse route-changing context" in js,
        "privacy intent must explicitly state that only coarse routing context is preserved",
    )
    require("focus=child" not in js and "child-pilot" not in js and "child_assistance_app" not in js, "must not create a parallel child app/engine")
    require(
        contract.get("public_handoff", {}).get("capability_fact_allowlists", {}).get("disability_home_support") == ["support_need", "support_for"],
        "disability/home-support route facts must be owned by the shared session contract",
    )
    require(len(scenarios.get("cases", [])) >= 8, "expected at least eight v85 synthetic cases")
    case_ids = {c.get("case_id") for c in scenarios["cases"]}
    require("lab-child-assistance-runtime-professional-v85-05" in case_ids, "professional false-positive regression missing")
    require("lab-child-assistance-runtime-language-ar-v85-07" in case_ids and "lab-child-assistance-runtime-language-fa-v85-08" in case_ids, "Arabic/Persian parity regressions missing")

    signal = signals.get("signals", [None])[0]
    require(signal and signal.get("signal_id") == "df-child-assistance-context-source-drift-v01", "v85 demand/friction signal missing")
    require(signal.get("priority_band") == "HIGH", "verified high-consequence context-loss miss should be HIGH")
    require("not measured search volumes" in signals.get("purpose", "") or "not measured search volumes" in json.dumps(signal), "signal must explicitly reject measured-search-volume interpretation")
    require("Verify material" in signal.get("truth_rule", ""), "truth rule must explicitly require primary-source verification")

    mapped = mapping.get("mappings", [None])[0]
    require(mapped and mapped.get("signal_id") == signal.get("signal_id"), "demand/friction mapping must point to v85 signal")
    require(set(mapped.get("regression_case_ids", [])) == case_ids, "every v85 scenario must be mapped as a regression")
    require("support_for is routing context only" in mapped.get("truth_boundary", ""), "routing fact must not become eligibility truth")

    run("node", "--test", "client/child-assistance-context-extension.test.cjs")
    run("node", "client/child-assistance-session-contract-v85.test.cjs")
    run("node", "--test", "client/disability-home-support-guidance.test.cjs")
    run("python", "scripts/validate_situation_session_contract.py")
    run("python", "scripts/validate_child_assistance_v84.py")
    run("python", "scripts/validate_disability_home_support_v55.py")
    run("python", "scripts/validate_scenario_lab_all.py")
    run("python", "scripts/validate_demand_friction_signals.py")
    run("python", "scripts/validate_demand_friction_learning_loop.py")
    print("child assistance runtime v85 validation: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
