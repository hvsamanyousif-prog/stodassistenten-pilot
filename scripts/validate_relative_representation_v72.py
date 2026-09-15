#!/usr/bin/env python3
"""Lock v72 representation/fullmakt boundaries into the existing relative_care product."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
CLIENT = ROOT / "client" / "relative-care.js"
TEST = ROOT / "client" / "relative-care.test.cjs"
APPENDIX = ROOT / "docs" / "PILOT_COVERAGE_MATRIX_V72_APPENDIX.md"

scenario = json.loads((EVAL / "scenario_lab_websignals_v72.json").read_text(encoding="utf-8"))
signal_doc = json.loads((EVAL / "demand_friction_signals_v72.json").read_text(encoding="utf-8"))
map_doc = json.loads((EVAL / "demand_friction_regression_map_v72.json").read_text(encoding="utf-8"))
client = CLIENT.read_text(encoding="utf-8")
test = TEST.read_text(encoding="utf-8")
appendix = APPENDIX.read_text(encoding="utf-8")

expected_ids = {
    "lab-relative-relationship-not-automatic-authority-v72-01",
    "lab-relative-existing-power-scope-v72-02",
    "lab-relative-healthcare-contact-not-consent-v72-03",
    "lab-relative-representation-professional-false-positive-v72-04",
    "lab-relative-representation-language-ar-v72-05",
    "lab-relative-representation-language-fa-v72-06",
}
cases = {case["case_id"]: case for case in scenario.get("cases", [])}
assert set(cases) == expected_ids, f"v72 scenario ids drifted: {sorted(cases)}"
assert all(case.get("source_requirements") for case in cases.values()), "every v72 scenario needs source requirements"
assert all(case.get("actor_type") == "relative" for case in cases.values()), "v72 must stay in the relative actor"

assert len(signal_doc.get("signals", [])) == 1
signal = signal_doc["signals"][0]
assert signal["signal_id"] == "df-relative-representation-fullmakt-scope-v01"
assert signal["priority_band"] == "HIGH"
assert "not measured search volumes" in signal_doc["purpose"]
assert "not measured search volumes" in signal_doc["scoring"]["priority_rule"]
assert any("reddit.com" in url for url in signal["discovery_sources"]), "community discovery evidence missing"
assert all("reddit.com" not in url for url in signal["primary_sources"]), "community source leaked into truth sources"
primary_joined = " ".join(signal["primary_sources"])
for host in ["riksdagen.se", "forsakringskassan.se", "1177.se"]:
    assert host in primary_joined, f"primary source host missing: {host}"
assert set(signal["regression_case"]) == expected_ids
truth = signal["truth_rule"].lower()
assert "discovery only" in truth and "primary sources" in truth and "never truth sources" in truth

assert len(map_doc.get("mappings", [])) == 1
mapping = map_doc["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert set(mapping["regression_case_ids"]) == expected_ids
assert mapping["coverage_status"] == "GUARDED_PUBLIC_ROUTE_READY"
assert "actor_type=relative" in mapping["fix_or_guardrail"]
assert "focus=relative_care" in mapping["fix_or_guardrail"]

for token in [
    "'representation'",
    "REPRESENTATION_PATTERNS",
    "PROFESSIONAL_REP_PATTERNS",
    "care_context=",
    "ADMIN_LAW_URL",
    "FK_POWER_URL",
    "CARE_RELATIVE_URL",
    "Släktskap är inte samma sak som behörighet att företräda",
    "ger inte rätt att fatta beslut eller samtycka till vårdåtgärder",
]:
    assert token in client, f"v72 public representation guard missing: {token}"

for forbidden in [
    "fullmakt_text=",
    "personnummer=",
    "diagnosis=",
    "name=",
    "story=",
    "situation=",
]:
    assert forbidden not in client, f"sensitive handoff field leaked into runtime: {forbidden}"

for token in [
    "Kan jag ansöka åt min mamma bara för att jag är hennes dotter?",
    "Jag har fullmakt för min pappa. Kan jag sköta hans Försäkringskasseärende?",
    "Jag jobbar med fullmakter på kommunen",
    "لدي توكيل من والدي",
    "برای پدرم وکالت‌نامه دارم",
    "care_context=representation",
]:
    assert token in test, f"v72 runtime regression missing: {token}"

assert "append-only" in appendix
assert "ingen separat anhörigapp" in appendix.lower()
assert "Feedback är lärsignal, aldrig sanningskälla" in appendix
assert "Namn, personnummer, diagnos, fullmaktstext" in appendix

subprocess.run(["node", "--check", str(CLIENT)], check=True)
subprocess.run(["node", str(TEST)], check=True)

print("relative representation v72: OK (same relative_care product; authority scope source-led; privacy and false-positive guards active)")
