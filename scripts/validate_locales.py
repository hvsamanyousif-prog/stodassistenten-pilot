#!/usr/bin/env python3
"""Dependency-free validation for Stödassistenten's scalable locale registry.

The registry is intentionally presentation-only. It must never carry eligibility,
matching, pricing, authorization or backend/service configuration.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

LOCALE_RE = re.compile(r"^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$")
UI_KEY_RE = re.compile(r"^[a-z][a-z0-9_-]{1,31}$")
VERSION_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
TOP_LEVEL_KEYS = {
    "schema_version",
    "canonical_rule_locale",
    "fallback_ui_locale",
    "locales",
}
LOCALE_KEYS = {
    "locale_id",
    "ui_key",
    "display_name",
    "direction",
    "pilot_active",
}
FORBIDDEN_SEMANTIC_TOKENS = {
    "eligibility",
    "entitlement",
    "matching",
    "match_rule",
    "support_rule",
    "pricing",
    "plan",
    "authorization",
    "endpoint",
    "token",
    "secret",
    "user_id",
    "case_id",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def validate_registry(data: Any) -> None:
    require(isinstance(data, dict), "locale registry must be an object")
    require(set(data) == TOP_LEVEL_KEYS, "locale registry top-level fields drifted")

    version = data["schema_version"]
    require(isinstance(version, str) and VERSION_RE.fullmatch(version), "invalid schema_version")

    canonical = data["canonical_rule_locale"]
    fallback = data["fallback_ui_locale"]
    require(isinstance(canonical, str) and LOCALE_RE.fullmatch(canonical), "invalid canonical_rule_locale")
    require(isinstance(fallback, str) and LOCALE_RE.fullmatch(fallback), "invalid fallback_ui_locale")
    require(canonical.lower().startswith("sv"), "canonical rule locale must remain Swedish")

    locales = data["locales"]
    require(isinstance(locales, list) and locales, "locales must be a non-empty array")

    locale_ids: set[str] = set()
    ui_keys: set[str] = set()
    active_ids: set[str] = set()

    for index, locale in enumerate(locales):
        prefix = f"locales[{index}]"
        require(isinstance(locale, dict), f"{prefix} must be an object")
        require(set(locale) == LOCALE_KEYS, f"{prefix} fields drifted")

        locale_id = locale["locale_id"]
        ui_key = locale["ui_key"]
        display_name = locale["display_name"]
        direction = locale["direction"]
        pilot_active = locale["pilot_active"]

        require(isinstance(locale_id, str) and LOCALE_RE.fullmatch(locale_id), f"{prefix}.locale_id is invalid")
        require(isinstance(ui_key, str) and UI_KEY_RE.fullmatch(ui_key), f"{prefix}.ui_key is invalid")
        require(isinstance(display_name, str) and 1 <= len(display_name) <= 80, f"{prefix}.display_name is invalid")
        require(direction in {"ltr", "rtl"}, f"{prefix}.direction must be ltr or rtl")
        require(type(pilot_active) is bool, f"{prefix}.pilot_active must be boolean")

        require(locale_id not in locale_ids, f"duplicate locale_id: {locale_id}")
        require(ui_key not in ui_keys, f"duplicate ui_key: {ui_key}")
        locale_ids.add(locale_id)
        ui_keys.add(ui_key)
        if pilot_active:
            active_ids.add(locale_id)

        lowered_keys = {key.lower() for key in locale}
        require(not (lowered_keys & FORBIDDEN_SEMANTIC_TOKENS), f"{prefix} contains forbidden product/backend semantics")

    require(canonical in locale_ids, "canonical_rule_locale must exist in locales")
    require(fallback in locale_ids, "fallback_ui_locale must exist in locales")
    require(fallback in active_ids, "fallback_ui_locale must be active in the pilot")
    require(active_ids, "at least one locale must be active in the pilot")


def run_self_tests() -> None:
    valid = {
        "schema_version": "1.0.0",
        "canonical_rule_locale": "sv-SE",
        "fallback_ui_locale": "sv-SE",
        "locales": [
            {
                "locale_id": "sv-SE",
                "ui_key": "sv",
                "display_name": "Svenska",
                "direction": "ltr",
                "pilot_active": True,
            },
            {
                "locale_id": "so",
                "ui_key": "so",
                "display_name": "Soomaali",
                "direction": "ltr",
                "pilot_active": False,
            },
        ],
    }
    validate_registry(valid)

    negative_cases = []

    duplicate = json.loads(json.dumps(valid))
    duplicate["locales"].append(dict(duplicate["locales"][0]))
    negative_cases.append((duplicate, "duplicate locale"))

    invalid_direction = json.loads(json.dumps(valid))
    invalid_direction["locales"][0]["direction"] = "auto"
    negative_cases.append((invalid_direction, "invalid direction"))

    inactive_fallback = json.loads(json.dumps(valid))
    inactive_fallback["locales"][0]["pilot_active"] = False
    negative_cases.append((inactive_fallback, "inactive fallback"))

    backend_leak = json.loads(json.dumps(valid))
    backend_leak["locales"][0]["endpoint"] = "https://private.invalid"
    negative_cases.append((backend_leak, "backend field leakage"))

    for payload, label in negative_cases:
        try:
            validate_registry(payload)
        except ValueError:
            continue
        raise AssertionError(f"self-test failed to reject: {label}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry", default="config/locales.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    validate_registry(load_json(Path(args.registry)))
    if args.self_test:
        run_self_tests()

    print("locale registry validation: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
