#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "client/age30-transition.js"
RUNTIME_TEST = ROOT / "client/age30-transition.test.cjs"
BUILD = ROOT / "scripts/build_public_pilot.py"
SCENARIO = ROOT / "data/evals/scenario_lab_websignals_v31.json"
SPECIAL_SUPPORT = ROOT / "data/supports/se-forsakringskassan-sjukpenning-sarskilda-fall.json"
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
    scenario = json.loads(SCENARIO.read_text(encoding="utf-8"))
    support = json.loads(SPECIAL_SUPPORT.read_text(encoding="utf-8"))

    run(["node", "--check", str(RUNTIME)], "age-30 runtime syntax")
    run(["node", str(RUNTIME_TEST)], "age-30 multilingual routing and question-order test")

    require('AGE30_TRANSITION_PATH = "client/age30-transition.js"' in build, "public build does not declare age-30 runtime")
    require("AGE30_TRANSITION_PATH" in build.split("SHELL_RUNTIME_PATHS", 1)[1].split("QUICK_RUNTIME_PATHS", 1)[0], "age-30 runtime is not wired into shared shell")
    require("AGE30_TRANSITION_PATH" in build.split("SCRIPT_PATHS", 1)[1].split("PROFILE_PATH", 1)[0], "age-30 runtime is not wired into person pilot")

    require("focus=activity_compensation_age30" in runtime, "handoff must use bounded age-30 focus")
    require("actor_type=private_person" in runtime, "handoff must stay inside shared person module")
    require("sv:" in runtime and "ar:" in runtime and "fa:" in runtime, "age-30 guidance must support sv/ar/fa")
    require("role', 'group'" in runtime and "aria-pressed" in runtime and "role', 'status'" in runtime, "age-30 guidance is missing keyboard/screen-reader state semantics")

    for unsafe in (
        "fetch(", "localStorage", "sessionStorage", "?q=", "&q=", "situation=", "diagnosis=", "health=",
        "searchParams.set('sgi'", 'searchParams.set("sgi"', "searchParams.set('situation'", 'searchParams.set("situation"',
    ):
        require(unsafe not in runtime, f"age-30 runtime must not transmit or persist raw/sensitive state: {unsafe}")

    lower = runtime.lower()
    require("inte automatiskt" in lower or "inte automatisk" in lower, "automatic-conversion warning is missing")
    require("bostadstillägg" in runtime and "boendetillägg" in runtime, "housing-support boundary is missing")
    require("låg eller saknas" in runtime, "SGI question must be conditional and explicit")
    require("försäkringskassan.se" in lower, "primary-source links are missing")

    cases = {case.get("case_id"): case for case in scenario.get("cases", [])}
    route = cases.get("lab-activity-compensation-turning-30-route-split-v31-01")
    housing = cases.get("lab-activity-compensation-age30-housing-support-v31-02")
    require(route is not None and housing is not None, "canonical v31 regressions are missing")
    require("activity_compensation_automatically_converts_to_sickness_compensation_at_age_30" in route.get("must_not_claim", []), "automatic conversion regression drifted")
    require("q_is_sgi_low_or_absent_if_the_special_cases_route_is_being_considered" in route.get("expected_questions", []), "conditional SGI question regression drifted")
    require("bostadstillagg_automatically_continues_unchanged_when_activity_compensation_ends" in housing.get("must_not_claim", []), "housing continuity regression drifted")

    require(support["verification"]["status"] == "NEEDS_REVIEW", "special-case truth record must stay review-gated")
    require(support["verification"]["human_review_required"] is True, "special-case truth record must require human review")
    require(support["verification"]["material_fields_verified"] == [], "AI must not promote material special-case fields")

    require("activity_compensation_age30" in coverage, "coverage matrix must reflect the public age-30 focus")
    require("fokuserad publik handoff" in coverage, "coverage matrix must describe the age-30 public handoff honestly")
    require("30-årsövergången har nu sannings-, regressions- och fokuserad publik handoff" in coverage, "coverage matrix still claims the public handoff is missing")

    with tempfile.TemporaryDirectory() as tmp:
        output = Path(tmp) / "site"
        run(["python", str(BUILD), "--source", str(ROOT), "--output", str(output)], "public pilot build")
        built_shell = (output / "index.html").read_text(encoding="utf-8")
        built_person = (output / "person-pilot.html").read_text(encoding="utf-8")
        tag = '<script src="client/age30-transition.js"></script>'
        require(tag in built_shell, "built root shell does not load age-30 runtime")
        require(tag in built_person, "built person pilot does not load age-30 runtime")
        require((output / "client/age30-transition.js").is_file(), "built pilot does not copy age-30 runtime")

    print("age-30 public transition release gate: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
