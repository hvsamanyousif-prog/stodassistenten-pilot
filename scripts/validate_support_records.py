#!/usr/bin/env python3
"""Validate public, non-user support records and their source grounding.

Standard-library only. This validator deliberately checks a conservative
subset of the JSON Schema plus cross-file invariants that matter for the
public pilot: source IDs, official-source hosts, review state and basic
lifecycle consistency.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SUPPORTS = DATA / "supports"
ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{2,127}$")


class ValidationError(ValueError):
    pass


def fail(message: str) -> None:
    raise ValidationError(message)


def load(path: Path):
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def parse_dt(value: object, field: str) -> datetime:
    require(isinstance(value, str) and value, f"{field} must be an ISO date-time")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValidationError(f"{field} must be ISO-8601: {value!r}") from exc
    require(parsed.tzinfo is not None, f"{field} must include timezone")
    return parsed.astimezone(timezone.utc)


def https_host(value: object, field: str) -> str:
    require(isinstance(value, str), f"{field} must be a string")
    parsed = urlparse(value)
    require(parsed.scheme == "https" and parsed.hostname, f"{field} must be an https URL")
    require(parsed.username is None and parsed.password is None, f"{field} must not contain credentials")
    return parsed.hostname.lower()


def validate_record(record: dict, path: str, registry: dict, schema: dict) -> None:
    require(isinstance(record, dict), f"{path}: root must be an object")
    required = set(schema["required"])
    allowed = set(schema["properties"])
    require(required <= set(record), f"{path}: missing required fields {sorted(required - set(record))}")
    require(set(record) <= allowed, f"{path}: unexpected fields {sorted(set(record) - allowed)}")

    support_id = record.get("support_id")
    require(isinstance(support_id, str) and ID_RE.fullmatch(support_id), f"{path}: invalid support_id")
    require(record.get("category") in schema["properties"]["category"]["enum"], f"{path}: invalid category")

    provider = record.get("provider")
    require(isinstance(provider, dict), f"{path}: provider must be object")
    require(bool(provider.get("name")), f"{path}: provider.name required")
    require(provider.get("provider_type") in schema["properties"]["provider"]["properties"]["provider_type"]["enum"], f"{path}: invalid provider_type")

    geography = record.get("geography")
    require(isinstance(geography, dict), f"{path}: geography must be object")
    require(geography.get("level") in schema["properties"]["geography"]["properties"]["level"]["enum"], f"{path}: invalid geography.level")
    if geography.get("level") == "national":
        require(geography.get("country_code") == "SE", f"{path}: national support must have country_code SE")

    eligibility = record.get("eligibility")
    require(isinstance(eligibility, dict), f"{path}: eligibility must be object")
    for key in ("conditions", "exclusions", "missing_information_questions"):
        require(isinstance(eligibility.get(key), list), f"{path}: eligibility.{key} must be list")
    seen_rules = set()
    for rule in eligibility["conditions"] + eligibility["exclusions"]:
        require(isinstance(rule, dict), f"{path}: rule must be object")
        for key in ("rule_id", "field", "operator", "value", "source_url"):
            require(key in rule, f"{path}: rule missing {key}")
        require(rule["rule_id"] not in seen_rules, f"{path}: duplicate rule_id {rule['rule_id']}")
        seen_rules.add(rule["rule_id"])
        https_host(rule["source_url"], f"{path}: rule.source_url")
    seen_questions = set()
    for question in eligibility["missing_information_questions"]:
        require(isinstance(question, dict), f"{path}: question must be object")
        for key in ("question_id", "prompt", "reason"):
            require(isinstance(question.get(key), str) and question[key].strip(), f"{path}: question.{key} required")
        require(question["question_id"] not in seen_questions, f"{path}: duplicate question_id {question['question_id']}")
        seen_questions.add(question["question_id"])

    application = record.get("application")
    require(isinstance(application, dict), f"{path}: application must be object")
    require(application.get("method") in schema["properties"]["application"]["properties"]["method"]["enum"], f"{path}: invalid application.method")
    if application.get("url") is not None:
        https_host(application["url"], f"{path}: application.url")
    require(isinstance(application.get("next_step"), str) and application["next_step"].strip(), f"{path}: next_step is required by product quality policy")

    source = record.get("source")
    require(isinstance(source, dict), f"{path}: source must be object")
    source_id = source.get("source_id")
    require(source_id in registry, f"{path}: unknown source_id {source_id!r}")
    source_host = https_host(source.get("url"), f"{path}: source.url")
    registry_host = https_host(registry[source_id]["url"], f"registry[{source_id}].url")
    require(source_host == registry_host, f"{path}: source host {source_host} differs from registry host {registry_host}")
    retrieved = parse_dt(source.get("retrieved_at"), f"{path}: source.retrieved_at")
    require(retrieved <= datetime.now(timezone.utc), f"{path}: retrieved_at cannot be in the future")

    verification = record.get("verification")
    require(isinstance(verification, dict), f"{path}: verification must be object")
    statuses = set(schema["properties"]["verification"]["properties"]["status"]["enum"])
    status = verification.get("status")
    require(status in statuses, f"{path}: invalid verification.status")
    if status in {"DISCOVERED", "PARSED", "NEEDS_REVIEW", "CHANGED"}:
        require(verification.get("human_review_required") is True, f"{path}: {status} must require human review")
    if status == "NEEDS_REVIEW":
        require(verification.get("last_verified_at") is None, f"{path}: NEEDS_REVIEW cannot claim last_verified_at")
        require(verification.get("material_fields_verified") == [], f"{path}: NEEDS_REVIEW cannot claim verified material fields")
    if status == "VERIFIED":
        require(verification.get("human_review_required") is False, f"{path}: VERIFIED must have completed human review")
        require(verification.get("last_verified_at") is not None, f"{path}: VERIFIED requires last_verified_at")
        parse_dt(verification["last_verified_at"], f"{path}: verification.last_verified_at")
        material = set(verification.get("material_fields_verified") or [])
        require({"provider", "eligibility", "application", "geography"} <= material, f"{path}: VERIFIED is missing core material-field review")

    lifecycle = record.get("lifecycle")
    require(isinstance(lifecycle, dict), f"{path}: lifecycle must be object")
    first_seen = parse_dt(lifecycle.get("first_seen_at"), f"{path}: lifecycle.first_seen_at")
    last_seen = parse_dt(lifecycle.get("last_seen_at"), f"{path}: lifecycle.last_seen_at")
    require(first_seen <= last_seen, f"{path}: first_seen_at must be <= last_seen_at")
    require(type(lifecycle.get("version")) is int and lifecycle["version"] >= 1, f"{path}: lifecycle.version must be >= 1")


def self_test(sample: dict, registry: dict, schema: dict) -> None:
    mutations = []

    bad = copy.deepcopy(sample)
    bad["source"]["source_id"] = "unknown-source"
    mutations.append((bad, "unknown source must fail"))

    bad = copy.deepcopy(sample)
    bad["source"]["url"] = "http://example.com/not-safe"
    mutations.append((bad, "non-https source must fail"))

    bad = copy.deepcopy(sample)
    bad["verification"]["human_review_required"] = False
    mutations.append((bad, "unreviewed record cannot bypass human review"))

    bad = copy.deepcopy(sample)
    bad["application"]["next_step"] = ""
    mutations.append((bad, "missing next step must fail"))

    for candidate, label in mutations:
        try:
            validate_record(candidate, "self-test", registry, schema)
        except ValidationError:
            continue
        fail(f"self-test failed: {label}")
    print(f"OK: {len(mutations)} negative support-record self-tests passed")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    schema = load(DATA / "support_record.schema.json")
    registry_doc = load(DATA / "source_registry.json")
    registry = {source["source_id"]: source for source in registry_doc["sources"]}
    files = sorted(SUPPORTS.glob("*.json"))
    require(files, "data/supports must contain at least one support record")

    records = []
    seen_ids = set()
    for file in files:
        record = load(file)
        validate_record(record, str(file.relative_to(ROOT)), registry, schema)
        require(record["support_id"] not in seen_ids, f"duplicate support_id across files: {record['support_id']}")
        seen_ids.add(record["support_id"])
        records.append(record)

    if args.self_test:
        self_test(records[0], registry, schema)
    print(f"OK: validated {len(records)} review-state support records; none are treated as user eligibility decisions")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValidationError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
