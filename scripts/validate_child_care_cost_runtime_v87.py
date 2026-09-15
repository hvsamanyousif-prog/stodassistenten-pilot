#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "client" / "child-assistance-context-extension.js"
TEST = ROOT / "client" / "child-assistance-context-extension.test.cjs"
CONTRACT = ROOT / "config" / "situation_session_contract.json"
CLIENT_CONTRACT = ROOT / "client" / "situation-session-contract.js"
SCENARIOS = ROOT / "data" / "evals" / "scenario_lab_websignals_v86.json"
MAPPING = ROOT / "data" / "evals" / "demand_friction_regression_map_v86.json"
OMV = ROOT / "data" / "supports" / "se-forsakringskassan-omvardnadsbidrag.json"
MERK = ROOT / "data" / "supports" / "se-forsakringskassan-merkostnadsersattning-barn.json"
DOC = ROOT / "docs" / "PILOT_COVERAGE_MATRIX_V87_APPENDIX.md"
BUILD = ROOT / "scripts" / "build_public_pilot.py"

OMV_URL = "https://www.forsakringskassan.se/privatperson/familj-och-barn/barn-med-funktionsnedsattning-eller-behov-av-extra-stod/omvardnadsbidrag"
MERK_URL = "https://www.forsakringskassan.se/privatperson/familj-och-barn/barn-med-funktionsnedsattning-eller-behov-av-extra-stod/merkostnadsersattning-for-barn"
EXPECTED_CASES = {
    "lab-child-care-support-adhd-extra-care-v86-01",
    "lab-child-care-support-extra-costs-v86-02",
    "lab-child-care-support-legacy-vardbidrag-v86-03",
    "lab-child-care-support-vab-school-meeting-v86-04",
    "lab-child-care-support-assistance-overlap-v86-05",
    "lab-child-care-support-diagnosis-only-v86-06",
    "lab-child-care-support-professional-v86-07",
    "lab-child-care-support-language-ar-v86-08",
    "lab-child-care-support-language-fa-v86-09",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def main() -> int:
    js = JS.read_text(encoding="utf-8")
    test = TEST.read_text(encoding="utf-8")
    contract = load(CONTRACT)
    client_contract = CLIENT_CONTRACT.read_text(encoding="utf-8")
    scenarios = load(SCENARIOS)
    mapping = load(MAPPING)
    omv = load(OMV)
    merk = load(MERK)
    doc = DOC.read_text(encoding="utf-8")
    build = BUILD.read_text(encoding="utf-8")

    require("PUBLIC_ROUTE_ACTIVE_V87" in doc, "v87 coverage status must disclose the active shared public route")
    require("No `child-benefit` app" in doc, "same-product architecture boundary missing")
    require("child-assistance-context-extension.js" in build, "existing shared child-context runtime must remain in the public build")
    require("detectFamilyNeed" in js and "rewriteFamilyHandoffHref" in js, "family care/cost context must be integrated in the existing child-context runtime")
    require("familySupportFlow" in js and "familySupportRows" in js, "existing family flow must consume the care/cost distinction")
    require("support_need" in js and "q','query','story','situation','raw_situation" in js, "coarse handoff and raw-story stripping must be explicit")
    require(OMV_URL in js and MERK_URL in js, "focused runtime must use both current primary-source URLs")
    require("diagnosen i sig avgör inte" in js.lower(), "diagnosis-not-entitlement boundary missing from public explanation")
    require("alla utgifter" in js.lower() and "inte automatiskt" in js.lower(), "cost-not-automatically-qualifying boundary missing")
    require("child-benefit" not in js and "omvardnadsbidrag-app" not in js, "parallel child-benefit app/engine marker detected")

    allowlists = contract.get("public_handoff", {}).get("capability_fact_allowlists", {})
    require(allowlists.get("family") == ["support_need"], "shared situation/session contract must own exactly the coarse family support_need fact")
    require("family:Object.freeze(['support_need'])" in client_contract, "public session adapter must match the family allowlist")
    forbidden = set(contract.get("public_handoff", {}).get("forbidden_keys", []))
    for key in ("story", "situation", "raw_situation", "diagnosis", "child_name", "address", "personnummer"):
        require(key in forbidden, f"privacy denylist lost {key}")

    case_ids = {case.get("case_id") for case in scenarios.get("cases", [])}
    require(case_ids == EXPECTED_CASES, "v87 must reuse and satisfy the nine deduplicated v86 scenarios")
    require(mapping.get("mappings", [{}])[0].get("coverage_status") == "LEARNING_GUARDED_PUBLIC_ROUTE_PENDING_V86", "historical v86 pending status must not be rewritten after the fact")
    for marker in (
        "v87 care wording routes to omvardnadsbidrag",
        "v87 extra costs wording routes to child merkostnadsersattning",
        "v87 combined care and costs keeps both primary source paths",
        "v87 legacy vardbidrag and diagnosis-only wording remain unsure",
        "v87 professional/research wording does not become a personal family route",
        "v87 Arabic and Persian preserve the care/cost distinction",
        "v87 family handoff carries only a coarse need",
    ):
        require(marker in test, f"missing executable v87 regression: {marker}")

    for record, source in ((omv, OMV_URL), (merk, MERK_URL)):
        require(record.get("source", {}).get("url") == source, "support primary source drifted")
        verification = record.get("verification", {})
        require(verification.get("status") == "NEEDS_REVIEW", "runtime must not self-promote support truth to VERIFIED")
        require(verification.get("human_review_required") is True, "material support truth must remain human-review-gated")
        require(verification.get("material_fields_verified") == [], "runtime integration must not auto-verify material fields")

    for volatile in ("3 083", "3083", "6 167", "6167", "9 250", "9250", "12 333", "12333", "14 800", "14800", "3 453", "3453"):
        require(volatile not in js, f"volatile 2026 amount/threshold must not be hard-coded in public runtime: {volatile}")

    run("node", "--check", str(JS.relative_to(ROOT)))
    run("node", "--test", str(TEST.relative_to(ROOT)))
    run("python", "scripts/validate_situation_session_contract.py")
    run("python", "scripts/validate_child_care_cost_support_v86.py")
    run("python", "scripts/validate_child_assistance_runtime_v85.py")

    with tempfile.TemporaryDirectory() as tmp:
        run("python", "scripts/build_public_pilot.py", "--source", ".", "--output", tmp)
        out = Path(tmp)
        index = (out / "index.html").read_text(encoding="utf-8")
        person = (out / "person-pilot.html").read_text(encoding="utf-8")
        require("client/child-assistance-context-extension.js" in index, "root shell must load the shared child-context extension")
        require("client/child-assistance-context-extension.js" in person, "person surface must load the same child-context extension")
        require((out / "client" / "child-assistance-context-extension.js").is_file(), "built runtime asset missing")

    print("v87 child extra-care/cost shared runtime: OK")
    print("scenarios=9 route=family support_need=care|cost|both|unsure truth=NEEDS_REVIEW")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
