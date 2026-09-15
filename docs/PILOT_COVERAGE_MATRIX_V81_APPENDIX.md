# Pilot coverage matrix v81 appendix

v81 strengthens the existing person pilot; it does not introduce a new family, housing or benefits product.

| Public actor / situation | Entry | Situation understanding | Truth/source boundary | Concrete next action | Anonymous feedback | Regression protection |
| --- | --- | --- | --- | --- | --- | --- |
| Private person / parent with children + pressed economy + housing pressure | Existing `person-pilot.html` general flow | Reuses `children`, `money` and `housing` already collected; no extra generic question | Canonical `se-forsakringskassan-bostadsbidrag-barnfamiljer` remains `NEEDS_REVIEW`; public route never decides eligibility or amount | Surface current Försäkringskassan family-housing route, preserving higher-priority actions | Existing structured person-pilot feedback only; no raw story or household details added | v81 cases 01, 02, 03, 07, 08 + Node runtime tests |
| Newly unemployed parent with children + housing pressure | Same general person flow | Reuses work + family + housing context across the same result pipeline | Family housing truth and unemployment truth remain separate canonical contracts in the same truth layer | First-day unemployment action stays first; family-housing candidate follows rather than replacing it | Same existing structured feedback | v81 case 04 + unemployment v78/v79 regressions |
| Future-period family-housing question (2027) | Same person flow / verified source handoff | Treats the future decision period as route-changing only when it matters | Fail closed: 2026 rules do not establish 2027 eligibility; current Försäkringskassan sources must be checked when the period is current | Verify the then-current 2027 rules rather than projecting one known transition as the full rule set | Same existing structured feedback | v81 case 05 |
| Professional/information-only mention of family housing benefit | Existing broad/product information context | Does not infer a private household need from the support name alone | Process facts require current primary source; no personal eligibility inference | Keep informational context instead of injecting a private candidate | Same existing feedback if the public flow is used | v81 case 06 |

## Self-audit finding made permanent

Fresh `main` before v81 asked the general-flow questions `Finns barn i hushållet?` and `Är boendekostnaden en stor del av ekonomin?`, but `getRows()` ranked results from `work` and `money` only. v80 had already added canonical family-housing truth and synthetic coverage. v81 therefore fixes a context-loss/dead-question defect: facts already collected now affect the same result pipeline when they can change the route.

## Privacy and architecture

The v81 runtime is a presentation/ranking guard only. It adds no URL parameter, no raw situation logging, no household income, child details, address, identity or future-rule eligibility to structured feedback. It does not create `family-housing.html`, a family-housing matcher or a separate truth store. The existing four-result ceiling and the existing general person flow remain intact.
