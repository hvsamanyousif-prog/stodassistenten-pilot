#!/usr/bin/env python3
"""Fail-closed regression gate for v36 association/company funding discovery.

This validates one shared person product: known actor context is reused, result rows
are source-aware and localized, companies are sent to the existing company pilot,
and directory/discovery sources cannot masquerade as eligibility or open calls.
"""
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"
RUNTIME = ROOT / "client" / "funding-discovery-guidance.js"
BUILD = ROOT / "scripts" / "build_public_pilot.py"

runtime = RUNTIME.read_text(encoding="utf-8")
required_runtime = [
    "actorType==='association'",
    "answers={orgType:'association'}",
    "originalGetRows",
    "answers.orgNeed",
    "ROWS[locale][kind][need]",
    "company-pilot.html?actor_type=company",
    "https://www.mucf.se/bidrag",
    "https://skr.se/kommunerochregioner/kommunerlista.8288.html",
    "https://www.arvsfonden.se/ansokan/vara-stodformer",
    "https://stiftelser.lansstyrelsen.se/",
    "فقط برای کشف",
    "للاكتشاف فقط",
]
for token in required_runtime:
    assert token in runtime, f"missing v36 runtime guardrail: {token}"

# Copy may start the sentence with an uppercase or lowercase letter; validate the semantic guardrail.
assert "registerträff betyder inte att det finns en öppen ansökan" in runtime.lower(), (
    "missing v36 runtime guardrail: register discovery must not imply an open call"
)

# The correction must not introduce a new backend, truth store or raw-text handoff.
for forbidden in ["fetch(", "localStorage", "sessionStorage", "encodeURIComponent(input", "eligibility=true"]:
    assert forbidden not in runtime, f"v36 runtime must stay presentation/ranking-only: {forbidden}"

pack = json.loads((EVAL / "scenario_lab_websignals_v36.json").read_text(encoding="utf-8"))
cases = {c["case_id"]: c for c in pack["cases"]}
expected_ids = {
    "lab-association-generic-funding-source-split-v36-01",
    "lab-company-org-flow-no-association-support-v36-02",
    "lab-association-ar-fa-language-parity-v36-03",
}
assert set(cases) == expected_ids
assert "being_an_association_automatically_makes_lok_support_relevant" in cases["lab-association-generic-funding-source-split-v36-01"]["must_not_claim"]
assert "small_company_selection_should_return_lok_support" in cases["lab-company-org-flow-no-association-support-v36-02"]["must_not_claim"]
assert "arabic_or_persian_actor_context_may_fall_back_to_swedish_only_result_explanations" in cases["lab-association-ar-fa-language-parity-v36-03"]["must_not_claim"]

signal_pack = json.loads((EVAL / "demand_friction_signals_v22.json").read_text(encoding="utf-8"))
signal = signal_pack["signals"][0]
assert signal["signal_id"] == "df-association-funding-fragmentation-v01"
assert signal["priority_band"] == "HIGH"
assert "not measured search volumes" in signal_pack["purpose"]
assert "not measured search volumes" in signal_pack["scoring"]["priority_rule"]
assert "discovery" in signal["truth_rule"].lower()
assert "verify" in signal["truth_rule"].lower()
assert any("mucf.se" in u for u in signal["primary_sources"])
assert any("skr.se" in u for u in signal["primary_sources"])
assert any("arvsfonden.se" in u for u in signal["primary_sources"])
assert any("lansstyrelsen.se" in u for u in signal["primary_sources"])

mapping = json.loads((EVAL / "demand_friction_regression_map_v16.json").read_text(encoding="utf-8"))["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert set(mapping["regression_case_ids"]) == expected_ids
assert "reuse known association actor context" in mapping["fix_or_guardrail"].lower()
assert "discovery rather than open-call proof" in mapping["fix_or_guardrail"].lower()

# Build-level proof that the shared person page receives this runtime, not a parallel app.
with tempfile.TemporaryDirectory() as tmp:
    out = Path(tmp) / "site"
    subprocess.run(["python", str(BUILD), "--source", str(ROOT), "--output", str(out)], check=True)
    built_person = (out / "person-pilot.html").read_text(encoding="utf-8")
    assert '<script src="client/funding-discovery-guidance.js"></script>' in built_person
    assert (out / "client" / "funding-discovery-guidance.js").is_file()
    assert not (out / "association-pilot.html").exists()

subprocess.run(["node", "--check", str(RUNTIME)], check=True)
print("association funding v36: OK (same product; source split, locale parity and actor contamination guarded)")
