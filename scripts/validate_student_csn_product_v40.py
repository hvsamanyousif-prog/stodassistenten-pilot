#!/usr/bin/env python3
"""Validate the v40 public CSN route against v39 truth/regression boundaries."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLIENT = ROOT / "client" / "student-finance-guidance.js"
TEST = ROOT / "client" / "student-finance-guidance.test.cjs"
BUILD = ROOT / "scripts" / "build_public_pilot.py"
SUPPORT = ROOT / "data" / "supports" / "se-csn-studiemedel-veckor-sommar.json"
SCENARIOS = ROOT / "data" / "evals" / "scenario_lab_websignals_v39.json"

client = CLIENT.read_text(encoding="utf-8")
test = TEST.read_text(encoding="utf-8")
build = BUILD.read_text(encoding="utf-8")
support = json.loads(SUPPORT.read_text(encoding="utf-8"))
scenarios = json.loads(SCENARIOS.read_text(encoding="utf-8"))

assert support["support_id"] == "se-csn-studiemedel-veckor-sommar"
assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["material_fields_verified"] == []

case_ids = {case["case_id"] for case in scenarios.get("cases", [])}
for case_id in {
    "lab-student-csn-remaining-weeks-v39-01",
    "lab-student-csn-summer-course-v39-02",
}:
    assert case_id in case_ids, f"canonical v39 regression missing: {case_id}"

for url in [
    "https://www.csn.se/fragor-och-svar/hur-manga-veckor-kan-jag-fa-studiemedel.html",
    "https://www.csn.se/bidrag-och-lan/studiemedel/studietakt---heltid-eller-deltid.html",
    "https://www.csn.se/bidrag-och-lan/studiemedel/sommarstudier-i-sverige-med-studiemedel.html",
    "https://www.csn.se/logga-in.html",
]:
    assert url in client, f"current CSN primary route missing: {url}"

for token in [
    "focus=student_csn",
    "actor_type=student",
    "flow:'student_csn'",
    "detectTopic",
    "nextWeeks",
    "nextSummer",
]:
    assert token in client, f"shared student route contract missing: {token}"

# The public runtime intentionally avoids mirroring precise personal balances or
# numeric entitlement tables. Those remain in current CSN sources / review-gated truth.
for forbidden in [
    "240 veckor",
    "120 veckor",
    "100 veckor",
    "80 veckor",
    "40 veckor",
    "weeks_left=",
    "income=",
    "identity=",
    "story=",
]:
    assert forbidden not in client, f"public route crossed a truth/privacy boundary: {forbidden}"

assert "STUDENT_FINANCE_GUIDANCE_PATH = \"client/student-finance-guidance.js\"" in build
assert build.count("STUDENT_FINANCE_GUIDANCE_PATH,") >= 2, "student guidance must ship to shell and person surface"
assert "student-finance-guidance.test.cjs" in test or "student finance guidance" in test.lower()
assert "situation=" in test and "weeks_left=" in test, "privacy regressions must explicitly test forbidden handoff fields"

# Preserve language parity and no raw prose in the handoff contract.
for language in ["sv", "ar", "fa"]:
    assert language in client
assert "topic=${safeTopic}" in client
assert "encodeURIComponent(lang)" in client

print("student CSN v40: OK (same product; v39 regressions preserved; support remains NEEDS_REVIEW)")
