#!/usr/bin/env python3
"""Deterministic change-detection contract for normalized support records.

Standard-library only. This is a public, synthetic test harness for the future
private ingestion engine. It never fetches external sources or handles user
case data.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures" / "change_detection"


class ChangeDetectionError(ValueError):
    pass


def load(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        value = json.load(fh)
    if not isinstance(value, dict):
        raise ChangeDetectionError(f"{path}: root must be a JSON object")
    return value


def canonical_hash(value: Any) -> str:
    encoded = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def material_projection(record: dict[str, Any]) -> dict[str, Any]:
    """Select fields whose change can alter eligibility, value or next action."""
    eligibility = record.get("eligibility") or {}
    benefit = record.get("benefit") or {}
    application = record.get("application") or {}
    lifecycle = record.get("lifecycle") or {}
    return {
        "name": record.get("name"),
        "category": record.get("category"),
        "provider": record.get("provider"),
        "geography": record.get("geography"),
        "audience": record.get("audience"),
        "eligibility": {
            "conditions": eligibility.get("conditions"),
            "exclusions": eligibility.get("exclusions"),
        },
        "benefit": {
            "kind": benefit.get("kind"),
            "amount_text": benefit.get("amount_text"),
            "calculation_text": benefit.get("calculation_text"),
            "recurrence": benefit.get("recurrence"),
        },
        "documents": record.get("documents"),
        "application": {
            "method": application.get("method"),
            "url": application.get("url"),
            "deadline_text": application.get("deadline_text"),
            "next_step": application.get("next_step"),
        },
        "lifecycle": {
            "valid_from": lifecycle.get("valid_from"),
            "valid_to": lifecycle.get("valid_to"),
        },
    }


def diff_paths(old: Any, new: Any, prefix: str = "") -> list[str]:
    if type(old) is not type(new):
        return [prefix or "$"]
    if isinstance(old, dict):
        changed: list[str] = []
        for key in sorted(set(old) | set(new)):
            path = f"{prefix}.{key}" if prefix else key
            if key not in old or key not in new:
                changed.append(path)
            else:
                changed.extend(diff_paths(old[key], new[key], path))
        return changed
    if isinstance(old, list):
        return [] if old == new else [prefix or "$"]
    return [] if old == new else [prefix or "$"]


HIGH_RISK_PREFIXES = (
    "provider",
    "geography",
    "eligibility.conditions",
    "eligibility.exclusions",
    "benefit.amount_text",
    "benefit.calculation_text",
    "benefit.recurrence",
    "application.method",
    "application.url",
    "application.deadline_text",
    "lifecycle.valid_from",
    "lifecycle.valid_to",
)
MEDIUM_RISK_PREFIXES = (
    "name",
    "category",
    "audience",
    "documents",
    "benefit.kind",
    "application.next_step",
)


def classify_risk(changed_fields: list[str]) -> str:
    if any(field.startswith(HIGH_RISK_PREFIXES) for field in changed_fields):
        return "HIGH"
    if any(field.startswith(MEDIUM_RISK_PREFIXES) for field in changed_fields):
        return "MEDIUM"
    return "LOW"


def compare_records(old: dict[str, Any], new: dict[str, Any]) -> dict[str, Any]:
    old_id = old.get("support_id")
    new_id = new.get("support_id")
    if not isinstance(old_id, str) or not old_id:
        raise ChangeDetectionError("old record must have support_id")
    if old_id != new_id:
        raise ChangeDetectionError(
            f"support_id mismatch: old={old_id!r} new={new_id!r}"
        )

    old_material = material_projection(old)
    new_material = material_projection(new)
    changed_fields = diff_paths(old_material, new_material)

    return {
        "support_id": old_id,
        "raw_changed": canonical_hash(old) != canonical_hash(new),
        "material_changed": bool(changed_fields),
        "changed_material_fields": changed_fields,
        "risk_class": classify_risk(changed_fields),
        "old_raw_hash": canonical_hash(old),
        "new_raw_hash": canonical_hash(new),
        "old_material_hash": canonical_hash(old_material),
        "new_material_hash": canonical_hash(new_material),
    }


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ChangeDetectionError(message)


def self_test() -> None:
    cases = load(FIXTURES / "cases.json")
    for name in ("baseline", "cosmetic_only", "eligibility_changed", "next_step_changed"):
        require(isinstance(cases.get(name), dict), f"fixture case {name!r} must be an object")
    baseline = cases["baseline"]
    cosmetic = cases["cosmetic_only"]
    eligibility = cases["eligibility_changed"]
    next_step = cases["next_step_changed"]

    result = compare_records(baseline, cosmetic)
    require(result["raw_changed"] is True, "cosmetic fixture must change raw hash")
    require(
        result["material_changed"] is False,
        "cosmetic-only fixture must not trigger material change",
    )
    require(result["risk_class"] == "LOW", "cosmetic-only risk must be LOW")

    result = compare_records(baseline, eligibility)
    require(result["material_changed"] is True, "eligibility change must be material")
    require(result["risk_class"] == "HIGH", "eligibility change must be HIGH risk")
    require(
        "eligibility.conditions" in result["changed_material_fields"],
        "eligibility condition diff must be visible",
    )

    result = compare_records(baseline, next_step)
    require(result["material_changed"] is True, "next-step change must be material")
    require(result["risk_class"] == "MEDIUM", "next-step change must be MEDIUM risk")
    require(
        "application.next_step" in result["changed_material_fields"],
        "next-step diff must be visible",
    )

    mismatched = dict(next_step)
    mismatched["support_id"] = "se-other-synthetic-support"
    try:
        compare_records(baseline, mismatched)
    except ChangeDetectionError:
        pass
    else:
        raise ChangeDetectionError("support_id mismatch must fail closed")

    print("OK: change-detection contract passed 4 synthetic Red Team scenarios")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--old", type=Path)
    parser.add_argument("--new", type=Path)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.old or args.new:
        if not (args.old and args.new):
            raise ChangeDetectionError("--old and --new must be supplied together")
        result = compare_records(load(args.old), load(args.new))
        if args.json:
            print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))
        else:
            print(
                f"{result['support_id']}: material_changed={result['material_changed']} "
                f"risk={result['risk_class']} fields={result['changed_material_fields']}"
            )

    if args.self_test or not (args.old or args.new):
        self_test()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ChangeDetectionError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
