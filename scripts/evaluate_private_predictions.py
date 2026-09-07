#!/usr/bin/env python3
"""Validate and score a private-core prediction export against public synthetic evals.

The bridge deliberately accepts only evaluation outputs. It must never expose
prompts, reasoning traces, internal scores, rule IDs, endpoints, tokens, secrets,
user identifiers or case data from a real user. All scoring remains offline and
uses the existing public benchmark evaluators.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

import evaluate_grounding as grounding
import evaluate_matching as matching
import evaluate_matching_segments as segments

ROOT = Path(__file__).resolve().parents[1]
EVAL_DIR = ROOT / "data" / "evals"
SCHEMA_PATH = EVAL_DIR / "private_prediction_export.schema.json"
TOKEN_RE = re.compile(r"^[a-z][a-z0-9_]{1,79}$")
CASE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{2,79}$")
SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
EXPORT_FIELDS = {"schema_version", "benchmark_dataset_sha256", "predictions"}
PREDICTION_FIELDS = {
    "case_id",
    "predicted_support_areas",
    "asked_questions",
    "next_actions",
    "claims",
    "source_requirements",
    "risk_acknowledgements",
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
        fail(f"missing file: {path.relative_to(ROOT) if path.is_relative_to(ROOT) else path}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path}: {exc}")


def validate_token_list(value: Any, field: str) -> None:
    require(isinstance(value, list), f"{field} must be a list")
    require(len(value) == len(set(value)), f"{field} must contain unique values")
    for item in value:
        require(isinstance(item, str) and TOKEN_RE.fullmatch(item) is not None,
                f"{field} contains invalid token: {item!r}")


def validate_source_list(value: Any, field: str) -> None:
    require(isinstance(value, list), f"{field} must be a list")
    require(len(value) == len(set(value)), f"{field} must contain unique values")
    for item in value:
        require(isinstance(item, str) and 2 <= len(item) <= 120,
                f"{field} contains invalid source requirement")


def validate_schema_contract() -> None:
    schema = load_json(SCHEMA_PATH)
    require(schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema",
            "private prediction schema must use JSON Schema draft 2020-12")
    require(schema.get("additionalProperties") is False,
            "private prediction export schema must reject extra top-level fields")
    require(set(schema.get("required", [])) == EXPORT_FIELDS,
            "private prediction export schema top-level required fields drifted")
    try:
        prediction = schema["$defs"]["prediction"]
    except (KeyError, TypeError):
        fail("private prediction export schema is missing $defs.prediction")
    require(prediction.get("additionalProperties") is False,
            "private prediction item schema must reject extra fields")
    require(set(prediction.get("required", [])) == PREDICTION_FIELDS,
            "private prediction item required fields drifted")


def validate_export(data: Any, cases: list[dict[str, Any]], dataset_sha256: str) -> list[dict[str, Any]]:
    require(isinstance(data, dict), "private prediction export must contain an object")
    require(set(data) == EXPORT_FIELDS,
            f"private prediction export fields drifted; missing={sorted(EXPORT_FIELDS-set(data))}, extra={sorted(set(data)-EXPORT_FIELDS)}")
    require(data["schema_version"] == "1.0.0", "private prediction export schema_version must be 1.0.0")
    digest = data["benchmark_dataset_sha256"]
    require(isinstance(digest, str) and SHA256_RE.fullmatch(digest) is not None,
            "benchmark_dataset_sha256 must be a lowercase SHA-256 hex digest")
    require(digest == dataset_sha256,
            "private prediction export targets a different benchmark dataset; regenerate it from the current locked benchmark")

    predictions = data["predictions"]
    require(isinstance(predictions, list), "private prediction export predictions must be a list")
    case_ids = {case["case_id"] for case in cases}
    seen: set[str] = set()
    validated: list[dict[str, Any]] = []
    for index, prediction in enumerate(predictions):
        loc = f"predictions[{index}]"
        require(isinstance(prediction, dict) and set(prediction) == PREDICTION_FIELDS,
                f"{loc} fields drifted")
        case_id = prediction["case_id"]
        require(isinstance(case_id, str) and CASE_ID_RE.fullmatch(case_id) is not None,
                f"{loc}.case_id invalid")
        require(case_id in case_ids, f"{loc}.case_id unknown: {case_id!r}")
        require(case_id not in seen, f"duplicate private prediction for {case_id}")
        seen.add(case_id)
        for field in ("predicted_support_areas", "asked_questions", "next_actions", "claims", "risk_acknowledgements"):
            validate_token_list(prediction[field], f"{loc}.{field}")
        validate_source_list(prediction["source_requirements"], f"{loc}.source_requirements")
        require(isinstance(prediction["verification_required"], bool),
                f"{loc}.verification_required must be boolean")
        validated.append(prediction)

    require(seen == case_ids,
            f"private prediction export must cover every benchmark case; missing={sorted(case_ids-seen)}")
    return validated


def project_matching(predictions: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "schema_version": "1.0.0",
        "predictions": [
            {
                "case_id": item["case_id"],
                "support_areas": item["predicted_support_areas"],
                "questions": item["asked_questions"],
                "claims": item["claims"],
                "next_actions": item["next_actions"],
            }
            for item in predictions
        ],
    }


def project_grounding(predictions: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "schema_version": "1.0.0",
        "predictions": [
            {
                "case_id": item["case_id"],
                "source_requirements": item["source_requirements"],
                "acknowledged_risks": item["risk_acknowledgements"],
                "verification_required": item["verification_required"],
            }
            for item in predictions
        ],
    }


def score_export(predictions: list[dict[str, Any]], cases: list[dict[str, Any]], baseline: dict[str, Any]) -> dict[str, Any]:
    case_ids = {case["case_id"] for case in cases}

    matching_data = project_matching(predictions)
    matching_predictions = matching.validate_predictions(matching_data, case_ids)
    matching_by_id = {item["case_id"]: item for item in matching_predictions}
    matching_scores = [matching.score_prediction(case, matching_by_id[case["case_id"]]) for case in cases]
    overall = matching.aggregate_scores(matching_scores)
    matching.enforce_policy(overall, baseline)

    segment_policy = segments.validate_policy()
    segment_metrics = segments.aggregate_by_segment(cases, matching_scores)
    segments.enforce_segment_policy(segment_metrics, segment_policy)

    grounding_cases = grounding.load_cases()
    require({case["case_id"] for case in grounding_cases} == case_ids,
            "matching and grounding case coverage drifted")
    grounding_policy = grounding.validate_policy(grounding_cases)
    grounding_data = project_grounding(predictions)
    grounding_predictions = grounding.validate_predictions(grounding_data, case_ids)
    grounding_by_id = {item["case_id"]: item for item in grounding_predictions}
    grounding_scores = [
        grounding.score_case(case, grounding_by_id[case["case_id"]]) for case in grounding_cases
    ]
    grounding_metrics = grounding.enforce_policy(grounding_scores, grounding_policy)

    return {
        "matching": {
            "overall": overall,
            "segments": segment_metrics,
            "cases_with_missed_support": [item["case_id"] for item in matching_scores if item["missed_support"]],
            "cases_with_unsafe_claims": [item["case_id"] for item in matching_scores if item["unsafe_claims"]],
        },
        "grounding": {
            **grounding_metrics,
            "cases_with_missed_sources": [item["case_id"] for item in grounding_scores if item["missed_sources"]],
            "cases_with_missed_risks": [item["case_id"] for item in grounding_scores if item["missed_risks"]],
            "cases_with_verification_gate_failure": [
                item["case_id"] for item in grounding_scores if item["verification_gate_failed"]
            ],
        },
    }


def self_test(cases: list[dict[str, Any]], dataset_sha256: str) -> None:
    first = cases[0]
    valid = {
        "schema_version": "1.0.0",
        "benchmark_dataset_sha256": dataset_sha256,
        "predictions": [],
    }
    for case in cases:
        valid["predictions"].append({
            "case_id": case["case_id"],
            "predicted_support_areas": list(case["expected_support_areas"]),
            "asked_questions": list(case["expected_questions"]),
            "next_actions": list(case["expected_next_actions"]),
            "claims": [],
            "source_requirements": list(case["source_requirements"]),
            "risk_acknowledgements": list(case["risk_flags"]),
            "verification_required": True,
        })
    validated = validate_export(valid, cases, dataset_sha256)
    require(len(validated) == len(cases), "bridge self-test valid export coverage failed")

    bad = json.loads(json.dumps(valid))
    bad["predictions"][0]["internal_score"] = 0.99
    rejected = False
    try:
        validate_export(bad, cases, dataset_sha256)
    except SystemExit:
        rejected = True
    require(rejected, "bridge self-test must reject private implementation leakage")

    stale = json.loads(json.dumps(valid))
    stale["benchmark_dataset_sha256"] = "0" * 64
    rejected = False
    try:
        validate_export(stale, cases, dataset_sha256)
    except SystemExit:
        rejected = True
    require(rejected, "bridge self-test must reject stale benchmark exports")

    duplicate = json.loads(json.dumps(valid))
    duplicate["predictions"][1]["case_id"] = first["case_id"]
    rejected = False
    try:
        validate_export(duplicate, cases, dataset_sha256)
    except SystemExit:
        rejected = True
    require(rejected, "bridge self-test must reject duplicate case IDs")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--predictions", type=Path, help="Private-core prediction export to score offline")
    parser.add_argument("--validate-only", action="store_true", help="Validate bridge/schema and benchmark compatibility")
    parser.add_argument("--self-test", action="store_true", help="Run deterministic bridge rejection tests")
    args = parser.parse_args()

    validate_schema_contract()
    cases = matching.load_cases()
    baseline = matching.validate_baseline(cases)
    dataset_sha256 = matching.semantic_fingerprint(cases)
    require(dataset_sha256 == baseline["dataset_sha256"], "locked benchmark fingerprint mismatch")

    if args.self_test:
        self_test(cases, dataset_sha256)

    result: dict[str, Any] = {
        "status": "ok",
        "bridge_schema_version": "1.0.0",
        "benchmark_dataset_sha256": dataset_sha256,
        "case_count": len(cases),
        "note": "Bridge validation/fixture scores are not evidence of real AI or private-core performance.",
    }
    if args.predictions:
        data = load_json(args.predictions)
        predictions = validate_export(data, cases, dataset_sha256)
        result["metrics"] = score_export(predictions, cases, baseline)

    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
