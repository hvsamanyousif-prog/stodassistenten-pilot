#!/usr/bin/env python3
"""Evaluate source grounding and risk-gate behavior for synthetic matching cases.

This public evaluator does not contain the private matching engine or verified
eligibility rules. It defines the structured contract that a private-core
prediction export can be scored against without exposing prompts, rankings,
secrets or user data.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
EVAL_DIR = ROOT / "data" / "evals"
CASES_DIR = EVAL_DIR / "cases"
POLICY_PATH = EVAL_DIR / "grounding_policy.json"
SEMVER_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
TOKEN_RE = re.compile(r"^[a-z][a-z0-9_]{1,79}$")
PREDICTION_FIELDS = {
    "case_id",
    "source_requirements",
    "acknowledged_risks",
    "verification_required",
}


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def load_json(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        fail(f"missing file: {path.relative_to(ROOT)}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path.relative_to(ROOT)}: {exc}")


def load_cases() -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for path in sorted(CASES_DIR.glob("*.json")):
        data = load_json(path)
        require(isinstance(data, dict) and isinstance(data.get("cases"), list),
                f"{path.relative_to(ROOT)} must contain a cases list")
        for case in data["cases"]:
            require(isinstance(case, dict), f"{path.relative_to(ROOT)} contains a non-object case")
            for field in ("case_id", "segment", "source_requirements", "risk_flags"):
                require(field in case, f"{path.relative_to(ROOT)} case missing {field}")
            cases.append(case)
    ids = [case["case_id"] for case in cases]
    require(ids and len(ids) == len(set(ids)), "grounding eval cases must have unique case_id values")
    return cases


def validate_string_list(value: Any, field: str, *, tokenized: bool, allow_empty: bool) -> None:
    require(isinstance(value, list), f"{field} must be a list")
    if not allow_empty:
        require(bool(value), f"{field} must not be empty")
    require(len(value) == len(set(value)), f"{field} must contain unique values")
    for item in value:
        if tokenized:
            require(isinstance(item, str) and TOKEN_RE.fullmatch(item) is not None,
                    f"{field} contains invalid token: {item!r}")
        else:
            require(isinstance(item, str) and 2 <= len(item) <= 120,
                    f"{field} contains invalid source requirement")


def validate_policy(cases: list[dict[str, Any]]) -> dict[str, Any]:
    policy = load_json(POLICY_PATH)
    expected_fields = {
        "schema_version",
        "expected_case_count",
        "expected_segments",
        "minimum_metrics",
        "per_segment_minimums",
        "change_reason",
    }
    require(isinstance(policy, dict) and set(policy) == expected_fields,
            "grounding_policy.json fields drifted")
    require(isinstance(policy["schema_version"], str) and SEMVER_RE.fullmatch(policy["schema_version"]),
            "grounding policy schema_version invalid")
    require(isinstance(policy["change_reason"], str) and len(policy["change_reason"].strip()) >= 20,
            "grounding policy requires a visible change_reason")
    require(isinstance(policy["expected_case_count"], int) and policy["expected_case_count"] > 0,
            "expected_case_count must be a positive integer")
    require(len(cases) == policy["expected_case_count"],
            f"expected {policy['expected_case_count']} grounding cases, found {len(cases)}")

    expected_segments = policy["expected_segments"]
    validate_string_list(expected_segments, "expected_segments", tokenized=True, allow_empty=False)
    actual_segments = sorted({case["segment"] for case in cases})
    require(sorted(expected_segments) == actual_segments,
            f"grounding segment coverage drifted: expected={sorted(expected_segments)}, actual={actual_segments}")

    minimum_fields = {
        "source_requirement_recall",
        "source_requirement_precision",
        "risk_ack_recall",
        "verification_gate_rate",
    }
    segment_fields = {
        "source_requirement_recall",
        "risk_ack_recall",
        "verification_gate_rate",
    }
    minimums = policy["minimum_metrics"]
    segment_minimums = policy["per_segment_minimums"]
    require(isinstance(minimums, dict) and set(minimums) == minimum_fields,
            "minimum_metrics fields drifted")
    require(isinstance(segment_minimums, dict) and set(segment_minimums) == segment_fields,
            "per_segment_minimums fields drifted")
    for location, values in (("minimum_metrics", minimums), ("per_segment_minimums", segment_minimums)):
        for key, value in values.items():
            require(isinstance(value, (int, float)) and 0 <= value <= 1,
                    f"{location}.{key} must be 0..1")
    return policy


def validate_predictions(data: Any, case_ids: set[str]) -> list[dict[str, Any]]:
    require(isinstance(data, dict), "grounding predictions file must contain an object")
    require(set(data) == {"schema_version", "predictions"},
            "grounding predictions top-level fields drifted")
    require(isinstance(data["schema_version"], str) and SEMVER_RE.fullmatch(data["schema_version"]),
            "grounding predictions schema_version invalid")
    require(isinstance(data["predictions"], list), "grounding predictions must be a list")
    seen: set[str] = set()
    predictions: list[dict[str, Any]] = []
    for index, prediction in enumerate(data["predictions"]):
        loc = f"predictions[{index}]"
        require(isinstance(prediction, dict) and set(prediction) == PREDICTION_FIELDS,
                f"{loc} fields drifted")
        case_id = prediction["case_id"]
        require(isinstance(case_id, str) and case_id in case_ids,
                f"{loc}.case_id unknown: {case_id!r}")
        require(case_id not in seen, f"duplicate grounding prediction for {case_id}")
        seen.add(case_id)
        validate_string_list(prediction["source_requirements"], f"{loc}.source_requirements",
                             tokenized=False, allow_empty=True)
        validate_string_list(prediction["acknowledged_risks"], f"{loc}.acknowledged_risks",
                             tokenized=True, allow_empty=True)
        require(isinstance(prediction["verification_required"], bool),
                f"{loc}.verification_required must be boolean")
        predictions.append(prediction)
    require(seen == case_ids,
            f"grounding predictions must cover every benchmark case; missing={sorted(case_ids-seen)}")
    return predictions


def set_metrics(expected: list[str], predicted: list[str]) -> tuple[float, float, list[str]]:
    expected_set = set(expected)
    predicted_set = set(predicted)
    hits = len(expected_set & predicted_set)
    recall = hits / len(expected_set) if expected_set else 1.0
    precision = hits / len(predicted_set) if predicted_set else (1.0 if not expected_set else 0.0)
    return recall, precision, sorted(expected_set - predicted_set)


def score_case(case: dict[str, Any], prediction: dict[str, Any]) -> dict[str, Any]:
    source_recall, source_precision, missed_sources = set_metrics(
        case["source_requirements"], prediction["source_requirements"]
    )
    risk_recall, _, missed_risks = set_metrics(case["risk_flags"], prediction["acknowledged_risks"])
    return {
        "case_id": case["case_id"],
        "segment": case["segment"],
        "source_requirement_recall": source_recall,
        "source_requirement_precision": source_precision,
        "risk_ack_recall": risk_recall,
        "verification_gate_rate": 1.0 if prediction["verification_required"] else 0.0,
        "missed_sources": missed_sources,
        "missed_risks": missed_risks,
        "verification_gate_failed": prediction["verification_required"] is not True,
    }


def aggregate(scores: list[dict[str, Any]]) -> dict[str, float | int]:
    count = len(scores)
    return {
        "cases": count,
        "source_requirement_recall": sum(item["source_requirement_recall"] for item in scores) / count,
        "source_requirement_precision": sum(item["source_requirement_precision"] for item in scores) / count,
        "risk_ack_recall": sum(item["risk_ack_recall"] for item in scores) / count,
        "verification_gate_rate": sum(item["verification_gate_rate"] for item in scores) / count,
        "missed_source_count": sum(len(item["missed_sources"]) for item in scores),
        "missed_risk_count": sum(len(item["missed_risks"]) for item in scores),
        "verification_gate_failure_count": sum(bool(item["verification_gate_failed"]) for item in scores),
    }


def require_minimum(metrics: dict[str, float | int], minimums: dict[str, Any], prefix: str) -> None:
    for key, threshold in minimums.items():
        require(float(metrics[key]) >= float(threshold),
                f"{prefix}: {key}={float(metrics[key]):.4f} below minimum {float(threshold):.4f}")


def enforce_policy(scores: list[dict[str, Any]], policy: dict[str, Any]) -> dict[str, Any]:
    overall = aggregate(scores)
    require_minimum(overall, policy["minimum_metrics"], "grounding regression")

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for score in scores:
        grouped[score["segment"]].append(score)
    per_segment: dict[str, dict[str, float | int]] = {}
    for segment in sorted(policy["expected_segments"]):
        require(segment in grouped and grouped[segment], f"missing grounding scores for segment {segment}")
        metrics = aggregate(grouped[segment])
        require_minimum(metrics, policy["per_segment_minimums"], f"grounding regression in {segment}")
        per_segment[segment] = metrics
    return {"overall": overall, "segments": per_segment}


def self_test() -> None:
    case = {
        "case_id": "selftest-grounding-001",
        "segment": "cancer",
        "source_requirements": ["Försäkringskassan", "patient_org"],
        "risk_flags": ["health_sensitive", "income_loss"],
    }
    prediction = {
        "case_id": "selftest-grounding-001",
        "source_requirements": ["Försäkringskassan", "irrelevant_source"],
        "acknowledged_risks": ["health_sensitive"],
        "verification_required": False,
    }
    scored = score_case(case, prediction)
    require(abs(scored["source_requirement_recall"] - 0.5) < 1e-12,
            "grounding self-test source recall failed")
    require(abs(scored["source_requirement_precision"] - 0.5) < 1e-12,
            "grounding self-test source precision failed")
    require(abs(scored["risk_ack_recall"] - 0.5) < 1e-12,
            "grounding self-test risk recall failed")
    require(scored["verification_gate_rate"] == 0.0 and scored["verification_gate_failed"] is True,
            "grounding self-test verification gate failed")
    require(scored["missed_sources"] == ["patient_org"], "grounding self-test missed source failed")
    require(scored["missed_risks"] == ["income_loss"], "grounding self-test missed risk failed")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--predictions", type=Path, help="Structured private-core grounding prediction export")
    parser.add_argument("--validate-only", action="store_true", help="Validate public grounding contract and policy")
    parser.add_argument("--self-test", action="store_true", help="Run deterministic grounding metric self-test")
    args = parser.parse_args()

    cases = load_cases()
    policy = validate_policy(cases)
    if args.self_test:
        self_test()

    result: dict[str, Any] = {
        "status": "ok",
        "case_count": len(cases),
        "segments": dict(sorted(Counter(case["segment"] for case in cases).items())),
    }
    if args.predictions:
        data = load_json(args.predictions)
        predictions = validate_predictions(data, {case["case_id"] for case in cases})
        by_id = {item["case_id"]: item for item in predictions}
        scores = [score_case(case, by_id[case["case_id"]]) for case in cases]
        metrics = enforce_policy(scores, policy)
        result["metrics"] = metrics
        result["cases_with_missed_sources"] = [item["case_id"] for item in scores if item["missed_sources"]]
        result["cases_with_missed_risks"] = [item["case_id"] for item in scores if item["missed_risks"]]
        result["cases_with_verification_gate_failure"] = [
            item["case_id"] for item in scores if item["verification_gate_failed"]
        ]

    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
