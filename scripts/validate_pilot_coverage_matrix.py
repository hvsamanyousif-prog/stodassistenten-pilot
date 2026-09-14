#!/usr/bin/env python3
"""Guard the operational coverage matrix against known runtime/documentation drift."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
matrix = (root / "docs" / "PILOT_COVERAGE_MATRIX.md").read_text(encoding="utf-8")
privacy = (root / "client" / "privacy-routing.js").read_text(encoding="utf-8")
vab_runtime = (root / "client" / "vab-focus.js").read_text(encoding="utf-8")
property_runtime = (root / "client" / "property-accessibility-focus.js").read_text(encoding="utf-8")

required_rows = [
    "| Privatperson |",
    "| Student/nyexaminerad |",
    "| Äldre person |",
    "| Person med funktionsnedsättning |",
    "| Anställd |",
    "| Anhörig som hjälper annan |",
    "| Barn via vårdnadshavare/familj |",
    "| Företag |",
    "| Förening/ideell |",
    "| BRF/fastighetsaktör |",
]
for row in required_rows:
    assert row in matrix, f"coverage matrix missing actor row: {row}"

# Known product capabilities must not regress back into stale documentation.
assert "ingen tydlig dedikerad publik ingång ännu" not in matrix
assert "VAB 12+ och deltidssjukskrivning + VAB finns som evals men ännu inte som egna publika fokuserade stödvägar" not in matrix
assert "focus=vab" in matrix
assert "property_actor" in matrix and "property_accessibility" in matrix
assert "tandflödet är ännu generiskt" in matrix

# Runtime/artifact existence backs the updated matrix claims. These checks do not
# turn the matrix into a truth source; they only prevent documentation drift.
for rel in [
    "client/assistance-focus.js",
    "client/housing-adaptation-guidance.js",
    "data/evals/scenario_lab_websignals_v16.json",
    "data/evals/scenario_lab_websignals_v17.json",
    "data/evals/scenario_lab_websignals_v19.json",
]:
    assert (root / rel).exists(), f"matrix references missing artifact: {rel}"

assert "focus !== 'vab'" in vab_runtime
assert "focus !== 'property_accessibility'" in property_runtime
assert "vab" in privacy.lower()
assert "property" in privacy.lower()

print("pilot coverage matrix: OK (actor rows + current runtime claims guarded)")
