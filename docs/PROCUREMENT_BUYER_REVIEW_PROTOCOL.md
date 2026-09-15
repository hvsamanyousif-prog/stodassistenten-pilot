# Procurement buyer-side review protocol

## Purpose

This protocol is for an experienced public procurement professional who tests Stödassistenten by **simulating suppliers** and then reviewing the output from the buyer side.

The goal is not a usability demo. The goal is to falsify the product:

> If a supplier followed Stödassistenten here, would the supplier understand the published procurement correctly and produce a serious, source-faithful tender response?

Construction/works procurement is the deepest review domain for this pilot, but the same Stödassistenten capability must also work across other sectors.

## Safety and independence

Use only:

- published current procurement material where the reviewer is not personally involved,
- closed/historical procurement material,
- or fully synthetic procurement cases.

Never use:

- unpublished or planned requirements,
- internal buyer scoring or deliberations,
- competing suppliers' bids,
- confidential/commercially sensitive information,
- security-classified material,
- a live procurement in which the reviewer participates.

Do not submit a real bid during this pilot.

## Test sequence

### 1. Supplier simulation

Choose a fictional or generalized supplier profile and interact with Stödassistenten as that company.

Describe the business in normal language. Vary:

- services/work category,
- geography,
- capacity,
- references,
- staff/key persons,
- subcontractors,
- certificates/management systems where relevant,
- insurance/economic evidence,
- document readiness.

The product should ask only facts that can materially change relevance, readiness or next action.

### 2. Procurement object

Use one public/historical/synthetic procurement. Record its public source and the controlling documents/attachments.

The target capability is:

`company situation → relevant opportunity/category → procurement documents → requirement extraction → evidence mapping → gaps → next action → structured tender draft → final source check`

### 3. Buyer-side verification

After completing the supplier simulation, switch mental role to procurement reviewer and compare Stödassistenten's output with the controlling documents.

Check whether it correctly separates:

1. exclusion grounds,
2. qualification requirements,
3. mandatory/shall requirements,
4. award criteria,
5. contract/performance terms,
6. commercial/pricing instructions,
7. requested evidence/documents,
8. deadlines and clarification/addendum information.

### 4. Source trace

For every material requirement, ask:

- Where in the published material does this come from?
- Did Stödassistenten invent or generalize anything?
- Is the cited document/version the controlling one?
- Did an attachment or later clarification change the interpretation?

If the product cannot trace a material requirement, treat that as a miss.

### 5. Bid/no-bid discipline

Test whether the product can say, with explanation:

- `ready enough to continue checking`,
- `gap must be resolved before a serious bid`,
- or `no-bid should be considered because an explicit mandatory requirement cannot currently be evidenced`.

It must never say that the supplier is guaranteed qualified, compliant, accepted or likely to win unless such a claim is actually supported — and award is never guaranteed.

## Construction-focused tests

Use multiple public/historical construction or contracting procurements with different requirement profiles. When — and only when — the published material contains them, verify handling of topics such as:

- reference projects,
- financial/economic capacity,
- liability insurance,
- quality/environmental management requirements,
- named roles or role qualifications,
- licences/certifications,
- subcontractors/third-party capacity,
- technical/professional capacity,
- work-environment obligations,
- schedules/milestones,
- bill-of-quantities or pricing instructions,
- reservations/deviations,
- contract terms,
- required evidence.

The product must not assume any of these are universal construction requirements.

## Cross-sector tests

At minimum include cases from three other categories, for example:

- cleaning/facility services,
- consulting/professional services,
- property/drift services,
- another clearly scoped SME category.

The purpose is to prove that the intelligence is procurement-general, not a cleaning or construction script.

## Scorecard per case

Record only generalized, non-sensitive evaluation data:

| Dimension | Values |
|---|---|
| Opportunity/category match | correct / partial / wrong |
| Requirement extraction | complete / missed / false requirement |
| Requirement classification | correct / wrong |
| Evidence/document checklist | complete / missing / unnecessary |
| Follow-up questions | necessary / unnecessary / missing |
| Tender-draft fidelity | faithful / risky / wrong |
| Deadline/process | correct / wrong |
| Source trace | clear / insufficient |
| False confidence | yes / no |
| Final judgement | usable support for a correct tender / not yet |

Also write one short generalized reason for every `partial`, `wrong`, `missing`, `risky` or `insufficient` score. Do not include real confidential facts.

## Minimum pilot bar

Before describing the procurement track as buyer-side pilot-validated:

- 10 completed supplier simulations,
- at least 4 construction/contracting,
- at least 3 other-sector cases,
- at least 2 deliberate no-bid/fail-closed cases,
- at least 1 ambiguous/cross-reference/addendum case,
- every verified miss converted into a synthetic regression, product fix, source rule or guardrail,
- re-run the failed case after the fix.

## Learning loop

`human buyer review → generalized miss → primary/published source verification → synthetic regression → product fix → CI → re-test`

The reviewer is a high-value Red Team signal, not a privileged source for supplier advantage.
