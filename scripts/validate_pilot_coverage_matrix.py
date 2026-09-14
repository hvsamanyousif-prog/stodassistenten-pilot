#!/usr/bin/env python3
"""Guard the operational coverage matrix against known runtime/documentation drift."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
matrix = (root / "docs" / "PILOT_COVERAGE_MATRIX.md").read_text(encoding="utf-8")
privacy = (root / "client" / "privacy-routing.js").read_text(encoding="utf-8")
vab_runtime = (root / "client" / "vab-focus.js").read_text(encoding="utf-8")
property_runtime = (root / "client" / "property-accessibility-focus.js").read_text(encoding="utf-8")
dental67_runtime = (root / "client" / "dental-67-guidance.js").read_text(encoding="utf-8")
relative_runtime = (root / "client" / "relative-care.js").read_text(encoding="utf-8")
work_injury_dental_runtime = (root / "client" / "work-injury-dental.js").read_text(encoding="utf-8")

required_rows = [
    "| Privatperson |",
    "| Student/nyexaminerad |",
    "| Äldre person |",
    "| Person med funktionsnedsättning |",
    "| Anställd |",
    "| Egenföretagare |",
    "| Egenanställd via faktureringsföretag |",
    "Anhörig/vän som hjälper annan",
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
assert "tandflödet är ännu generiskt" not in matrix
assert "focus=vab" in matrix
assert "property_actor" in matrix and "property_accessibility" in matrix
assert "dental quick-help med åldersmedveten 67+-handoff" in matrix
assert "Handoffen får inte avgöra exakt eligibility, åtgärdsomfattning eller slutkostnad" in matrix
assert "relative_care" in matrix
assert "livshotande tillstånd och avstående från arbete" in matrix
assert "work_injury_dental" in matrix
assert "trafikolycka på arbetsresan" in matrix
assert "work_context=self_employed" in matrix
assert "work_context=invoiced_worker" in matrix
assert "aldrig rå skadeberättelse" in matrix
assert "NEEDS_REVIEW" in matrix

# Runtime/artifact existence backs the updated matrix claims. These checks do not
# turn the matrix into a truth source; they only prevent documentation drift.
for rel in [
    "client/assistance-focus.js",
    "client/housing-adaptation-guidance.js",
    "client/dental-67-guidance.js",
    "client/relative-care.js",
    "client/work-injury-dental.js",
    "data/evals/scenario_lab_websignals_v16.json",
    "data/evals/scenario_lab_websignals_v17.json",
    "data/evals/scenario_lab_websignals_v19.json",
    "data/evals/scenario_lab_websignals_v21.json",
    "data/evals/scenario_lab_websignals_v26.json",
    "data/evals/scenario_lab_websignals_v27.json",
    "data/evals/scenario_lab_websignals_v29.json",
    "data/evals/scenario_lab_websignals_v30.json",
    "data/evals/scenario_lab_websignals_v37.json",
    "data/evals/demand_friction_signals_v23.json",
    "data/supports/se-forsakringskassan-sarskild-tandvardsersattning-67.json",
    "data/supports/se-forsakringskassan-narstaendepenning.json",
    "data/supports/se-forsakringskassan-arbetsskada-tandvard.json",
]:
    assert (root / rel).exists(), f"matrix references missing artifact: {rel}"

assert "focus !== 'vab'" in vab_runtime
assert "focus !== 'property_accessibility'" in property_runtime
assert "new Set(['cost', 'support', 'unsure'])" in dental67_runtime
assert "get('q')" not in dental67_runtime and 'get("q")' not in dental67_runtime
assert "focus=relative_care" in relative_runtime
assert "get('q')" not in relative_runtime and 'get("q")' not in relative_runtime
assert "focus=work_injury_dental" in work_injury_dental_runtime
assert "actor_type=employee&focus=work_injury_dental&lang=" in work_injury_dental_runtime
assert "actor_type=self_employed&focus=work_injury_dental&work_context=self_employed" in work_injury_dental_runtime
assert "work_context=invoiced_worker" in work_injury_dental_runtime
assert "detectWorkContext" in work_injury_dental_runtime
assert "data-stod-work-injury-dental" in work_injury_dental_runtime
assert "Var händelsen på arbetsresan en trafikolycka?" in work_injury_dental_runtime
assert "Har företaget ett aktuellt försäkringsavtal eller grundavtal hos Fora?" in work_injury_dental_runtime
assert "get('q')" not in work_injury_dental_runtime and 'get("q")' not in work_injury_dental_runtime
assert "fetch(" not in work_injury_dental_runtime and "XMLHttpRequest" not in work_injury_dental_runtime
assert "vab" in privacy.lower()
assert "property" in privacy.lower()

print("pilot coverage matrix: OK (actor rows + current runtime claims guarded through v37 worker context)")
