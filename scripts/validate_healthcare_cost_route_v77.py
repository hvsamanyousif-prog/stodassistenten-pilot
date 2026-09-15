#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V76 = ROOT / "data/evals/scenario_lab_websignals_v76.json"
V77 = ROOT / "data/evals/healthcare_cost_route_v77.json"
SHELL = ROOT / "client/experience-learning.js"
QUICK = ROOT / "client/quick-help-guidance.js"
INDEX = ROOT / "index.html"
BUILD = ROOT / "scripts/build_public_pilot.py"


def load(path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    v76 = load(V76)
    v77 = load(V77)
    shell = SHELL.read_text(encoding="utf-8")
    quick = QUICK.read_text(encoding="utf-8")
    index = INDEX.read_text(encoding="utf-8")
    build = BUILD.read_text(encoding="utf-8")

    v76_ids = {c["case_id"] for c in v76.get("cases", [])}
    outcomes = v77.get("case_outcomes", [])
    require(v77.get("source_signal_id") == "df-healthcare-cost-protection-boundary-v01", "v77 must close the existing v76 signal, not create a competing signal")
    require(v77.get("coverage_status") == "PUBLIC_ROUTE_SHIPPED_V77", "v77 public-route status missing")
    require(len(outcomes) == 8, "v77 must map all eight permanent v76 scenarios")
    require({o.get("case_id") for o in outcomes} == v76_ids, "v77 outcome map must cover exactly the v76 scenario set")

    expected = {
        "lab-health-cost-primary-care-v76-01": "healthcare:care",
        "lab-health-cost-frikort-medicine-boundary-v76-02": "healthcare:boundary",
        "lab-health-cost-prescription-medicine-v76-03": "healthcare:medicine",
        "lab-health-cost-dental-overlap-v76-04": "existing_dental_cost_route",
        "lab-health-cost-basic-needs-overlap-v76-05": "healthcare:medicine+economy_visible",
        "lab-health-cost-professional-false-positive-v76-06": "no_personal_healthcare_cost_route",
        "lab-health-cost-language-ar-v76-07": "healthcare:boundary",
        "lab-health-cost-language-fa-v76-08": "healthcare:boundary",
    }
    require({o["case_id"]: o["expected_route"] for o in outcomes} == expected, "v77 scenario outcome contract drifted")

    for token in ("healthcareCostDetected", "healthcareNeed", "MEDICINE_COST_PATTERNS", "CARE_COST_PATTERNS", "PROFESSIONAL_PATTERNS", "PERSONAL_NEED_PATTERNS"):
        require(token in shell, f"shell healthcare routing missing {token}")
    require("quick-help.html?mode=healthcare&need=" in shell, "shell must route into existing quick-help surface")
    require("mode==='healthcare'" in quick, "quick-help healthcare mode missing")
    require("'boundary'" in quick and "healthcare:boundary" in json.dumps(v77), "visit/medicine boundary route missing")
    require("quick-help.html?mode=dental&need=cost" in quick, "dental overlap must reuse existing dental cost route")
    require("if(any(DENTAL_PATTERNS,value)&&!medicine) return false" in shell, "dental route-steal guard missing")
    require("PROFESSIONAL_PATTERNS" in shell and "!any(PERSONAL_NEED_PATTERNS,value)" in shell, "professional false-positive fail-closed guard missing")

    require("https://www.1177.se/sa-fungerar-varden/kostnader-och-ersattningar/hogkostnadsskydd-for-oppenvard/" in quick, "current 1177 outpatient source anchor missing")
    require("https://www.ehalsomyndigheten.se/privatperson/hogkostnadsskydd/" in quick, "E-halsomyndigheten medicine source anchor missing")
    for volatile in ("1450", "2 950", "2950", "3 800", "3800"):
        require(volatile not in shell and volatile not in quick, f"volatile high-cost amount must not be hard-coded in public runtime: {volatile}")
    require("separata system" in quick, "outpatient/medicine separation explanation missing")

    require("searchParams.set('q'" not in shell and "?q=" not in shell, "raw situation must not be added to healthcare handoff")
    require("url.searchParams.delete('q')" in quick, "quick-help healthcare route must strip legacy raw-query parameter")
    allowlist = set(v77.get("privacy_contract", {}).get("handoff_allowlist", []))
    require(allowlist == {"mode", "need", "lang"}, "healthcare handoff allowlist drifted")

    require("healthTitle:" in shell and "تكاليف الرعاية" in shell and "هزینه درمان" in shell, "sv/ar/fa shell copy missing")
    require("HEALTH_COPY" in quick and "تكاليف الرعاية" in quick and "هزینه درمان" in quick, "sv/ar/fa healthcare quick-help copy missing")
    require("economy:['pengar','ekonomi','hyra'" in index, "existing economy route must remain available for basic-needs overlap")

    require('SHELL_LEARNING_PATH = "client/experience-learning.js"' in build, "same-shell experience runtime wiring missing")
    require('QUICK_GUIDANCE_PATH = "client/quick-help-guidance.js"' in build, "same quick-help runtime wiring missing")
    forbidden_paths = [ROOT / "healthcare-cost.html", ROOT / "health-cost.html", ROOT / "client/healthcare-cost-app.js"]
    require(not any(path.exists() for path in forbidden_paths), "parallel healthcare-cost app detected")

    print("v77 healthcare-cost public route guard: OK")
    print(f"mapped_cases={len(outcomes)} status={v77['coverage_status']} handoff=mode+need+lang")


if __name__ == "__main__":
    main()
