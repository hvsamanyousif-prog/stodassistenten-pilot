#!/usr/bin/env python3
"""Lock v67 student sickness learning into the existing student_csn product."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
CLIENT = ROOT / "client" / "student-finance-guidance.js"
TEST = ROOT / "client" / "student-finance-guidance.test.cjs"
APPENDIX = ROOT / "docs" / "PILOT_COVERAGE_MATRIX_V67_APPENDIX.md"

scenario = json.loads((EVAL / "scenario_lab_websignals_v67.json").read_text(encoding="utf-8"))
signal_doc = json.loads((EVAL / "demand_friction_signals_v67.json").read_text(encoding="utf-8"))
map_doc = json.loads((EVAL / "demand_friction_regression_map_v67.json").read_text(encoding="utf-8"))
client = CLIENT.read_text(encoding="utf-8")
test = TEST.read_text(encoding="utf-8")
appendix = APPENDIX.read_text(encoding="utf-8")

expected_ids = {
    "lab-student-sickness-unknown-study-context-v67-01",
    "lab-student-sickness-work-combination-v67-02",
    "lab-student-sickness-gymnasium-v67-03",
    "lab-student-sickness-abroad-v67-04",
    "lab-student-vab-not-own-sickness-v67-05",
    "lab-student-sickness-research-false-positive-v67-06",
    "lab-student-sickness-language-ar-v67-07",
    "lab-student-sickness-language-fa-v67-08",
}
cases = {case["case_id"]: case for case in scenario.get("cases", [])}
assert set(cases) == expected_ids, f"v67 scenario ids drifted: {sorted(cases)}"
assert all(case.get("source_requirements") for case in cases.values()), "every v67 scenario needs a source requirement"

assert len(signal_doc.get("signals", [])) == 1
signal = signal_doc["signals"][0]
assert signal["signal_id"] == "df-student-sickness-study-vs-work-vab-v01"
assert signal["priority_band"] == "HIGH"
assert "not measured search volumes" in signal_doc["purpose"]
assert "not measured search volumes" in signal_doc["scoring"]["priority_rule"]
assert any("reddit.com" in url for url in signal["discovery_sources"]), "community discovery evidence missing"
assert all("reddit.com" not in url for url in signal["primary_sources"]), "community source leaked into truth sources"
assert all(host in " ".join(signal["primary_sources"]) for host in ["csn.se", "forsakringskassan.se"])
assert set(signal["regression_case"]) == expected_ids

assert len(map_doc.get("mappings", [])) == 1
mapping = map_doc["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert set(mapping["regression_case_ids"]) == expected_ids
assert mapping["coverage_status"] == "GUARDED_PUBLIC_ROUTE_READY"
assert "same actor_type=student" in mapping["fix_or_guardrail"]
assert "focus=student_csn" in mapping["fix_or_guardrail"]

for token in [
    "topic === 'sickness'",
    "nextSickness",
    "detectStudyContext",
    "detectWorkAlongside",
    "study_context=",
    "study_work=",
    "flow:'student_csn'",
    "https://www.csn.se/om-nagot-hander-eller-andras/sjuk",
    "https://www.forsakringskassan.se/privatperson/sjuk-eller-skadad/ersattning-nar-du-ar-sjuk-eller-skadad-sjukpenning/om-du-blir-sjuk-nar-du-studerar",
]:
    assert token in client, f"v67 public route token missing: {token}"

for forbidden in [
    "diagnosis=",
    "sgi=",
    "medical_certificate=",
    "employer=",
    "story=",
    "situation=",
]:
    assert forbidden not in client, f"sensitive handoff field leaked into runtime: {forbidden}"
    assert forbidden in test, f"privacy regression must explicitly test forbidden field: {forbidden}"

for token in [
    "Jag skriver uppsats om sjukskrivna studenter.",
    "Jag studerar och mitt barn är sjukt så jag behöver vabba.",
    "sickness",
    "gymnasium_sweden",
    "abroad",
]:
    assert token in test, f"red-team unit regression missing: {token}"

assert "Ingen separat student-sjuk" in appendix
assert "Feedback är lärsignal, aldrig sanningskälla" in appendix
assert "Diagnos, SGI, läkarintyg" in appendix

print("student sickness v67: OK (same student_csn product; source-led; VAB/research fail closed; privacy guarded)")
