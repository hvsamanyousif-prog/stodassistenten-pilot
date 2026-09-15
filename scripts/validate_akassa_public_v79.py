#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "client/unemployment-regime-guidance.js"
TEST = ROOT / "client/unemployment-regime-guidance.test.cjs"
BUILD = ROOT / "scripts/build_public_pilot.py"
V78_SCENARIOS = ROOT / "data/evals/scenario_lab_websignals_v78.json"
V78_SIGNALS = ROOT / "data/evals/demand_friction_signals_v78.json"
V79_MAP = ROOT / "data/evals/demand_friction_regression_map_v79.json"
SUPPORT = ROOT / "data/supports/se-arbetsloshetsersattning-a-kassa.json"


def load(path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    module = MODULE.read_text(encoding="utf-8")
    test = TEST.read_text(encoding="utf-8")
    build = BUILD.read_text(encoding="utf-8")
    scenarios = load(V78_SCENARIOS)
    signals = load(V78_SIGNALS)
    mapping = load(V79_MAP)
    support = load(SUPPORT)

    case_ids = {case.get("case_id") for case in scenarios.get("cases", [])}
    require(len(case_ids) == 8, "v79 must reuse all eight permanent v78 unemployment scenarios")
    require({case.get("language") for case in scenarios.get("cases", [])} >= {"sv", "ar", "fa"}, "v79 must preserve sv/ar/fa scenario parity")

    signal_list = signals.get("signals", [])
    require(len(signal_list) == 1, "v79 must close the existing v78 signal rather than invent a duplicate")
    signal = signal_list[0]
    require(signal.get("signal_id") == "df-unemployment-two-rule-regime-v01", "unexpected unemployment signal")

    mappings = mapping.get("mappings", [])
    require(len(mappings) == 1, "v79 closure map must contain one mapping")
    closure = mappings[0]
    require(closure.get("signal_id") == signal.get("signal_id"), "v79 must close the same v78 demand/friction signal")
    require(set(closure.get("regression_case_ids", [])) == case_ids, "v79 closure must keep every permanent v78 scenario")
    require(closure.get("coverage_status") == "PUBLIC_RUNTIME_GUARDED_V79", "v79 public runtime guard status missing")

    require("UNEMPLOYMENT_REGIME_GUIDANCE_PATH = \"client/unemployment-regime-guidance.js\"" in build, "public build does not name the v79 runtime")
    require("UNEMPLOYMENT_REGIME_GUIDANCE_PATH," in build, "v79 runtime is not wired into the existing person-pilot script set")
    require("client/unemployment-regime-guidance.js" in test, "v79 browser regression test is not connected to the runtime")

    for token in ("sv:", "ar:", "fa:", "1 oktober 2025", "1 أكتوبر 2025", "۱ اکتبر ۲۰۲۵"):
        require(token in module, f"public regime copy missing parity/boundary token: {token}")
    require("AF_FIRST_DAY_URL" in module and "arbetslos---vad-hander-nu" in module, "first-day Arbetsförmedlingen source missing")
    require("IAF_REGIME_URL" in module and "iaf.se" in module, "IAF two-regime source missing")
    require("work !== 'unemployed'" in module and "work !== 'akassa'" in module, "newly unemployed and existing recipient paths must be explicitly guarded")
    require("if (work === 'unemployed')" in module, "newly unemployed must have a distinct first-day ordering")
    require("baseRows.slice(2)" in module, "v79 must preserve existing overlap candidates instead of replacing the matcher")

    # Scan only code that ships to users. The test intentionally contains
    # forbidden threshold literals so it can prove they never enter runtime copy.
    for volatile in ("34 000", "34000", "120 000", "120000"):
        require(volatile not in module, f"v79 must not hard-code volatile benefit threshold: {volatile}")
    for forbidden in ("searchParams.set('situation'", "searchParams.set(\"situation\"", "searchParams.set('income'", "searchParams.set('employer'", "searchParams.set('identity'"):
        require(forbidden not in module, f"sensitive public handoff introduced: {forbidden}")

    require(support.get("verification", {}).get("status") == "NEEDS_REVIEW", "v79 public-copy fix must not self-promote canonical a-kassa truth")
    require(support.get("verification", {}).get("human_review_required") is True, "a-kassa truth must remain human-review gated")
    require(support.get("verification", {}).get("material_fields_verified") == [], "v79 must not mark material eligibility fields verified")

    forbidden_paths = [
        ROOT / "akassa.html",
        ROOT / "a-kassa.html",
        ROOT / "client/akassa-app.js",
        ROOT / "client/unemployment-app.js",
    ]
    require(not any(path.exists() for path in forbidden_paths), "parallel a-kassa/unemployment app detected")

    print("v79 public a-kassa regime guard: OK")
    print(f"cases={len(case_ids)} signal={signal['signal_id']} closure={closure['coverage_status']} truth_status={support['verification']['status']}")


if __name__ == "__main__":
    main()
