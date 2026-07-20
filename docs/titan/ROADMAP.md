# Roadmap — CyberDudeBivash Compliance Platform (Project Titan)

Phased, sequential, each phase's "done" tied to the quality gates the original brief specified: build passes, lint passes, typecheck passes, unit tests pass, integration tests pass, e2e tests pass, accessibility passes, performance passes, security review passes, documentation complete. **No phase is reported complete without evidence against every applicable gate** — the same discipline this repo's `docs/audit/` work has maintained for five stages carries forward here.

A module marked "not this phase" is not forgotten — it's in `PROGRAM_BACKLOG.md`-equivalent tracking once Phase 1 starts (see below), sequenced deliberately rather than attempted in parallel with everything else.

## How the Phase 2 master prompt's sub-phases (A–L) map onto this roadmap

A later master prompt ("Project Titan — Phase 2 — Enterprise DPDP Platform Integration & Production Evolution") introduced its own internal sequence, Phase A through Phase L, scoped to turning the already-existing scanner asset (`dpdpriskscan.html`, uploaded as part of that prompt) into Titan's Module 1. It doesn't replace the phases below — Phase 0's foundation work already happened, and this document's overall structure stands — but its Phase A–D content lands inside what Phase 1 originally scoped as Module 2/3 (questionnaire + risk engine), because that content already exists as a working asset rather than needing to be authored from scratch. `DECISION_LOG.md` has the full record; this table is the status snapshot, kept current here rather than in a second competing roadmap:

| Sub-phase | Covers | Status |
|---|---|---|
| A — Discovery | Review the scanner, document findings, no rewriting | ✅ Done — `ARCHITECTURE.md`'s Module 1 discovery section |
| B — Modularization | Break the scanner into production modules | 🟡 Started — `titan/packages/assessment-core` is the first extracted module |
| C — Question Engine | Data-driven question config, no hardcoded logic | ✅ Done for the DPDP v1 bank — typed, versioned, tested |
| D — Risk Engine | Separated business rules/scoring, tested | ✅ Done — the source asset's `maxScore` bug fixed, regression-tested, 100% statement coverage |
| E — Cloudflare Backend | Workers API, D1, repository layer, audit logging | ⛔ Not started |
| F — Authentication | Auth.js integration, orgs/users/RBAC/sessions | ⛔ Not started |
| G — Lead Management | Real persistence, pipeline, admin search | ⛔ Not started |
| H — Reporting | Server-side PDF support, storage, email workflow | ⛔ Not started |
| I — Admin Portal | Dashboard, assessments, companies, leads, reports | ⛔ Not started |
| J — Customer Portal | Org history, reports, roadmaps, bookings | ⛔ Not started |
| K — Security | Input validation, XSS/CSRF, rate limiting, headers | ⛔ Not started (findings documented in `ARCHITECTURE.md`; only the risk-engine class of bug is actually fixed so far) |
| L — Quality | Full build/typecheck/lint/test/a11y/perf/security/regression pass | 🟡 Passes for what exists (`assessment-core`); nothing built yet for E–K to run it against |

Phase E onward needs an explicit answer to a question nobody's made yet: does the scanner's UI get rebuilt inside `@titan/web`, or does `dpdpriskscan.html` get progressively wired to import from `assessment-core` in place? Either is workable; picking one is the next real decision on this track, separate from (and blocking progress on top of) the hosting/database/auth decisions already made.

## Phase 0 — Foundation

**Goal:** a deployable skeleton with nothing user-facing yet, but every cross-cutting concern (Module 15/16/17/18/19/20's *infrastructure*, not their full feature set) wired in from day one.

- Resolve the five open decisions in `ARCHITECTURE.md` (hosting target, database, auth approach, email provider, payments provider)
- `titan/` directory scaffolded: app skeleton, CI pipeline (build/lint/typecheck/test, mirroring the discipline already proven in this repo's existing `npm run build`/`verify-dist` pipeline)
- Database schema for the core entities (`ARCHITECTURE.md` data model), migrations tooling
- Auth skeleton (login, session/token handling) — no real user-facing screens yet, just the mechanism, tested
- `/health` endpoint, structured logging, error-tracking wired in
- `FEATURE_MATRIX.md` created — empty, ready for Phase 1

**Explicitly not in Phase 0:** any of the 20 feature modules. This phase produces zero user-visible functionality by design — it's the ground everything else stands on.

## Phase 1 — MVP: the free assessment, end to end

**Goal:** a working, tested, demoable core loop. This is the smallest slice that delivers the actual product value proposition.

- Module 1 (thin): landing page, hero, "start assessment" CTA — not the full marketing site (FAQ/pricing/blog/testimonials deferred)
- Module 2: questionnaire engine — question bank (from `DPDP_ASSESSMENT_FRAMEWORK.md`'s draft content, or reviewed content if the review-before-Phase-1 option was chosen), multi-step UX, validation, autosave/resume
- Module 3: risk engine — weighted scoring against the draft framework's risk categories
- Module 4 (partial): a results page with findings and priority ranking — not yet the full recommendation detail (effort estimates, reference material) that Module 4 specifies in full
- Module 17, 18 baseline: WCAG AA and SEO requirements met for every page shipped this phase, tested in CI, not assumed
- Module 20: unit tests for the risk engine (highest priority per `ARCHITECTURE.md`'s security/testing section), integration tests for the questionnaire API, one E2E test covering landing → complete assessment → see results

**Explicitly not in Phase 1:** AI Insights, PDF generation, lead capture beyond what's needed to show a result, CRM, admin portal, customer portal, booking, payments. The free tier does not require any of these.

**Definition of done:** a real person can land on the page, take the assessment, and see a risk result — and every quality gate for everything shipped this phase has passing evidence, not a claim.

## Phase 2 — Lead capture, reporting, first paid tier

- Module 7: lead qualification — capture contact info, compute a lead score from assessment answers + org size/industry
- Module 6: PDF generator — the paid "Gap Analysis" deliverable
- Module 4 (complete): full recommendation engine — business/operational impact, effort estimates, reference material
- Payments integration (per the decision made in Phase 0) — this is where "Paid Gap Analysis" actually becomes a real, chargeable tier
- Module 11 (partial): automated report-delivery email

**Gate:** a real transaction can occur — someone pays, gets a real PDF report, and that report's content traces to the same risk engine validated in Phase 1, not a separate, unaudited code path.

## Phase 3 — AI Insights, Admin Portal basics

- Module 5: AI Insights — personalized executive summary and risk narrative via Gemini, layered on top of (not replacing) the deterministic risk engine's output. **AI-generated text is additive framing, not the source of the risk score itself** — the score must remain traceable to the deterministic scoring logic from Phase 1, so the platform can always explain *why* a result was reached without depending on an LLM's explanation being consistent run-to-run.
- Module 9 (partial): admin can view assessments and leads — no full dashboard/analytics/template management yet

**Gate:** AI-generated content is reviewed for the specific failure mode of overclaiming compliance (it must never tell a user their organization "is compliant" — only frame identified gaps and priorities, consistent with `PRODUCT_VISION.md`'s scope boundary). This is a testable requirement (prompt + output review against a checklist), not a hope.

## Phase 4 — Growth & sales enablement

- Module 8: CRM (internal data model, per `ARCHITECTURE.md`)
- Module 12: booking (embedded scheduler)
- Module 11 (complete): automation — reminders, follow-ups, calendar integration
- Module 10 (partial): funnel analytics — landing conversion, drop-off, completion rate

## Phase 5 — Customer Portal & APIs

- Module 13: customer portal — assessment history, report downloads, bookings, support
- Module 14: enterprise APIs — REST + webhooks, for the "Enterprise Consulting" and "Partner Programs" tiers that need programmatic access
- Module 9 (complete): full admin portal — templates, question-bank management, email templates

## Phase 6 — Platform generalization

- Extract the questionnaire/scoring/reporting engines from DPDP-specific naming into a generic `AssessmentFramework` abstraction (flagged as a low-cost-if-done-early architectural choice in `ARCHITECTURE.md` — this phase is where it pays off)
- Second assessment type (ISO 27001 or SOC 2 readiness, per the original "Enterprise recommendation") as a new question bank + scoring rubric on the existing engine — proof that the generalization actually works, not just a design intention
- Module 10 (complete): full analytics — industry trends, revenue funnel, consultation conversion
- Partner program tooling (white-label, referral tracking)

## Cross-cutting, every phase

Modules 15 (Security), 16 (Performance), 19 (Observability), 20 (Testing) are not phases — they're the bar every module in every phase above has to clear before that phase is called done. A "Phase 3 complete" claim that skipped a security review or shipped without tests isn't Phase 3 complete; it's an unvalidated claim, which the original brief's own stop conditions explicitly prohibit.

## What happens next

Nothing, until Phase 0's open decisions are answered and there's an explicit go-ahead to start implementation. This roadmap is a plan to review and revise, not a queue already running.
