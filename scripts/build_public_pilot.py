#!/usr/bin/env python3
"""Build the minimal GitHub Pages artifact for the public Stödassistenten pilot.

The root ``index.html`` is the shared platform shell. The preserved person pilot
lives at ``person-pilot.html`` and receives the public capability runtime at build
time. Company and focused quick-help pages remain explicit deep-link modules
inside the same deployed site.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

MANAGED_START = "<!-- STOD_CAPABILITY_WIRING_START -->"
MANAGED_END = "<!-- STOD_CAPABILITY_WIRING_END -->"
SCRIPT_PATHS = (
    "client/capabilities.js",
    "client/pilot-surface.js",
    "client/public-pilot-ui-gate.js",
    "client/public-pilot-wiring.js",
)
PROFILE_PATH = "config/public_pilot_capabilities.json"
PERSON_PILOT_PATH = "person-pilot.html"
MODULE_PILOT_PATHS = ("company-pilot.html", "quick-help.html")


def wiring_block() -> str:
    lines = [MANAGED_START]
    lines.extend(f'<script src="{path}"></script>' for path in SCRIPT_PATHS)
    lines.append(MANAGED_END)
    return "\n".join(lines)


def inject_wiring(html: str) -> str:
    if MANAGED_START in html or MANAGED_END in html:
        raise ValueError("source pilot already contains managed capability wiring")
    if "</body>" not in html:
        raise ValueError("source pilot is missing </body>")
    if html.count("</body>") != 1:
        raise ValueError("source pilot must contain exactly one </body>")
    return html.replace("</body>", f"{wiring_block()}\n</body>", 1)


def copy_required_asset(source_root: Path, output_root: Path, relative_path: str) -> None:
    source = source_root / relative_path
    if not source.is_file():
        raise FileNotFoundError(f"required public pilot asset is missing: {relative_path}")
    destination = output_root / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def build(source_root: Path, output_root: Path) -> Path:
    source_root = source_root.resolve()
    output_root = output_root.resolve()
    source_index = source_root / "index.html"
    source_person = source_root / PERSON_PILOT_PATH
    if not source_index.is_file():
        raise FileNotFoundError("index.html is missing")
    if not source_person.is_file():
        raise FileNotFoundError(f"{PERSON_PILOT_PATH} is missing")
    if source_root == output_root:
        raise ValueError("output directory must differ from source root")

    if output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True)

    # Shared shell is deployed unchanged. Capability wiring belongs to the
    # preserved person pilot until the shared matcher/session runtime is unified.
    shutil.copy2(source_index, output_root / "index.html")
    person_html = source_person.read_text(encoding="utf-8")
    (output_root / PERSON_PILOT_PATH).write_text(inject_wiring(person_html), encoding="utf-8")

    for path in MODULE_PILOT_PATHS:
        copy_required_asset(source_root, output_root, path)
    for path in SCRIPT_PATHS:
        copy_required_asset(source_root, output_root, path)
    copy_required_asset(source_root, output_root, PROFILE_PATH)
    return output_root / "index.html"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=".", help="repository root")
    parser.add_argument("--output", default="_site", help="build output directory")
    args = parser.parse_args()
    built = build(Path(args.source), Path(args.output))
    print(f"public pilot build: OK ({built})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())