#!/usr/bin/env python3
"""Deterministic review-task contract for support knowledge.

This public harness converts review-worthy support knowledge into machine-readable
human-review tasks. It handles support/source metadata only, never user case data.
The actual persistent queue/backend belongs in the private product core.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from test_change_detection import canonical_hash, compare_records, material_projection

ROOT = Path(__file__).resolve().parents[1]
SUPPORT_DIR = ROOT / "data" / "supports"
CHANGE_FIXTURES = ROOT / "tests" / "fixtures" / "change_detection" / "cases.json"


class ReviewQueueError(ValueError):
    pass


TASK_KEYS = {
    "task_id",
    "support_id",
    "trigger",
    "status",
    "priority",
    "risk_class",
    "reason_codes",
    "changed_material_fields",
    "requires_human_review",
    "source_id",
    "source_url",
    "previous_material_hash",
    "current_material_hash",
    "created_at",
}

HASH_RE = re.compile(r"^[a-f0-9]{64}$")
TASK_ID_RE = re.compile(r"^review_[a-z0-9._-]+_[a-f0-9]{12}$")


def load(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        value = json.load(fh)
    if not isinstance(value, dict):
        raise ReviewQueueError(f"{path}: root must be a JSON object")
    return value


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ReviewQueueError(message)


def parse_datetime(value: str) -> None:
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError) as exc:
        raise ReviewQueueError(f"invalid created_at: {value!r}") from exc


def source_metadata(record: dict[str, Any]) -> tuple[str, str]:
    source = record.get("source")
    require(isinstance(source, dict), "support record must include source object")
    source_id = source.get("source_id")
    source_url = source.get("url")
    require(isinstance(source_id, str) and source_id, "source.source_id is required")
    require(
        isinstance(source_url, str) and source_url.startswith("https://"),
        "source.url must be HTTPS",
    )
    return source_id, source_url


def task_id(support_id: str, current_material_hash: str) -> str:
    return f"review_{support_id}_{current_material_hash[:12]}"


def priority_for_risk(risk_class: str) -> str:
    return {
        "HIGH": "P0",
        "MEDIUM": "P1",
        "LOW": "P2",
        "UNASSESSED": "P1",
    }[risk_class]


def reason_codes(changed_fields: list[str]) -> list[str]:
    reasons: set[str] = set()
    for field in changed_fields:
        if field.startswith("eligibility"):
            reasons.add("ELIGIBILITY_CHANGED")
        elif field.startswith("benefit"):
            reasons.add("BENEFIT_CHANGED")
        elif field.startswith("application"):
            reasons.add("APPLICATION_CHANGED")
        elif field.startswith("provider"):
            reasons.add("PROVIDER_CHANGED")
        elif field.startswith("geography"):
            reasons.add("GEOGRAPHY_CHANGED")
        elif field.startswith("lifecycle"):
            reasons.add("LIFECYCLE_CHANGED")
        elif field.startswith("audience"):
            reasons.add("AUDIENCE_CHANGED")
        elif field.startswith("documents"):
            reasons.add("DOCUMENTS_CHANGED")
        else:
            reasons.add("OTHER_MATERIAL_CHANGE")
    return sorted(reasons)


def validate_task(task: dict[str, Any]) -> None:
    require(set(task) == TASK_KEYS, "review task fields must match the public contract exactly")
    require(TASK_ID_RE.fullmatch(task["task_id"]) is not None, "invalid task_id")
    require(isinstance(task["support_id"], str) and task["support_id"], "support_id required")
    require(task["trigger"] in {"NEEDS_REVIEW", "MATERIAL_CHANGE"}, "invalid trigger")
    require(task["status"] == "OPEN", "public generator may only create OPEN tasks")
    require(task["priority"] in {"P0", "P1", "P2"}, "invalid priority")
    require(task["risk_class"] in {"UNASSESSED", "LOW", "MEDIUM", "HIGH"}, "invalid risk_class")
    require(task["requires_human_review"] is True, "human review may never be bypassed")
    require(isinstance(task["reason_codes"], list) and task["reason_codes"], "reason_codes required")
    require(len(task["reason_codes"]) == len(set(task["reason_codes"])), "reason_codes must be unique")
    require(isinstance(task["changed_material_fields"], list), "changed_material_fields must be a list")
    require(isinstance(task["source_id"], str) and task["source_id"], "source_id required")
    require(task["source_url"].startswith("https://"), "source_url must be HTTPS")
    require(HASH_RE.fullmatch(task["current_material_hash"]) is not None, "invalid current material hash")
    previous = task["previous_material_hash"]
    require(previous is None or HASH_RE.fullmatch(previous) is not None, "invalid previous material hash")
    parse_datetime(task["created_at"])

    expected_priority = priority_for_risk(task["risk_class"])
    require(task["priority"] == expected_priority, "priority must be derived from risk class")

    if task["trigger"] == "NEEDS_REVIEW":
        require(task["risk_class"] == "UNASSESSED", "initial review risk must be UNASSESSED")
        require(task["previous_material_hash"] is None, "initial review cannot have previous hash")
        require(task["changed_material_fields"] == [], "initial review cannot claim changed fields")
        require(task["reason_codes"] == ["INITIAL_HUMAN_REVIEW"], "initial review reason mismatch")
    else:
        require(task["risk_class"] != "UNASSESSED", "material change must have assessed risk")
        require(task["previous_material_hash"] is not None, "material change requires previous hash")
        require(bool(task["changed_material_fields"]), "material change requires changed fields")
        require("INITIAL_HUMAN_REVIEW" not in task["reason_codes"], "change task cannot use initial-review reason")


def build_initial_review_task(record: dict[str, Any], created_at: str) -> dict[str, Any]:
    verification = record.get("verification")
    require(isinstance(verification, dict), "support record must include verification object")
    require(verification.get("status") == "NEEDS_REVIEW", "initial task requires NEEDS_REVIEW status")
    require(verification.get("human_review_required") is True, "initial task requires human_review_required=true")
    support_id = record.get("support_id")
    require(isinstance(support_id, str) and support_id, "support_id required")
    source_id, source_url = source_metadata(record)
    current_hash = canonical_hash(material_projection(record))
    task = {
        "task_id": task_id(support_id, current_hash),
        "support_id": support_id,
        "trigger": "NEEDS_REVIEW",
        "status": "OPEN",
        "priority": "P1",
        "risk_class": "UNASSESSED",
        "reason_codes": ["INITIAL_HUMAN_REVIEW"],
        "changed_material_fields": [],
        "requires_human_review": True,
        "source_id": source_id,
        "source_url": source_url,
        "previous_material_hash": None,
        "current_material_hash": current_hash,
        "created_at": created_at,
    }
    validate_task(task)
    return task


def build_change_review_task(
    old: dict[str, Any], new: dict[str, Any], created_at: str
) -> dict[str, Any] | None:
    comparison = compare_records(old, new)
    if not comparison["material_changed"]:
        return None

    verification = new.get("verification")
    require(isinstance(verification, dict), "new support record must include verification object")
    require(verification.get("status") == "CHANGED", "material-change task requires CHANGED status")
    require(verification.get("human_review_required") is True, "changed record must require human review")
    source_id, source_url = source_metadata(new)
    risk_class = comparison["risk_class"]
    changed_fields = comparison["changed_material_fields"]
    task = {
        "task_id": task_id(comparison["support_id"], comparison["new_material_hash"]),
        "support_id": comparison["support_id"],
        "trigger": "MATERIAL_CHANGE",
        "status": "OPEN",
        "priority": priority_for_risk(risk_class),
        "risk_class": risk_class,
        "reason_codes": reason_codes(changed_fields),
        "changed_material_fields": changed_fields,
        "requires_human_review": True,
        "source_id": source_id,
        "source_url": source_url,
        "previous_material_hash": comparison["old_material_hash"],
        "current_material_hash": comparison["new_material_hash"],
        "created_at": created_at,
    }
    validate_task(task)
    return task


def scan_current_supports() -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for path in sorted(SUPPORT_DIR.glob("*.json")):
        record = load(path)
        verification = record.get("verification") or {}
        if verification.get("status") != "NEEDS_REVIEW":
            continue
        source = record.get("source") or {}
        created_at = source.get("retrieved_at")
        require(isinstance(created_at, str), f"{path}: source.retrieved_at required for deterministic scan")
        tasks.append(build_initial_review_task(record, created_at))
    return tasks


def self_test() -> None:
    current_tasks = scan_current_supports()
    expected_current = sum(
        1
        for path in SUPPORT_DIR.glob("*.json")
        if (load(path).get("verification") or {}).get("status") == "NEEDS_REVIEW"
    )
    require(len(current_tasks) == expected_current, "every NEEDS_REVIEW support must produce one task")
    require(len({task["task_id"] for task in current_tasks}) == len(current_tasks), "task IDs must be unique")

    cases = load(CHANGE_FIXTURES)
    baseline = dict(cases["baseline"])
    baseline["source"] = {
        "source_id": "se-synthetic-source",
        "url": "https://example.invalid/support",
        "retrieved_at": "2026-09-10T10:00:00Z",
    }
    baseline["verification"] = {
        "status": "VERIFIED",
        "human_review_required": False,
    }

    cosmetic = dict(cases["cosmetic_only"])
    cosmetic["source"] = {
        "source_id": "se-synthetic-source",
        "url": "https://example.invalid/support",
        "retrieved_at": "2026-09-11T08:00:00Z",
    }
    cosmetic["verification"] = {
        "status": "CHANGED",
        "human_review_required": True,
    }
    require(
        build_change_review_task(baseline, cosmetic, "2026-09-11T08:00:00Z") is None,
        "cosmetic-only source refresh must not create a material review task",
    )

    eligibility = dict(cases["eligibility_changed"])
    eligibility["source"] = {
        "source_id": "se-synthetic-source",
        "url": "https://example.invalid/support",
        "retrieved_at": "2026-09-11T08:00:00Z",
    }
    eligibility["verification"] = {
        "status": "CHANGED",
        "human_review_required": True,
    }
    high = build_change_review_task(baseline, eligibility, "2026-09-11T08:00:00Z")
    require(high is not None, "eligibility change must create review task")
    require(high["priority"] == "P0", "HIGH-risk eligibility change must be P0")
    require("ELIGIBILITY_CHANGED" in high["reason_codes"], "eligibility reason must be explicit")

    next_step = dict(cases["next_step_changed"])
    next_step["source"] = {
        "source_id": "se-synthetic-source",
        "url": "https://example.invalid/support",
        "retrieved_at": "2026-09-11T08:00:00Z",
    }
    next_step["verification"] = {
        "status": "CHANGED",
        "human_review_required": True,
    }
    medium = build_change_review_task(baseline, next_step, "2026-09-11T08:00:00Z")
    require(medium is not None, "next-step change must create review task")
    require(medium["priority"] == "P1", "MEDIUM-risk next-step change must be P1")
    require("APPLICATION_CHANGED" in medium["reason_codes"], "application reason must be explicit")

    unsafe = dict(eligibility)
    unsafe["verification"] = {"status": "VERIFIED", "human_review_required": False}
    try:
        build_change_review_task(baseline, unsafe, "2026-09-11T08:00:00Z")
    except ReviewQueueError:
        pass
    else:
        raise ReviewQueueError("material change marked VERIFIED must fail closed")

    print(
        f"OK: review queue contract passed current-dataset coverage + 4 Red Team scenarios; "
        f"open synthetic/current tasks={len(current_tasks)}"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--scan-current", action="store_true")
    args = parser.parse_args()

    if args.scan_current:
        print(json.dumps(scan_current_supports(), ensure_ascii=False, sort_keys=True, indent=2))
    if args.self_test or not args.scan_current:
        self_test()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ReviewQueueError, FileNotFoundError, json.JSONDecodeError, KeyError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
