"""Quality-sprint browser matrix for the existing procurement expert pilot.

Runs synthetic/public-style supplier journeys through the same UI at five CSS widths.
Network is blocked and feedback is not submitted. Chromium/WebKit are supported via
BROWSER_ENGINE; WebKit here is Playwright WebKit on Linux, not Safari/iPad validation.
"""
import hashlib
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("procurement-quality-matrix.json")
ENGINE = os.environ.get("BROWSER_ENGINE", "chromium").strip().lower()
VIEWPORTS = [
    {"width": 320, "height": 800},
    {"width": 390, "height": 844},
    {"width": 768, "height": 1024},
    {"width": 1024, "height": 768},
    {"width": 1280, "height": 900},
]

# Standalone expected procurement-review outcomes. These are intentionally written
# as domain expectations rather than derived from the pilot classifier implementation.
JOURNEYS = [
    {
        "id": "construction-reference-insurance",
        "sector": "construction",
        "text": "\n".join([
            "3.1 Leverantören ska ha genomfört minst två referensuppdrag av liknande art.",
            "4.1 Anbudsgivaren ska inneha ansvarsförsäkring enligt bilaga 2.",
            "6.1 Tilldelning sker enligt bästa förhållandet mellan pris och kvalitet.",
            "9.1 Sista anbudsdag är 2026-10-30 klockan 23:59.",
        ]),
        "expected": ["qualification", "mandatory", "award", "deadline"],
    },
    {
        "id": "construction-site-and-price",
        "sector": "construction",
        "text": "\n".join([
            "Leverantören ska ha två dokumenterade referensuppdrag inom markentreprenad.",
            "Arbetsledare ska kunna styrka efterfrågad kompetens i kravspecifikationen.",
            "Under avtalstiden gäller vite vid utebliven arbetsmiljörapportering.",
            "Fast pris ska anges i prisbilaga 6.",
        ]),
        "expected": ["qualification", "mandatory", "contract", "commercial"],
    },
    {
        "id": "construction-missing-certificate",
        "sector": "construction",
        "text": "\n".join([
            "Anbudsgivaren ska ha dokumenterad teknisk och yrkesmässig kapacitet.",
            "Anbudet ska innehålla efterfrågat miljöcertifikat.",
            "Samtliga priser ska anges i prisbilagan.",
        ]),
        "expected": ["qualification", "mandatory", "commercial"],
        "missing_index": 1,
    },
    {
        "id": "construction-missing-safety-plan",
        "sector": "construction",
        "text": "\n".join([
            "Leverantören ska ha relevant erfarenhet styrkt med referensuppdrag.",
            "Anbudet ska innehålla en undertecknad arbetsmiljöplan.",
            "Anbud ska vara beställaren tillhanda senast den 2 november klockan 23:59.",
        ]),
        "expected": ["qualification", "mandatory", "deadline"],
        "missing_index": 1,
    },
    {
        "id": "cleaning-hygiene-price",
        "sector": "cleaning",
        "text": "\n".join([
            "Leverantören ska ha minst två dokumenterade referensuppdrag inom lokalvård.",
            "Daglig städning ska utföras enligt hygienkraven i kravspecifikationen.",
            "Samtliga priser anges i prisbilaga 3.",
            "Under avtalstiden gäller vite vid utebliven kvalitetsrapportering.",
        ]),
        "expected": ["qualification", "mandatory", "commercial", "contract"],
    },
    {
        "id": "cleaning-access-and-evaluation",
        "sector": "cleaning",
        "text": "\n".join([
            "Anbudsgivaren ska ha minst tre års dokumenterad erfarenhet av lokalvård.",
            "Leverantören ska följa beställarens rutiner för nyckel- och passerkortshantering.",
            "Frågor om underlaget ska lämnas senast den 21 oktober.",
            "Kvalitetsplanen utvärderas och kan ge maximalt 15 poäng.",
        ]),
        "expected": ["qualification", "mandatory", "deadline", "award"],
    },
    {
        "id": "consulting-capacity-interview",
        "sector": "consulting",
        "text": "\n".join([
            "Anbudsgivaren ska ha dokumenterad teknisk och yrkesmässig kapacitet.",
            "Intervjun utvärderas och kan ge maximalt 20 poäng.",
            "Timpris ska anges i prisbilagan.",
            "Frågor om underlaget ska lämnas senast den 20 oktober.",
        ]),
        "expected": ["qualification", "award", "commercial", "deadline"],
    },
    {
        "id": "consulting-missing-cv",
        "sector": "consulting",
        "text": "\n".join([
            "Leverantören ska ha två relevanta referensuppdrag inom verksamhetsutveckling.",
            "Anbudet ska innehålla CV för erbjuden huvudkonsult.",
            "Timpris ska anges för huvudkonsult och specialist.",
            "Avtalstiden är två år med möjlighet till förlängning.",
        ]),
        "expected": ["qualification", "mandatory", "commercial", "contract"],
        "missing_index": 1,
    },
    {
        "id": "property-operation",
        "sector": "property",
        "text": "\n".join([
            "Leverantören ska ha två relevanta referensuppdrag inom fastighetsdrift.",
            "Under avtalstiden gäller vite enligt kontraktsbilagan.",
            "Fast pris ska anges för planerat underhåll.",
            "Anbud ska vara beställaren tillhanda senast den 31 oktober klockan 23:59.",
        ]),
        "expected": ["qualification", "contract", "commercial", "deadline"],
    },
    {
        "id": "property-jour-and-quality",
        "sector": "property",
        "text": "\n".join([
            "Leverantören ska ha dokumenterad erfarenhet av teknisk fastighetsdrift.",
            "Jourberedskap ska finnas dygnet runt under kontraktstiden.",
            "Servicenivån utvärderas enligt poängmodellen.",
            "Pris ska anges som fast pris per månad.",
        ]),
        "expected": ["qualification", "mandatory", "award", "commercial"],
    },
    {
        "id": "other-it-security",
        "sector": "other",
        "text": "\n".join([
            "Anbudsgivaren ska ha dokumenterad teknisk och yrkesmässig kapacitet.",
            "Systemet ska stödja multifaktorautentisering för administratörer.",
            "Anbudspris ska anges i svenska kronor exklusive mervärdesskatt.",
            "Sista anbudsdag är 2026-11-05 klockan 23:59.",
        ]),
        "expected": ["qualification", "mandatory", "commercial", "deadline"],
    },
    {
        "id": "other-catering-allergens",
        "sector": "other",
        "text": "\n".join([
            "Leverantören ska ha minst två referensuppdrag inom måltidstjänster.",
            "Allergeninformation ska lämnas för samtliga erbjudna måltider.",
            "Smaktestet utvärderas och kan ge maximalt 25 poäng.",
            "Under avtalstiden gäller leveransvillkor enligt kontraktsbilagan.",
        ]),
        "expected": ["qualification", "mandatory", "award", "contract"],
    },
]


def check(ok, message):
    if not ok:
        raise AssertionError(message)


def install_offline_app(page, context):
    unexpected = []
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))

    def block(route):
        unexpected.append(route.request.url)
        route.abort()

    context.route("**/*", block)
    html = (ROOT / "procurement-expert-pilot.html").read_text(encoding="utf-8")
    html = html.replace('<script src="client/procurement-expert-pilot.js"></script>', "")
    page.set_content(html)
    page.evaluate("""() => {
      window.fetch=()=>Promise.reject(new Error('Network disabled in quality matrix'));
    }""")
    page.add_script_tag(content=(ROOT / "client/procurement-expert-pilot.js").read_text(encoding="utf-8"))
    return unexpected, errors


def run_journey(page, scenario):
    page.locator("#startBtn").click()
    page.locator(f'[data-sector="{scenario["sector"]}"]').click()
    page.locator("#sourceText").fill(scenario["text"])
    page.locator("#analyzeBtn").click()
    expect(page.locator("#analysisCard")).to_be_visible()
    actual = [el.input_value() for el in page.locator("[data-cat]").all()]
    check(actual == scenario["expected"], f'{scenario["id"]}: expected {scenario["expected"]}, got {actual}')

    if "missing_index" in scenario:
        page.locator("[data-ev]").nth(scenario["missing_index"]).select_option("missing")
        check(page.locator("#summary .okbox").count() == 0, f'{scenario["id"]}: missing evidence produced positive summary')
        check("saknas" in page.locator("#summary").inner_text().lower(), f'{scenario["id"]}: missing evidence is not visible in summary')

    # Source position must remain physical, independent of blank lines or short labels.
    source_lines = [int(el.inner_text().split()[-1]) for el in page.locator(".source").all()]
    check(source_lines == list(range(1, len(source_lines) + 1)), f'{scenario["id"]}: source positions changed: {source_lines}')

    sizes = page.evaluate("({viewport:innerWidth,content:document.documentElement.scrollWidth})")
    check(sizes["content"] <= sizes["viewport"] + 1, f'{scenario["id"]}: horizontal overflow {sizes}')

    # Main interaction controls should remain comfortably touchable in the CSS-width matrix.
    for selector in ["#editSourceBtn", "#restartBtn"]:
        box = page.locator(selector).bounding_box()
        check(box and box["height"] >= 40 and box["width"] >= 40, f'{scenario["id"]}: small touch target {selector}: {box}')

    # Emulated root text enlargement is a reflow signal only; it is not real browser zoom validation.
    page.evaluate("document.documentElement.style.fontSize='200%'")
    scaled = page.evaluate("({viewport:innerWidth,content:document.documentElement.scrollWidth})")
    check(scaled["content"] <= scaled["viewport"] + 1, f'{scenario["id"]}: reflow overflow after root text enlargement {scaled}')


def sha1_blob(path):
    data = path.read_bytes()
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


results = []
browser_version = None
try:
    with sync_playwright() as p:
        browser_type = getattr(p, ENGINE, None)
        if browser_type is None:
            raise RuntimeError(f"Unsupported BROWSER_ENGINE={ENGINE}")
        browser = browser_type.launch(headless=True)
        browser_version = browser.version
        for viewport in VIEWPORTS:
            for scenario in JOURNEYS:
                context = browser.new_context(viewport=viewport, reduced_motion="reduce")
                page = context.new_page()
                page.set_default_timeout(3000)
                unexpected, errors = install_offline_app(page, context)
                try:
                    run_journey(page, scenario)
                    check(not errors, "JavaScript errors: " + str(errors))
                    check(not unexpected, "Unexpected external requests: " + str(unexpected))
                    results.append({"journey": scenario["id"], "width": viewport["width"], "status": "PASS"})
                except Exception as exc:
                    results.append({"journey": scenario["id"], "width": viewport["width"], "status": "FAIL", "error": str(exc).split("\n")[0]})
                finally:
                    context.close()
        browser.close()
finally:
    report = {
        "scope": "Offline procurement supplier-journey quality matrix. Network disabled; no feedback persistence claim. Root-font enlargement is an emulated reflow signal. Playwright WebKit is not Safari/iPad/VoiceOver validation.",
        "engine": ENGINE,
        "browser_version": browser_version,
        "viewports": VIEWPORTS,
        "journeys": len(JOURNEYS),
        "construction_journeys": sum(x["sector"] == "construction" for x in JOURNEYS),
        "missing_evidence_journeys": sum("missing_index" in x for x in JOURNEYS),
        "passed": sum(x["status"] == "PASS" for x in results),
        "failed": sum(x["status"] == "FAIL" for x in results),
        "sources": {
            "procurement-expert-pilot.html": sha1_blob(ROOT / "procurement-expert-pilot.html"),
            "client/procurement-expert-pilot.js": sha1_blob(ROOT / "client/procurement-expert-pilot.js"),
        },
        "results": results,
    }
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))

sys.exit(1 if report["failed"] else 0)
