#!/usr/bin/env python3
"""Generate a deterministic synthetic private-prediction bridge fixture.

This fixture mirrors public benchmark expectations solely to smoke-test the bridge
contract and evaluator plumbing. Its score must never be reported as real model or
private-core performance.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import evaluate_matching as matching


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True, help="Path for generated synthetic prediction export")
    args = parser.parse_args()

    cases = matching.load_cases()
    baseline = matching.validate_baseline(cases)
    dataset_sha256 = matching.semantic_fingerprint(cases)
    matching.require(dataset_sha256 == baseline["dataset_sha256"], "locked benchmark fingerprint mismatch")

    export = {
        "schema_version": "1.0.0",
        "benchmark_dataset_sha256": dataset_sha256,
        "predictions": [
            {
                "case_id": case["case_id"],
                "predicted_support_areas": list(case["expected_support_areas"]),
                "asked_questions": list(case["expected_questions"]),
                "next_actions": list(case["expected_next_actions"]),
                "claims": [],
                "source_requirements": list(case["source_requirements"]),
                "risk_acknowledgements": list(case["risk_flags"]),
                "verification_required": True,
            }
            for case in cases
        ],
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(export, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "ok",
        "fixture": str(args.output),
        "case_count": len(cases),
        "benchmark_dataset_sha256": dataset_sha256,
        "warning": "Synthetic fixture only; not evidence of model quality.",
    }, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
