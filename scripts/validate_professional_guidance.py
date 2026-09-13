#!/usr/bin/env python3
"""Validate the shared-shell professional guidance runtime without browser dependencies."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "client/professional-guidance.js"
BUILDER = ROOT / "scripts/build_public_pilot.py"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    js = RUNTIME.read_text(encoding="utf-8")
    build = BUILDER.read_text(encoding="utf-8")

    require('SHELL_GUIDANCE_PATH = "client/professional-guidance.js"' in build, "guidance runtime is not wired into public build")
    require("SHELL_GUIDANCE_PATH" in build.split("SHELL_RUNTIME_PATHS", 1)[1], "guidance runtime is not part of shell runtime set")

    for locale in ("sv:{", "ar:{", "fa:{"):
        require(locale in js, f"missing guidance locale: {locale}")
    for token in (
        "journey-rail",
        "engine-summary",
        "route-badge",
        "route-detail",
        "primary-route",
        "Börja här",
        "Också relevant",
        "Motorn prioriterar alternativ men fattar inte beslut åt dig",
    ):
        require(token in js, f"professional guidance invariant missing: {token}")

    require("new MutationObserver" in js, "guidance must react when situation results render")
    require("routeKey(anchor)" in js, "guidance must preserve route-specific next-step copy")

    forbidden = ("fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "pilot-feedback", "q',text", 'q",text')
    for token in forbidden:
        require(token not in js, f"guidance runtime must stay local-only and data-minimal: {token}")

    print("professional guidance validation: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
