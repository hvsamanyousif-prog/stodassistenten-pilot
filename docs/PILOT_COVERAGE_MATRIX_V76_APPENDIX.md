# Pilot coverage matrix v76 appendix — healthcare-cost navigation

Date: 2026-09-15

This appendix strengthens the SAME Stödassistenten product, intelligence, truth layer and learning system. It does not authorize a separate healthcare-cost app, target-group engine or truth registry.

| Actor / situation | Public entry | Situation understanding | Truth/source boundary | Concrete next action | Structured feedback | Regression guard | Status |
|---|---|---|---|---|---|---|---|
| Private person — cannot afford healthcare visit | General private-person/economy entry exists; focused healthcare-cost entry is missing | Must distinguish outpatient visit cost from medicine and dental cost | Exact patient fee and regional rules require current 1177/region primary source | Verify current regional patient fee and outpatient high-cost path | Existing anonymous feedback system must be reused when public route is wired | `lab-health-cost-primary-care-v76-01` | LEARNING_GUARDED_PUBLIC_ROUTE_PENDING |
| Private person — asks if visit frikort covers prescription medicine | No focused public boundary today | Must recognize that outpatient care and prescription medicine are separate cost-protection paths | Current 1177 + E-hälsomyndigheten sources control material claims | Verify medicine high-cost status through current official channel; do not infer from visit frikort | Same feedback system | `lab-health-cost-frikort-medicine-boundary-v76-02` | LEARNING_GUARDED_PUBLIC_ROUTE_PENDING |
| Private person — prescription medicine cost | Broad economy/health routing exists | Medicine cost should route separately from visit fee | E-hälsomyndigheten current guidance controls medicine high-cost facts; avoid stale amounts | Open current medicine high-cost information / personal official high-cost status channel | Same feedback system | `lab-health-cost-prescription-medicine-v76-03` | LEARNING_GUARDED_PUBLIC_ROUTE_PENDING |
| Private person — dental cost | Existing dental quick-help works | Reuse dental intent; do not duplicate under healthcare-cost branch | Dental truth remains separate from outpatient patient fees | Reuse existing dental cost route | Existing quick-help feedback | `lab-health-cost-dental-overlap-v76-04` | COVERED_REUSE_REQUIRED |
| Private person — medicine cost plus food/rent crisis | Economy path exists but must not be hidden by health-cost intent | Preserve both basic-needs and medicine-cost context | Economic-assistance truth and medicine-cost truth stay source-separated | Show safe parallel next steps; do not promise municipal payment | Same feedback system | `lab-health-cost-basic-needs-overlap-v76-05` | LEARNING_GUARDED_PUBLIC_ROUTE_PENDING |
| Employee/professional — discusses patient fees as work topic | General work route | Professional/research wording alone must not become a personal patient-cost need | No material personal claim without personal-need evidence + primary-source check | Fail closed for personal healthcare-cost routing | No sensitive free-text feedback | `lab-health-cost-professional-false-positive-v76-06` | GUARDED |
| Arabic / Persian healthcare-cost confusion | Multilingual product shell exists | Same visit-versus-medicine boundary must survive language change | Same primary sources and truth boundary; translation does not create new facts | Same route and next action in the selected language | Same structured feedback system | `lab-health-cost-language-ar-v76-07`, `lab-health-cost-language-fa-v76-08` | LEARNING_GUARDED_PUBLIC_ROUTE_PENDING |

## Self-critical finding

The homepage promises support across health and economy, but the focused quick-help surface currently accepts only `dental` and `vision` modes. That makes a common question such as “I cannot afford the health-centre visit” structurally weaker than dental-cost help. Generic person questions do not fix the information-friction problem because the high-value split is the cost category, not a longer generic questionnaire.

## Required implementation shape

A safe implementation must extend the existing quick-help/person journey. It should ask at most one route-changing question — healthcare visit, prescription medicine or dental — only when the story does not already say which cost is involved. Dental must reuse the existing dental route. If food or housing is explicitly at risk, economic-assistance guidance must remain visible alongside healthcare-cost guidance. Professional/research wording must fail closed.

Do not add exact patient fees, medicine high-cost ceilings, eligibility, deadlines or region-specific rules unless the current responsible primary source has been verified for the relevant region/period. The medicine high-cost system has changed over time, so stale numeric copy is specifically prohibited as a shortcut.
