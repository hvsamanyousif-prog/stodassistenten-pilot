#!/usr/bin/env python3
"""Release gate for the shared economic-assistance product path.

This gate verifies visible routing, privacy-preserving handoff, review-state truth,
permanent learning memory and the built public artifact. It does not perform or
approve an individual eligibility assessment.
"""
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLIENT = ROOT / "client" / "economic-assistance.js"
TEST = ROOT / "client" / "economic-assistance.test.cjs"
SUPPORT = ROOT / "data" / "supports" / "se-socialstyrelsen-ekonomiskt-bistand.json"
SCENARIO = ROOT / "data" / "evals" / "scenario_lab_websignals_v23.json"
BUILD = ROOT / "scripts" / "build_public_pilot.py"
RECENT = ROOT / "scripts" / "validate_recent_learning_memory.py"
SUPPORT_VALIDATOR = ROOT / "scripts" / "validate_support_records.py"


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def main() -> int:
    run("node", "--check", str(CLIENT))
    run("node", str(TEST))
    run("python", str(SUPPORT_VALIDATOR))
    run("python", str(RECENT))

    support = json.loads(SUPPORT.read_text(encoding="utf-8"))
    assert support["verification"]["status"] == "NEEDS_REVIEW"
    assert support["verification"]["human_review_required"] is True
    assert support["verification"]["material_fields_verified"] == []
    assert support["source"]["source_id"] == "se-socialstyrelsen-financial-assistance"
    assert support["application"]["method"] == "municipality_contact"

    scenario = json.loads(SCENARIO.read_text(encoding="utf-8"))["cases"][0]
    assert scenario["case_id"] == "lab-private-basic-needs-economic-assistance-v23-01"
    assert "a_simplified_trial_calculation_is_a_municipal_decision" in scenario["must_not_claim"]
    assert "do_not_block_an_application_because_the_public_pilot_is_unsure" in scenario["expected_next_actions"]

    js = CLIENT.read_text(encoding="utf-8")
    assert "focus=economic_assistance" in js
    assert "exact income" not in js.lower()
    assert "fetch(" not in js
    assert "localStorage" not in js
    assert "sessionStorage" not in js

    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "site"
        run("python", str(BUILD), "--source", str(ROOT), "--output", str(out))
        built_index = (out / "index.html").read_text(encoding="utf-8")
        built_person = (out / "person-pilot.html").read_text(encoding="utf-8")
        built_client = out / "client" / "economic-assistance.js"
        needle = '<script src="client/economic-assistance.js"></script>'
        assert built_index.count(needle) == 1
        assert built_person.count(needle) == 1
        assert built_client.is_file()
        run("node", "--check", str(built_client))

    print("economic assistance product: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
