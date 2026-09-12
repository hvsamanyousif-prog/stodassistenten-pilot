#!/usr/bin/env python3
"""Validate the v0.2 public benchmark expansion and optional combined predictions.

The locked v0.1 benchmark remains unchanged for compatibility with the existing
private prediction bridge. This module layers 63 additional, fully synthetic
cases on top and adds explicit semantic language-parity guards.

Public-repo scope only: no production rules, prompts, secrets or user data.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from typing import Any

import evaluate_matching as core

ROOT = Path(__file__).resolve().parents[1]
EXPANSION_DIR = ROOT / "data" / "evals" / "expansion"
POLICY_PATH = ROOT / "data" / "evals" / "benchmark_expansion_policy.json"
PARITY_FIELDS = (
    "known_facts",
    "unknown_facts",
    "expected_support_areas",
    "must_not_claim",
    "expected_questions",
    "expected_next_actions",
    "risk_flags",
    "source_requirements",
)
SCORED_FIELDS = ("support_areas", "questions", "claims", "next_actions")
MINIMUM_KEYS = {
    "support_recall",
    "support_precision",
    "unsafe_claim_rate",
    "question_efficiency",
    "next_action_recall",
}


def validate_policy() -> dict[str, Any]:
    policy = core.load_json(POLICY_PATH)
    required = {
        "schema_version",
        "expansion_sha256",
        "expected_expansion_case_count",
        "expected_total_case_count",
        "expected_expansion_cases_per_segment",
        "expected_total_cases_per_segment",
        "required_languages_per_segment",
        "expected_parity_groups_per_segment",
        "minimum_prediction_parity_rate",
        "minimum_metrics",
        "change_reason",
    }
    core.require(isinstance(policy, dict) and set(policy) == required, "benchmark expansion policy fields drifted")
    core.require(
        isinstance(policy["schema_version"], str) and core.SEMVER_RE.fullmatch(policy["schema_version"]),
        "benchmark expansion policy schema_version invalid",
    )
    core.require(
        isinstance(policy["expansion_sha256"], str) and re.fullmatch(r"[0-9a-f]{64}", policy["expansion_sha256"]),
        "benchmark expansion policy expansion_sha256 invalid",
    )
    for field in (
        "expected_expansion_case_count",
        "expected_total_case_count",
        "expected_expansion_cases_per_segment",
        "expected_total_cases_per_segment",
        "expected_parity_groups_per_segment",
    ):
        core.require(isinstance(policy[field], int) and policy[field] > 0, f"{field} must be a positive integer")

    languages = policy["required_languages_per_segment"]
    core.require(isinstance(languages, list) and languages, "required_languages_per_segment must be non-empty")
    core.require(len(languages) == len(set(languages)), "required_languages_per_segment must be unique")
    core.require(set(languages) <= {"sv", "ar", "fa", "en"}, "required_languages_per_segment contains unsupported language")

    rate = policy["minimum_prediction_parity_rate"]
    core.require(isinstance(rate, (int, float)) and 0 <= rate <= 1, "minimum_prediction_parity_rate must be 0..1")

    metrics = policy["minimum_metrics"]
    core.require(isinstance(metrics, dict) and set(metrics) == MINIMUM_KEYS, "minimum_metrics fields drifted")
    for key, value in metrics.items():
        core.require(isinstance(value, (int, float)) and 0 <= value <= 1, f"minimum_metrics.{key} must be 0..1")

    core.require(
        isinstance(policy["change_reason"], str) and len(policy["change_reason"].strip()) >= 20,
        "benchmark expansion changes require a visible change_reason",
    )
    return policy


def load_expansion_cases() -> list[dict[str, Any]]:
    paths = sorted(EXPANSION_DIR.glob("*.json"))
    core.require(paths, "no benchmark expansion files found")
    cases: list[dict[str, Any]] = []
    for path in paths:
        data = core.load_json(path)
        core.require(
            isinstance(data, dict) and set(data) == {"schema_version", "generated_at", "purpose", "cases"},
            f"{path.relative_to(ROOT)} top-level fields drifted",
        )
        core.require(
            isinstance(data["schema_version"], str) and core.SEMVER_RE.fullmatch(data["schema_version"]),
            f"{path.relative_to(ROOT)} schema_version invalid",
        )
        try:
            generated = date.fromisoformat(data["generated_at"])
        except (TypeError, ValueError):
            core.fail(f"{path.relative_to(ROOT)} generated_at must be YYYY-MM-DD")
        core.require(generated <= date.today(), f"{path.relative_to(ROOT)} generated_at cannot be in the future")
        core.require(
            isinstance(data["purpose"], str) and len(data["purpose"]) >= 20,
            f"{path.relative_to(ROOT)} purpose too short",
        )
        core.require(isinstance(data["cases"], list) and data["cases"], f"{path.relative_to(ROOT)} cases empty")
        for index, item in enumerate(data["cases"]):
            core.validate_case(item, f"{path.relative_to(ROOT)}.cases[{index}]")
            cases.append(item)

    ids = [item["case_id"] for item in cases]
    core.require(len(ids) == len(set(ids)), "duplicate case_id across benchmark expansion files")
    return cases


def parity_case_ids(segment: str, languages: list[str]) -> list[str]:
    stem = segment.replace("_", "-")
    return [f"v02-{stem}-parity-{language}" for language in languages]


def validate_ground_truth_parity(expansion: list[dict[str, Any]], policy: dict[str, Any]) -> None:
    by_id = {item["case_id"]: item for item in expansion}
    languages = policy["required_languages_per_segment"]
    for segment in sorted(core.SEGMENTS):
        ids = parity_case_ids(segment, languages)
        core.require(
            all(case_id in by_id for case_id in ids),
            f"segment {segment} must contain one parity case for every required language",
        )
        reference = by_id[ids[0]]
        for case_id in ids[1:]:
            candidate = by_id[case_id]
            core.require(candidate["segment"] == reference["segment"], f"parity segment drift in {case_id}")
            for field in PARITY_FIELDS:
                core.require(
                    candidate[field] == reference[field],
                    f"ground-truth language parity drift: {case_id}.{field} differs from {ids[0]}",
                )


def validate_suite(base_cases: list[dict[str, Any]], expansion: list[dict[str, Any]], policy: dict[str, Any]) -> list[dict[str, Any]]:
    core.validate_baseline(base_cases)

    base_ids = {item["case_id"] for item in base_cases}
    expansion_ids = {item["case_id"] for item in expansion}
    core.require(not (base_ids & expansion_ids), "benchmark expansion case_id collides with locked v0.1 baseline")

    actual_hash = core.semantic_fingerprint(expansion)
    core.require(
        actual_hash == policy["expansion_sha256"],
        f"benchmark expansion changed semantically; expected {policy['expansion_sha256']}, got {actual_hash}",
    )
    core.require(
        len(expansion) == policy["expected_expansion_case_count"],
        f"expected {policy['expected_expansion_case_count']} expansion cases, found {len(expansion)}",
    )

    expansion_counts = Counter(item["segment"] for item in expansion)
    core.require(set(expansion_counts) == core.SEGMENTS, "benchmark expansion segment coverage drifted")
    for segment in sorted(core.SEGMENTS):
        core.require(
            expansion_counts[segment] == policy["expected_expansion_cases_per_segment"],
            f"segment {segment} expansion must contain {policy['expected_expansion_cases_per_segment']} cases",
        )
        languages = {item["language"] for item in expansion if item["segment"] == segment}
        missing = set(policy["required_languages_per_segment"]) - languages
        core.require(not missing, f"segment {segment} missing expansion languages: {sorted(missing)}")

    validate_ground_truth_parity(expansion, policy)

    combined = base_cases + expansion
    core.require(
        len(combined) == policy["expected_total_case_count"],
        f"expected {policy['expected_total_case_count']} total cases, found {len(combined)}",
    )
    total_counts = Counter(item["segment"] for item in combined)
    for segment in sorted(core.SEGMENTS):
        core.require(
            total_counts[segment] == policy["expected_total_cases_per_segment"],
            f"segment {segment} total must contain {policy['expected_total_cases_per_segment']} cases",
        )
    return combined


def validate_combined_predictions(data: Any, case_ids: set[str]) -> list[dict[str, Any]]:
    core.require(isinstance(data, dict), "predictions file must contain an object")
    core.require(set(data) == {"schema_version", "predictions"}, "predictions top-level fields drifted")
    core.require(
        isinstance(data["schema_version"], str) and core.SEMVER_RE.fullmatch(data["schema_version"]),
        "predictions schema_version invalid",
    )
    predictions = data["predictions"]
    core.require(isinstance(predictions, list), "predictions must be a list")
    seen: set[str] = set()
    for index, prediction in enumerate(predictions):
        loc = f"predictions[{index}]"
        core.require(
            isinstance(prediction, dict) and set(prediction) == core.PREDICTION_FIELDS,
            f"{loc} fields drifted",
        )
        case_id = prediction["case_id"]
        core.require(case_id in case_ids, f"{loc}.case_id unknown: {case_id!r}")
        core.require(case_id not in seen, f"duplicate prediction for {case_id}")
        seen.add(case_id)
        for field in SCORED_FIELDS:
            core.validate_token_list(prediction[field], f"{loc}.{field}", allow_empty=True)
    core.require(seen == case_ids, f"predictions must cover all combined benchmark cases; missing={sorted(case_ids-seen)}")
    return predictions


def enforce_metrics(label: str, metrics: dict[str, float | int], minimums: dict[str, float]) -> None:
    for key in ("support_recall", "support_precision", "question_efficiency", "next_action_recall"):
        core.require(
            float(metrics[key]) >= float(minimums[key]),
            f"{label}.{key}={metrics[key]:.4f} below minimum {minimums[key]:.4f}",
        )
    core.require(
        float(metrics["unsafe_claim_rate"]) <= float(minimums["unsafe_claim_rate"]),
        f"{label}.unsafe_claim_rate={metrics['unsafe_claim_rate']:.4f} above maximum {minimums['unsafe_claim_rate']:.4f}",
    )


def prediction_parity_rate(
    predictions_by_id: dict[str, dict[str, Any]],
    policy: dict[str, Any],
) -> tuple[float, list[str]]:
    languages = policy["required_languages_per_segment"]
    failures: list[str] = []
    total = 0
    for segment in sorted(core.SEGMENTS):
        total += 1
        ids = parity_case_ids(segment, languages)
        reference = predictions_by_id[ids[0]]
        drift_fields: list[str] = []
        for field in SCORED_FIELDS:
            expected = set(reference[field])
            if any(set(predictions_by_id[case_id][field]) != expected for case_id in ids[1:]):
                drift_fields.append(field)
        if drift_fields:
            failures.append(f"{segment}:{','.join(drift_fields)}")
    rate = (total - len(failures)) / total if total else 1.0
    return rate, failures


def score_combined(
    combined: list[dict[str, Any]],
    predictions: list[dict[str, Any]],
    policy: dict[str, Any],
) -> dict[str, Any]:
    by_id = {item["case_id"]: item for item in predictions}
    scores = [core.score_prediction(item, by_id[item["case_id"]]) for item in combined]
    overall = core.aggregate_scores(scores)
    enforce_metrics("overall", overall, policy["minimum_metrics"])

    segment_by_case = {item["case_id"]: item["segment"] for item in combined}
    grouped_segments: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for score in scores:
        grouped_segments[segment_by_case[score["case_id"]]].append(score)
    segment_metrics = {
        segment: core.aggregate_scores(items) for segment, items in sorted(grouped_segments.items())
    }
    for segment, metrics in segment_metrics.items():
        enforce_metrics(f"segment.{segment}", metrics, policy["minimum_metrics"])

    languages = policy["required_languages_per_segment"]
    parity_ids = {
        case_id
        for segment in core.SEGMENTS
        for case_id in parity_case_ids(segment, languages)
    }
    case_language = {item["case_id"]: item["language"] for item in combined if item["case_id"] in parity_ids}
    grouped_languages: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for score in scores:
        if score["case_id"] in parity_ids:
            grouped_languages[case_language[score["case_id"]]].append(score)
    language_metrics = {
        language: core.aggregate_scores(items) for language, items in sorted(grouped_languages.items())
    }
    core.require(set(language_metrics) == set(languages), "parity language metric coverage drifted")
    for language, metrics in language_metrics.items():
        enforce_metrics(f"language.{language}", metrics, policy["minimum_metrics"])

    parity_rate, parity_failures = prediction_parity_rate(by_id, policy)
    core.require(
        parity_rate >= float(policy["minimum_prediction_parity_rate"]),
        f"prediction language parity rate {parity_rate:.4f} below minimum "
        f"{policy['minimum_prediction_parity_rate']:.4f}; drift={parity_failures}",
    )

    return {
        "overall_metrics": overall,
        "segment_metrics": segment_metrics,
        "parity_language_metrics": language_metrics,
        "prediction_parity_rate": parity_rate,
        "prediction_parity_failures": parity_failures,
    }


def oracle_predictions(cases: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "schema_version": "0.2.0",
        "predictions": [
            {
                "case_id": item["case_id"],
                "support_areas": list(item["expected_support_areas"]),
                "questions": list(item["expected_questions"]),
                "claims": [],
                "next_actions": list(item["expected_next_actions"]),
            }
            for item in cases
        ],
    }


def self_test(combined: list[dict[str, Any]], policy: dict[str, Any]) -> None:
    oracle = oracle_predictions(combined)
    predictions = validate_combined_predictions(oracle, {item["case_id"] for item in combined})
    result = score_combined(combined, predictions, policy)
    core.require(abs(float(result["prediction_parity_rate"]) - 1.0) < 1e-12, "oracle parity self-test failed")

    red_team = json.loads(json.dumps(oracle))
    target = next(
        item for item in red_team["predictions"]
        if item["case_id"] == "v02-akassa-parity-ar"
    )
    target["support_areas"].append("language_only_extra")
    predictions = validate_combined_predictions(red_team, {item["case_id"] for item in combined})
    failed = False
    try:
        score_combined(combined, predictions, policy)
    except SystemExit:
        failed = True
    core.require(failed, "Red Team self-test must reject cross-language prediction drift")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--predictions", type=Path, help="Prediction JSON covering all 108 benchmark cases")
    parser.add_argument("--validate-only", action="store_true", help="Validate expansion and combined benchmark structure")
    parser.add_argument("--self-test", action="store_true", help="Run deterministic metric and Red Team parity tests")
    args = parser.parse_args()

    policy = validate_policy()
    base_cases = core.load_cases()
    expansion = load_expansion_cases()
    combined = validate_suite(base_cases, expansion, policy)

    if args.self_test:
        self_test(combined, policy)

    result: dict[str, Any] = {
        "status": "ok",
        "locked_v01_cases": len(base_cases),
        "expansion_cases": len(expansion),
        "total_cases": len(combined),
        "segments": len(core.SEGMENTS),
        "required_languages_per_segment": policy["required_languages_per_segment"],
        "ground_truth_parity_groups": len(core.SEGMENTS) * policy["expected_parity_groups_per_segment"],
        "expansion_sha256": policy["expansion_sha256"],
    }

    if args.predictions:
        data = core.load_json(args.predictions)
        predictions = validate_combined_predictions(data, {item["case_id"] for item in combined})
        result.update(score_combined(combined, predictions, policy))

    print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))


if __name__ == "__main__":
    main()
