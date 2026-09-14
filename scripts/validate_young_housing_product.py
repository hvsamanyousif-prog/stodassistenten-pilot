#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "client/young-housing-transition.js"
RUNTIME_TEST = ROOT / "client/young-housing-transition.test.cjs"
BUILD = ROOT / "scripts/build_public_pilot.py"
SIGNAL = ROOT / "data/evals/demand_friction_signals_v11.json"
SCENARIO = ROOT / "data/evals/scenario_lab_websignals_v22.json"
REGRESSION_MAP = ROOT / "data/evals/demand_friction_regression_map_v05.json"
SUPPORT = ROOT / "data/supports/se-forsakringskassan-bostadsbidrag-unga.json"
COVERAGE = ROOT / "docs/PILOT_COVERAGE_MATRIX.md"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def run(command: list[str], label: str) -> None:
    proc = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
    require(proc.returncode == 0, f"{label} failed: {proc.stderr or proc.stdout}")


def main() -> int:
    runtime = RUNTIME.read_text(encoding="utf-8")
    build = BUILD.read_text(encoding="utf-8")
    coverage = COVERAGE.read_text(encoding="utf-8")
    signal = json.loads(SIGNAL.read_text(encoding="utf-8"))
    scenario = json.loads(SCENARIO.read_text(encoding="utf-8"))
    mapping = json.loads(REGRESSION_MAP.read_text(encoding="utf-8"))
    support = json.loads(SUPPORT.read_text(encoding="utf-8"))

    run(["node", "--check", str(RUNTIME)], "young housing runtime syntax")
    run(["node", str(RUNTIME_TEST)], "young housing multilingual routing test")

    require('YOUNG_HOUSING_TRANSITION_PATH = "client/young-housing-transition.js"' in build, "public build does not declare young housing runtime")
    require("YOUNG_HOUSING_TRANSITION_PATH" in build.split("SHELL_RUNTIME_PATHS", 1)[1].split("QUICK_RUNTIME_PATHS", 1)[0], "young housing runtime is not wired into shared shell")
    require("YOUNG_HOUSING_TRANSITION_PATH" in build.split("SCRIPT_PATHS", 1)[1].split("PROFILE_PATH", 1)[0], "young housing runtime is not wired into person pilot")

    for unsafe in ("fetch(", "localStorage", "sessionStorage", "searchParams.set('situation'", 'searchParams.set("situation"', "?q=", "&q="):
        require(unsafe not in runtime, f"young housing runtime must not transmit or persist raw situation data: {unsafe}")
    require("focus=young_housing" in runtime, "handoff must use bounded young_housing focus")
    require("context=${safe}" in runtime, "handoff must carry only a coarse governed context")
    require("actor_type=student" in runtime, "handoff must stay inside the shared student/person module")
    require("if (context !== 'income_change')" in runtime, "known income-change context must suppress the duplicate follow-up question")
    require("Försäkringskassan" in runtime, "guidance must name the responsible primary source")
    require("hela kalenderåret" in runtime, "2026 annual-income next action is missing")
    require("uppdatera uppgifterna direkt" in runtime, "income-change reporting next action is missing")
    require("role', 'group'" in runtime and "aria-pressed" in runtime and "role', 'status'" in runtime, "accessibility states are missing")
    require("sv:" in runtime and "ar:" in runtime and "fa:" in runtime, "young housing guidance must support sv/ar/fa")

    verification = support.get("verification", {})
    require(verification.get("status") == "NEEDS_REVIEW", "young housing truth record must remain review-gated")
    require(verification.get("human_review_required") is True, "young housing truth record must require human review")
    require(verification.get("material_fields_verified") == [], "AI must not promote young housing material fields to VERIFIED")
    support_text = json.dumps(support, ensure_ascii=False)
    require("bhyoung.annual_income_basis_2026" in support_text, "truth record must retain the current 2026 annual-income rule")
    require("bhyoung.monthly_income_transition_2027" in support_text, "truth record must version the 2027 transition separately")

    signals = {item.get("signal_id"): item for item in signal.get("signals", [])}
    sig = signals.get("df-young-post-study-housing-change-v01")
    require(sig is not None, "young housing transition friction signal is missing")
    require(sig.get("priority_band") == "HIGH", "young housing transition should remain a high-priority gap")
    require(any("reddit.com" in url for url in sig.get("discovery_sources", [])), "community discovery source is missing")
    require(all("forsakringskassan.se" in url for url in sig.get("primary_sources", [])), "truth-bearing sources must be Försäkringskassan primary sources")
    require("Community discussion" in sig.get("truth_rule", ""), "discovery/truth source boundary is missing")

    cases = {case.get("case_id"): case for case in scenario.get("cases", [])}
    case = cases.get("lab-young-post-study-housing-change-v22-01")
    require(case is not None, "canonical young housing transition regression is missing")
    must_not = set(case.get("must_not_claim", []))
    require("one_month_income_is_enough_for_a_2026_housing_benefit_assessment" in must_not, "single-month income overclaim regression is missing")
    require("the_2027_monthly_income_model_applies_to_a_2026_decision" in must_not, "future-rule backport regression is missing")
    require("the_raw_situation_text_or_exact_age_should_be_put_in_the_handoff_url_or_feedback" in must_not, "privacy regression is missing")
    require(case.get("expected_questions") == ["q_is_user_under_29", "q_housing_form_if_youth_route_continues"], "information-gain question contract drifted")
    require("do_not_repeat_an_income_change_question_when_the_coarse_shell_context_already_establishes_that_fact" in case.get("expected_next_actions", []), "known-fact no-repeat guard is missing")

    mappings = {item.get("signal_id"): item for item in mapping.get("mappings", [])}
    learned = mappings.get("df-young-post-study-housing-change-v01")
    require(learned is not None, "friction signal is not mapped to permanent learning")
    require("lab-young-post-study-housing-change-v22-01" in learned.get("regression_case_ids", []), "signal is not linked to v22 regression")
    require("studier, bostad och första anställning" in coverage, "coverage matrix no longer contains the combined transition contract")
    require("Ung bostadsövergång v22" in coverage and "focus=young_housing" in coverage, "coverage matrix must reflect the actual v22 public capability")

    with tempfile.TemporaryDirectory() as tmp:
        output = Path(tmp) / "site"
        run(["python", str(BUILD), "--source", str(ROOT), "--output", str(output)], "public pilot build")
        built_shell = (output / "index.html").read_text(encoding="utf-8")
        built_person = (output / "person-pilot.html").read_text(encoding="utf-8")
        tag = '<script src="client/young-housing-transition.js"></script>'
        require(tag in built_shell, "built shared shell does not load young housing runtime")
        require(tag in built_person, "built person pilot does not load young housing runtime")
        require((output / "client/young-housing-transition.js").is_file(), "built pilot does not copy young housing runtime")

    print("young housing product transition release gate: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
