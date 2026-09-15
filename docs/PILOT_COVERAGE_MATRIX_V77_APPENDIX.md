# Pilot coverage appendix v77 — healthcare-cost public route

Date: 2026-09-15

## What changed

The v76 healthcare-cost learning gap is now wired into the **same Stödassistenten** public product. Natural personal situations about outpatient patient fees/frikort or prescription-medicine costs can surface one focused quick-help route. The handoff carries only `mode`, coarse `need` and `lang`; it does not carry the raw situation, diagnosis, medicine name, amount or identity.

The route deliberately keeps three truth paths separate:

- **Outpatient care:** 1177 / the responsible region remains the primary source for current patient fees, frikort handling and regional detail.
- **Prescription medicines:** E-hälsomyndigheten remains the primary operational source for the medicine high-cost database and current high-cost information. The product explains that this is separate from outpatient frikort.
- **Dental:** the product reuses the existing dental-cost route rather than creating a second dental matcher or truth path.

Exact ceilings are intentionally not hard-coded in the public runtime. They are time-sensitive and, for the medicine system, a user's applicable path can depend on the current high-cost period. The product therefore sends the person to the responsible primary source for the current value/status.

## Information-gain rule

If the story already says **vårdbesök/patientavgift**, **receptläkemedel**, or explicitly compares the two systems, Stödassistenten does not ask the same category question again. Only an ambiguous direct visit to the healthcare-cost quick-help surface shows the single cost-type choice.

## Fail-closed / Red Team boundaries

- Professional/research wording such as working with patient fees must not create a personal healthcare-cost route unless a personal need signal is also present.
- Dental wording must keep the existing dental route instead of being stolen by the healthcare-cost route.
- When the same story says medicine costs are threatening food/rent, the existing economy route remains visible in parallel; the medicine high-cost path must not be presented as solving the basic-needs crisis.
- `sv`, `ar` and `fa` use the same semantic route states (`care`, `medicine`, `boundary`, `dental`, `unsure`). RTL behavior remains provided by the shared shell.

## Primary-source verification used for this release

Verified 2026-09-15:

- 1177, **Högkostnadsskydd för öppenvård**: https://www.1177.se/sa-fungerar-varden/kostnader-och-ersattningar/hogkostnadsskydd-for-oppenvard/
- E-hälsomyndigheten, **Högkostnadsskydd för läkemedel**: https://www.ehalsomyndigheten.se/privatperson/hogkostnadsskydd/

These sources support the separation of outpatient and prescription-medicine cost protection. They do not authorize Stödassistenten to infer entitlement, the user's current balance, or a region-specific fee without the relevant current source/context.

Coverage status: `PUBLIC_ROUTE_SHIPPED_V77`.
