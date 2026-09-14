#!/usr/bin/env python3
"""Guard v44 caregiver route split in the single Stödassistenten product."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
MODULE = ROOT / "client" / "relative-care.js"
TEST = ROOT / "client" / "relative-care.test.cjs"
SUPPORT = ROOT / "data" / "supports" / "se-socialtjanstlagen-anhorigstod-stodkontakt.json"
FK_SUPPORT = ROOT / "data" / "supports" / "se-forsakringskassan-narstaendepenning.json"
V44 = EVAL / "scenario_lab_websignals_v44.json"
SIGNALS = EVAL / "demand_friction_signals_v28.json"
MAP = EVAL / "demand_friction_regression_map_v22.json"
MATRIX = ROOT / "docs" / "PILOT_COVERAGE_MATRIX.md"

for path in [MODULE, TEST, SUPPORT, FK_SUPPORT, V44, SIGNALS, MAP, MATRIX]:
    assert path.exists(), f"missing v44 asset: {path.relative_to(ROOT)}"

syntax = subprocess.run(["node", "--check", str(MODULE)], capture_output=True, text=True, check=False)
assert syntax.returncode == 0, syntax.stderr or syntax.stdout
runtime = subprocess.run(["node", str(TEST)], capture_output=True, text=True, check=False)
assert runtime.returncode == 0, runtime.stderr or runtime.stdout
assert "relative-care runtime: OK" in runtime.stdout

module = MODULE.read_text(encoding="utf-8")
for required in [
    "detectContext",
    "near_relative_benefit",
    "municipal_support",
    "care_context",
    "Socialtjänstlag",
    "13 kap. 9 §",
    "stödkontakt",
    "sfs-2025-400",
    "forsakringskassan.se",
    "1177.se",
]:
    assert required in module, f"missing v44 runtime contract: {required}"
assert "relative-care-pilot.html" not in module, "v44 must extend same product, not create caregiver app"
assert "fetch(" not in module, "public module must not create a competing client-side truth fetcher"
assert "localStorage" not in module and "sessionStorage" not in module
for forbidden in ["raw_story=", "diagnosis=", "name=", "employer=", "work_schedule=", "municipality_case="]:
    assert forbidden not in module, f"forbidden caregiver handoff field: {forbidden}"
assert "sv:" in module and "ar:" in module and "fa:" in module

support = json.loads(SUPPORT.read_text(encoding="utf-8"))
assert support["support_id"] == "se-socialtjanstlagen-anhorigstod-stodkontakt"
assert support["provider"]["provider_type"] == "municipality"
assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["material_fields_verified"] == []
assert support["lifecycle"]["valid_from"] == "2026-07-01"
assert support["source"]["url"].startswith("https://www.riksdagen.se/")
assert support["eligibility"]["missing_information_questions"][0]["question_id"] == "caregiver.municipal.scope"
assert support["benefit"]["amount_text"] is None

fk_support = json.loads(FK_SUPPORT.read_text(encoding="utf-8"))
assert fk_support["verification"]["status"] == "NEEDS_REVIEW"
assert fk_support["verification"]["material_fields_verified"] == []

v44 = json.loads(V44.read_text(encoding="utf-8"))
cases = {case["case_id"]: case for case in v44["cases"]}
expected_ids = {
    "lab-relative-older-parent-municipal-support-v44-01",
    "lab-relative-longterm-disability-support-contact-v44-02",
    "lab-relative-life-threatening-income-route-v44-03",
}
assert set(cases) == expected_ids
older = cases["lab-relative-older-parent-municipal-support-v44-01"]
assert "municipal_caregiver_support_is_the_same_as_near_relative_benefit" in older["must_not_claim"]
assert "municipality_must_pay_a_cash_caregiver_allowance" in older["must_not_claim"]
assert older["expected_questions"] == ["q_is_person_older_long_term_ill_or_disabled_only_if_scope_not_already_clear"]
assert "route_to_the_users_municipality_for_caregiver_support_or_support_contact" in older["expected_next_actions"]
longterm = cases["lab-relative-longterm-disability-support-contact-v44-02"]
assert "life_threatening_condition_is_required_for_all_caregiver_support" in longterm["must_not_claim"]
assert "when_scope_is_explicit_skip_life_threatening_and_work_absence_questions_for_the_municipal_route" in longterm["expected_next_actions"]
benefit = cases["lab-relative-life-threatening-income-route-v44-03"]
assert "q_has_healthcare_described_condition_as_life_threatening" in benefit["expected_questions"]
assert "q_must_helper_refrain_from_work_a_kassa_or_parental_benefit" in benefit["expected_questions"]
assert "municipal_caregiver_support_and_forsakringskassan_share_one_eligibility_decision" in benefit["must_not_claim"]

signals = json.loads(SIGNALS.read_text(encoding="utf-8"))
assert "not measured search volumes" in signals["scoring"]["priority_rule"]
assert len(signals["signals"]) == 1
signal = signals["signals"][0]
assert signal["signal_id"] == "df-caregiver-municipal-vs-benefit-route-v01"
assert signal["priority_band"] == "HIGH"
assert signal["current_product_coverage_gap"]["score"] == 5
assert all("reddit.com" in url for url in signal["discovery_sources"])
assert all("reddit.com" not in url for url in signal["primary_sources"])
assert any("riksdagen.se" in url for url in signal["primary_sources"])
assert any("forsakringskassan.se" in url for url in signal["primary_sources"])
assert "discovery" in signal["truth_rule"].lower()
assert "verify" in signal["truth_rule"].lower()

mapping = json.loads(MAP.read_text(encoding="utf-8"))["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert set(mapping["regression_case_ids"]) == expected_ids
assert "No caregiver app" in mapping["fix_or_guardrail"]
assert "coarse route family" in mapping["privacy_guardrail"]
assert "NEEDS_REVIEW" in mapping["truth_guardrail"]
assert "Socialtjänstlag 13 kap. 9 §" in mapping["truth_guardrail"]

matrix = MATRIX.read_text(encoding="utf-8")
for token in ["v44", "kommunalt anhörigstöd", "stödkontakt", "care_context", "NEEDS_REVIEW"]:
    assert token in matrix, f"coverage matrix missing v44 token: {token}"

print("relative-care v44 validation: OK (municipal caregiver support split + benefit boundary + review-gated truth)")
