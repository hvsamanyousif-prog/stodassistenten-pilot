# Pilot coverage matrix — v86 appendix

## Child/guardian: extra care vs extra costs

| Requirement | v86 status | Evidence / guardrail |
|---|---|---|
| Same-product entry | LEARNING_GUARDED | Existing family/child, VAB, school-support, disability/home-support and child-assistance paths are reused conceptually; no new target-group app or matcher is introduced. |
| Situation understanding | COVERED_BY_REGRESSION | Nine synthetic cases distinguish extra care/supervision, qualifying extra costs, legacy `vårdbidrag`, VAB overlap, assistance overlap, diagnosis-only ambiguity, professional false positives and sv/ar/fa parity. |
| Primary-source truth | NEEDS_REVIEW | Two normalized Försäkringskassan support records are source-bound and remain `NEEDS_REVIEW`, `human_review_required=true`, `material_fields_verified=[]`. |
| Concrete next action | GUARDED | Scenarios route to current Försäkringskassan sources and require the minimum route-changing fact instead of diagnosing eligibility. |
| Feedback / learning | SAME_SYSTEM | No raw child/family story is added to feedback or eval data. Future runtime must use the existing anonymous structured feedback channel. |
| Regression protection | PERMANENT | `scenario_lab_websignals_v86.json`, demand/friction mapping and dedicated v86 validator run inside the canonical Scenario Lab learning loop. |
| Public runtime | PENDING | `LEARNING_GUARDED_PUBLIC_ROUTE_PENDING_V86`: this run intentionally does not claim a shipped public omvårdnadsbidrag/merkostnadsersättning route before the guarded truth boundary is integrated into the existing family flow. |

### Truth boundary

Diagnosis is context, not entitlement. Omvårdnadsbidrag (extra care/supervision) and merkostnadsersättning (qualifying extra costs) are separate assessment paths even when both can be relevant for the same child. VAB and personal-assistance overlap must be checked against current responsible primary sources. Current amounts, thresholds, deadlines and individual outcomes are never hard-coded or self-promoted to `VERIFIED`.

### Architecture boundary

No `child-benefit` app, separate family matcher, duplicate truth store or raw-user-data learning path is permitted. A later public implementation must extend the existing family/child intelligence and consume the same support records, Scenario Lab and structured feedback contract.
