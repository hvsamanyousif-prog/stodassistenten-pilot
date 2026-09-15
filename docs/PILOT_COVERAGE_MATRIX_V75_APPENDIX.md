# Pilot coverage matrix v75 appendix — bereavement natural-language breadth

Append-only extension of the SAME Stödassistenten coverage model. v75 does not create a new actor or engine; it strengthens `actor_type=relative` + `focus=bereavement` introduced in v74.

## Verified miss

v74 was safe after a user reached the bereavement route, but its natural-language boundary was narrower than the public promise “när någon nära har dött”. Common Swedish wording such as “min bror har gått bort” and close relations such as sibling/friend could fail before the verified first-action flow was reached. Arabic/Persian sibling wording had the same relation-coverage risk.

## Permanent coverage guard

| Surface / actor | Natural situation | Situation understanding | Verified source boundary | Concrete next action | Structured anonymous feedback | Regression protection |
|---|---|---|---|---|---|---|
| Shared public shell → `relative` | Close person has died, including `gått bort` and sibling/friend wording | Reuses `focus=bereavement`; unknown intent stays `unsure` and asks at most one route-changing question | Afterlevandeguiden/Skatteverket for practical first action; Pensionsmyndigheten only when survivor-support route is actually relevant | Same v74 overview or focused practical/partner/child/work-related path | Same `relative_bereavement_*` structured feedback; no raw story | v75 scenarios + runtime test + false-positive motion test |
| Arabic/Persian | Sibling has died | Same `relative` actor and same bereavement context model | Same Swedish primary-source truth boundary; translated UI is not a truth source | Same overview/information-gain behavior | Same structured fields | v75 AR/FA parity cases |

## Fail-closed rule

`gick bort` can also mean physical movement. “Min bror gick bort till affären och kom tillbaka” must not become a bereavement route. v75 therefore broadens death-language recognition without treating every occurrence of `gick bort` as death.

A broader relationship match also does **not** make the person eligible for survivor benefits, an heir, a `dödsbodelägare`, or authorized to act for an estate. Those material claims remain behind current primary-source verification and the existing truth boundary.

## Learning signal

`df-bereavement-euphemism-relation-breadth-v01` is a qualitative HIGH-priority signal, not measured search volume or evidence of individual eligibility. Open-web question pages are discovery only. Official Efterlevandeguiden explicitly describes its service as help when a `närstående har gått bort`, while Skatteverket addresses people who have `mist en närstående`; that supports a broader first-action entry than the original narrow relation detector without changing any eligibility rules.
