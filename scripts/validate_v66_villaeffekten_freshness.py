#!/usr/bin/env python3
"""Fail-closed v66 freshness guard for the existing Villaeffekten truth/product route."""
from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SUPPORT = ROOT / "data" / "supports" / "se-boverket-energieffektivisering-smahus.json"
SCENARIOS = ROOT / "data" / "evals" / "scenario_lab_websignals_v66.json"
PERSON = ROOT / "client" / "person-context-learning.js"
BUILD = ROOT / "scripts" / "build_public_pilot.py"

for path in [SUPPORT, SCENARIOS, PERSON, BUILD]:
    assert path.is_file(), f"missing v66 artifact: {path.relative_to(ROOT)}"

support = json.loads(SUPPORT.read_text(encoding="utf-8"))
assert support["support_id"] == "se-boverket-energieffektivisering-smahus"
assert support["verification"]["status"] == "NEEDS_REVIEW"
assert support["verification"]["human_review_required"] is True
assert support["verification"]["last_verified_at"] is None
assert support["verification"]["material_fields_verified"] == []
assert support["source"]["updated_at"].startswith("2026-09-14")
assert support["source"]["retrieved_at"].startswith("2026-09-15")
assert support["lifecycle"]["version"] >= 2
assert support["lifecycle"]["last_seen_at"].startswith("2026-09-15")

rules = {rule["rule_id"]: rule for rule in support["eligibility"]["conditions"]}
assert rules["villaeffekten.not_district_heating_connected"]["value"] is False
assert "planerad ny anslutning" in rules["villaeffekten.not_district_heating_connected"]["notes"]
assert "district_heating_connection" in rules["villaeffekten.eligible_measure"]["value"]
order_notes = rules["villaeffekten.material_order_date"]["notes"].lower()
assert "tjänsten beställs" in order_notes
assert "företaget beställer" in order_notes

exclusions = {rule["rule_id"]: rule for rule in support["eligibility"]["exclusions"]}
assert "villaeffekten.insurance_reimbursement" in exclusions
assert exclusions["villaeffekten.insurance_reimbursement"]["value"] is True
assert "försäkringsersättning" in exclusions["villaeffekten.insurance_reimbursement"]["notes"].lower()

benefit = support["benefit"]["calculation_text"].lower()
assert "anslutningsavgiften" in benefit
assert "försäkringsersättning" in benefit
assert "arbetskostnad" in benefit
assert "30 procent" in support["benefit"]["amount_text"]
assert "60 000" in support["benefit"]["amount_text"]
assert "10 000" in support["benefit"]["amount_text"]
assert "28 februari 2027" in support["application"]["deadline_text"]
assert "1 juni 2030" in support["application"]["deadline_text"]

# The public route remains the same product and keeps the critical existing-vs-planned boundary.
person = PERSON.read_text(encoding="utf-8")
for token in [
    "focus')||'').toLowerCase()!=='home_energy'",
    "qDistrict:'Är huset redan anslutet till fjärrvärmenät?'",
    "districtYesTitle:'Blanda inte ihop befintlig fjärrvärmeanslutning med en planerad ny anslutning'",
    "districtYesBody:'Ett hus som redan är anslutet till fjärrvärmenät träffar en annan gräns än ett hus som överväger en ny anslutning som åtgärd.",
    "state.district==='yes'",
    "BOVERKET_URL",
]:
    assert token in person, f"v66 same-product district-heating guard missing token: {token}"
for forbidden in ["personnummer=", "address=", "property_id=", "insurance_claim=", "raw_story="]:
    assert forbidden not in person.lower(), f"forbidden v66 public handoff/storage token: {forbidden}"

pack = json.loads(SCENARIOS.read_text(encoding="utf-8"))
required = {
    "lab-villaeffekten-existing-district-heating-v66-01",
    "lab-villaeffekten-planned-district-heating-v66-02",
    "lab-villaeffekten-contractor-order-date-v66-03",
    "lab-villaeffekten-insurance-overlap-v66-04",
    "lab-villaeffekten-transition-deadline-v66-05",
}
by = {case["case_id"]: case for case in pack["cases"]}
assert set(by) == required
assert "mentioning_district_heating_always_disqualifies_the_house" in by["lab-villaeffekten-planned-district-heating-v66-02"]["must_not_claim"]
assert "district_heating_connection_fee_is_an_eligible_material_cost" in by["lab-villaeffekten-planned-district-heating-v66-02"]["must_not_claim"]
assert "contractors_later_purchase_date_automatically_makes_the_material_eligible" in by["lab-villaeffekten-contractor-order-date-v66-03"]["must_not_claim"]
assert "the_same_cost_can_be_fully_reimbursed_by_insurance_and_grant" in by["lab-villaeffekten-insurance-overlap-v66-04"]["must_not_claim"]
assert "surface_the_2027_02_28_transition_deadline" in by["lab-villaeffekten-transition-deadline-v66-05"]["expected_next_actions"]

# Keep the prior one-product product guard and global scenario schema green.
subprocess.run([sys.executable, str(ROOT / "scripts" / "validate_v35_villaeffekten_product.py")], cwd=ROOT, check=True)
subprocess.run([sys.executable, str(ROOT / "scripts" / "validate_scenario_lab_all.py")], cwd=ROOT, check=True)
print("Villaeffekten v66 freshness guard: OK (fresh primary-source boundaries, same product, review gate preserved)")
