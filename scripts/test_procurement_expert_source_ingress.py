#!/usr/bin/env python3
"""Regression: unsupported link/document ingress must not look functional."""
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SourceIngressParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.source_url_attrs: dict[str, str | None] | None = None
        self.visible_text: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        attrs_map = dict(attrs)
        if attrs_map.get("id") == "sourceUrl":
            self.source_url_attrs = {str(k): v for k, v in attrs_map.items()}

    def handle_data(self, data: str) -> None:
        self.visible_text.append(data)


def main() -> int:
    html = (ROOT / "procurement-expert-pilot.html").read_text(encoding="utf-8")
    parser = SourceIngressParser()
    parser.feed(html)
    assert parser.source_url_attrs is not None, "Compatibility sourceUrl control is missing"
    assert parser.source_url_attrs.get("type") == "hidden", (
        "Public source URL is not fetched or verified in this pilot and must not be presented as a usable input"
    )
    visible = " ".join(parser.visible_text).lower()
    assert "publik källänk" not in visible, "Unsupported public-link ingress is still visible to users"
    assert "ladda upp" not in visible and "dokumentlänk" not in visible, "Unsupported document ingress is presented as functional"
    print("procurement source ingress boundary: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
