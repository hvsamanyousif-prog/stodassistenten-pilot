#!/usr/bin/env python3
"""Contract for plain-language orientation on the shared public entry page.

This is a source/build contract, not a human comprehension study. It protects the
bounded product requirement that the normal landing surface explains what the
pilot does and what the first step returns without exposing internal architecture
terminology as user-facing copy.
"""

from __future__ import annotations

import argparse
from pathlib import Path


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def verify(site_root: Path) -> None:
    html = (site_root / "index.html").read_text(encoding="utf-8")

    required = (
        "Beskriv situationen med egna ord. Du får några relevanta vägar",
        "ae:'Börja här'",
        "at:'Vad behöver du hjälp med?'",
        "Pilotversion: Stödassistenten hjälper dig hitta och förstå nästa steg.",
        "Jag studerar och söker stipendium",
        "company-pilot.html?actor_type=company",
        "person-pilot.html?actor_type=student",
        "quick-help.html?mode=dental",
    )
    for token in required:
        require(token in html, f"shared entry is missing plain-language contract: {token}")

    forbidden_user_copy = (
        "ae:'Situationsmotor'",
        "badge:'Pilotmotor'",
        "samma sannings- och lärlager",
        "principle:'En produkt. En intelligens. Ett sanningslager. Ett lärsystem.",
        "ae:'محرك الحالة'",
        "badge:'محرك تجريبي'",
        "مصدر حقيقة واحد. نظام تعلم واحد",
        "ae:'موتور شرایط'",
        "badge:'موتور آزمایشی'",
        "یک لایه حقیقت. یک سیستم یادگیری",
    )
    for token in forbidden_user_copy:
        require(token not in html, f"internal architecture language leaked onto normal user surface: {token}")

    require("privacy:'Din beskrivning analyseras lokalt" in html, "existing local-analysis privacy boundary must remain visible")
    require("ar:{" in html and "fa:{" in html, "Arabic and Persian landing copy must remain present")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", default="_site")
    args = parser.parse_args()
    verify(Path(args.site).resolve())
    print("landing clarity contract: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
