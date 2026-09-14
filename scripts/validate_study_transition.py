#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "client/study-transition.js"
RUNTIME_TEST = ROOT / "client/study-transition.test.cjs"
BUILD = ROOT / "scripts/build_public_pilot.py"
SIGNAL = ROOT / "data/evals/demand_friction_signals_v09.json"
SCENARIO = ROOT / "data/evals/scenario_lab_websignals_v20.json"
REGRESSION_MAP = ROOT / "data/evals/demand_friction_regression_map_v03.json"
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

    run(["node", "--check", str(RUNTIME)], "study transition runtime syntax")
    run(["node", str(RUNTIME_TEST)], "study transition multilingual routing test")

    require("STUDY_TRANSITION_PATH = \"client/study-transition.js\"" in build, "public build does not declare study transition runtime")
    require("STUDY_TRANSITION_PATH" in build.split("SHELL_RUNTIME_PATHS", 1)[1].split("QUICK_RUNTIME_PATHS", 1)[0], "study transition runtime is not wired into shared shell")
    require("STUDY_TRANSITION_PATH" in build.split("SCRIPT_PATHS", 1)[1].split("PROFILE_PATH", 1)[0], "study transition runtime is not wired into person pilot")

    for unsafe in ("fetch(", "localStorage", "sessionStorage", "searchParams.set('situation'", 'searchParams.set("situation"', "?q=", "&q="):
        require(unsafe not in runtime, f"study transition runtime must not transmit or persist raw situation data: {unsafe}")
    require("focus=study_to_work" in runtime, "handoff must use bounded study_to_work focus")
    require("actor_type=student" in runtime, "handoff must stay inside the shared student/person module")
    require("Arbetsförmedlingen" in runtime, "guidance must name the responsible primary source")
    require("första arbetslösa dag" in runtime, "first-unemployed-day next action is missing")
    require("a-kassan" in runtime, "a-kassa responsibility boundary is missing")
    require("role', 'group'" in runtime and "aria-pressed" in runtime and "role', 'status'" in runtime, "accessibility states are missing")
    require("sv:" in runtime and "ar:" in runtime and "fa:" in runtime, "study transition guidance must support sv/ar/fa")

    signals = {item.get("signal_id"): item for item in signal.get("signals", [])}
    sig = signals.get("df-young-post-study-no-job-v01")
    require(sig is not None, "graduate friction discovery signal is missing")
    require(sig.get("priority_band") == "HIGH", "graduate transition should remain a high-priority gap")
    require(any("reddit.com" in url for url in sig.get("discovery_sources", [])), "community discovery source is missing")
    require(all("arbetsformedlingen.se" in url for url in sig.get("primary_sources", [])), "truth-bearing sources must be current Arbetsförmedlingen primary sources")
    require("Community discussions" in sig.get("truth_rule", ""), "discovery/truth source boundary is missing")

    cases = {case.get("case_id"): case for case in scenario.get("cases", [])}
    case = cases.get("lab-young-post-study-no-job-v20-01")
    require(case is not None, "canonical post-study regression is missing")
    must_not = set(case.get("must_not_claim", []))
    require("registration_with_arbetsformedlingen_automatically_grants_a_kassa" in must_not, "automatic a-kassa overclaim regression is missing")
    require("the_raw_situation_text_should_be_put_in_the_handoff_url_or_feedback" in must_not, "privacy regression is missing")
    questions = case.get("expected_questions", [])
    require(questions == ["q_does_a_job_start_immediately_after_studies", "q_is_the_first_unemployed_day_today_or_later"], "question-efficiency regression drifted")

    mappings = {item.get("signal_id"): item for item in mapping.get("mappings", [])}
    learned = mappings.get("df-young-post-study-no-job-v01")
    require(learned is not None, "friction signal is not mapped to permanent learning")
    require("lab-young-post-study-no-job-v20-01" in learned.get("regression_case_ids", []), "signal is not linked to v20 regression")

    require("study_to_work" in coverage, "coverage matrix does not reflect the public study-to-work handoff")
    require("a-kassa" in coverage, "coverage matrix must keep the a-kassa truth boundary visible")

    with tempfile.TemporaryDirectory() as tmp:
        output = Path(tmp) / "site"
        run(["python", str(BUILD), "--source", str(ROOT), "--output", str(output)], "public pilot build")
        built_shell = (output / "index.html").read_text(encoding="utf-8")
        built_person = (output / "person-pilot.html").read_text(encoding="utf-8")
        tag = '<script src="client/study-transition.js"></script>'
        require(tag in built_shell, "built shared shell does not load study transition runtime")
        require(tag in built_person, "built person pilot does not load study transition runtime")
        require((output / "client/study-transition.js").is_file(), "built pilot does not copy study transition runtime")

    print("study transition release gate: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
