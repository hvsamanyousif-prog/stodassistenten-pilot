#!/usr/bin/env python3
"""Build the minimal GitHub Pages artifact for the public Stödassistenten pilot.

The source ``index.html`` intentionally stays easy to inspect. The deployed artifact
gets the public capability runtime injected at build time, after the legacy inline
pilot script has declared its browser globals. This keeps the change reversible and
lets CI prove that the only HTML change is the managed script block.
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


def wiring_block() -> str:
    lines = [MANAGED_START]
    lines.extend(f'<script src="{path}"></script>' for path in SCRIPT_PATHS)
    lines.append(MANAGED_END)
    return "\n".join(lines)


def inject_wiring(html: str) -> str:
    if MANAGED_START in html or MANAGED_END in html:
        raise ValueError("source index already contains managed capability wiring")
    if "</body>" not in html:
        raise ValueError("source index is missing </body>")
    if html.count("</body>") != 1:
        raise ValueError("source index must contain exactly one </body>")
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
    if not source_index.is_file():
        raise FileNotFoundError("index.html is missing")
    if source_root == output_root:
        raise ValueError("output directory must differ from source root")

    if output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True)

    source_html = source_index.read_text(encoding="utf-8")
    built_html = inject_wiring(source_html)
    (output_root / "index.html").write_text(built_html, encoding="utf-8")

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
