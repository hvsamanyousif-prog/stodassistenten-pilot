# Pilot coverage matrix — v78 appendix

## Scope

This appendix strengthens the existing Stödassistenten unemployment/a-kassa capability. It does not create a separate unemployment app, target-group engine, truth layer or feedback system.

## Verified product miss

The normalized support contract already distinguishes the income-based unemployment-insurance rules for new decisions from 1 October 2025 from an older ongoing benefit period that can remain under previous rules. The public `person-pilot` unemployment result and older synthetic a-kassa benchmarks still use generic legacy `arbetsvillkor/work history` semantics. That is an internal truth-drift risk.

## Coverage contract

| Actor / situation | Working entry | Situation understanding | Truth/source boundary | Safe next action | Anonymous feedback | Regression protection |
| --- | --- | --- | --- | --- | --- | --- |
| Newly unemployed private person | Existing person/work entry | Detect unemployment without requiring scheme vocabulary | Current Arbetsförmedlingen + IAF + relevant a-kassa | Register with Arbetsförmedlingen first unemployed day; then a-kassa assessment | Reuse existing structured product feedback | `lab-akassa-newly-unemployed-v78-01` |
| Older ongoing benefit period | Same unemployment capability | Preserve pre-2025-10-01 period as route-changing context | IAF dual-regime source + relevant a-kassa | Verify the individual period; do not auto-switch because calendar year changed | Same feedback contract | `lab-akassa-old-ongoing-period-v78-02` |
| New application/current period | Same unemployment capability | Correct legacy `arbetsvillkor` misconception for the new regime | IAF ALF24 + Arbetsförmedlingen | Use income-based source path; individual eligibility stays with a-kassa | Same feedback contract | `lab-akassa-new-period-income-regime-v78-03` |
| Unemployed + sick | Reuse existing unemployed-sick route | Keep sickness as a route-changing overlap, not a new engine | Current Arbetsförmedlingen + Försäkringskassan | Reuse current unemployed-sick next-step logic | Same feedback contract | `lab-akassa-unemployed-sick-overlap-v78-04` |
| Unemployed + food/rent crisis | Same person product | Keep acute basic-needs risk visible alongside a-kassa | Current Arbetsförmedlingen + responsible municipality/Socialstyrelsen | Parallel safe steps; do not promise benefit timing or municipal approval | Same feedback contract | `lab-akassa-basic-needs-overlap-v78-05` |
| Professional/research wording | Existing shell | Fail closed without a personal unemployment need signal | Primary source required for material rule claims | No personal route inference | No sensitive free text | `lab-akassa-professional-false-positive-v78-06` |
| Arabic / Persian | Same product and semantics | Preserve first-day action and old/new rule boundary | Same Swedish authoritative primary sources; translated explanation must not alter substance | Same safe action order | Same structured feedback | `lab-akassa-language-ar-v78-07`, `lab-akassa-language-fa-v78-08` |

## Information-gain rule

Do not turn unemployment into a generic questionnaire. For a newly unemployed person, first-day registration is a safe action that can be shown immediately. Ask whether there is an older ongoing benefit period only when material rule guidance depends on which regime applies. Ask about income or membership only when the answer can change the individual route or explanation.

## Truth and privacy boundary

Do not autonomously mark unemployment-insurance eligibility, amount, sanction outcome, deadlines or membership effects as VERIFIED. The existing a-kassa support contract remains `NEEDS_REVIEW` with human review required. Do not place identity, employer name, salary, exact income history, dismissal details or raw story text in public handoff or feedback.

## Open public-copy correction

`person-pilot.html` still contains generic legacy wording equivalent to “membership, work condition and history”. The v78 learning and regression layer therefore records `LEARNING_GUARDED_PUBLIC_COPY_FIX_PENDING`; a later audited runtime change must align Swedish, Arabic and Persian public copy with the dual-regime truth contract without creating a parallel unemployment surface.
