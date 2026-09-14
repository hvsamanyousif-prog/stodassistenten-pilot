#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "client/dental-67-guidance.js"
BUILD = ROOT / "scripts/build_public_pilot.py"
SUPPORT = ROOT / "data/supports/se-forsakringskassan-sarskild-tandvardsersattning-67.json"
SCENARIO = ROOT / "data/evals/scenario_lab_websignals_v19.json"
COVERAGE = ROOT / "docs/PILOT_COVERAGE_MATRIX.md"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def main() -> int:
    runtime = RUNTIME.read_text(encoding="utf-8")
    build = BUILD.read_text(encoding="utf-8")
    coverage = COVERAGE.read_text(encoding="utf-8")
    support = json.loads(SUPPORT.read_text(encoding="utf-8"))
    scenario = json.loads(SCENARIO.read_text(encoding="utf-8"))

    syntax = subprocess.run(["node", "--check", str(RUNTIME)], capture_output=True, text=True, check=False)
    require(syntax.returncode == 0, f"dental 67+ runtime syntax failed: {syntax.stderr or syntax.stdout}")

    require("DENTAL_67_GUIDANCE_PATH = \"client/dental-67-guidance.js\"" in build, "public build does not declare dental 67+ runtime")
    require("DENTAL_67_GUIDANCE_PATH" in build.split("QUICK_RUNTIME_PATHS", 1)[1], "dental 67+ runtime is not part of shared quick-help build")

    require("!== 'dental'" in runtime, "runtime must fail closed outside dental quick-help")
    require("new Set(['cost', 'support', 'unsure'])" in runtime, "runtime must limit age question to route-changing dental needs")
    require("'care'" not in runtime.split("ELIGIBLE_NEEDS", 1)[1].split(";", 1)[0], "acute/care path must not receive a nonessential age question")
    require("get('q')" not in runtime and "get(\"q\")" not in runtime, "runtime must not read raw situation text")
    require("localStorage" not in runtime and "sessionStorage" not in runtime, "runtime must not persist scenario answers")
    require("VERIFIED" not in runtime, "runtime must not self-promote truth status")

    for token in (
        "kalenderåret",
        "hela fakturan automatiskt kostar 10 %",
        "Undersökning, förebyggande vård och röntgen",
        "ordinarie högkostnadsskyddet",
        "Försäkringskassan",
        "TLV",
        "aria-pressed",
        "role=\"group\"",
        "role=\"status\"",
    ):
        require(token in runtime, f"missing dental 67+ safety/accessibility token: {token}")

    require("ar:" in runtime and "fa:" in runtime and "sv:" in runtime, "dental 67+ handoff must support sv/ar/fa")
    require("https://www.forsakringskassan.se/privatperson/tandvard/tandvardsstod/ett-battre-skydd-mot-hoga-tandvardskostnader" in runtime, "missing current Försäkringskassan primary source")
    require("https://www.tlv.se/tandvard/regelverk-om-tandvardsstodet.html" in runtime, "missing current TLV primary source")

    verification = support.get("verification", {})
    require(verification.get("status") == "NEEDS_REVIEW", "dental 67+ support record must remain NEEDS_REVIEW")
    require(verification.get("human_review_required") is True, "dental 67+ support record must require human review")
    require(verification.get("material_fields_verified") == [], "AI must not mark dental 67+ material fields VERIFIED")

    cases = {case.get("case_id"): case for case in scenario.get("cases", [])}
    case = cases.get("lab-older-dental-67-v19-01")
    require(case is not None, "canonical dental 67+ scenario regression is missing")
    must_not = set(case.get("must_not_claim", []))
    require("strengthened_high_cost_protection_covers_the_entire_dental_invoice" in must_not, "whole-invoice overclaim regression is missing")
    require("a_specific_final_cost_is_guaranteed_before_the_treatment_measures_and_reference_prices_are_known" in must_not, "premature final-cost regression is missing")

    require("dental quick-help med åldersmedveten 67+-handoff" in coverage, "coverage matrix does not reflect the actual 67+ public handoff")
    require("Handoffen får inte avgöra exakt eligibility, åtgärdsomfattning eller slutkostnad" in coverage, "coverage matrix must keep the remaining truth boundary visible")

    with tempfile.TemporaryDirectory() as tmp:
        output = Path(tmp) / "site"
        built = subprocess.run(
            ["python", str(BUILD), "--source", str(ROOT), "--output", str(output)],
            capture_output=True,
            text=True,
            check=False,
        )
        require(built.returncode == 0, f"public pilot build failed: {built.stderr or built.stdout}")
        built_quick = (output / "quick-help.html").read_text(encoding="utf-8")
        require('<script src="client/dental-67-guidance.js"></script>' in built_quick, "built quick-help does not load dental 67+ guidance")
        require((output / "client/dental-67-guidance.js").is_file(), "built pilot does not copy dental 67+ guidance asset")

    print("dental 67+ public guidance: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
