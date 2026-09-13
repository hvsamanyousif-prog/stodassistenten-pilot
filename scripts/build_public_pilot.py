#!/usr/bin/env python3
"""Build the minimal GitHub Pages artifact for the public Stödassistenten pilot.

The root ``index.html`` is the shared platform shell. The preserved person pilot
lives at ``person-pilot.html`` and receives the public capability runtime at build
time. Company and focused quick-help pages remain modules inside the same deployed
site. Small governed runtime blocks add feedback coverage and privacy-preserving
route handoff without duplicating product engines.
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

MANAGED_START = "<!-- STOD_CAPABILITY_WIRING_START -->"
MANAGED_END = "<!-- STOD_CAPABILITY_WIRING_END -->"
SHELL_LEARNING_START = "<!-- STOD_EXPERIENCE_LEARNING_START -->"
SHELL_LEARNING_END = "<!-- STOD_EXPERIENCE_LEARNING_END -->"
QUICK_LEARNING_START = "<!-- STOD_QUICK_HELP_LEARNING_START -->"
QUICK_LEARNING_END = "<!-- STOD_QUICK_HELP_LEARNING_END -->"
SHELL_ROUTING_PATH = "client/privacy-routing.js"
SHELL_LEARNING_PATH = "client/experience-learning.js"
QUICK_LEARNING_PATH = "client/quick-help-feedback.js"
PERSON_CONTEXT_PATH = "client/person-context-learning.js"
SHELL_RUNTIME_PATHS = (SHELL_ROUTING_PATH, SHELL_LEARNING_PATH)
SCRIPT_PATHS = (
    "client/capabilities.js",
    "client/pilot-surface.js",
    "client/public-pilot-ui-gate.js",
    "client/public-pilot-wiring.js",
    PERSON_CONTEXT_PATH,
)
PROFILE_PATH = "config/public_pilot_capabilities.json"
PERSON_PILOT_PATH = "person-pilot.html"
MODULE_PILOT_PATHS = ("company-pilot.html", "quick-help.html")


def wiring_block() -> str:
    lines = [MANAGED_START]
    lines.extend(f'<script src="{path}"></script>' for path in SCRIPT_PATHS)
    lines.append(MANAGED_END)
    return "\n".join(lines)


def shell_learning_block() -> str:
    lines = [SHELL_LEARNING_START]
    lines.extend(f'<script src="{path}"></script>' for path in SHELL_RUNTIME_PATHS)
    lines.append(SHELL_LEARNING_END)
    return "\n".join(lines)


def quick_learning_block() -> str:
    return "\n".join((QUICK_LEARNING_START, f'<script src="{QUICK_LEARNING_PATH}"></script>', QUICK_LEARNING_END))


def inject_before_body(html: str, block: str, forbidden_markers: tuple[str, ...]) -> str:
    if any(marker in html for marker in forbidden_markers):
        raise ValueError("source HTML already contains managed wiring")
    if html.count("</body>") != 1:
        raise ValueError("source HTML must contain exactly one </body>")
    return html.replace("</body>", f"{block}\n</body>", 1)


def inject_wiring(html: str) -> str:
    return inject_before_body(html, wiring_block(), (MANAGED_START, MANAGED_END))


def inject_shell_learning(html: str) -> str:
    return inject_before_body(html, shell_learning_block(), (SHELL_LEARNING_START, SHELL_LEARNING_END))


def inject_quick_learning(html: str) -> str:
    return inject_before_body(html, quick_learning_block(), (QUICK_LEARNING_START, QUICK_LEARNING_END))


def repair_known_inline_syntax(html: str, page: str) -> str:
    """Hotfix the two locale-object brace regressions that reached main.

    This is intentionally narrow and fail-closed: the build only repairs the
    exact structural signature we observed. Source files should be corrected
    separately; this protects the live Pages artifact immediately.
    """
    if page == "index.html":
        marker = "company-pilot.html?actor_type=company']]}}\n};\nconst KEYWORDS="
        fixed = "company-pilot.html?actor_type=company']]}\n};\nconst KEYWORDS="
    elif page == "quick-help.html":
        marker = "unsure:['می‌خواهم بدانم چه کمک‌هایی وجود دارد','گسترده شروع کن.']}}}}\n};\nconst SV_RESULTS="
        fixed = "unsure:['می‌خواهم بدانم چه کمک‌هایی وجود دارد','گسترده شروع کن.']}}}\n};\nconst SV_RESULTS="
    else:
        return html
    if marker in html:
        return html.replace(marker, fixed, 1)
    return html


def validate_inline_javascript(html: str, label: str) -> None:
    scripts = re.findall(r"<script(?:\\s[^>]*)?>(.*?)</script>", html, flags=re.S)
    with tempfile.TemporaryDirectory() as tmp:
        for i, script in enumerate(scripts):
            if not script.strip():
                continue
            path = Path(tmp) / f"{label.replace('/', '_')}-{i}.js"
            path.write_text(script, encoding="utf-8")
            proc = subprocess.run(
                ["node", "--check", str(path)],
                capture_output=True,
                text=True,
                check=False,
            )
            if proc.returncode:
                detail = (proc.stderr or proc.stdout).strip()
                raise ValueError(f"inline JavaScript syntax invalid in {label} script {i}: {detail}")


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
    source_quick = source_root / "quick-help.html"
    if not source_index.is_file():
        raise FileNotFoundError("index.html is missing")
    if not source_person.is_file():
        raise FileNotFoundError(f"{PERSON_PILOT_PATH} is missing")
    if not source_quick.is_file():
        raise FileNotFoundError("quick-help.html is missing")
    if source_root == output_root:
        raise ValueError("output directory must differ from source root")

    if output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True)

    shell_html = repair_known_inline_syntax(source_index.read_text(encoding="utf-8"), "index.html")
    built_shell = inject_shell_learning(shell_html)
    validate_inline_javascript(built_shell, "index.html")
    (output_root / "index.html").write_text(built_shell, encoding="utf-8")

    person_html = source_person.read_text(encoding="utf-8")
    built_person = inject_wiring(person_html)
    validate_inline_javascript(built_person, PERSON_PILOT_PATH)
    (output_root / PERSON_PILOT_PATH).write_text(built_person, encoding="utf-8")

    copy_required_asset(source_root, output_root, "company-pilot.html")
    quick_html = repair_known_inline_syntax(source_quick.read_text(encoding="utf-8"), "quick-help.html")
    built_quick = inject_quick_learning(quick_html)
    validate_inline_javascript(built_quick, "quick-help.html")
    (output_root / "quick-help.html").write_text(built_quick, encoding="utf-8")

    for path in SCRIPT_PATHS:
        copy_required_asset(source_root, output_root, path)
    for path in SHELL_RUNTIME_PATHS:
        copy_required_asset(source_root, output_root, path)
    copy_required_asset(source_root, output_root, QUICK_LEARNING_PATH)
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
