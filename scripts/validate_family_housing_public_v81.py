#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "client/family-housing-guidance.js"
TEST = ROOT / "client/family-housing-guidance.test.cjs"
BUILD = ROOT / "scripts/build_public_pilot.py"
PERSON = ROOT / "person-pilot.html"
SUPPORT = ROOT / "data/supports/se-forsakringskassan-bostadsbidrag-barnfamiljer.json"
SCENARIOS = ROOT / "data/evals/scenario_lab_websignals_v81.json"
SIGNALS = ROOT / "data/evals/demand_friction_signals_v81.json"
REGRESSION_MAP = ROOT / "data/evals/demand_friction_regression_map_v81.json"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    for path in (MODULE, TEST, BUILD, PERSON, SUPPORT, SCENARIOS, SIGNALS, REGRESSION_MAP):
        require(path.is_file(), f"missing v81 dependency: {path.relative_to(ROOT)}")

    support = load(SUPPORT)
    verification = support.get("verification", {})
    require(verification.get("status") == "NEEDS_REVIEW", "family housing truth must remain NEEDS_REVIEW")
    require(verification.get("human_review_required") is True, "family housing truth must require human review")
    require(verification.get("material_fields_verified") == [], "AI must not self-promote family housing material fields")

    scenarios = load(SCENARIOS).get("cases", [])
    ids = [case.get("case_id") for case in scenarios]
    required_ids = {
        "lab-family-housing-public-main-v81-01",
        "lab-family-housing-no-child-false-positive-v81-02",
        "lab-family-housing-housing-not-pressure-v81-03",
        "lab-family-housing-unemployed-priority-v81-04",
        "lab-family-housing-2027-change-collision-v81-05",
        "lab-family-housing-professional-false-positive-v81-06",
        "lab-family-housing-language-ar-v81-07",
        "lab-family-housing-language-fa-v81-08",
    }
    require(set(ids) == required_ids, "v81 must keep the complete eight-case regression package without duplicates")
    for case in scenarios:
        for field in ("actor_type", "language", "story", "expected_support_areas", "must_not_claim", "expected_questions", "expected_next_actions", "source_requirements"):
            require(field in case and case[field], f"{case.get('case_id')}: missing {field}")

    signals = load(SIGNALS).get("signals", [])
    require(len(signals) == 1, "v81 should add one deduplicated demand/friction signal")
    signal = signals[0]
    require(signal.get("signal_id") == "df-family-housing-public-dead-end-v81", "unexpected v81 signal id")
    require(signal.get("priority_band") == "HIGH", "verified public dead-end should stay HIGH priority")
    for metric in ("demand_signal", "friction_signal", "miss_consequence", "source_fragmentation", "language_accessibility_friction", "steps_to_action", "recurrence_signal", "current_product_coverage_gap"):
        require(isinstance(signal.get(metric, {}).get("score"), int), f"missing score for {metric}")
    truth_rule = signal.get("truth_rule", "")
    require("Verify" in truth_rule and "Do not infer eligibility" in truth_rule, "truth rule must be explicit and machine-auditable")
    require("2027" in truth_rule, "future-rule collision must remain explicit")

    mapping = load(REGRESSION_MAP).get("mappings", [])
    require(len(mapping) == 1, "v81 regression map should be deduplicated")
    require(mapping[0].get("signal_id") == signal.get("signal_id"), "signal and regression map must align")
    require(set(mapping[0].get("regression_case_ids", [])) == required_ids, "all v81 cases must be mapped permanently")
    require(mapping[0].get("product_miss"), "regression map must preserve the product miss")

    module = MODULE.read_text(encoding="utf-8")
    require("scenario !== 'general'" in module, "family housing runtime must stay inside the existing general person flow")
    require("opts.children === 'yes'" in module and "opts.housing === 'yes'" in module, "runtime must reuse already-collected children and housing facts")
    require("opts.money === 'tight'" in module and "opts.money === 'some'" in module, "runtime must require economic-pressure context")
    require("opts.work === 'unemployed'" in module and "opts.work === 'akassa'" in module, "runtime must preserve unemployment/a-kassa higher-priority ordering")
    require("FAMILY_HOUSING_URL" in module, "runtime must link to the current primary-source route")
    for forbidden in ("6800", "7900", "8600", "40000", "21000", "URLSearchParams", "FEEDBACK_ENDPOINT"):
        require(forbidden not in module, f"public v81 runtime contains forbidden volatile/sensitive coupling: {forbidden}")

    person = PERSON.read_text(encoding="utf-8")
    require("children:'Finns barn i hushållet?'" in person, "public flow must still collect the existing children signal")
    require("housing:'Är boendekostnaden en stor del av ekonomin?'" in person, "public flow must still collect the existing housing-pressure signal")
    require("function getRows()" in person, "same existing result pipeline must remain present")

    build = BUILD.read_text(encoding="utf-8")
    require('client/family-housing-guidance.js' in build, "public build must ship v81 in the same person surface")

    for forbidden_path in (
        ROOT / "family-housing.html",
        ROOT / "bostadsbidrag-barnfamilj.html",
        ROOT / "client/family-housing-app.js",
        ROOT / "client/family-housing-matcher.js",
    ):
        require(not forbidden_path.exists(), f"parallel family housing product forbidden: {forbidden_path.name}")

    print("family housing public route v81: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
