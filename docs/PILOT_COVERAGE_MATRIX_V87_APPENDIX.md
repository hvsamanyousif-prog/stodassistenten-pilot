# Pilot coverage matrix v87 appendix — child extra care vs extra cost runtime

Status: `PUBLIC_ROUTE_ACTIVE_V87`

This closes the public-runtime gap recorded by v86 without creating a new app, actor engine or truth store. The existing person/family route (`actor_type=relative`, `focus=family`) now carries one privacy-safe coarse fact when it is already known: `support_need=care|cost|both|unsure`.

## Same-product behavior

- Natural language about a child's **extra care/supervision** can route to the existing family flow and prioritize the current Försäkringskassan omvårdnadsbidrag source.
- Natural language about **extra costs** can route to the same family flow and prioritize the current Försäkringskassan child merkostnadsersättning source.
- When both are stated, both paths remain visible. When the distinction is missing (for example legacy `vårdbidrag` or diagnosis-only wording), the family flow asks one route-changing question instead of guessing.
- The already-known care/cost distinction is reused after the child-age gate, so the product does not ask the same question again.
- Swedish, Arabic and Persian use the same route semantics and source boundaries.
- Professional/research wording is guarded from opening a personal family-benefit route.

## Truth and privacy boundary

The runtime does **not** decide eligibility, amount, deadline, diagnosis sufficiency, duration or whether a particular expense qualifies. The v86 support records remain `NEEDS_REVIEW` and keep human review required. Material facts must still be verified against the current primary source before being treated as truth.

Only the coarse `support_need` token may cross the public family handoff. Raw story, child name, diagnosis, exact address, costs and identifiers must not be put in the URL or feedback. The shared situation/session contract owns that allowlist for web, iOS and Android.

No `child-benefit` app, `omvardnadsbidrag` app or separate family matcher is introduced. The existing `client/child-assistance-context-extension.js` is extended as the shared child-context bridge inside the same product.
