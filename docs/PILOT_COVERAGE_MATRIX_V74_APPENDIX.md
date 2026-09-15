# Pilot coverage matrix — v74 bereavement appendix

Append-only extension to the existing Stödassistenten coverage model. This does not create a new app or actor engine. The route stays inside the same public shell and person product with `actor_type=relative`, `focus=bereavement` and a bounded `bereavement_context`.

| Coverage dimension | v74 contract |
|---|---|
| Public entry | Natural-language shell stories about a close person dying can reach the same `person-pilot.html` product with `focus=bereavement`. Direct links remain in the same deployed site. |
| Situation understanding | Reuse explicit facts and distinguish `partner_support`, `child_support`, `practical`, `work_related`, `overview`; use `unsure` only as the unresolved initial state. If the route is unclear, ask at most one high-information first-action question. |
| Source verification | Reuse the canonical `se-pensionsmyndigheten-pensioner-support` source family and current primary sources. Efterlevandeguiden sequences practical actions; Pensionsmyndigheten covers survivor-support candidates and work-related-death guidance; Skatteverket covers current death/estate administration. Catalog/source presence never proves individual eligibility. |
| Concrete next action | Give the correct official page/checklist to verify first instead of a generic “contact someone” result. Do not decide survivor-benefit entitlement, inheritance share, estate representation authority, work-injury status, amount or deadline. |
| Language/accessibility | Swedish, Arabic and Persian use the same route semantics. RTL is preserved for Arabic/Persian. Controls expose button semantics/pressed states where relevant and the overview choice must finish the question instead of looping back to the same unresolved state. |
| Structured anonymous feedback | Each resolved/overview bereavement path exposes the same three product-learning signals: `learned_new`, `useful`, `next_step_clear`. Flow is coarse (`relative_bereavement_<context>`); raw situation text and sensitive death/estate facts are not sent. |
| Privacy | Navigation may contain only bounded `actor_type`, `focus`, `bereavement_context` and language. Do not put name, personnummer, cause of death, exact assets/debts, will content, death certificate data or raw story in URL/feedback. |
| Regression protection | `scenario_lab_websignals_v74.json`, behavior tests and `validate_bereavement_v74.py` permanently guard partner/child/practical/work-related separation, vague-case information gain, professional false positive, language parity, privacy and truth boundaries. |

## Truth boundary

The product is fast in learning and conservative in truth. Community questions may reveal recurring friction but are discovery-only. Product feedback is a learning signal only. Any material statement about survivor benefits, who must apply, child conditions, work-related-death compensation, estate procedure, amount, deadline or authority to act must be verified against the current responsible primary source before use. Previous AI output is never a truth source.

## Self-critique guard

A vague story such as “Min mamma har dött och jag vet inte vad jag ska göra” must not be pushed straight into an economic-benefit route. The user should receive the official overview immediately and, if they want a narrower route, at most one question that separates practical steps, partner support, child support or a work-related death. Choosing “overview” must be a terminal coarse context rather than re-rendering the same unresolved question.
