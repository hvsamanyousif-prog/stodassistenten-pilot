#!/usr/bin/env python3
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
SUPPORT = ROOT / "data" / "supports"

RECORD = SUPPORT / "se-forsakringskassan-vab-under-12.json"
OLDER = SUPPORT / "se-forsakringskassan-vab-12-15.json"
SCENARIOS = EVAL / "scenario_lab_websignals_v88.json"
SIGNALS = EVAL / "demand_friction_signals_v88.json"
MAPPING = EVAL / "demand_friction_regression_map_v88.json"

UNDER12_URL = "https://www.forsakringskassan.se/privatperson/familj-och-barn/vab-for-barn-under-12-ar"
AGE12_URL = "https://www.forsakringskassan.se/privatperson/familj-och-barn/vab-for-barn-som-ar-12-ar-eller-aldre"
DEADLINE_URL = "https://www.forsakringskassan.se/privatperson/familj-och-barn/kortare-tid-att-ansoka-om-vab-10-dagar-och-kontaktdagar"
SID = "df-vab-current-deadline-boundary-v01"
EXPECTED_CASES = {
    "lab-vab-under12-standard-sv-v88-01",
    "lab-vab-under12-deadline-v88-02",
    "lab-vab-serious-illness-exception-v88-03",
    "lab-vab-pre-april-transition-v88-04",
    "lab-vab-age-13-route-v88-05",
    "lab-vab-missing-age-v88-06",
    "lab-vab-professional-false-positive-v88-07",
    "lab-vab-under12-language-ar-v88-08",
    "lab-vab-under12-language-fa-v88-09",
}


def load(path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def validate_record(record):
    require(record.get("support_id") == "se-forsakringskassan-vab-under-12", "under-12 support_id drifted")
    require(record.get("category") == "family_children", "VAB must remain in family_children")
    require(record.get("provider", {}).get("name") == "Försäkringskassan", "provider drifted")
    require(record.get("source", {}).get("source_id") == "se-forsakringskassan-benefits-a-z", "canonical source registry id drifted")
    require(record.get("source", {}).get("url") == UNDER12_URL, "under-12 primary source drifted")
    verification = record.get("verification", {})
    require(verification.get("status") == "NEEDS_REVIEW", "record must not self-promote to VERIFIED")
    require(verification.get("human_review_required") is True, "record must require human review")
    require(verification.get("material_fields_verified") == [], "AI must not auto-verify material fields")
    text = json.dumps(record, ensure_ascii=False).lower()
    require("1 april 2026" in text and "30 dagar" in text, "current ordinary VAB deadline boundary missing")
    require("90-dagars" in text or "90 dagar" in text, "pre-April transition boundary missing")
    require("allvarligt sjukt" in text, "serious-illness exception boundary missing")
    require("12" in text and "ålder" in text, "age-specific route boundary missing")
    require(record.get("benefit", {}).get("amount_text") is None, "volatile VAB amount must not be normalized")


def main():
    record = load(RECORD)
    older = load(OLDER)
    scenarios = load(SCENARIOS)
    signals = load(SIGNALS)
    mapping = load(MAPPING)

    validate_record(record)
    require(older.get("support_id") == "se-forsakringskassan-vab-12-15", "existing 12-15 truth must be preserved")
    require(older.get("source", {}).get("url") == AGE12_URL, "existing 12-15 primary source drifted")

    cases = scenarios.get("cases", [])
    by_id = {case.get("case_id"): case for case in cases}
    require(len(cases) == 9 and set(by_id) == EXPECTED_CASES, "v88 must contain exactly the nine permanent VAB cases")
    require(by_id["lab-vab-serious-illness-exception-v88-03"].get("expected_next_actions") == [
        "verify_current_forsakringskassan_serious_illness_exception",
        "do_not_apply_ordinary_deadline_blindly",
    ], "serious-illness fail-closed action drifted")
    require("use_under12_truth_for_age_13" in by_id["lab-vab-age-13-route-v88-05"].get("must_not_claim", []), "12-15 boundary regression missing")
    require("q_child_age_because_it_can_change_route_and_documents" in by_id["lab-vab-missing-age-v88-06"].get("expected_questions", []), "information-gain age question missing")
    require("do_not_open_personal_vab_flow_from_professional_wording" in by_id["lab-vab-professional-false-positive-v88-07"].get("expected_next_actions", []), "professional false-positive guard missing")
    require(by_id["lab-vab-under12-language-ar-v88-08"].get("language") == "ar", "Arabic parity case missing")
    require(by_id["lab-vab-under12-language-fa-v88-09"].get("language") == "fa", "Persian parity case missing")
    require(all(case.get("source_requirements") for case in cases), "every v88 scenario must require a source")

    require(len(signals.get("signals", [])) == 1, "v88 must add one coherent demand/friction signal")
    signal = signals["signals"][0]
    require(signal.get("signal_id") == SID and signal.get("priority_band") == "HIGH", "v88 signal id/priority drifted")
    require(UNDER12_URL in signal.get("primary_sources", []), "under-12 primary source missing from signal")
    require(DEADLINE_URL in signal.get("primary_sources", []), "deadline primary source missing from signal")
    require(set(signal.get("regression_case", [])) == EXPECTED_CASES, "signal must map to every v88 regression")
    require("not measured search volumes" in signals.get("purpose", "").lower(), "demand signal must keep qualitative disclaimer")

    require(len(mapping.get("mappings", [])) == 1, "v88 mapping must stay single-signal")
    mapped = mapping["mappings"][0]
    require(mapped.get("signal_id") == SID, "mapping signal id drifted")
    require(set(mapped.get("regression_case_ids", [])) == EXPECTED_CASES, "mapping must cover every v88 regression")
    require(mapped.get("coverage_status") == "TRUTH_AND_REGRESSION_GUARDED_V88", "coverage status drifted")

    # Red Team: truth must fail closed if a future edit self-promotes or loses a critical exception.
    promoted = copy.deepcopy(record)
    promoted["verification"]["status"] = "VERIFIED"
    try:
        validate_record(promoted)
    except AssertionError:
        pass
    else:
        raise AssertionError("red-team mutation: self-promoted truth was accepted")

    no_exception = copy.deepcopy(record)
    no_exception["application"]["deadline_text"] = "För vab-dagar från 1 april 2026 ska ansökan göras senast 30 dagar efter första vab-dagen."
    no_exception["verification"]["review_notes"] = "Kontrollera aktuell ansökningstid."
    no_exception["eligibility"]["missing_information_questions"] = [
        q for q in no_exception["eligibility"]["missing_information_questions"] if q.get("question_id") != "vab_under12.serious_illness"
    ]
    for condition in no_exception["eligibility"]["conditions"]:
        condition["notes"] = (condition.get("notes") or "").replace("allvarligt sjukt", "specialfall")
    try:
        validate_record(no_exception)
    except AssertionError:
        pass
    else:
        raise AssertionError("red-team mutation: lost serious-illness exception was accepted")

    forbidden = [ROOT / "vab-app.html", ROOT / "client" / "vab-app.js", ROOT / "data" / "vab_truth_store.json"]
    require(not any(path.exists() for path in forbidden), "parallel VAB app/truth store detected")

    print("v88 VAB current-rule truth/regression guard: OK")
    print(f"signal={SID} cases={len(cases)} truth=NEEDS_REVIEW")


if __name__ == "__main__":
    main()
