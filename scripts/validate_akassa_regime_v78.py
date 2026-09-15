#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCENARIOS = ROOT / "data/evals/scenario_lab_websignals_v78.json"
SIGNALS = ROOT / "data/evals/demand_friction_signals_v78.json"
REGMAP = ROOT / "data/evals/demand_friction_regression_map_v78.json"
BENCH = ROOT / "data/evals/cases/akassa.json"
EXPANSION = ROOT / "data/evals/expansion/akassa_v02.json"
SUPPORT = ROOT / "data/supports/se-arbetsloshetsersattning-a-kassa.json"
PERSON = ROOT / "person-pilot.html"
BUILD = ROOT / "scripts/build_public_pilot.py"
PUBLIC_RUNTIME = ROOT / "client/unemployment-regime-guidance.js"
DUPLICATE_V79_MAP = ROOT / "data/evals/demand_friction_regression_map_v79.json"


def load(path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    scenarios = load(SCENARIOS)
    signals = load(SIGNALS)
    regmap = load(REGMAP)
    bench = load(BENCH)
    expansion = load(EXPANSION)
    support = load(SUPPORT)
    person = PERSON.read_text(encoding="utf-8")

    cases = scenarios.get("cases", [])
    require(len(cases) == 8, "v78 must keep exactly eight permanent unemployment scenarios")
    case_ids = {c.get("case_id") for c in cases}
    require(len(case_ids) == 8, "v78 scenario ids must be unique")
    required_ids = {
        "lab-akassa-newly-unemployed-v78-01",
        "lab-akassa-old-ongoing-period-v78-02",
        "lab-akassa-new-period-income-regime-v78-03",
        "lab-akassa-unemployed-sick-overlap-v78-04",
        "lab-akassa-basic-needs-overlap-v78-05",
        "lab-akassa-professional-false-positive-v78-06",
        "lab-akassa-language-ar-v78-07",
        "lab-akassa-language-fa-v78-08",
    }
    require(case_ids == required_ids, "v78 scenario set drifted")
    require({c.get("language") for c in cases} >= {"sv", "ar", "fa"}, "sv/ar/fa parity scenarios missing")
    for case in cases:
        require(case.get("source_requirements"), f"{case.get('case_id')} must have source requirements")
        require(case.get("must_not_claim"), f"{case.get('case_id')} must define forbidden claims")
        require(case.get("expected_next_actions"), f"{case.get('case_id')} must define safe next actions")

    signal_list = signals.get("signals", [])
    require(len(signal_list) == 1, "v78 must add one deduplicated demand/friction signal")
    signal = signal_list[0]
    require(signal.get("signal_id") == "df-unemployment-two-rule-regime-v01", "unexpected v78 signal id")
    require(signal.get("priority_band") == "HIGH", "verified unemployment truth drift should remain HIGH priority")
    require(signal.get("product_miss"), "v78 signal must record the product miss")
    require(set(signal.get("regression_case", [])) == case_ids, "v78 signal must map all permanent scenarios")
    truth_rule = signal.get("truth_rule", "").lower()
    for token in ("verify", "current", "do not infer", "1 october 2025"):
        require(token in truth_rule, f"truth rule missing required guard: {token}")
    for volatile in ("34000", "34 000", "120000", "120 000"):
        require(volatile not in json.dumps(signals, ensure_ascii=False), f"v78 signal must not hard-code benefit thresholds: {volatile}")

    mappings = regmap.get("mappings", [])
    require(len(mappings) == 1, "v78 regression map must have one mapping")
    mapping = mappings[0]
    require(mapping.get("signal_id") == signal["signal_id"], "v78 regression map signal mismatch")
    require(mapping.get("product_miss"), "v78 regression map must preserve product_miss")
    require(set(mapping.get("regression_case_ids", [])) == case_ids, "v78 regression map must cover every v78 case")

    coverage_status = mapping.get("coverage_status")
    allowed_statuses = {
        "LEARNING_GUARDED_PUBLIC_COPY_FIX_PENDING",
        "PUBLIC_RUNTIME_GUARDED_V79",
    }
    require(coverage_status in allowed_statuses, f"unexpected a-kassa learning lifecycle status: {coverage_status}")

    for label, payload in (("canonical", bench), ("expansion", expansion)):
        benchmark_text = json.dumps(payload, ensure_ascii=False)
        require("work_history" not in benchmark_text and "q_work_history" not in benchmark_text, f"{label} a-kassa benchmark still encodes generic legacy work-history semantics")
        require("existing_pre_2025_10_01_benefit_period" in benchmark_text or "benefit_period_start" in benchmark_text, f"{label} a-kassa benchmark must model the dual-regime boundary")
        require("register_employment_service_first_unemployed_day" in benchmark_text or "prepare_registration_but_submit_on_first_unemployed_day" in benchmark_text, f"{label} a-kassa benchmark must preserve first-day registration semantics")

    rules = {r.get("rule_id"): r for r in support.get("eligibility", {}).get("conditions", [])}
    questions = {q.get("question_id"): q for q in support.get("eligibility", {}).get("missing_information_questions", [])}
    require("ak.income_condition" in rules, "support truth must retain the income-condition rule")
    require("ak.current_period" in questions, "support truth must retain the old/new benefit-period question")
    require(support.get("verification", {}).get("status") == "NEEDS_REVIEW", "a-kassa support truth must remain review-gated")
    require(support.get("verification", {}).get("human_review_required") is True, "a-kassa support truth must require human review")
    require(support.get("verification", {}).get("material_fields_verified") == [], "v78 must not self-promote material a-kassa fields to VERIFIED")

    forbidden_paths = [
        ROOT / "akassa.html",
        ROOT / "a-kassa.html",
        ROOT / "client/akassa-app.js",
        ROOT / "client/unemployment-app.js",
    ]
    require(not any(path.exists() for path in forbidden_paths), "parallel a-kassa/unemployment app detected")
    require(not DUPLICATE_V79_MAP.exists(), "same a-kassa learning signal must not be duplicated in a v79 mapping pack")

    stale_public_copy = "Regler beror på medlemskap, arbetsvillkor och historik." in person
    if coverage_status == "LEARNING_GUARDED_PUBLIC_COPY_FIX_PENDING":
        require(stale_public_copy, "public copy changed while the learning record still says the fix is pending")
        print("PUBLIC_COPY_DRIFT_PRESENT: static person-pilot still uses legacy generic wording and no governed public runtime has been recorded yet.")
    else:
        require(PUBLIC_RUNTIME.is_file(), "PUBLIC_RUNTIME_GUARDED_V79 requires the governed unemployment runtime")
        runtime_evidence = set(mapping.get("runtime_evidence", []))
        require("client/unemployment-regime-guidance.js" in runtime_evidence, "public runtime evidence missing from the single learning record")
        require("client/unemployment-regime-guidance.test.cjs" in runtime_evidence, "public runtime regression evidence missing from the single learning record")
        build_text = BUILD.read_text(encoding="utf-8")
        require("UNEMPLOYMENT_REGIME_GUIDANCE_PATH" in build_text, "governed public runtime is not wired by the shared public build")
        print("PUBLIC_COPY_RUNTIME_GUARDED: v79 replaces stale unemployment result presentation through the shared person-pilot build; canonical eligibility truth remains review-gated.")

    print("v78 a-kassa rule-regime learning guard: OK")
    print(f"cases={len(cases)} signal={signal['signal_id']} coverage={coverage_status} truth_status={support['verification']['status']}")


if __name__ == "__main__":
    main()
