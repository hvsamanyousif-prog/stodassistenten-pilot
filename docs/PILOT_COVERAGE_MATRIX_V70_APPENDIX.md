# Pilot Coverage Matrix — v70 appendix

## Scope

v70 strengthens the existing `disability_home_support` journey. It does not create a separate personal-assistance app, actor engine, truth store, demand signal or feedback system. The existing HIGH-priority signal `df-personal-assistance-authority-split-v01` and canonical case `lab-personal-assistance-authority-v12-01` are reused rather than duplicated.

| Public actor / situation | Entry | Situation understanding | Source boundary | Concrete next action | Anonymous feedback | Regression guard |
|---|---|---|---|---|---|---|
| `private_person` · explicit personal assistance | shared situation engine → `person-pilot.html?focus=disability_home_support&support_need=personal_assistance` | Detect explicit personal-assistance intent; do not infer diagnosis, LSS personkrets or assessed hours | Current Försäkringskassan adult-assistance primary source + current local municipal source before local-process claims | Compare the state and municipal paths without deciding entitlement | Existing structured `disability_home_support` feedback; only coarse `support_need` | canonical v12 authority case + v70 runtime unit regression |
| `private_person` · personal assistance + healthcare | same journey with coarse `support_need=assistance_healthcare` | Preserve both facts instead of letting the assistance branch erase medical context | Försäkringskassan + current 1177/local healthcare source | Verify each path separately | Same structured feedback | v70-03 |
| `relative` · explicit older-person context | preserve existing older-home-support journey | Age/context must not be stolen by the disability detector | Current age/assistance primary source + local older-support source | Stay in older route unless current verified facts justify another path | Existing actor-segmented feedback | v70-04 |
| `employee` · professional wording | no personal-support route | `jobbar med personlig assistans` or work with assistansersättning is professional context, not proof of personal need | No material claim from phrase alone | Fail closed | No fabricated personal feedback flow | v70-05 |
| `student` · research wording | no personal-support route | Research/statistics wording is not proof of personal need | Primary source required before any material claim | Fail closed | No fabricated personal feedback flow | v70-06 |
| Arabic / Persian personal-assistance wording | same `disability_home_support` journey | Same coarse support meaning across languages | Same primary-source boundary | Same state/local next-step explanation | Same structured anonymous feedback | v70-07, v70-08 |

## Truth and privacy guardrails

The normalized support record `se-forsakringskassan-assistansersattning-vuxna` remains `NEEDS_REVIEW`; v70 does not promote any material field to `VERIFIED`. The public product must not decide LSS personkrets, counted needs, authority-assessed hours, eligibility, amount, age exception, local process or responsible authority from the user's free text.

Public handoff and feedback may carry only language, `focus=disability_home_support` and coarse `support_need=personal_assistance|assistance_healthcare`. Diagnosis, identity, address, municipality, raw story, self-estimated hours, authority-assessed hours and medical information remain forbidden.

## Self-audit corrections

The first v70 discovery draft tried to create a new demand/friction signal for the same authority split. Canonical inspection showed that `df-personal-assistance-authority-split-v01` and `lab-personal-assistance-authority-v12-01` already existed, so the duplicate signal and duplicate authority scenarios were removed. v70 extends the existing signal mapping only with genuinely new public-route boundary regressions.

The first public-route draft also prioritized explicit personal assistance so strongly that a combined story containing both personal assistance and home healthcare would have lost the medical context. v70 now preserves that combination as the coarse `assistance_healthcare` branch and shows both source families.

Finally, the pre-v70 feedback coverage validator listed `property_actor` in the coverage data but did not assert it in its canonical actor loops. v70 closes that regression blind spot. This is a learning-system correction, not a new audience engine.

Feedback is a learning signal, never a truth source. Repeated `not relevant`, unclear-next-step or route-confusion signals may generate synthetic regressions, but may never promote eligibility or material rules.
