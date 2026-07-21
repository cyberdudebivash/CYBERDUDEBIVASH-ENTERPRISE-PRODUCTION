# Roadmap — CyberDudeBivash Compliance Platform (Project Titan)

Phased, sequential, each phase's "done" tied to the quality gates the original brief specified: build passes, lint passes, typecheck passes, unit tests pass, integration tests pass, e2e tests pass, accessibility passes, performance passes, security review passes, documentation complete. **No phase is reported complete without evidence against every applicable gate** — the same discipline this repo's `docs/audit/` work has maintained for five stages carries forward here.

A module marked "not this phase" is not forgotten — it's in `PROGRAM_BACKLOG.md`-equivalent tracking once Phase 1 starts (see below), sequenced deliberately rather than attempted in parallel with everything else.

## How the Phase 2 master prompt's sub-phases (A–L) map onto this roadmap

A later master prompt ("Project Titan — Phase 2 — Enterprise DPDP Platform Integration & Production Evolution") introduced its own internal sequence, Phase A through Phase L, scoped to turning the already-existing scanner asset (`dpdpriskscan.html`, uploaded as part of that prompt) into Titan's Module 1. It doesn't replace the phases below — Phase 0's foundation work already happened, and this document's overall structure stands — but its Phase A–D content lands inside what Phase 1 originally scoped as Module 2/3 (questionnaire + risk engine), because that content already exists as a working asset rather than needing to be authored from scratch. `DECISION_LOG.md` has the full record; this table is the status snapshot, kept current here rather than in a second competing roadmap:

| Sub-phase | Covers | Status |
|---|---|---|
| A — Discovery | Review the scanner, document findings, no rewriting | ✅ Done — `ARCHITECTURE.md`'s Module 1 discovery section |
| B — Modularization | Break the scanner into production modules | ✅ Done for the DPDP flow — `titan/packages/assessment-core` (data/logic) + `titan/apps/web/src/features/dpdp-assessment` (UI), the original `dpdpriskscan.html` untouched alongside it |
| C — Question Engine | Data-driven question config, no hardcoded logic | ✅ Done for the DPDP v1 bank — typed, versioned, tested |
| D — Risk Engine | Separated business rules/scoring, tested | ✅ Done — the source asset's `maxScore` bug fixed, regression-tested, 100% statement coverage |
| E — Cloudflare Backend | Workers API, D1, repository layer, audit logging | ✅ Done for this stage's scope — `titan/packages/platform`: 5 repositories (Lead, Organization, Assessment, UserProfile, Audit), each in-memory + D1, contract-tested against real SQLite; 7 migration files applied against a **real local D1 instance**; a Worker with 5 endpoints, audit logging on every write. Verified via real `wrangler dev` HTTP requests, not just tests — see Stage 4's `PLATFORM_FOUNDATION.md` section |
| F — Authentication | Auth.js integration, orgs/users/RBAC/sessions | ✅ Done for this stage's scope — `titan/packages/platform/src/auth/`: D1-adapter database sessions, RBAC + org-membership foundation, Email (dev-mode)/Google/GitHub providers (Google/GitHub inactive without real credentials). Enterprise SSO explicitly deferred |
| G — Lead Management | Real persistence, pipeline, admin search | 🟡 Started — real persistence now works end to end (`@titan/web`'s `leadStore.ts` calls the real Worker API, no more `localStorage`); status tracking, ownership, notes, activity history, admin search/filtering are all still unbuilt (need an Admin Portal, Stage 5+) |
| H — Reporting | Server-side PDF support, storage, email workflow | ⛔ Not started — PDF generation is still real but client-side only (`pdfReport.ts`, lazy-loaded jsPDF). A `reports` table exists (migrations/0006) but nothing writes to it yet |
| I — Admin Portal | Dashboard, assessments, companies, leads, reports | 🟡 **Started — EAP-1 Phase 1 + EAP-2 + EAP-3 + EAP-4 + EAP-5 + EAP-6.** Application shell, Dashboard, full **Lead Management** (search/filter/sort/paginate, detail view, lifecycle, risk intelligence, audit history), full **Assessment Management** (search/filter/sort/paginate, detail view, results/severity-breakdown/category-coverage/question-responses, compliance intelligence, audit history, lead linkage), full **Organization Management** (search/filter/sort/paginate, create/archive/restore, detail view with Health/Relationships/Administration, audit history), full **Enterprise Identity & User Management** (real user directory search/sort/paginate, identity profile, Role Assignment — grant/change/revoke, Relationships, audit history), and now full **Enterprise Audit Center** (cross-entity search/filter/sort/paginate over every audit event, Audit Details, Investigation View grouping, CSV/JSON export). Reports remain unbuilt; an Operations Center remains unbuilt — see the EAP section below |
| J — Customer Portal | Org history, reports, roadmaps, bookings | ⛔ Not started |
| K — Security | Input validation, XSS/CSRF, rate limiting, headers | ✅ Done for what's actually deployed-testable — input/schema validation, route-scoped security headers (strict CSP for the JSON API, relaxed-but-locked-down for Auth.js's own HTML pages, HSTS, Permissions-Policy, Cross-Origin-Opener/Resource-Policy), CSRF (Origin validation on the custom JSON endpoints, extended to `POST`/`PATCH /api/organizations/:id` EAP-4), rate limiting (general + a separate, stricter limiter for `/api/auth/*`), cookie hardening reviewed, secret rotation support, **authorization gates on `GET /api/leads`/`GET /api/assessments/:id` and server-side risk-score recomputation (Security Release Blocker Sprint — both of ERP-1's named findings, fixed and verified)**, and a real cross-origin CORS gap found and fixed by EAP-6's own Playwright verification (`Access-Control-Expose-Headers` was never set, silently hiding `Content-Disposition` from browser JS). A full threat model + OWASP ASVS review exists (`SECURITY_GUIDE.md`), updated this pass |
| L — Quality | Full build/typecheck/lint/test/a11y/perf/security/regression pass | ✅ Passes for everything that exists — 769 tests across 4 packages (up from 119 at Stage 4's start, 222 as of ERP-1, 244 as of the Security Release Blocker Sprint, 300 as of EAP-1 Phase 1, 432 as of EAP-2, 497 as of EAP-3, 609 as of EAP-4, 713 as of EAP-5, +56 for EAP-6), full CI green, real `wrangler dev` + real Chromium browser verification (both direct D1 inspection and seven committed Playwright E2E specs, 25 tests total, run strictly serially — `workers: 1` — clean across 2 consecutive full-suite runs this pass, one transient unrelated flake on an already-shipped scenario during the first, reproduced-clean on retry) |

## RC1 pass: what it covered, what it explicitly didn't

The "Titan RC1 — Ultra Enterprise Master Implementation Program" master prompt asked for twelve workstreams in one pass: architecture audit, security hardening, Admin Portal, Customer Portal, a reporting platform, observability, a deployment pipeline, performance, enterprise testing, compliance (SOC 2/ISO 27001/GDPR/DPDP), commercial readiness (billing/licensing/plans), and documentation. Given the choice between shallow progress across all twelve or real depth on a scoped subset, the chosen scope was: architecture audit, security hardening, observability, testing, documentation (`DECISION_LOG.md` has the full reasoning). Status:

- **Architecture audit, security hardening, observability, testing, documentation** — done this pass, see `PLATFORM_FOUNDATION.md`'s RC1 section and `SECURITY_GUIDE.md`.
- **Admin Portal (I), Customer Portal (J)** — not started. Real product surfaces needing real UX decisions; `auth/rbac.ts`/`auth/authorize.ts` exist so whichever is built first has a real authorization mechanism to call.
- **Reporting Platform (H, server-side)** — not started. Blocked on the still-undecided email provider.
- **Deployment Pipeline, Cloudflare Turnstile** — not started. Need a real Cloudflare account, which has never existed in any environment this project has run in.
- **Commercial Readiness** (plans/licensing/billing/tenant isolation) — not started. Blocked on the still-undecided payments provider.
- **Compliance** (SOC 2/ISO 27001 readiness, formal GDPR/DPDP compliance) — not started. Organizational/legal work (external audits, legal review, retention-policy decisions), not something a code session completes.
- **Performance workstream** (bundle analysis, Lighthouse, Core Web Vitals beyond what Stage 3 already measured) — not attempted this pass; no new evidence to report beyond what `PLATFORM_FOUNDATION.md` already documents from Stage 3.

## ERP-1 pass: an independent audit, not a features pass

The "ERP-1 — Enterprise Release Program" prompt asked an independent reviewer to determine, with evidence, whether Titan had earned a release stage beyond Internal Alpha — explicitly not to make it look complete. It found one finding that outweighs everything else this pass verified: **`GET /api/leads` has no authentication** (HIGH — `SECURITY_GUIDE.md`, `DECISION_LOG.md`). It also closed two real WCAG AA failures a real Lighthouse audit caught (jsdom+axe could not), and ran a supply-chain review (clean). Same engineering-only scope as RC1 — see `DECISION_LOG.md`'s ERP-1 entry for why the rest of the RC1 prompt's deferred workstreams still aren't attempted. Full detail: `PLATFORM_FOUNDATION.md`'s ERP-1 section; release-stage conclusion: the ERP-1 Final Report communicated alongside this pass.

## Security Release Blocker Sprint: ERP-1's two named findings, fixed

Scoped narrowly to exactly ERP-1's two findings — no new features, no Admin/Customer Portal. **`GET /api/leads`'s missing authentication (HIGH)** is fixed: gated behind a new Platform Administrator role, verified against a real running Worker (401 anonymous → 403 authenticated-unprivileged → 200 Platform Administrator). **The client-submitted-risk-score tampering finding** is fixed: `POST /api/leads`/`POST /api/assessments` now recompute `result` server-side and discard the client's value, verified the same way (a tampered `score: 0` submission persisted the real computed score). A resume prompt described a prior session having already done this work; repository evidence (`git log`, reflog, every remote branch, direct file inspection) showed it was never committed, so this pass implemented it from a verified-clean baseline rather than assuming it existed — full reasoning in `DECISION_LOG.md`. Detail: `PLATFORM_FOUNDATION.md`'s Security Release Blocker Sprint section, `SECURITY_GUIDE.md`'s "Authorization model."

## EAP: the Admin Portal as an explicitly phased program, not one pass

The "EAP-1 — Enterprise Administration Platform" prompt requested a full admin application in one pass: shell, navigation, dashboard, Lead/Assessment/Organization/User Management, an Audit Center, and an Operations Center. Given the choice between shallow progress across all of that or real depth on a scoped subset, each EAP prompt since has been built as its own phase against this same shell — full reasoning in `DECISION_LOG.md`'s EAP-1, EAP-2, EAP-3, EAP-4, EAP-5, and EAP-6 entries.

### Phase 1 — Enterprise Administration Foundation (done)

The authenticated application shell (session lifecycle via real Auth.js sign-in/sign-out, protected-route middleware, role-aware navigation built for pluggability, reusable admin UI framework — `MetricCard`/`Panel`), and one complete module: **Dashboard** (executive overview, organization/lead/assessment metrics, risk-level breakdown, recent activity, audit summary, platform health/system status). Four new read endpoints (`GET /api/me`, `GET /api/organizations`, `GET /api/assessments` list, `GET /api/audit`) back it, reusing the existing Platform Administrator role — no new authorization concept. Found and fixed one real, non-obvious bug that only real-browser verification could catch: CSP's `form-action` directive also restricts the redirect a form submission causes, which silently broke cross-origin sign-out until `authPagesCsp` widened it. Full detail: `ARCHITECTURE.md`'s "Admin Application architecture" section, `DECISION_LOG.md`'s EAP-1 entry, `PLATFORM_FOUNDATION.md`'s EAP-1 Phase 1 section.

### Phase 2 — Lead Intelligence Platform (done)

The first complete business module: a Lead Workspace (real server-side search/filter/sort/pagination, saved filters and column selection), Lead Details, Lead Lifecycle management (status/priority/assign-to-me-or-unassign/tags/notes — real `PATCH /api/leads/:id` writes, no optimistic-only updates), a Risk Intelligence panel (real score/breakdown/findings-by-severity from the lead's own server-recomputed result), and audit integration (a single lead's real activity/audit trail, server-filtered via `GET /api/audit`'s new `entityType`/`entityId` params). Three new/extended endpoints, all reusing the existing Platform Administrator role. Found and fixed two real bugs only real-browser verification could catch: CORS `Access-Control-Allow-Methods` never included `PATCH` (silently blocked the entire Lifecycle panel's write path), and a `useLeadDetail` data-loading effect missing the request-cancellation guard every sibling hook already has (a real React StrictMode race that could revert a fresh update to stale data). Full detail: `ARCHITECTURE.md`'s "Lead Intelligence Platform architecture" section, `DECISION_LOG.md`'s EAP-2 entry, `PLATFORM_FOUNDATION.md`'s EAP-2 section.

### Phase 3 — Enterprise Assessment Center (done)

The second complete business module, built read-only end to end since an assessment (unlike a lead) is one immutable row per completed run with no lifecycle to manage: an Assessment Workspace (real server-side search/filter by framework and risk level/sort/pagination, saved filters and column selection), Assessment Details (metadata, an honest "Completed" status rather than a fabricated workflow, organization/owner), Assessment Results (risk badge/score, severity breakdown, findings by severity, category coverage by real DPDP section, full question-by-question responses with Pass/Gap status — all still traced to the assessment's own server-computed result, never recomputed client-side), a Compliance Intelligence panel (aggregate risk distribution/framework status/outstanding findings by section/risk trend, computed client-side from the existing full-list endpoint, mirroring how the Dashboard already handles aggregate views), Lead linkage (real leads produced by an assessment, via a new `assessmentId` filter on `GET /api/leads/search`), and audit integration (a real `assessment.viewed` event added to the pre-existing `GET /api/assessments/:id`, alongside the pre-existing `assessment.created`). One new/extended endpoint (`GET /api/assessments/search`), reusing the existing Platform Administrator role — no new authorization concept, no new CORS method, no new CSRF-checked write, since nothing in this module accepts a write. Found and fixed two real bugs while building it: a pre-existing `LeadWorkspacePage.tsx` sort-column bug (an invalid `sortBy=risk` that 400'd the whole table) and a pre-existing `useLeadDetail` audit-trail race (fixed there and built correctly from the start in the new `useAssessmentDetail`). Full detail: `ARCHITECTURE.md`'s "Enterprise Assessment Center architecture" section, `DECISION_LOG.md`'s EAP-3 entry, `PLATFORM_FOUNDATION.md`'s EAP-3 section.

### Phase 4 — Enterprise Organization Management Platform (done)

The third complete business module, and the first with a real administrative write surface (unlike Assessments): an Organization Workspace (real server-side search/filter by status/industry/region/sort/pagination, saved filters and column selection, plus a real create-organization form — the first admin-facing creation UI in this app), Organization Details (Metadata, Health — current risk/average score/risk distribution/score trend, all derived from this organization's own real linked assessments, never fabricated — Relationships — real linked leads/assessments deep-linked into the existing Lead Intelligence/Assessment Center modules, never duplicating either — Administration — real name/industry/region/tags edits, archive/restore, and notes, all real `PATCH` writes — and Activity & audit history). Two new/extended endpoints beyond the pre-existing `GET /api/organizations` (`POST /api/organizations`, `GET /api/organizations/search`, `GET /api/organizations/:id`, `PATCH /api/organizations/:id`), reusing the existing Platform Administrator role. Found and fixed one real, pre-existing bug in EAP-3's own shipped frontend code: `leadApi.ts`'s `searchLeads` accepted an `assessmentId` filter but never forwarded it into the request URL, so Assessment Details' "Lead linkage" panel had been silently unfiltered since EAP-3 shipped. Full detail: `ARCHITECTURE.md`'s "Enterprise Organization Management Platform architecture" section, `DECISION_LOG.md`'s EAP-4 entry, `PLATFORM_FOUNDATION.md`'s EAP-4 section.

### Phase 5 — Enterprise Identity & User Management (done)

The fourth complete business module: an Enterprise User Directory (real server-side search by name/email/sort/pagination over Auth.js's own `users` table — no create-form, since identity comes only from a real sign-in), User Details (Identity, Role Assignment — grant/change/revoke a user's organization or platform-wide role, every action a real server round-trip — Relationships — real assigned leads and real created assessments, deep-linked into the existing Lead Intelligence/Assessment Center modules — and Activity & audit history). Five new endpoints (`GET /api/users/search`, `GET /api/users/:id`, `POST /api/users/:id/profiles`, `PATCH`/`DELETE /api/users/:id/profiles/:profileId`), reusing the existing Platform Administrator role. Closes, for every grant after the first, the "no self-service way to grant Platform Administrator" gap named since the Security Release Blocker Sprint, guarded by a new `wouldRemoveLastPlatformAdministrator` check preventing the system from ever being left with zero Platform Administrators. `UserProfileRepository.remove()` is this system's first real deletion — a deliberate, reasoned exception to every other repository's archive-not-delete pattern, since a role grant (unlike an organization or a lead) has no dependent data of its own to preserve. Found and fixed one real environmental gap, not a code defect: this session's container had never had `AUTH_SECRET` provisioned (`.dev.vars` didn't exist), so every authenticated real-browser scenario — for this new module and, reproduced deliberately, for already-shipped EAP-4 too — silently resolved every caller as anonymous until fixed by following `OPERATIONAL_RUNBOOK.md`'s own documented setup step. Full detail: `ARCHITECTURE.md`'s "Enterprise Identity & User Management architecture (EAP-5)" section, `DECISION_LOG.md`'s EAP-5 entry, `PLATFORM_FOUNDATION.md`'s EAP-5 section.

**Explicitly not done across Phases 1–5** (deferred to later phases, not forgotten, not stubbed ahead of time): an Audit Center and an Operations Center as full modules — no dedicated, cross-module-filterable view over `audit_events` beyond what each module's own Details page already renders as one slice of. Also explicitly not done: a self-service way to create a user's own identity (Auth.js's real sign-in remains the only path), an Organization Details "Members" panel (User Details shows a user's own memberships; the reciprocal organization-side view is real, deferred follow-up), and a real assignee picker wired into Lead Lifecycle's already-shipped UI (EAP-5 closes the reason it was deferred — no user directory existed — but not the picker itself). The shell continues to be architected so each remaining module plugs in without rework: `adminNavItems` takes the caller's real role and is where a new module's nav entry gets added; `AdminLayout`'s `<Outlet/>` is the mount point new module routes nest under; `SectionState` (loading/ready/forbidden/error) is now used by eight independent hooks (`useDashboardData`, `useLeadSearch`, `useLeadDetail`, `useAssessmentSearch`, `useAssessmentDetail`, `useOrganizationSearch`, `useOrganizationDetail`, `useUserSearch`/`useUserDetail`) and is meant to keep being reused by each new module's own data-loading hook rather than reinvented.

### Phase 6 — Enterprise Audit Center (done)

The sixth complete business module, and the first that consolidates existing data rather than introducing a new entity: an Enterprise Audit Workspace (real server-side search/filter by entity type, action, actor id, organization id, and date range/sort/pagination, saved filters and column selection, a Table/Investigation view toggle), Audit Details (an inline panel — actor/action/timestamp/entity/organization/raw metadata/related events — over an already-loaded record, not a new route or endpoint), Investigation View (groups the currently-loaded page of results by entity/actor/organization, reusing the existing `Timeline` component), and Audit Export (CSV/JSON file download of the same filtered set, capped at 10,000 rows). Two new endpoints (`GET /api/audit/search`, `GET /api/audit/export`), reusing the existing Platform Administrator role and the pre-existing `GET /api/audit` endpoint's own policy — no new authorization concept, no new writer to `audit_events` (every event any module already records is unchanged; this phase only adds a new way to read them). A CSV/formula-injection risk was investigated and verified not present in this data model (`metadata` is always JSON-wrapped, so it can never begin with a formula-triggering character). Found and fixed one real cross-origin CORS gap: `http/cors.ts` never set `Access-Control-Expose-Headers`, so a real browser silently hid the `Content-Disposition` header the export's filename depends on — caught only by real Playwright/Chromium E2E verification, the identical class of finding EAP-2's missing `Access-Control-Allow-Methods` entry for `PATCH` already was. Full detail: `ARCHITECTURE.md`'s "Enterprise Audit Center architecture (EAP-6)" section, `DECISION_LOG.md`'s EAP-6 entry, `PLATFORM_FOUNDATION.md`'s EAP-6 section.

**Explicitly not done across Phases 1–6** (deferred to later phases, not forgotten, not stubbed ahead of time): an Operations Center as a full module. Also explicitly not done: a self-service way to create a user's own identity (Auth.js's real sign-in remains the only path), an Organization Details "Members" panel, a real assignee picker wired into Lead Lifecycle's already-shipped UI, investigation notes/annotations on Audit Center events (no backing column exists on `audit_events` — a real schema addition, not built speculatively ahead of one), and a truncation signal on an Audit Export beyond 10,000 rows (the cap itself is the real control). The shell continues to be architected so the remaining module plugs in without rework: `adminNavItems`/`AdminLayout`'s `<Outlet/>`/`SectionState` are all reused exactly as before, not extended or reworked for this phase.

### Recommended next EAP phase

**The Operations Center**, as the natural next module now that every business module (Leads, Assessments, Organizations, Users) and the audit trail itself (EAP-6) have real, filterable, cross-entity views: operational visibility into the platform's own health, not its business data — request/error rates, latency, rate-limit activity, and readiness, building on `observability/metrics.ts`'s already-real (if in-memory, per-isolate) counters and `GET /health`/`GET /health/ready`'s existing liveness/readiness signals rather than inventing a new telemetry layer. Three smaller, real, newly-unblocked follow-ups worth sequencing alongside it: wiring a real assignee picker into Lead Lifecycle's already-shipped `LeadLifecyclePanel.tsx` (the user directory it needed didn't exist before EAP-5; it does now), an Organization Details "Members" panel (the reciprocal view of User Details' own Role Assignment), and a truncation signal on Audit Export beyond its current 10,000-row cap. This is a recommendation for sequencing, not a decision already made — the same way `ARCHITECTURE.md`'s open decisions are recommendations, not commitments.

## What Stage 5 / the next pass needs

1. **EAP Phase 7 (Operations Center)** — see above.
2. **Organization-scoped filtering for `GET /api/leads`/`GET /api/leads/search`/`GET /api/organizations`/`GET /api/organizations/search`/`GET /api/assessments`/`GET /api/assessments/search`/`GET /api/users/search`/`GET /api/audit`/`GET /api/audit/search`/`GET /api/audit/export`**, if an organization's own admin (not just a Platform Administrator) should ever see their own organization's data. Needs each repository's query layer to support it — not added speculatively ahead of a management UI needing it (`SECURITY_GUIDE.md`'s "Known, accepted gaps").
3. **A real assignee picker in Lead Lifecycle**, now genuinely unblocked by EAP-5's real user directory (`GET /api/users/search`) — the *reason* this was deferred since EAP-2 is closed; wiring the picker into `LeadLifecyclePanel.tsx` itself is real, recommended near-term work, not yet done.
4. **A real email provider decision**, to make Auth.js's Email sign-in actually send mail, and to unblock server-side reporting/delivery.
5. **A real payments provider decision**, to unblock commercial readiness (plans/licensing/billing).
6. **The Vitest 3→4 decision**, if real Workers-runtime testing (`@cloudflare/vitest-pool-workers`, real `workerd`) becomes a priority. Still deferred (`DECISION_LOG.md`) — sql.js closed most of the practical gap for repository-level SQL correctness without requiring this upgrade.
7. **Deploying somewhere real** (Cloudflare account/credentials still don't exist in any environment this project has run in) — everything verified so far is local-only, by design and by necessity. Needed before Turnstile, a real deployment pipeline, a global (not per-isolate) rate limiter, or a real (non-SQL-insert) way to provision the *first* Platform Administrator can exist (every grant after the first is now a real endpoint call, EAP-5).

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
