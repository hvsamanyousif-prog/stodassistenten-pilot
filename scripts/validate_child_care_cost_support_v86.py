#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
SUPPORT = ROOT / "data" / "supports"

SIGNAL = EVAL / "demand_friction_signals_v86.json"
SCENARIOS = EVAL / "scenario_lab_websignals_v86.json"
MAPPING = EVAL / "demand_friction_regression_map_v86.json"
OMV = SUPPORT / "se-forsakringskassan-omvardnadsbidrag.json"
MERK = SUPPORT / "se-forsakringskassan-merkostnadsersattning-barn.json"
V85 = EVAL / "scenario_lab_websignals_v85.json"
DOC = ROOT / "docs" / "PILOT_COVERAGE_MATRIX_V86_APPENDIX.md"

OMV_URL = "https://www.forsakringskassan.se/privatperson/familj-och-barn/barn-med-funktionsnedsattning-eller-behov-av-extra-stod/omvardnadsbidrag"
MERK_URL = "https://www.forsakringskassan.se/privatperson/familj-och-barn/barn-med-funktionsnedsattning-eller-behov-av-extra-stod/merkostnadsersattning-for-barn"
SID = "df-child-extra-care-cost-boundary-v01"
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


def load(path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    signal_pack = load(SIGNAL)
    scenario_pack = load(SCENARIOS)
    mapping_pack = load(MAPPING)
    omv = load(OMV)
    merk = load(MERK)
    v85 = load(V85)
    doc = DOC.read_text(encoding="utf-8")

    require("not measured search volumes" in signal_pack.get("purpose", "").lower(), "v86 signal purpose must keep qualitative-search-volume disclaimer")
    require(len(signal_pack.get("signals", [])) == 1, "v86 must add one coherent demand/friction signal, not a parallel engine")
    signal = signal_pack["signals"][0]
    require(signal.get("signal_id") == SID, "v86 signal id drifted")
    require(signal.get("priority_band") == "HIGH", "child extra-care/cost weak link should remain HIGH")
    for field in (
        "demand_signal", "friction_signal", "miss_consequence", "source_fragmentation",
        "language_accessibility_friction", "steps_to_action", "recurrence_signal",
        "current_product_coverage_gap",
    ):
        require(1 <= signal[field]["score"] <= 5, f"{field} score outside 1-5")
    require(signal["demand_signal"]["score"] >= 4 and signal["friction_signal"]["score"] >= 4, "HIGH signal needs strong demand+friction")
    require(OMV_URL in signal["primary_sources"] and MERK_URL in signal["primary_sources"], "both current child-benefit primary sources required")
    require("verify" in signal["truth_rule"].lower() and "do not" in signal["truth_rule"].lower(), "truth boundary must explicitly verify and forbid self-promotion")

    cases = scenario_pack.get("cases", [])
    by_id = {case["case_id"]: case for case in cases}
    require(len(cases) == 9 and set(by_id) == EXPECTED_CASES, "v86 must contain exactly the nine permanent cases")

    locks = {
        "lab-child-care-support-adhd-extra-care-v86-01": {
            "must_not_claim": ["diagnosis_alone_establishes_omvardnadsbidrag"],
            "expected_next_actions": ["show_current_forsakringskassan_omvardnadsbidrag_source"],
        },
        "lab-child-care-support-extra-costs-v86-02": {
            "must_not_claim": ["care_supervision_and_extra_costs_are_the_same_assessment_path", "any_extra_cost_is_automatically_qualifying"],
        },
        "lab-child-care-support-legacy-vardbidrag-v86-03": {
            "must_not_claim": ["new_vardbidrag_application_is_available"],
            "expected_next_actions": ["explain_that_current_routes_are_omvardnadsbidrag_and_merkostnadsersattning"],
        },
        "lab-child-care-support-vab-school-meeting-v86-04": {
            "must_not_claim": ["blanket_yes_or_no_vab_without_current_overlap_and_decision_context", "old_application_window_is_current_for_new_vab_days"],
            "expected_next_actions": ["verify_current_forsakringskassan_vab_overlap_rule"],
        },
        "lab-child-care-support-assistance-overlap-v86-05": {
            "must_not_claim": ["omvardnadsbidrag_duplicates_needs_already_covered_by_assistance", "personal_assistance_automatically_excludes_all_omvardnadsbidrag"],
            "expected_next_actions": ["preserve_existing_child_assistance_route", "explain_omvardnadsbidrag_only_for_needs_not_covered_by_assistance"],
        },
        "lab-child-care-support-professional-v86-07": {
            "expected_next_actions": ["do_not_open_personal_family_benefit_flow_from_professional_wording"],
        },
    }
    for cid, field_locks in locks.items():
        for field, tokens in field_locks.items():
            for token in tokens:
                require(token in by_id[cid][field], f"{cid}: missing locked {field} token {token}")

    require(by_id["lab-child-care-support-language-ar-v86-08"].get("language") == "ar", "Arabic parity case missing")
    require(by_id["lab-child-care-support-language-fa-v86-09"].get("language") == "fa", "Persian parity case missing")
    require(all(case.get("source_requirements") for case in cases), "every v86 case must require a source")

    require(len(mapping_pack.get("mappings", [])) == 1, "v86 mapping pack must stay single-signal")
    mapping = mapping_pack["mappings"][0]
    require(mapping.get("signal_id") == SID, "v86 mapping signal id drifted")
    require(set(mapping.get("regression_case_ids", [])) == EXPECTED_CASES, "v86 mapping must cover all nine scenarios")
    require(mapping.get("coverage_status") == "LEARNING_GUARDED_PUBLIC_ROUTE_PENDING_V86", "do not claim a public route before runtime is integrated")

    for record, support_id, source_url in (
        (omv, "se-forsakringskassan-omvardnadsbidrag", OMV_URL),
        (merk, "se-forsakringskassan-merkostnadsersattning-barn", MERK_URL),
    ):
        require(record.get("support_id") == support_id, f"support_id drifted for {support_id}")
        require(record.get("category") == "family_children", f"{support_id} category must stay family_children")
        require(record.get("provider", {}).get("name") == "Försäkringskassan", f"{support_id} provider drifted")
        require(record.get("source", {}).get("url") == source_url, f"{support_id} primary source drifted")
        verification = record.get("verification", {})
        require(verification.get("status") == "NEEDS_REVIEW", f"{support_id} must not self-promote to VERIFIED")
        require(verification.get("human_review_required") is True, f"{support_id} must require human review")
        require(verification.get("material_fields_verified") == [], f"{support_id} must not auto-verify material fields")

    omv_text = json.dumps(omv, ensure_ascii=False).lower()
    merk_text = json.dumps(merk, ensure_ascii=False).lower()
    require("diagnos" in omv_text and "diagnos" in merk_text, "diagnosis-not-entitlement boundary missing")
    require("vab" in omv_text and "assistans" in omv_text, "omvårdnadsbidrag overlap boundaries missing")
    require("extra kost" in merk_text or "merkost" in merk_text, "merkostnadsersättning cost boundary missing")

    # Keep volatile 2026 monetary values out of the new truth/eval package.
    combined = "\n".join(
        p.read_text(encoding="utf-8")
        for p in (SIGNAL, SCENARIOS, MAPPING, OMV, MERK, DOC)
    )
    for volatile in ("3 083", "3083", "6 167", "6167", "9 250", "9250", "12 333", "12333", "14 800", "14800", "3 453", "3453"):
        require(volatile not in combined, f"volatile current amount/threshold must not be hard-coded in v86 package: {volatile}")

    v85_ids = {c.get("case_id") for c in v85.get("cases", [])}
    require("lab-child-assistance-runtime-child-sv-v85-01" in v85_ids, "v86 must preserve the child-assistance context regression")
    require("LEARNING_GUARDED_PUBLIC_ROUTE_PENDING_V86" in doc, "coverage appendix must disclose pending public route")
    require("No `child-benefit` app" in doc, "same-product architecture boundary missing")

    forbidden_paths = [
        ROOT / "child-benefit.html",
        ROOT / "omvardnadsbidrag.html",
        ROOT / "client" / "child-benefit-app.js",
        ROOT / "client" / "omvardnadsbidrag-app.js",
    ]
    require(not any(path.exists() for path in forbidden_paths), "parallel child-benefit app detected")

    print("v86 child extra-care/cost learning guard: OK")
    print(f"signal={SID} cases={len(cases)} truth=NEEDS_REVIEW public_route=pending")


if __name__ == "__main__":
    main()
