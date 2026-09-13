#!/usr/bin/env python3
"""Dependency-free tests for the public pilot Pages build."""

from __future__ import annotations

import argparse
import tempfile
from pathlib import Path

import build_public_pilot as builder


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def make_fixture(root: Path) -> None:
    (root / "index.html").write_text(
        '<!doctype html><html lang="sv"><body><main>shell quick-help.html actor_type= person-pilot.html company-pilot.html En Stödassistenten – flera ingångar</main></body></html>',
        encoding="utf-8",
    )
    (root / builder.PERSON_PILOT_PATH).write_text(
        '<!doctype html><html lang="sv"><body><main>pilot</main><script>function results(){};function resultCard(){};function render(){};sv:{};ar:{};fa:{};/* .rtl{direction:rtl */ /* document.body.classList.toggle(\'rtl\',l===\'ar\'||l===\'fa\') */</script></body></html>',
        encoding="utf-8",
    )
    for relative in builder.MODULE_PILOT_PATHS:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('<!doctype html><html><body>module</body></html>', encoding="utf-8")
    for relative in builder.SCRIPT_PATHS:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"// {relative}\n", encoding="utf-8")
    profile = root / builder.PROFILE_PATH
    profile.parent.mkdir(parents=True, exist_ok=True)
    profile.write_text('{"schema_version":"1.0.0","capabilities":[]}', encoding="utf-8")


def test_injection_is_exact() -> None:
    source = '<html><body><script>window.keep="exact";</script></body></html>'
    built = builder.inject_wiring(source)
    block = builder.wiring_block() + "\n"
    require(built.replace(block, "", 1) == source, "managed block must be the only pilot HTML mutation")
    require(built.count(builder.MANAGED_START) == 1, "managed start marker must occur once")
    require(built.count(builder.MANAGED_END) == 1, "managed end marker must occur once")

    positions = [built.index(f'<script src="{path}"></script>') for path in builder.SCRIPT_PATHS]
    require(positions == sorted(positions), "capability scripts must remain in dependency order")
    require(positions[-1] < built.index("</body>"), "capability scripts must load before </body>")


def test_fail_closed_source_validation() -> None:
    for source in (
        "<html><body>missing close",
        f"<html><body>{builder.MANAGED_START}</body></html>",
        "<html><body></body><body></body></html>",
    ):
        try:
            builder.inject_wiring(source)
        except ValueError:
            pass
        else:
            raise AssertionError("invalid source HTML must fail closed")


def test_minimal_artifact() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / "repo"
        site = Path(tmp) / "site"
        root.mkdir()
        make_fixture(root)
        builder.build(root, site)
        expected = {
            Path("index.html"),
            Path(builder.PERSON_PILOT_PATH),
            Path(builder.PROFILE_PATH),
            *(Path(path) for path in builder.MODULE_PILOT_PATHS),
            *(Path(path) for path in builder.SCRIPT_PATHS),
        }
        actual = {path.relative_to(site) for path in site.rglob("*") if path.is_file()}
        require(actual == expected, f"public artifact drifted: {sorted(str(p) for p in actual ^ expected)}")

        (root / builder.SCRIPT_PATHS[-1]).unlink()
        try:
            builder.build(root, site)
        except FileNotFoundError:
            pass
        else:
            raise AssertionError("missing capability runtime asset must fail the build")


def verify_repository_build(source_root: Path, site_root: Path) -> None:
    source_shell = (source_root / "index.html").read_text(encoding="utf-8")
    built_shell = (site_root / "index.html").read_text(encoding="utf-8")
    require(built_shell == source_shell, "shared shell must deploy byte-for-byte")
    for token in (
        "En Stödassistenten – flera ingångar",
        "person-pilot.html",
        "company-pilot.html",
        "quick-help.html",
        "mode=dental",
        "mode=vision",
        "actor_type=",
    ):
        require(token in built_shell, f"shared shell invariant missing: {token}")

    source_person = (source_root / builder.PERSON_PILOT_PATH).read_text(encoding="utf-8")
    built_person = (site_root / builder.PERSON_PILOT_PATH).read_text(encoding="utf-8")
    block = builder.wiring_block() + "\n"
    require(
        built_person.replace(block, "", 1) == source_person,
        "person pilot build changed HTML outside wiring block",
    )

    for token in (
        "sv:{",
        "ar:{",
        "fa:{",
        ".rtl{direction:rtl",
        "document.body.classList.toggle('rtl',l==='ar'||l==='fa')",
    ):
        require(token in source_person, f"source person-pilot invariant missing: {token}")
        require(token in built_person, f"built person-pilot invariant missing: {token}")

    positions = [built_person.index(f'<script src="{path}"></script>') for path in builder.SCRIPT_PATHS]
    require(positions == sorted(positions), "person pilot script order drifted")
    require(built_person.count(builder.MANAGED_START) == 1, "person pilot must contain exactly one managed wiring block")

    for module in builder.MODULE_PILOT_PATHS:
        require((site_root / module).is_file(), f"deployed module missing: {module}")
        require(
            (site_root / module).read_bytes() == (source_root / module).read_bytes(),
            f"module must deploy byte-for-byte: {module}",
        )

    quick = (site_root / "quick-help.html").read_text(encoding="utf-8")
    for token in (
        'id="main" tabindex="-1" aria-live="polite"',
        'class="skip"',
        "mode==='dental'",
        "mode==='vision'",
        "forsakringskassan.se/privatperson/tandvard/tandvardsstod",
        "boverket.se/sv/babhandboken/for-dig-som-soker/vad-ar-bostadsanpassningsbidrag",
        "1177.se/undersokning-behandling/hjalpmedel/syn/synhjalpmedel",
    ):
        require(token in quick, f"quick-help accessibility/content invariant missing: {token}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=".")
    parser.add_argument("--site", default=None)
    args = parser.parse_args()

    test_injection_is_exact()
    test_fail_closed_source_validation()
    test_minimal_artifact()

    if args.site:
        verify_repository_build(Path(args.source).resolve(), Path(args.site).resolve())

    print("public pilot build tests: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())