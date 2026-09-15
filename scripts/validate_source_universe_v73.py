#!/usr/bin/env python3
"""v73 fail-closed guard for local-government and collective-insurance source coverage.

This extends the single canonical source universe. SKR directories are discovery
navigation only; Afa is authoritative for its own insurance conditions but a
catalog hit never proves that a particular person is covered or entitled.
"""
from __future__ import annotations

import copy
import json
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

CANONICAL_METADATA = {
    "owner", "url", "geography", "source_type", "ingestion_method",
    "source_verification_status", "last_source_check", "adapter_state",
}
EXPECTED_FAMILIES = {
    "se-foundation-registry-discovery": {
        "refs": {"se-lansstyrelserna-foundation-search"},
        "role": "registry_discovery",
        "authority": "not_authoritative",
        "locks": {"registered_foundation_equals_open_opportunity", "purpose_text_equals_user_eligibility"},
    },
    "se-national-benefit-catalog-discovery": {
        "refs": {"se-forsakringskassan-benefits-a-z", "se-pensionsmyndigheten-pensioner-support", "se-arbetsformedlingen-support-a-z", "se-csn-grants-loans"},
        "role": "catalog_discovery",
        "authority": "not_authoritative",
        "locks": {"catalog_presence_equals_user_eligibility", "catalog_text_equals_personal_decision"},
    },
    "se-business-financing-aggregator-discovery": {
        "refs": {"se-verksamt-financing-advice"},
        "role": "aggregator_discovery",
        "authority": "not_authoritative",
        "locks": {"aggregator_listing_equals_open_opportunity", "aggregator_summary_equals_verified_eligibility", "aggregator_deadline_equals_verified_deadline"},
    },
    "se-civil-society-grant-catalog-discovery": {
        "refs": {"se-arvsfonden-services", "se-kulturradet-grants", "se-rf-grants-support"},
        "role": "catalog_discovery",
        "authority": "source_specific",
        "locks": {"catalog_membership_equals_open_call", "catalog_summary_equals_user_eligibility", "grant_history_equals_award_probability"},
    },
    "se-local-government-directory-discovery": {
        "refs": {"se-skr-municipality-directory", "se-skr-region-directory"},
        "role": "registry_discovery",
        "authority": "not_authoritative",
        "locks": {"directory_presence_equals_local_support", "directory_link_equals_verified_local_eligibility", "another_authority_rule_equals_local_rule"},
    },
    "se-collective-insurance-catalog-discovery": {
        "refs": {"se-afa-collective-insurance"},
        "role": "catalog_discovery",
        "authority": "source_specific",
        "locks": {"catalog_presence_equals_collective_coverage", "employment_equals_collective_agreement_coverage", "insurance_name_equals_user_entitlement"},
    },
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def is_https(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme == "https" and bool(parsed.netloc)


def validate(universe: dict, registry: dict) -> None:
    assert date.fromisoformat(universe["generated_at"]) <= date.today()
    assert universe["schema_version"] == "0.1.0"
    for key, value in universe["invariants"].items():
        assert value is True, f"source-universe invariant must remain true: {key}"

    registry_by_id = {item["source_id"]: item for item in registry["sources"]}
    assert len(registry_by_id) == len(registry["sources"]), "duplicate source_id in canonical registry"
    families = {item["family_id"]: item for item in universe["families"]}
    assert len(families) == len(universe["families"]), "duplicate source-universe family_id"
    assert EXPECTED_FAMILIES.keys() <= families.keys(), "required source-universe family missing"

    seen_refs: set[str] = set()
    for family_id, family in families.items():
        assert family["source_registry_refs"], f"{family_id}: no canonical source refs"
        assert family["public_safe_fields"], f"{family_id}: no public-safe fields"
        assert family["blocked_fields"], f"{family_id}: no blocked fields"
        assert family["required_verification_before_action"], f"{family_id}: no verification rule"
        assert family["prohibited_promotions"], f"{family_id}: no prohibited promotions"
        assert family["private_adapter_required"] is True, f"{family_id}: adapter must stay private"
        assert family["review_required"] is True, f"{family_id}: review boundary required"
        assert not (CANONICAL_METADATA & set(family)), f"{family_id}: duplicated canonical source metadata"
        assert not (set(family["public_safe_fields"]) & set(family["blocked_fields"])), f"{family_id}: safe and blocked fields overlap"
        assert "community_advice_equals_truth" in family["prohibited_promotions"], f"{family_id}: community discovery must never become truth"

        for ref in family["source_registry_refs"]:
            assert ref in registry_by_id, f"{family_id}: unknown canonical source ref {ref}"
            assert ref not in seen_refs, f"canonical source assigned to multiple universe families: {ref}"
            seen_refs.add(ref)
            source = registry_by_id[ref]
            assert source["source_verification_status"] == "SOURCE_VERIFIED", f"{ref}: source itself must be verified before universe use"
            assert source["geography"] == "SE", f"{ref}: current v73 registry contract is Sweden-scoped"
            assert is_https(source["url"]), f"{ref}: canonical source must use https"

    for family_id, expected in EXPECTED_FAMILIES.items():
        family = families[family_id]
        assert set(family["source_registry_refs"]) == expected["refs"], f"{family_id}: source refs drifted"
        assert family["discovery_role"] == expected["role"], f"{family_id}: discovery role drifted"
        assert family["opportunity_state_authority"] == expected["authority"], f"{family_id}: authority boundary drifted"
        assert expected["locks"] <= set(family["prohibited_promotions"]), f"{family_id}: required fail-closed promotion lock missing"

    local = families["se-local-government-directory-discovery"]
    local_text = " ".join(local["required_verification_before_action"]).lower()
    for token in ["official website", "directory presence", "geography-specific"]:
        assert token in local_text, f"local-government source boundary missing: {token}"

    collective = families["se-collective-insurance-catalog-discovery"]
    collective_text = " ".join(collective["required_verification_before_action"]).lower()
    for token in ["collective-agreement", "catalog presence alone", "claims decisions"]:
        assert token in collective_text, f"collective-insurance source boundary missing: {token}"

    serialized = json.dumps(universe, ensure_ascii=False).lower()
    for forbidden in ['"raw_case_data":', '"medical_details":', '"income_details":', '"personal_identifiers":', '"employer_identity":']:
        assert forbidden not in serialized, f"sensitive field promoted as object property: {forbidden}"


def expect_failure(universe: dict, registry: dict, label: str) -> None:
    try:
        validate(universe, registry)
    except AssertionError:
        return
    raise AssertionError(f"red team: {label} was not rejected")


def red_team(registry: dict, universe: dict) -> None:
    broken = copy.deepcopy(universe)
    local = next(item for item in broken["families"] if item["family_id"] == "se-local-government-directory-discovery")
    local["opportunity_state_authority"] = "source_specific"
    expect_failure(broken, registry, "SKR directory authority promotion")

    broken = copy.deepcopy(universe)
    collective = next(item for item in broken["families"] if item["family_id"] == "se-collective-insurance-catalog-discovery")
    collective["prohibited_promotions"].remove("employment_equals_collective_agreement_coverage")
    expect_failure(broken, registry, "collective-agreement coverage lock removal")

    broken = copy.deepcopy(universe)
    civil = next(item for item in broken["families"] if item["family_id"] == "se-civil-society-grant-catalog-discovery")
    civil["source_registry_refs"].append("se-skr-municipality-directory")
    expect_failure(broken, registry, "canonical source reuse across families")


universe = load(DATA / "source_universe.json")
registry = load(DATA / "source_registry.json")
validate(universe, registry)
red_team(registry, universe)
print("source universe v73: OK")
