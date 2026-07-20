# Product Vision — CyberDudeBivash Compliance Platform (Project Titan)

## What this is

A SaaS platform that lets organizations self-assess their readiness against India's Digital Personal Data Protection Act, 2023 (DPDPA) through a structured questionnaire, receive a prioritized, evidence-based risk report, and — for organizations that want it — move into paid gap-analysis, implementation, or managed-compliance engagements with CyberDudeBivash.

**DPDP is the first module, not the whole product.** The questionnaire engine, risk-scoring engine, reporting engine, lead pipeline, and admin/customer portals are built generic enough that a second assessment (ISO 27001 readiness, SOC 2 readiness, ransomware resilience, AI governance, cloud security posture) is a new question bank and scoring rubric plugged into the same platform — not a rewrite. This is addressed structurally in `ARCHITECTURE.md`; it costs little to build in from day one and a great deal to retrofit later.

## What this is explicitly NOT

- **Not legal advice.** The output is an informational, self-reported risk indicator based on the organization's own answers to a structured questionnaire. It does not constitute a legal opinion, a compliance certification, or a substitute for qualified counsel. This must appear on every report, every results page, and every marketing page that describes the assessment — not as fine print, as a stated fact of what the product is.
- **Not a compliance guarantee.** A "low risk" result does not mean an organization is DPDPA-compliant; it means their self-reported answers didn't trigger the framework's risk flags. The framework itself is a draft pending expert legal review (`DPDP_ASSESSMENT_FRAMEWORK.md`) and, even once reviewed, self-assessment has inherent limits a professional audit doesn't.
- **Not a data processor for the assessed organization's actual personal-data operations.** The platform collects the *organization's* answers about their own practices, plus the lead/contact data of the person taking the assessment. It does not need or want access to the organization's actual data-principal records. Keeping this boundary explicit avoids the platform itself becoming a DPDPA-relevant data fiduciary for data it never needed to touch.

## Who this is for

- **Primary:** Compliance/security/legal owners at small-to-mid-size Indian companies (and Indian operations of multinationals) who need a first-pass sense of DPDPA exposure before committing budget to a full audit.
- **Secondary:** Founders/CTOs at startups who know DPDPA applies to them but don't know where to start.
- **Channel:** Compliance consultants and law firms who could white-label or refer the free tier as a qualification tool for their own engagements (`Partner Programs`, Phase 6).

## Business model — tiers, from the original brief

| Tier | What it delivers | Primary purpose |
|---|---|---|
| Free Assessment | Questionnaire → risk score → summary findings on-screen | Lead generation, top of funnel |
| Paid Gap Analysis | Full PDF report: detailed findings, prioritized recommendations, roadmap | Self-serve revenue, mid-funnel qualification |
| Professional Assessment | Gap analysis + a human review/validation pass | Higher-touch, higher-trust offering |
| Implementation Services | Consulting engagement to close identified gaps | Services revenue |
| Annual Managed Compliance | Ongoing reassessment, monitoring, advisory retainer | Recurring revenue |
| Enterprise Consulting | Custom scope for large/complex organizations | High-value, low-volume |
| Partner Programs | White-label or referral arrangements with consultants/law firms | Channel/distribution |

**Gap in the original brief, flagged here rather than assumed:** nothing in the original module list is a payments/billing module, yet four of the seven tiers above require charging money. This needs an explicit decision (`ARCHITECTURE.md` §Open Decisions) before Phase 2.

## Success metrics (not yet measurable — no product exists; listed so Phase 1+ instrumentation targets them from day one)

- Landing → assessment-start conversion rate
- Assessment completion rate (vs. drop-off per question)
- Free → paid tier conversion rate
- Time-to-first-value (landing to seeing a risk score)
- Lead quality (score distribution, sales-qualified rate)
- Report-to-consultation booking rate

Per the platform's own stop conditions: none of these get reported as real numbers until there's real traffic to measure. A demo/staging environment does not produce customer metrics.
