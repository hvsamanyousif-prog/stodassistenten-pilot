#!/usr/bin/env python3
"""Per-segment quality guard for Stödassistenten synthetic matching evals.

This complements scripts/evaluate_matching.py. Aggregate benchmark scores can hide
one weak target group; this script scores and enforces the same quality dimensions
for every segment independently. It uses only public synthetic eval data and the
Python standard library.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any

import evaluate_matching as core

ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = ROOT / "data" / "evals" / "segment_policy.json"
MINIMUM_KEYS = {
    "support_recall",
    "support_precision",
    "unsafe_claim_rate",
    "question_efficiency",
    "next_action_recall",
}


def validate_policy() -> dict[str, Any]:
    policy = core.load_json(POLICY_PATH)
    required = {"schema_version", "expected_segments", "minimum_metrics", "change_reason"}
    core.require(isinstance(policy, dict), "segment_policy.json must contain an object")
    core.require(set(policy) == required, "segment_policy.json fields drifted")
    core.require(
        isinstance(policy["schema_version"], str) and core.SEMVER_RE.fullmatch(policy["schema_version"]),
        "segment_policy.schema_version must use semantic x.y.z format",
    )
    segments = policy["expected_segments"]
    core.require(isinstance(segments, list), "segment_policy.expected_segments must be a list")
    core.require(len(segments) == len(set(segments)), "segment_policy.expected_segments must be unique")
    core.require(set(segments) == core.SEGMENTS, "segment_policy.expected_segments must exactly match benchmark segments")
    core.require(
        isinstance(policy["change_reason"], str) and len(policy["change_reason"].strip()) >= 20,
        "segment policy changes require a visible change_reason of at least 20 characters",
    )
    metrics = policy["minimum_metrics"]
    core.require(isinstance(metrics, dict) and set(metrics) == MINIMUM_KEYS, "segment_policy.minimum_metrics fields drifted")
    for key, value in metrics.items():
        core.require(isinstance(value, (int, float)) and 0 <= value <= 1, f"segment_policy.minimum_metrics.{key} must be 0..1")
    return policy


def aggregate_by_segment(cases: list[dict[str, Any]], scores: list[dict[str, Any]]) -> dict[str, dict[str, float | int]]:
    segment_by_case = {case["case_id"]: case["segment"] for case in cases}
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for score in scores:
        case_id = score["case_id"]
        core.require(case_id in segment_by_case, f"score references unknown case: {case_id}")
        grouped[segment_by_case[case_id]].append(score)
    return {segment: core.aggregate_scores(items) for segment, items in sorted(grouped.items())}


def enforce_one_segment(segment: str, metrics: dict[str, float | int], minimums: dict[str, float]) -> None:
    for key in ("support_recall", "support_precision", "question_efficiency", "next_action_recall"):
        core.require(
            float(metrics[key]) >= float(minimums[key]),
            f"segment regression: {segment}.{key}={metrics[key]:.4f} below minimum {minimums[key]:.4f}",
        )
    core.require(
        float(metrics["unsafe_claim_rate"]) <= float(minimums["unsafe_claim_rate"]),
        f"segment regression: {segment}.unsafe_claim_rate={metrics['unsafe_claim_rate']:.4f} above maximum {minimums['unsafe_claim_rate']:.4f}",
    )


def enforce_segment_policy(segment_metrics: dict[str, dict[str, float | int]], policy: dict[str, Any]) -> None:
    expected = set(policy["expected_segments"])
    actual = set(segment_metrics)
    core.require(actual == expected, f"segment score coverage drifted; missing={sorted(expected-actual)}, extra={sorted(actual-expected)}")
    minimums = policy["minimum_metrics"]
    for segment in sorted(expected):
        core.require(int(segment_metrics[segment]["cases"]) > 0, f"segment {segment} has no scored cases")
        enforce_one_segment(segment, segment_metrics[segment], minimums)


def self_test() -> None:
    cases = [
        {"case_id": "seg-a-1", "segment": "akassa"},
        {"case_id": "seg-a-2", "segment": "akassa"},
        {"case_id": "seg-b-1", "segment": "anhorig"},
    ]
    scores = [
        {
            "case_id": "seg-a-1",
            "support_recall": 1.0,
            "support_precision": 1.0,
            "missed_support": [],
            "unsafe_claims": [],
            "question_efficiency": 1.0,
            "next_action_recall": 1.0,
        },
        {
            "case_id": "seg-a-2",
            "support_recall": 0.5,
            "support_precision": 0.5,
            "missed_support": ["missed"],
            "unsafe_claims": [],
            "question_efficiency": 0.5,
            "next_action_recall": 0.5,
        },
        {
            "case_id": "seg-b-1",
            "support_recall": 1.0,
            "support_precision": 1.0,
            "missed_support": [],
            "unsafe_claims": ["unsafe"],
            "question_efficiency": 1.0,
            "next_action_recall": 1.0,
        },
    ]
    metrics = aggregate_by_segment(cases, scores)
    core.require(abs(float(metrics["akassa"]["support_recall"]) - 0.75) < 1e-12, "segment self-test recall failed")
    core.require(int(metrics["akassa"]["missed_support_count"]) == 1, "segment self-test missed support failed")
    core.require(abs(float(metrics["anhorig"]["unsafe_claim_rate"]) - 1.0) < 1e-12, "segment self-test unsafe rate failed")

    strict = {
        "support_recall": 0.80,
        "support_precision": 0.75,
        "unsafe_claim_rate": 0.00,
        "question_efficiency": 0.60,
        "next_action_recall": 0.70,
    }
    failed = False
    try:
        enforce_one_segment("akassa", metrics["akassa"], strict)
    except SystemExit:
        failed = True
    core.require(failed, "segment self-test must prove a weak segment fails closed")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--predictions", type=Path, help="Full prediction JSON to score per segment")
    parser.add_argument("--validate-only", action="store_true", help="Validate benchmark and segment policy without predictions")
    parser.add_argument("--self-test", action="store_true", help="Run deterministic per-segment metric tests")
    args = parser.parse_args()

    cases = core.load_cases()
    core.validate_baseline(cases)
    policy = validate_policy()
    if args.self_test:
        self_test()

    result: dict[str, Any] = {
        "status": "ok",
        "segment_policy_version": policy["schema_version"],
        "expected_segments": sorted(policy["expected_segments"]),
    }

    if args.predictions:
        data = core.load_json(args.predictions)
        predictions = core.validate_predictions(data, {case["case_id"] for case in cases})
        by_id = {item["case_id"]: item for item in predictions}
        scores = [core.score_prediction(case, by_id[case["case_id"]]) for case in cases]
        overall = core.aggregate_scores(scores)
        baseline = core.load_json(core.BASELINE_PATH)
        core.enforce_policy(overall, baseline)
        segment_metrics = aggregate_by_segment(cases, scores)
        enforce_segment_policy(segment_metrics, policy)
        result["overall_metrics"] = overall
        result["segment_metrics"] = segment_metrics

    print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
