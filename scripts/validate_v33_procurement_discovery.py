#!/usr/bin/env python3
"""Fail-closed v33 guard for procurement discovery friction.

Locks the new company scenarios, qualitative demand/friction signal and the
existing company-pilot product correction into the same Stödassistenten
learning system. Generic guidance never replaces a specific procurement's
current documents.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVAL = ROOT / "data" / "evals"

scenario_paths = [EVAL / "scenario_lab_v01.json", *sorted(EVAL.glob("scenario_lab_websignals*.json"))]
cases = {}
for path in scenario_paths:
    pack = json.loads(path.read_text(encoding="utf-8"))
    for case in pack.get("cases", []):
        cid = case["case_id"]
        assert cid not in cases, f"duplicate scenario id: {cid}"
        cases[cid] = case

assert len(cases) >= 81, f"expected at least 81 canonical scenarios after v33, got {len(cases)}"

locks = {
    "lab-company-procurement-fragmented-search-v33-01": {
        "expected_support_areas": [
            "registered_procurement_ad_databases",
            "multi_database_and_cpv_search_strategy",
            "advertised_procurement_and_direct_procurement_kept_distinct",
        ],
        "must_not_claim": [
            "one_procurement_database_is_guaranteed_to_cover_all_swedish_public_procurements",
            "all_public_sector_purchases_must_be_advertised",
            "registering_in_a_supplier_list_or_contacting_a_buyer_guarantees_a_direct_procurement_request",
        ],
        "expected_next_actions": [
            "for_advertised_procurements_search_registered_databases_and_do_not_assume_one_database_is_complete",
            "for_direct_procurement_map_relevant_public_buyers_and_how_they_source_suppliers_because_prior_advertising_is_not_always_required",
            "when_a_specific_opportunity_is_found_open_the_primary_procurement_documents_and_verify_requirements_deadlines_and_submission_route_before_recommending_action",
        ],
    },
    "lab-company-dynamic-purchasing-system-late-entry-v33-02": {
        "expected_support_areas": [
            "dynamic_purchasing_system_distinguished_from_closed_framework_assumption",
            "supplier_qualification_before_individual_bid_invitations",
        ],
        "must_not_claim": [
            "an_active_dynamic_purchasing_system_is_closed_to_all_new_suppliers_after_its_start_date",
            "finding_a_dynamic_purchasing_system_automatically_qualifies_the_supplier",
            "qualification_in_a_dynamic_purchasing_system_guarantees_a_contract",
        ],
        "expected_next_actions": [
            "open_the_current_dynamic_purchasing_system_notice_and_documents",
            "verify_that_the_relevant_category_is_open_and_submit_an_application_to_qualify_if_the_requirements_can_be_met",
        ],
    },
}

for cid, fields in locks.items():
    assert cid in cases, f"v33 regression missing from canonical lab: {cid}"
    case = cases[cid]
    for field, tokens in fields.items():
        for token in tokens:
            assert token in case[field], f"{cid}: missing locked {field} token {token}"

signal_pack = json.loads((EVAL / "demand_friction_signals_v19.json").read_text(encoding="utf-8"))
assert "not measured search volumes" in signal_pack["purpose"].lower()
assert len(signal_pack["signals"]) == 1
signal = signal_pack["signals"][0]
assert signal["signal_id"] == "df-procurement-discovery-fragmentation-v01"
assert signal["priority_band"] == "HIGH"
assert signal["demand_signal"]["score"] >= 4
assert signal["friction_signal"]["score"] >= 4
assert signal["miss_consequence"]["score"] >= 4
assert signal["current_product_coverage_gap"]["score"] >= 4
assert signal["primary_sources"]
assert any("upphandlingsmyndigheten.se" in url for url in signal["primary_sources"])
assert any("konkurrensverket.se" in url for url in signal["primary_sources"])
truth_rule = signal["truth_rule"].lower()
assert "verify" in truth_rule
assert "one database is complete" in truth_rule
assert "all public purchases are advertised" in truth_rule

mapping_pack = json.loads((EVAL / "demand_friction_regression_map_v13.json").read_text(encoding="utf-8"))
assert len(mapping_pack["mappings"]) == 1
mapping = mapping_pack["mappings"][0]
assert mapping["signal_id"] == signal["signal_id"]
assert mapping["regression_case_ids"] == [
    "lab-company-procurement-fragmented-search-v33-01",
    "lab-company-dynamic-purchasing-system-late-entry-v33-02",
]
assert "same company pilot" in mapping["fix_or_guardrail"].lower()
assert "direct procurement" in mapping["fix_or_guardrail"].lower()
assert "dynamic purchasing systems" in mapping["fix_or_guardrail"].lower()

company_suite = json.loads((EVAL / "company_pilot_scenarios.json").read_text(encoding="utf-8"))
company_cases = {c["id"]: c for c in company_suite["cases"]}
company_case = company_cases["procurement-discovery-is-not-one-database"]
for marker in ["en enda databas", "Direktupphandlingar behöver inte annonseras", "CPV", "registrerade annonsdatabaser"]:
    assert marker in company_case["must_include"], f"company scenario missing marker: {marker}"
assert company_suite["ui_contract"]["procurement_question_steps"] == 6

html = (ROOT / "company-pilot.html").read_text(encoding="utf-8")
for marker in [
    "En enda databas är inte säkert heltäckande.",
    "Direktupphandlingar behöver inte annonseras.",
    "Dynamiskt inköpssystem (DIS)",
    "relevanta CPV-koder",
    "dynamiskt-inkopssystem",
]:
    assert marker in html, f"company product missing procurement-discovery marker: {marker}"
assert "Välj en verklig annonserad affär" not in html
assert "alla offentliga affärer annonseras" not in html.lower()
assert "garanterar inte att ni får en förfrågan" in html

print(
    f"v33 procurement discovery: OK ({len(cases)} canonical scenarios; "
    "multi-database + direct procurement + DIS boundaries locked in same company pilot)"
)
