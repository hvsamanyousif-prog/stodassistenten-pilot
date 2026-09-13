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
        '<!doctype html><html lang="sv"><body><main>shell quick-help.html actor_type= person-pilot.html company-pilot.html En Stödassistenten – flera ingångar id="situation" function classify(text)</main></body></html>',
        encoding="utf-8",
    )
    (root / builder.PERSON_PILOT_PATH).write_text(
        '<!doctype html><html lang="sv"><body><main>pilot</main><script>function results(){};function resultCard(){};function render(){};sv:{};ar:{};fa:{};/* .rtl{direction:rtl */ /* document.body.classList.toggle(\'rtl\',l===\'ar\'||l===\'fa\') */</script></body></html>',
        encoding="utf-8",
    )
    for relative in builder.MODULE_PILOT_PATHS:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        if relative == "quick-help.html":
            path.write_text('<!doctype html><html><body><main id="main" tabindex="-1" aria-live="polite"></main><a class="skip"></a><script>let mode; if(![\'dental\',\'vision\'].includes(mode)){}; const x="forsakringskassan.se/privatperson/tandvard/tandvardsstod boverket.se/sv/babhandboken/bostadsanpassningsbidrag/ 1177.se/undersokning-behandling/hjalpmedel/syn/synhjalpmedel/";</script></body></html>', encoding="utf-8")
        else:
            path.write_text('<!doctype html><html><body>module</body></html>', encoding="utf-8")
    for relative in builder.SCRIPT_PATHS:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"// {relative}\n", encoding="utf-8")
    for relative in (*builder.SHELL_RUNTIME_PATHS, *builder.QUICK_RUNTIME_PATHS):
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"// {relative}\n", encoding='utf-8')
    profile = root / builder.PROFILE_PATH
    profile.parent.mkdir(parents=True, exist_ok=True)
    profile.write_text('{"schema_version":"1.0.0","capabilities":[]}', encoding="utf-8")


def test_injection_is_exact() -> None:
    source = '<html><body><script>window.keep="exact";</script></body></html>'
    built = builder.inject_wiring(source)
    block = builder.wiring_block() + "\n"
    require(built.replace(block, "", 1) == source, "managed block must be the only person-pilot HTML mutation")
    require(built.count(builder.MANAGED_START) == 1, "managed start marker must occur once")
    require(built.count(builder.MANAGED_END) == 1, "managed end marker must occur once")

    shell = builder.inject_shell_learning(source)
    shell_block = builder.shell_learning_block() + "\n"
    require(shell.replace(shell_block, "", 1) == source, "shell learning block must be the only shell HTML mutation")
    require(shell.count(builder.SHELL_LEARNING_START) == 1, "shell learning start marker must occur once")
    require(shell.count(builder.SHELL_LEARNING_END) == 1, "shell learning end marker must occur once")

    quick = builder.inject_quick_learning(source)
    quick_block = builder.quick_learning_block() + "\n"
    require(quick.replace(quick_block, "", 1) == source, "quick learning block must be the only quick-help HTML mutation")
    require(quick.count(builder.QUICK_LEARNING_START) == 1, "quick learning start marker must occur once")
    require(quick.count(builder.QUICK_LEARNING_END) == 1, "quick learning end marker must occur once")

    positions = [built.index(f'<script src="{path}"></script>') for path in builder.SCRIPT_PATHS]
    require(positions == sorted(positions), "capability scripts must remain in dependency order")
    shell_positions = [shell.index(f'<script src="{path}"></script>') for path in builder.SHELL_RUNTIME_PATHS]
    require(shell_positions == sorted(shell_positions), "shell privacy/learning scripts must remain in dependency order")
    quick_positions = [quick.index(f'<script src="{path}"></script>') for path in builder.QUICK_RUNTIME_PATHS]
    require(quick_positions == sorted(quick_positions), "quick-help runtime scripts must remain in dependency order")
    require(positions[-1] < built.index("</body>"), "capability scripts must load before </body>")
    require(shell_positions[-1] < shell.index('</body>'), 'shell runtime must load before </body>')
    require(quick_positions[-1] < quick.index('</body>'), 'quick-help runtimes must load before </body>')


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
            raise AssertionError("invalid person source HTML must fail closed")
    for fn,source in (
        (builder.inject_shell_learning,f'<html><body>{builder.SHELL_LEARNING_START}</body></html>'),
        (builder.inject_quick_learning,f'<html><body>{builder.QUICK_LEARNING_START}</body></html>'),
    ):
        try:
            fn(source)
        except ValueError:
            pass
        else:
            raise AssertionError('pre-wired public surface must fail closed')


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
            *(Path(path) for path in builder.QUICK_RUNTIME_PATHS),
            *(Path(path) for path in builder.SHELL_RUNTIME_PATHS),
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
    expected_shell_source = builder.repair_known_inline_syntax(source_shell, "index.html")
    built_shell = (site_root / "index.html").read_text(encoding="utf-8")
    shell_block = builder.shell_learning_block() + "\n"
    require(built_shell.replace(shell_block, "", 1) == expected_shell_source, "shared shell build changed HTML outside governed runtime wiring/hotfix")
    require(built_shell.count(builder.SHELL_LEARNING_START) == 1, 'shared shell must contain exactly one learning block')
    for token in (
        "En Stödassistenten – flera ingångar",
        "person-pilot.html",
        "company-pilot.html",
        "quick-help.html?mode=dental",
        "quick-help.html?mode=vision",
        'id="situation"',
        "function classify(text)",
        "actor_type=",
        builder.SHELL_ROUTING_PATH,
        builder.SHELL_LEARNING_PATH,
        builder.SHELL_GUIDANCE_PATH,
    ):
        require(token in built_shell, f"shared shell invariant missing: {token}")

    source_person = (source_root / builder.PERSON_PILOT_PATH).read_text(encoding="utf-8")
    built_person = (site_root / builder.PERSON_PILOT_PATH).read_text(encoding="utf-8")
    block = builder.wiring_block() + "\n"
    require(built_person.replace(block, "", 1) == source_person, "person pilot build changed HTML outside wiring block")

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

    require((site_root / "company-pilot.html").read_bytes() == (source_root / "company-pilot.html").read_bytes(), "company module must deploy byte-for-byte")

    source_quick = (source_root / "quick-help.html").read_text(encoding="utf-8")
    expected_quick_source = builder.repair_known_inline_syntax(source_quick, "quick-help.html")
    quick = (site_root / "quick-help.html").read_text(encoding="utf-8")
    quick_block = builder.quick_learning_block() + "\n"
    require(quick.replace(quick_block, "", 1) == expected_quick_source, "quick-help build changed HTML outside governed feedback/guidance wiring/hotfix")
    require(quick.count(builder.QUICK_LEARNING_START) == 1, "quick-help must contain exactly one learning block")

    for path in (*builder.SHELL_RUNTIME_PATHS, *builder.QUICK_RUNTIME_PATHS):
        require((site_root / path).read_bytes() == (source_root / path).read_bytes(), f'runtime must deploy byte-for-byte: {path}')

    for token in (
        'id="main" tabindex="-1" aria-live="polite"',
        'class="skip"',
        "['dental','vision']",
        "forsakringskassan.se/privatperson/tandvard/tandvardsstod",
        "boverket.se/sv/babhandboken/bostadsanpassningsbidrag/",
        "1177.se/undersokning-behandling/hjalpmedel/syn/synhjalpmedel/",
        builder.QUICK_LEARNING_PATH,
        builder.QUICK_GUIDANCE_PATH,
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
