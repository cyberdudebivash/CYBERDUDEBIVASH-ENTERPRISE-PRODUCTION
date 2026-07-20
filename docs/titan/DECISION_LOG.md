# Decision Log — Project Titan

Chronological record of architecture and product decisions once they're actually made — not proposals (those live in `ARCHITECTURE.md` until someone decides). Newest first.

## 2026-07-20 — Stage 3: UI architecture, repository scope, and a deferred Workers-testing decision

**Decided: the DPDP assessment flow is a public route in `@titan/web`, outside the admin/customer-portal shell, with its own visual system.** `titan/apps/web/src/app/App.tsx`'s `Layout` (Header/Sidebar/Footer) is the authenticated-app shell `ARCHITECTURE.md` describes; the free assessment is explicitly unauthenticated top-of-funnel lead gen (`PRODUCT_VISION.md`). It's mounted as a sibling route (`/assessment/dpdp`), not nested in `Layout`. It also does not use `@titan/design-system`'s components — that system's own token file (`design-system/src/tokens/colors.ts`) documents it as deliberately tuned for a data-dense enterprise app, not a public marketing/conversion surface, which is what this page is. The assessment flow has its own scoped tokens (`dpdp-assessment.css`, under `.dpdp-root`, not `:root`) matching the original scanner's brand instead.

**Decided: `LeadRepository` only, not a speculative full repository set.** `titan/packages/platform` implements the Repository Pattern (`DECISION_LOG.md`'s earlier entry) for exactly the one entity with a real, already-built consumer — leads. `AssessmentRepository`/`OrganizationRepository`/`UserRepository` are not stubbed out ahead of a real need; the pattern is proven with `LeadRepository`'s in-memory and D1 implementations (kept interchangeable by a shared contract test suite), and repeated for the next entity when Workstream 6/8/9 actually needs one.

**Decided (deferred, explicitly): real Cloudflare Workers runtime verification waits for a workspace-wide Vitest decision.** `@cloudflare/vitest-pool-workers` — the standard way to run tests against real `workerd`/D1 instead of a hand-written fake — requires Vitest 4. Every other package in this workspace (`@titan/web`, `@titan/design-system`, `@titan/assessment-core`) is pinned to Vitest 3. Upgrading affects the whole workspace, not just the new `@titan/platform` package, so it's recorded here as a decision *not* made yet, rather than silently bumped as a side effect of adding one Worker. `titan/packages/platform`'s tests instead use a hand-written fake D1 double (`repositories/testUtils/fakeD1.ts`) — real enough to prove this package's own SQL/binding/routing logic is correct, not a substitute for testing against actual D1/`workerd` semantics. See `ROADMAP.md`'s "What Stage 4 needs" for the recommendation.

**Decided: the paid PDF report requires real contact details — no anonymous download.** The uploaded scanner asset let a visitor download the PDF without submitting the lead form (defaulting to placeholder values like "User"/`user@example.com` if the fields were empty). The rebuilt flow removes that path: `LeadCaptureForm`'s validated submit is the only way to get the report. `PRODUCT_VISION.md` states the free assessment's purpose is lead generation; a loophole that produces a personalized compliance report for an anonymous visitor works against that purpose, and wasn't a deliberate design choice worth preserving for its own sake the way the "Analyzing..." loading delay (kept, see `ARCHITECTURE.md`) was.

**Decided: PDF report text substitutes "Rs." for "₹".** jsPDF's built-in fonts use WinAnsi encoding, which has no glyph for ₹ (U+20B9 postdates that encoding). The question bank's `penalty` strings (`@titan/assessment-core`) keep the real ₹ symbol, since that's correct for on-screen display where real font rendering handles it fine — the substitution happens only in `pdfReport.ts`'s rendering step, not in the underlying data.

## 2026-07-20 — Hosting, database, and auth: Cloudflare-native, Auth.js, Repository Pattern

**Decided:**

- **Hosting/runtime target**: Cloudflare, full platform — Pages (app shell/marketing), Workers (backend/API), D1 (database), R2 (object storage — generated PDF reports), Queues (async work — report/email delivery), Turnstile (bot mitigation on public endpoints), plus Cloudflare's CDN/WAF/Analytics.
- **Database engine**: Cloudflare D1 (SQLite-based), accessed exclusively through a Repository Pattern — business logic never imports a D1 client directly.
- **Auth approach**: self-hosted Auth.js, behind an authentication abstraction layer that application code depends on instead of Auth.js's APIs directly.

**Source:** the Phase 2 master prompt ("CYBERDUDEBIVASH® Enterprise — Project Titan — Phase 2 — Enterprise DPDP Platform Integration & Production Evolution"), which specifies these three under "Architectural Decisions" as directives, not options to weigh. This resolves `ARCHITECTURE.md`'s open decisions #2 (hosting target) and #4 (auth provider) from the Phase 1 planning pass — both had been blocking Workstreams 4–7 since Phase 1 foundation work completed.

**What this closes out:** `PLATFORM_FOUNDATION.md`'s "blocked on architecture decisions" note for authentication, authorization, database, and API foundations no longer applies to *which* hosting/auth/database engine — those three are now known. Building them out is still real work (Phase E/F of the master prompt), not done by virtue of being decided.

**What this does not decide:** payments provider, email provider, and the DPDP legal-review timing remain open — the Phase 2 master prompt doesn't address any of the three. See `ARCHITECTURE.md`'s "Still open" list.

**Rationale for the Repository Pattern specifically (not just "use D1"):** the master prompt states it explicitly ("Business logic must never depend directly on D1"), and it holds up independent of that instruction — D1 is SQLite-based with a narrower feature set than the Postgres `ARCHITECTURE.md`'s original Phase 1 pass recommended. A repository boundary means that if D1's limits become a real problem later, the fix is a new repository implementation, not a rewrite of every place that touches data.

## 2026-07-20 — Existing scanner (`dpdpriskscan.html`) adopted as Titan Module 1's starting point, not rebuilt

**Decided:** the working, production-quality DPDP risk scanner uploaded as part of the Phase 2 master prompt is treated as Version 1 of Module 1 (Assessment Core), to be modularized and integrated — not replaced with a from-scratch build.

**Source:** the Phase 2 master prompt's Mission and Non-Negotiable Rules ("DO NOT BUILD A NEW DPDP SCANNER... Never rebuild working features").

**Consequence for `ROADMAP.md`:** the original Phase 1 plan ("Module 2: questionnaire engine... built from scratch") is superseded for the question-engine and risk-engine pieces specifically — that logic already exists and works; the remaining work is extraction into tested, modular code (Phase C/D of the master prompt), not authoring it new. See the reconciliation note added to `ROADMAP.md`.
