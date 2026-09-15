# Pilot coverage matrix — v79 appendix

## Scope

v79 closes the public-copy part of the existing HIGH demand/friction signal `df-unemployment-two-rule-regime-v01` inside the same Stödassistenten person surface. It does not create a second unemployment app, matcher, truth layer, learning signal or roadmap.

## Verified user-value change

For `general` → unemployment:

- a newly unemployed person sees **register with Arbetsförmedlingen on the first unemployed day** before generic a-kassa rule detail;
- a person who already reports receiving a-kassa sees the **two-rule-regime boundary first**, rather than being told to re-register;
- sv/ar/fa use the same ordering and truth boundary;
- the existing basic-needs/economic-assistance overlap remains in the result tail when already produced by the shared matcher.

## Truth boundary

Primary-source verification on 2026-09-15 reconfirmed:

- Arbetsförmedlingen: register on the first unemployed day, then apply to the relevant a-kassa;
- IAF: from 1 October 2025 the new income-based unemployment-insurance rules apply to new decisions, while the previous rules continue for an ongoing benefit period that started before 1 October 2025.

The public runtime therefore does **not** infer the applicable regime from today's date alone. It does not guarantee eligibility, benefit amount, sanction outcome or deadline. The normalized a-kassa support remains `NEEDS_REVIEW` with human review required.

## Regression and release guard

Permanent v78 Scenario Lab cases remain the semantic regression set, including newly unemployed, older ongoing period, new regime, unemployed+sick overlap, basic-needs overlap, professional false positive and Arabic/Persian parity. v79 adds runtime-level regression for the actual person-pilot row ordering and browser wiring.

Red Team also caught an architecture regression during PR CI: closing the v78 signal through a new v79 mapping pack duplicated the same `signal_id` across the shared learning system and correctly failed unrelated cross-domain workflows. The fix was to **advance the existing v78 mapping record in place** to `PUBLIC_RUNTIME_GUARDED_V79` and remove the duplicate pack. This preserves one signal → one regression record → one product learning loop.

Release evidence is guarded by:

- `client/unemployment-regime-guidance.test.cjs`
- `scripts/validate_akassa_public_v79.py`
- `.github/workflows/akassa-public-v79.yml`
- the existing shared demand/friction uniqueness validator
- the existing public build and v78 regression/truth guard

## Privacy and architecture

The v79 runtime does not add raw situation, income, employer, identity, benefit amount or other sensitive facts to URL, logs or structured feedback. It is a presentation guard on top of the existing person result pipeline; the matcher and canonical support truth remain unchanged.
