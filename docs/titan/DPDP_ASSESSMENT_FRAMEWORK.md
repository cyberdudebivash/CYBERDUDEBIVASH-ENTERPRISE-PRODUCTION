# DPDP Assessment Framework — DRAFT

> ## This document is not legal advice and is not authoritative.
>
> It is a starting skeleton, drafted from Claude's general knowledge of the published structure of India's Digital Personal Data Protection Act, 2023 (DPDPA), as background material for building the questionnaire and scoring engine described in `ARCHITECTURE.md`. It has **not** been reviewed by qualified legal or compliance counsel. It must not reach a real customer, in any form — free assessment, paid report, or otherwise — until it has been reviewed by someone with current DPDPA expertise.
>
> **Currency warning, stated plainly:** the DPDPA's core structure (below) is primary legislation and changes slowly. The operative details that actually determine compliance — breach notification timelines, the Significant Data Fiduciary designation criteria, the cross-border transfer restricted-country list, Data Protection Board procedures, and specific compliance deadlines — are set by Rules and government notifications, which move faster and which this document's author (Claude, trained with a knowledge cutoff of January 2026, writing this in July 2026) does **not** have current visibility into. Any date, deadline, threshold, or penalty figure below must be checked against the current Ministry of Electronics & IT (MeitY) and Data Protection Board of India publications before it appears anywhere a customer can see it.

## Structure this framework is organized around

| Category | What it covers |
|---|---|
| A. Lawful basis & consent | How the organization establishes a valid ground to process personal data |
| B. Notice | What data principals are told, and when |
| C. Data principal rights | Access, correction, erasure, grievance redressal, nomination |
| D. Data accuracy & quality | Processes to keep data used for decisions accurate |
| E. Security safeguards | Technical/organizational controls against breach |
| F. Breach notification readiness | Whether the org could actually meet its notification obligations if a breach happened |
| G. Retention & erasure | Storage-limitation practices |
| H. Grievance redressal | Complaint-handling mechanism and timelines |
| I. Children's data | Age verification, parental consent, prohibited processing |
| J. Significant Data Fiduciary readiness | DPO appointment, DPIA, independent audits — only relevant to orgs that may meet SDF criteria |
| K. Cross-border transfer | Where data goes outside India and under what conditions |
| L. Vendor / processor management | Contracts and oversight of data processors |
| M. Governance & accountability | Policies, training, documented ownership |

## Candidate questions (representative sample per category — not the full bank)

Full question-bank build-out is Phase 1 implementation work (`ROADMAP.md`), ideally against reviewed content. What follows demonstrates the pattern and severity-tagging approach, not a finished bank.

| # | Category | Question | Draft severity |
|---|---|---|---|
| A1 | Lawful basis | Does the organization rely on consent, a "legitimate use" ground, or both, for its processing activities — and can it identify which ground applies to each major processing activity? | Critical |
| A2 | Lawful basis | Is consent collected through a clear affirmative action, in language as accessible as the request itself, and separable from consent to other matters? | High |
| A3 | Lawful basis | Can a data principal withdraw consent at least as easily as they gave it? | High |
| B1 | Notice | Is an itemized notice provided at or before data collection, describing what is collected and why? | Critical |
| B2 | Notice | Does the notice explain how to exercise data principal rights and how to complain to the Data Protection Board? | High |
| C1 | Data principal rights | Does the organization have a working process to respond to an access request within a defined timeframe? | High |
| C2 | Data principal rights | Does the organization have a working process to correct or erase personal data on request? | High |
| C3 | Data principal rights | Can an individual nominate another person to exercise their rights in the event of death or incapacity? | Medium |
| D1 | Data accuracy | Is there a process to keep personal data accurate and complete, specifically for data used to make a decision about the data principal or shared with another fiduciary? | Medium |
| E1 | Security | Are there documented technical and organizational security safeguards proportionate to the sensitivity and volume of personal data processed? | Critical |
| E2 | Security | Is access to personal data restricted on a need-to-know basis and logged? | High |
| E3 | Security | Are processors/vendors contractually bound to equivalent security safeguards? | High |
| F1 | Breach readiness | Is there a documented incident-response plan that specifically includes notifying the Data Protection Board and affected data principals? | Critical |
| F2 | Breach readiness | Has the organization identified who is responsible for breach notification and within what timeframe they must act? | High |
| G1 | Retention | Is there a defined retention schedule, with erasure when the purpose is fulfilled and no legal retention requirement applies? | Medium |
| G2 | Retention | Are processors required to erase data on the fiduciary's instruction or contract termination? | Medium |
| H1 | Grievance redressal | Is there a published grievance-redressal mechanism with a defined response timeframe? | High |
| I1 | Children's data | Does the organization verify age and, where the data principal is a child, obtain verifiable parental/guardian consent before processing? | Critical (if applicable) |
| I2 | Children's data | Does the organization avoid tracking, behavioral monitoring, or targeted advertising directed at children? | Critical (if applicable) |
| J1 | SDF readiness | Has the organization assessed whether it might meet Significant Data Fiduciary criteria (data volume, sensitivity, risk factors)? | High (gates whether J-series applies at all) |
| J2 | SDF readiness | If potentially an SDF: is there an appointed Data Protection Officer based in India, reporting to the board? | Critical (conditional) |
| J3 | SDF readiness | If potentially an SDF: are periodic Data Protection Impact Assessments and independent audits conducted? | Critical (conditional) |
| K1 | Cross-border transfer | Does the organization know which countries its personal data is transferred to or stored in? | High |
| K2 | Cross-border transfer | Is there a process to check transfers against current government restrictions before they occur? | High |
| L1 | Vendor management | Is there a current inventory of processors/vendors that handle personal data on the organization's behalf? | Medium |
| M1 | Governance | Is there a named owner (individual or role) accountable for DPDPA compliance? | High |
| M2 | Governance | Is staff training on data protection obligations conducted and documented? | Medium |

## Draft scoring approach

- Each question tagged **Critical / High / Medium / Low**, reflecting how directly a "no" answer relates to a high-consequence obligation (breach-readiness and consent fundamentals sit at Critical; documentation/training hygiene sits at Medium/Low). Exact weights are a policy decision for whoever reviews this framework — the categories above are the more durable part; the specific weight of each is easily tunable in the scoring engine (`ARCHITECTURE.md`) and should not be hardcoded as immutable.
- **Category score** = weighted proportion of "yes" answers within that category, weighted by severity.
- **Overall score** = weighted roll-up across categories, with Security (E), Breach Readiness (F), and Consent (A) weighted most heavily, consistent with where the Act's own penalty structure places the greatest consequence.
- **Adjustment factors**, both needing real definition before use, not invented here:
  - *Organization size*: the Act itself contemplates government-defined exemptions for certain classes of data fiduciaries (which may include smaller entities/startups) from some obligations — the scoring engine should be able to represent "not applicable at this size" distinctly from "applicable and failing," rather than penalizing a five-person startup for lacking a formal DPIA program.
  - *Industry*: organizations handling children's data, health data, or financial data plausibly warrant different category weighting (e.g., Category I weighted higher) — this needs real input on which industries/data types should trigger which adjustments, not an invented mapping.
- **Confidence score**: a separate signal for "how much of the questionnaire did the organization actually answer, and how directly (vs. 'not sure')" — distinct from the risk score itself, so a report can honestly say "high confidence, high risk" vs. "low confidence, apparent low risk" rather than conflating incomplete answers with genuine low risk.

## What this draft explicitly does not cover

- State-level or sector-specific regulations that may layer on top of the DPDPA (e.g., RBI guidelines for financial-sector data, health-data-specific rules) — out of scope for a general-purpose first pass, but a real gap if the target customer base skews toward regulated sectors.
- Interaction with the IT Act 2000 / SPDI Rules, which predate the DPDPA and may still be relevant in some contexts — not addressed here.
- Any Rules-level operative detail (see currency warning above) — this framework covers what the Act's structure asks organizations to be able to demonstrate, not the specific procedural mechanics of demonstrating it, which the Rules (once verified current) would define.

## Before this framework can be used for anything customer-facing

1. Legal/compliance review against the current, verified text of the Act and any notified Rules.
2. Real weight assignment (the severities above are a reasonable starting structure, not validated weights).
3. Real adjustment-factor definitions for organization size and industry.
4. A decision on whether Significant Data Fiduciary-track questions (Category J) should gate/branch the questionnaire (skip entirely for clearly-small organizations) rather than being asked of everyone — a UX and accuracy question, not just a content one.
