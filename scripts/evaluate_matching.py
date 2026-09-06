#!/usr/bin/env python3
"""Validate and score Stödassistenten synthetic matching benchmarks.

Public-repo scope: benchmark integrity and metric implementation only. The real
matching engine and verified rule data belong in the private core. This script
uses only the Python standard library and never needs network access, secrets or
user data.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
EVAL_DIR = ROOT / "data" / "evals"
CASES_DIR = EVAL_DIR / "cases"
BASELINE_PATH = EVAL_DIR / "benchmark_baseline.json"
TOKEN_RE = re.compile(r"^[a-z][a-z0-9_]{1,79}$")
CASE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{2,79}$")
SEMVER_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
SEGMENTS = {
    "pension_ekonomi",
    "akassa",
    "deltid_sjukskrivning",
    "npf_funktionsnedsattning",
    "cancer",
    "anhorig",
    "villa_energi",
    "forening",
    "foretag",
}
CASE_FIELDS = {
    "case_id",
    "segment",
    "language",
    "story",
    "known_facts",
    "unknown_facts",
    "expected_support_areas",
    "must_not_claim",
    "expected_questions",
    "expected_next_actions",
    "risk_flags",
    "source_requirements",
}
PREDICTION_FIELDS = {
    "case_id",
    "support_areas",
    "questions",
    "claims",
    "next_actions",
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


def validate_token_list(value: Any, field: str, *, allow_empty: bool = False) -> None:
    require(isinstance(value, list), f"{field} must be a list")
    if not allow_empty:
        require(bool(value), f"{field} must not be empty")
    require(len(value) == len(set(value)), f"{field} must contain unique values")
    for item in value:
        require(isinstance(item, str) and TOKEN_RE.fullmatch(item) is not None,
                f"{field} contains invalid token: {item!r}")


def validate_case(case: Any, location: str) -> None:
    require(isinstance(case, dict), f"{location} must be an object")
    require(set(case) == CASE_FIELDS,
            f"{location} fields drifted; missing={sorted(CASE_FIELDS-set(case))}, extra={sorted(set(case)-CASE_FIELDS)}")
    require(isinstance(case["case_id"], str) and CASE_ID_RE.fullmatch(case["case_id"]),
            f"{location}.case_id invalid")
    require(case["segment"] in SEGMENTS, f"{location}.segment invalid: {case['segment']!r}")
    require(case["language"] in {"sv", "ar", "fa", "en"}, f"{location}.language invalid")
    require(isinstance(case["story"], str) and 20 <= len(case["story"]) <= 800,
            f"{location}.story must be 20..800 characters")
    facts = case["known_facts"]
    require(isinstance(facts, dict) and facts, f"{location}.known_facts must be a non-empty object")
    for key, value in facts.items():
        require(isinstance(key, str) and TOKEN_RE.fullmatch(key), f"{location}.known_facts key invalid: {key!r}")
        require(value is None or isinstance(value, (str, int, float, bool)),
                f"{location}.known_facts[{key!r}] must be scalar")
    for field in (
        "unknown_facts",
        "expected_support_areas",
        "must_not_claim",
        "expected_questions",
        "expected_next_actions",
    ):
        validate_token_list(case[field], f"{location}.{field}")
    validate_token_list(case["risk_flags"], f"{location}.risk_flags", allow_empty=True)
    sources = case["source_requirements"]
    require(isinstance(sources, list) and sources, f"{location}.source_requirements must be a non-empty list")
    require(len(sources) == len(set(sources)), f"{location}.source_requirements must be unique")
    for source in sources:
        require(isinstance(source, str) and 2 <= len(source) <= 120,
                f"{location}.source_requirements contains invalid source")


def load_cases() -> list[dict[str, Any]]:
    paths = sorted(CASES_DIR.glob("*.json"))
    require(paths, "no eval case files found")
    all_cases: list[dict[str, Any]] = []
    for path in paths:
        data = load_json(path)
        require(isinstance(data, dict), f"{path.relative_to(ROOT)} must contain an object")
        require(set(data) == {"schema_version", "generated_at", "purpose", "cases"},
                f"{path.relative_to(ROOT)} top-level fields drifted")
        require(isinstance(data["schema_version"], str) and SEMVER_RE.fullmatch(data["schema_version"]),
                f"{path.relative_to(ROOT)} schema_version invalid")
        try:
            generated = date.fromisoformat(data["generated_at"])
        except (TypeError, ValueError):
            fail(f"{path.relative_to(ROOT)} generated_at must be YYYY-MM-DD")
        require(generated <= date.today(), f"{path.relative_to(ROOT)} generated_at cannot be in the future")
        require(isinstance(data["purpose"], str) and len(data["purpose"]) >= 20,
                f"{path.relative_to(ROOT)} purpose too short")
        require(isinstance(data["cases"], list) and data["cases"], f"{path.relative_to(ROOT)} cases empty")
        for index, case in enumerate(data["cases"]):
            validate_case(case, f"{path.relative_to(ROOT)}.cases[{index}]")
            all_cases.append(case)

    ids = [case["case_id"] for case in all_cases]
    require(len(ids) == len(set(ids)), "duplicate case_id across eval files")
    counts = Counter(case["segment"] for case in all_cases)
    baseline = load_json(BASELINE_PATH)
    expected_count = baseline.get("expected_case_count")
    expected_per_segment = baseline.get("expected_cases_per_segment")
    require(len(all_cases) == expected_count,
            f"expected {expected_count} total cases, found {len(all_cases)}")
    require(set(counts) == SEGMENTS, f"segment coverage drifted: {sorted(counts)}")
    for segment in sorted(SEGMENTS):
        require(counts[segment] == expected_per_segment,
                f"segment {segment} must contain {expected_per_segment} cases, found {counts[segment]}")
    return all_cases


def semantic_fingerprint(cases: list[dict[str, Any]]) -> str:
    canonical = json.dumps(
        sorted(cases, key=lambda item: item["case_id"]),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def validate_baseline(cases: list[dict[str, Any]]) -> dict[str, Any]:
    baseline = load_json(BASELINE_PATH)
    required = {
        "schema_version",
        "dataset_sha256",
        "expected_case_count",
        "expected_cases_per_segment",
        "minimum_metrics",
        "change_reason",
    }
    require(set(baseline) == required, "benchmark_baseline.json fields drifted")
    require(isinstance(baseline["change_reason"], str) and len(baseline["change_reason"].strip()) >= 20,
            "benchmark baseline changes require a visible change_reason of at least 20 characters")
    actual = semantic_fingerprint(cases)
    require(actual == baseline["dataset_sha256"],
            "semantic eval dataset changed. Update benchmark_baseline.json dataset_sha256 and change_reason in the same review")
    metrics = baseline["minimum_metrics"]
    require(isinstance(metrics, dict), "minimum_metrics must be an object")
    expected_metrics = {
        "support_recall",
        "support_precision",
        "unsafe_claim_rate",
        "question_efficiency",
        "next_action_recall",
    }
    require(set(metrics) == expected_metrics, "minimum_metrics fields drifted")
    for key, value in metrics.items():
        require(isinstance(value, (int, float)) and 0 <= value <= 1, f"minimum_metrics.{key} must be 0..1")
    return baseline


def set_metric(expected: list[str], predicted: list[str]) -> tuple[float, float, list[str]]:
    e, p = set(expected), set(predicted)
    hit = len(e & p)
    recall = hit / len(e) if e else 1.0
    precision = hit / len(p) if p else (1.0 if not e else 0.0)
    return recall, precision, sorted(e - p)


def score_prediction(case: dict[str, Any], prediction: dict[str, Any]) -> dict[str, Any]:
    recall, precision, missed = set_metric(case["expected_support_areas"], prediction["support_areas"])
    q_recall, q_precision, _ = set_metric(case["expected_questions"], prediction["questions"])
    action_recall, _, _ = set_metric(case["expected_next_actions"], prediction["next_actions"])
    unsafe = sorted(set(case["must_not_claim"]) & set(prediction["claims"]))
    return {
        "case_id": case["case_id"],
        "support_recall": recall,
        "support_precision": precision,
        "missed_support": missed,
        "unsafe_claims": unsafe,
        "question_efficiency": q_recall * q_precision,
        "next_action_recall": action_recall,
    }


def validate_predictions(data: Any, case_ids: set[str]) -> list[dict[str, Any]]:
    require(isinstance(data, dict), "predictions file must contain an object")
    require(set(data) == {"schema_version", "predictions"}, "predictions top-level fields drifted")
    require(isinstance(data["schema_version"], str) and SEMVER_RE.fullmatch(data["schema_version"]),
            "predictions schema_version invalid")
    predictions = data["predictions"]
    require(isinstance(predictions, list), "predictions must be a list")
    seen: set[str] = set()
    for index, prediction in enumerate(predictions):
        loc = f"predictions[{index}]"
        require(isinstance(prediction, dict) and set(prediction) == PREDICTION_FIELDS,
                f"{loc} fields drifted")
        case_id = prediction["case_id"]
        require(case_id in case_ids, f"{loc}.case_id unknown: {case_id!r}")
        require(case_id not in seen, f"duplicate prediction for {case_id}")
        seen.add(case_id)
        for field in ("support_areas", "questions", "claims", "next_actions"):
            validate_token_list(prediction[field], f"{loc}.{field}", allow_empty=True)
    require(seen == case_ids, f"predictions must cover every benchmark case; missing={sorted(case_ids-seen)}")
    return predictions


def aggregate_scores(scores: list[dict[str, Any]]) -> dict[str, float | int]:
    count = len(scores)
    unsafe_count = sum(len(item["unsafe_claims"]) for item in scores)
    missed_count = sum(len(item["missed_support"]) for item in scores)
    return {
        "cases": count,
        "support_recall": sum(item["support_recall"] for item in scores) / count,
        "support_precision": sum(item["support_precision"] for item in scores) / count,
        "missed_support_count": missed_count,
        "unsafe_claim_count": unsafe_count,
        "unsafe_claim_rate": sum(bool(item["unsafe_claims"]) for item in scores) / count,
        "question_efficiency": sum(item["question_efficiency"] for item in scores) / count,
        "next_action_recall": sum(item["next_action_recall"] for item in scores) / count,
    }


def enforce_policy(metrics: dict[str, float | int], baseline: dict[str, Any]) -> None:
    minimums = baseline["minimum_metrics"]
    for key in ("support_recall", "support_precision", "question_efficiency", "next_action_recall"):
        require(float(metrics[key]) >= float(minimums[key]),
                f"benchmark regression: {key}={metrics[key]:.4f} below minimum {minimums[key]:.4f}")
    require(float(metrics["unsafe_claim_rate"]) <= float(minimums["unsafe_claim_rate"]),
            f"benchmark regression: unsafe_claim_rate={metrics['unsafe_claim_rate']:.4f} above maximum {minimums['unsafe_claim_rate']:.4f}")


def self_test() -> None:
    case = {
        "case_id": "selftest-001",
        "expected_support_areas": ["alpha", "beta"],
        "must_not_claim": ["unsafe"],
        "expected_questions": ["q_alpha", "q_beta"],
        "expected_next_actions": ["next_alpha", "next_beta"],
    }
    prediction = {
        "case_id": "selftest-001",
        "support_areas": ["alpha", "extra"],
        "questions": ["q_alpha", "q_extra"],
        "claims": ["unsafe"],
        "next_actions": ["next_alpha"],
    }
    scored = score_prediction(case, prediction)
    expected = {
        "support_recall": 0.5,
        "support_precision": 0.5,
        "question_efficiency": 0.25,
        "next_action_recall": 0.5,
    }
    for key, value in expected.items():
        require(abs(scored[key] - value) < 1e-12, f"self-test failed for {key}: {scored[key]} != {value}")
    require(scored["missed_support"] == ["beta"], "self-test missed_support failed")
    require(scored["unsafe_claims"] == ["unsafe"], "self-test unsafe_claims failed")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--predictions", type=Path, help="Full prediction JSON to score against the benchmark")
    parser.add_argument("--validate-only", action="store_true", help="Validate dataset and baseline only")
    parser.add_argument("--self-test", action="store_true", help="Run deterministic metric unit test")
    args = parser.parse_args()

    cases = load_cases()
    baseline = validate_baseline(cases)
    if args.self_test:
        self_test()
    result: dict[str, Any] = {
        "status": "ok",
        "case_count": len(cases),
        "segments": dict(sorted(Counter(case["segment"] for case in cases).items())),
        "dataset_sha256": semantic_fingerprint(cases),
    }
    if args.predictions:
        data = load_json(args.predictions)
        predictions = validate_predictions(data, {case["case_id"] for case in cases})
        by_id = {item["case_id"]: item for item in predictions}
        scores = [score_prediction(case, by_id[case["case_id"]]) for case in cases]
        metrics = aggregate_scores(scores)
        enforce_policy(metrics, baseline)
        result["metrics"] = metrics
        result["cases_with_missed_support"] = [item["case_id"] for item in scores if item["missed_support"]]
        result["cases_with_unsafe_claims"] = [item["case_id"] for item in scores if item["unsafe_claims"]]
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
