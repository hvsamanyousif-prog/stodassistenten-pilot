#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCENARIOS = ROOT / "data/evals/scenario_lab_websignals_v76.json"
SIGNALS = ROOT / "data/evals/demand_friction_signals_v76.json"
REG_MAP = ROOT / "data/evals/demand_friction_regression_map_v76.json"
COVERAGE = ROOT / "docs/PILOT_COVERAGE_MATRIX_V76_APPENDIX.md"


def load(path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    scenarios = load(SCENARIOS)
    signals = load(SIGNALS)
    reg_map = load(REG_MAP)
    coverage = COVERAGE.read_text(encoding="utf-8")

    cases = scenarios.get("cases", [])
    require(len(cases) == 8, "v76 must contain exactly eight permanent healthcare-cost scenarios")
    ids = [c.get("case_id") for c in cases]
    require(len(ids) == len(set(ids)), "v76 scenario ids must be unique")
    required_ids = {
        "lab-health-cost-primary-care-v76-01",
        "lab-health-cost-frikort-medicine-boundary-v76-02",
        "lab-health-cost-prescription-medicine-v76-03",
        "lab-health-cost-dental-overlap-v76-04",
        "lab-health-cost-basic-needs-overlap-v76-05",
        "lab-health-cost-professional-false-positive-v76-06",
        "lab-health-cost-language-ar-v76-07",
        "lab-health-cost-language-fa-v76-08",
    }
    require(set(ids) == required_ids, "v76 scenario set drifted")

    for case in cases:
        for key in ("actor_type", "language", "story", "expected_support_areas", "must_not_claim", "expected_questions", "expected_next_actions", "source_requirements"):
            require(case.get(key), f"{case.get('case_id')}: missing {key}")
        require(case["must_not_claim"], f"{case['case_id']}: must_not_claim cannot be empty")
        require(case["source_requirements"], f"{case['case_id']}: source_requirements cannot be empty")

    by_id = {c["case_id"]: c for c in cases}
    require("outpatient_frikort_automatically_covers_prescription_medicines" in by_id["lab-health-cost-frikort-medicine-boundary-v76-02"]["must_not_claim"], "frikort/medicine separation guard missing")
    require("reuse_existing_dental_cost_route" in by_id["lab-health-cost-dental-overlap-v76-04"]["expected_next_actions"], "dental must reuse existing route")
    require("keep_economic_assistance_or_acute_basic_needs_path_visible" in by_id["lab-health-cost-basic-needs-overlap-v76-05"]["expected_next_actions"], "basic-needs overlap must stay visible")
    require(by_id["lab-health-cost-professional-false-positive-v76-06"]["expected_support_areas"] == ["no_personal_healthcare_cost_route_without_personal_need_signal"], "professional false positive must fail closed")
    require({by_id["lab-health-cost-language-ar-v76-07"]["language"], by_id["lab-health-cost-language-fa-v76-08"]["language"]} == {"ar", "fa"}, "Arabic/Persian parity guard missing")

    sigs = signals.get("signals", [])
    require(len(sigs) == 1, "v76 must contain one deduplicated demand/friction signal")
    signal = sigs[0]
    require(signal.get("signal_id") == "df-healthcare-cost-protection-boundary-v01", "unexpected v76 signal id")
    require(signal.get("product_miss"), "v76 demand/friction signal must name the product miss")
    require(signal.get("priority_band") == "HIGH", "verified v76 gap should remain HIGH priority")
    for score_key in ("demand_signal", "friction_signal", "miss_consequence", "source_fragmentation", "language_accessibility_friction", "steps_to_action", "recurrence_signal", "current_product_coverage_gap"):
        block = signal.get(score_key, {})
        require(isinstance(block.get("score"), int) and 1 <= block["score"] <= 5, f"invalid {score_key} score")
        require(block.get("basis"), f"missing {score_key} basis")
    require(set(signal.get("regression_case", [])) == required_ids, "signal must map to all v76 scenarios")
    primary = signal.get("primary_sources", [])
    require(any("1177.se" in u for u in primary), "1177 primary source missing")
    require(any("ehalsomyndigheten.se" in u for u in primary), "E-hälsomyndigheten primary source missing")
    require(all("reddit.com" not in u for u in primary), "community source must never be promoted to primary source")
    require(any("reddit.com" in u for u in signal.get("discovery_sources", [])), "discovery-only community signal expected")
    truth = signal.get("truth_rule", "").lower()
    require("primary source" in truth and "separate" in truth and "exact" in truth, "truth rule must explicitly require source verification and separate cost paths")

    mappings = reg_map.get("mappings", [])
    require(len(mappings) == 1, "v76 regression map must contain one mapping")
    mapping = mappings[0]
    require(mapping.get("signal_id") == signal["signal_id"], "regression map signal id mismatch")
    require(mapping.get("product_miss"), "regression mapping must preserve product_miss")
    require(set(mapping.get("regression_case_ids", [])) == required_ids, "regression map must cover all v76 cases")
    require(mapping.get("coverage_status") == "LEARNING_GUARDED_PUBLIC_ROUTE_PENDING", "do not claim the public healthcare-cost route is shipped before it is wired")

    lower_coverage = coverage.lower()
    require("same stödassistenten" in lower_coverage, "coverage appendix must preserve single-product architecture")
    require("learning_guarded_public_route_pending" in lower_coverage, "coverage appendix must expose the remaining public-route gap")
    require("reuse existing dental" in lower_coverage or "reuse the existing dental" in lower_coverage, "coverage appendix must forbid dental duplication")
    require("exact patient fees" in lower_coverage and "primary source" in lower_coverage, "coverage appendix must fail closed on volatile numeric claims")

    print("v76 healthcare-cost navigation learning guard: OK")
    print(f"scenarios={len(cases)} signal={signal['signal_id']} status={mapping['coverage_status']}")


if __name__ == "__main__":
    main()
