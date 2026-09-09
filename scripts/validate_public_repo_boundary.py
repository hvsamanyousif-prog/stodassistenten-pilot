#!/usr/bin/env python3
"""Fail-closed guard against leaking private-core or secret material into the public repo.

This is intentionally dependency-free. It checks repository structure and high-confidence
secret patterns only; it does not attempt to classify business logic or user content.
"""

from __future__ import annotations

import argparse
import re
import tempfile
from pathlib import Path

SELF_PATH = Path("scripts/validate_public_repo_boundary.py")
SKIP_DIRS = {".git", ".pytest_cache", "__pycache__", "node_modules", "dist"}
MAX_TEXT_BYTES = 1_000_000

FORBIDDEN_PATH_SEGMENTS = {"private_core", "proprietary", "secrets"}
FORBIDDEN_BASENAMES = {
    ".env",
    "credentials.json",
    "service-account.json",
    "service_account.json",
    "id_rsa",
    "id_ed25519",
}
ALLOWED_ENV_EXAMPLES = {".env.example", ".env.sample", ".env.template"}

SECRET_ASSIGNMENT_RE = re.compile(
    r"(?im)^\s*(OPENAI_API_KEY|ANTHROPIC_API_KEY|SUPABASE_SERVICE_ROLE_KEY|"
    r"SERVICE_ROLE_KEY|DATABASE_URL|JWT_SECRET)\s*=\s*[\"']?([^\s\"'#]{12,})"
)
PRIVATE_KEY_RE = re.compile(
    r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"
)
SAFE_VALUE_MARKERS = ("${", "example", "placeholder", "changeme", "replace-me", "test-only")


def is_skipped(path: Path, root: Path) -> bool:
    rel = path.relative_to(root)
    return any(part in SKIP_DIRS for part in rel.parts)


def looks_textual(path: Path) -> tuple[bool, str]:
    try:
        raw = path.read_bytes()
    except OSError as exc:
        return False, f"unreadable file: {exc}"
    if len(raw) > MAX_TEXT_BYTES or b"\x00" in raw:
        return False, ""
    try:
        return True, raw.decode("utf-8")
    except UnicodeDecodeError:
        return False, ""


def validate(root: Path) -> list[str]:
    root = root.resolve()
    violations: list[str] = []

    for path in root.rglob("*"):
        if not path.is_file() or is_skipped(path, root):
            continue

        rel = path.relative_to(root)
        rel_posix = rel.as_posix()
        parts = set(rel.parts)

        if parts & FORBIDDEN_PATH_SEGMENTS:
            violations.append(f"{rel_posix}: forbidden private/secret path segment")

        name = path.name.lower()
        if name in FORBIDDEN_BASENAMES or (
            name.startswith(".env") and name not in ALLOWED_ENV_EXAMPLES
        ):
            violations.append(f"{rel_posix}: forbidden secret-bearing filename")

        if rel == SELF_PATH:
            continue

        textual, content = looks_textual(path)
        if not textual:
            continue

        if PRIVATE_KEY_RE.search(content):
            violations.append(f"{rel_posix}: private key material detected")

        for match in SECRET_ASSIGNMENT_RE.finditer(content):
            secret_name, value = match.groups()
            lower_value = value.lower()
            if any(marker in lower_value for marker in SAFE_VALUE_MARKERS):
                continue
            violations.append(
                f"{rel_posix}: possible live secret assigned to {secret_name}"
            )

    return sorted(set(violations))


def run_self_test() -> None:
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        (root / "docs").mkdir()
        (root / "docs" / "safe.md").write_text(
            "OPENAI_API_KEY=${OPENAI_API_KEY}\nNo real secret here.\n",
            encoding="utf-8",
        )
        (root / ".env.example").write_text(
            "OPENAI_API_KEY=placeholder-value\n", encoding="utf-8"
        )
        assert validate(root) == [], "safe fixture must pass"

    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        (root / "private_core").mkdir()
        (root / "private_core" / "engine.py").write_text("pass\n", encoding="utf-8")
        (root / ".env").write_text("X=1\n", encoding="utf-8")
        (root / "leak.txt").write_text(
            "OPENAI_API_KEY=sk-live-looking-value-123456789\n"
            "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
            encoding="utf-8",
        )
        violations = validate(root)
        joined = "\n".join(violations)
        assert "forbidden private/secret path segment" in joined
        assert "forbidden secret-bearing filename" in joined
        assert "possible live secret assigned to OPENAI_API_KEY" in joined
        assert "private key material detected" in joined

    print("public repository boundary self-test: OK")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return 0

    violations = validate(Path(args.root))
    if violations:
        print("PUBLIC REPOSITORY BOUNDARY VIOLATIONS:")
        for violation in violations:
            print(f"- {violation}")
        return 1

    print("public repository boundary: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
