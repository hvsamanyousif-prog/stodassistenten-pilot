#!/usr/bin/env python3
"""Lock v38 pension-housing product and learning semantics in the same system."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
MODULE = ROOT / "client" / "pension-housing.js"
TEST = ROOT / "client" / "pension-housing.test.cjs"
SUPPORT = ROOT / "data" / "supports" / "se-pensionsmyndigheten-bostadstillagg.json"
BUILD = ROOT / "scripts" / "build_public_pilot.py"

scenario = json.loads((EVAL / "scenario_lab_websignals_v38.json").read_text(encoding="utf-8"))
cases = {case["case_id"]: case for case in scenario["cases"]}
expected_ids = {
    "lab-pension-low-income-high-housing-cost-v38-01",
    "lab-pension-housing-stale-age-source-v38-02",
    "lab-nonpension-bostadstillagg-authority-boundary-v38-03",
}
assert set(cases) == expected_ids

main = cases["lab-pension-low-income-high-housing-cost-v38-01"]
for token in [
    "pensioner_status_alone_proves_bostadstillagg_eligibility",
    "a_specific_amount_can_be_promised_from_a_short_story",
    "housing_cost_income_assets_or_household_details_should_be_collected_in_the_public_handoff_url_or_feedback",
    "the_product_should_ask_municipality_size_living_alone_and_dental_need_before_the_route_changing_age_full_pension_and_residence_facts",
]:
    assert token in main["must_not_claim"]
for token in [
    "q_is_person_67_or_older",
    "q_is_full_public_pension_including_premium_pension_withdrawn",
    "q_does_person_live_in_sweden",
]:
    assert token in main["expected_questions"]

stale = cases["lab-pension-housing-stale-age-source-v38-02"]
assert "the_2025_age_66_rule_should_be_backported_into_the_2026_product_route" in stale["must_not_claim"]
assert "prefer_the_current_pensionsmyndigheten_web_page_for_the_2026_main_route" in stale["expected_next_actions"]

boundary = cases["lab-nonpension-bostadstillagg-authority-boundary-v38-03"]
assert "every_bostadstillagg_question_should_route_to_pensionsmyndigheten_pensioner_flow" in boundary["must_not_claim"]
assert "do_not_trigger_the_pension_housing_route_without_pension_context" in boundary["expected_next_actions"]

signal_pack = json.loads((EVAL / "demand_friction_signals_v24.json").read_text(encoding="utf-8"))
assert len(signal_pack["signals"]) == 1
signal = signal_pack["signals"][0]
assert signal["signal_id"] == "df-pension-housing-low-income-source-recency-v01"
assert signal["priority_band"] == "HIGH"
assert "not measured search volumes" in signal_pack["scoring"]["priority_rule"]
assert all(score["score"] >= 4 for key, score in signal.items() if key in {
    "demand_signal", "friction_signal", "miss_consequence", "source_fragmentation",
    "language_accessibility_friction", "steps_to_action", "recurrence_signal", "current_product_coverage_gap"
})
assert any("reddit.com" in url or "lawline.se" in url for url in signal["discovery_sources"])
assert all("reddit.com" not in url and "lawline.se" not in url for url in signal["primary_sources"])
assert all("pensionsmyndigheten.se" in url for url in signal["primary_sources"])
assert "discovery" in signal["truth_rule"].lower()
assert "primary" in signal["truth_rule"].lower()

mapping_pack = json.loads((EVAL / "demand_friction_regression_map_v18.json").read_text(encoding="utf-8"))
assert len(mapping_pack["mappings"]) == 1
mapping = mapping_pack["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert set(mapping["regression_case_ids"]) == expected_ids
assert "stale official pdf" in mapping["fix_or_guardrail"].lower()
assert "raw stories" in mapping["privacy_guardrail"].lower()
assert "do not promote" in mapping["truth_guardrail"].lower()

module = MODULE.read_text(encoding="utf-8")
for token in [
    "focus: 'pension_housing'",
    "qAge",
    "qFullPension",
    "qResidence",
    "CALC_URL",
    "flow:'pension_housing'",
    "NON_PENSION_BENEFIT_PATTERNS",
]:
    assert token in module, f"missing runtime guard: {token}"
for forbidden in ["rent_amount", "asset_amount", "pension_amount", "household_income"]:
    assert forbidden not in module

build = BUILD.read_text(encoding="utf-8")
assert 'PENSION_HOUSING_PATH = "client/pension-housing.js"' in build
assert "PENSION_HOUSING_PATH" in build

support = json.loads(SUPPORT.read_text(encoding="utf-8"))
assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["material_fields_verified"] == []
assert support["audience"]["age_min"] == 67

proc = subprocess.run(["node", str(TEST)], cwd=ROOT, capture_output=True, text=True, check=False)
assert proc.returncode == 0, proc.stderr or proc.stdout

print("pension housing v38: OK (same product; current-source age guard; structured privacy-safe feedback; truth remains review-gated)")
