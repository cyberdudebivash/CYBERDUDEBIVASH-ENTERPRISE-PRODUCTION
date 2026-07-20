# Architecture — CyberDudeBivash Compliance Platform (Project Titan)

Planning-phase document. Most choices below are recommendations to review, not decisions already executed. Four rows in the Tech Stack table (Backend, Database, Auth, Deployment target) are now **Decided**, per the Phase 2 master prompt's explicit architectural directives — see `DECISION_LOG.md` for the record of that and everything else decided since. Rows still marked as recommendations remain open.

## Where this lives

Chosen: inside this repository (`CYBERDUDEBIVASH-ENTERPRISE-PRODUCTION`), not a new repo. Recommendation for *how*: as a **separate top-level application directory**, e.g. `titan/`, not woven into `src/` (the existing marketing SPA).

Why separate, even in the same repo:

| Dimension | Existing site (`src/`, root `*.html`) | Titan |
|---|---|---|
| State | Stateless static content | Stateful — accounts, assessments, leads, CRM records |
| Data | None (no database) | Needs a real database, multi-tenant |
| Auth | None | Needs real authentication (admin + customer portal) |
| Deploy target | Static hosting (GitHub Pages / Cloudflare Pages) | Needs a real application host (backend + DB) — cannot deploy the same way |
| Release cadence | Content-driven, infrequent structural change | Product-driven, frequent |

A monorepo with `titan/` as its own directory (own `package.json`, own build, own deploy pipeline) keeps one repository, one git history, one PR/review convention — but doesn't force a stateful SaaS product and a static marketing site through the same build or the same deployment target, which the current repo's five-stage audit trail (`docs/audit/`) already shows causes real problems even *within* a single static site's build pipeline.

**Marketing pages for Titan** (landing, pricing, blog, resources — everything in Module 1 that needs SEO) are a different concern from **the application** (questionnaire, admin portal, customer portal — everything behind auth, none of which needs to be indexed). Recommendation: Titan's own marketing pages ship as static/SSG content (consistent with how the existing site already handles SEO-critical pages), and the authenticated app is a separate SPA. This mirrors the split the existing repo already has between its 16 static pages and its `src/` SPA — a pattern this engagement has already spent five stages validating works, including its failure modes.

## Module → subsystem map

The original 20-module list groups into five subsystems:

| Subsystem | Modules |
|---|---|
| **Public/Marketing** | 1 (Marketing Website) |
| **Assessment Core** | 2 (Questionnaire Engine), 3 (Risk Engine), 4 (Recommendation Engine), 5 (AI Insights), 6 (PDF Generator) |
| **Growth/Ops** | 7 (Lead Qualification), 8 (CRM Integration), 10 (Analytics), 11 (Automation), 12 (Booking) |
| **Internal/Customer-facing apps** | 9 (Admin Portal), 13 (Customer Portal) |
| **Platform (cross-cutting, applies to all of the above)** | 14 (APIs), 15 (Security), 16 (Performance), 17 (Accessibility), 18 (SEO), 19 (Observability), 20 (Testing) |

The Platform row isn't a phase — it's a standard every module in the other four rows has to meet, per the original brief's own quality gates. `ROADMAP.md` treats it that way.

## Module 1 — existing scanner asset: discovery findings (Phase A)

The Phase 2 master prompt's Phase A requires reviewing the existing scanner (`dpdpriskscan.html`, an uploaded, production-quality asset — single-file HTML/CSS/JS, ~1,660 lines) and documenting evidence before any rewrite. "Production-quality" describes the code as written, not its current runtime state — see below, that turns out to matter. This section is that review, done against the file as uploaded. **Nothing in the scanner itself has been changed as a result of these findings** — the fixes land in `titan/packages/assessment-core` (Phase C/D, built alongside the original file, proven correct with tests), not in the original file, so the working customer-facing scanner is untouched and keeps working exactly as it does today.

### Architecture as it exists today

- Single static HTML file: ~840 lines of inline `<style>`, ~570 lines of inline `<script>`, no build step, no module system, no framework.
- Two CDN dependencies load unconditionally on every page view: jsPDF 2.5.1 and Chart.js 3.9.1 (both from cdnjs). **Chart.js is loaded but never invoked** — no `new Chart(...)` call exists anywhere in the file. Confirmed dead weight, not a guess.
- State is two global mutables (`answers`, `riskData`) plus a `currentQuestion` index — reasonable for one inline script, not something that survives a module split without deliberate state ownership, which is exactly what modularization (Phase B onward) has to design for.
- Question bank: 15 entries, inline array literal (`const questions = [...]`). Matches the "15 Question Assessment" existing-asset description.

### Confirmed: the script does not currently parse — the scanner is non-functional as uploaded

Verified directly against the uploaded file (`/root/.claude/uploads/.../ce22f943-dpdpriskscan.html`, not a copy), not inferred from reading: extracting the inline `<script>` block (lines 1091–1656) and running `node --check` against it fails with a real `SyntaxError`, not a lint warning:

```
scanner_script.js:65
                text: 'Do you process children's data (<18) with verifiable parental consent?',
                                               ^

SyntaxError: Unexpected identifier 's'
```

The `children_data` question's `text` field (and, unreached because parsing already failed, its `penalty` field two lines later — `'₹200 crore (children's data violation)'`) has a bare, unescaped apostrophe inside a single-quoted JS string literal, closing the string early. A JavaScript `<script>` block that fails to parse does not partially execute — **none** of it runs: `createParticles()`, `startScan()`, the question renderer, the risk engine, `submitLead()`, `generatePDF()`. The hero section's "Start Free Risk Scan" button calls `onclick="startScan()"`, an undefined function once parsing fails, so clicking it does nothing observable (a `ReferenceError` lands in the browser console, nothing on screen). As uploaded, this is a static hero section with a non-functional CTA, not a working 15-question flow — that characterization needs correcting before anything else here is read as "review of a working scanner."

Scoped fix, confirmed by patching a scratch copy only (the real uploaded file is untouched, per Phase A's "do not rewrite yet"): escaping that single apostrophe (`children\'s data`, both occurrences) is sufficient — re-running `node --check` on the patched copy exits clean, no further syntax errors found anywhere else in the script. This is a one-character-class bug with total functional impact, not a sprawling one — worth being precise about both halves of that, since overstating scope is as much a violation of "every recommendation must include evidence" as understating it.

**This finding changes what "existing asset" means for the rest of this document and for Phase B.** The question bank data, risk-scoring logic, and PDF layout below are analyzed from reading the source (which is well-formed once the one string is fixed) and from the scratch-patched copy — they're real and were clearly authored to work — but none of it has ever actually run in this repository until now. Nothing here should be read as "this was working in production and has a subtle bug"; it should be read as "this was one syntax error away from working, is now verified logically once that's fixed, and has the further issues below."

### Confirmed correctness bug: risk score denominator is off by one

This is the next bug behind the parse error above — verified logically against the source and confirmed live against the scratch-patched copy, since the unpatched original never reaches this code path at all. The score is `Math.round((riskData.total / maxScore) * 100)`, with `maxScore` **hardcoded to `13`** independently in two places (the on-screen `calculateAndDisplayRisk` function and, duplicated, in `generatePDF`).

Actual count from the question bank: of 15 questions, 1 is free-text (`company_info`, not scored) and 2 are qualification-only (`collects_data`, `any_work` — explicitly excluded from scoring by the code's own `riskField !== 'qualification'` check). That leaves exactly **12** boolean questions that feed the score (`has_dpo`, `consent_mechanism`, `breach_sop`, `dpr_fulfillment`, `cross_border`, `children_data`, `dpa_vendors`, `retention_policy`, `privacy_notice`, `sdf_classification`, `dpia`, `incident_response`) — not 13.

Effect: an organization that fails **every** scored question gets `riskData.total = 12` and a displayed score of `round((12/13)*100) = 92`, never 100. The scanner cannot display its own worst-case score correctly against its own question bank. This is precisely the failure class this document's own testing strategy (below) already names as highest-priority — a scoring bug with real consequences for what an organization is told about its compliance posture — and it existed because the scoring logic has zero test coverage. Fixed in `packages/assessment-core`, with a regression test pinning the correct denominator so it can't silently drift again.

### Security

- **DOM-based XSS today, a stored-XSS path once persistence and an admin UI exist.** `renderQuestion()` interpolates the user's own free-text answer into an HTML attribute via `innerHTML` (`value="${answers[q.id] || ''}"`). Low severity today (self-XSS against the user's own tab only). Not low severity once Phase E (persistence) and Phase I (Admin Portal) land: `submitLead()` already stores unsanitized `name`/`email`/`company` into the lead record, and an admin UI rendering those fields without escaping is a textbook stored-XSS vector against whoever's viewing the dashboard. Needs output encoding (or a non-string-concatenation rendering approach) before Phase I, not after.
- **Email validation isn't real validation.** `submitLead()` only checks that the string contains both `@` and `.` — `@.` passes. Acceptable for a client-only demo; not acceptable once it gates a real lead pipeline (Phase G) or a real account email (Phase F).
- **The "No Data Stored" trust badge contradicts the code.** The hero section shows a trust badge reading "No Data Stored," but `submitLead()` persists the full lead record — name, email, company, every questionnaire answer, timestamp, user agent — to `localStorage` indefinitely. This is a factual-accuracy problem on a page selling data-protection compliance specifically, separate from its security severity. It needs to either become true (don't persist without disclosed consent) or be reworded before this ships as Module 1 of the real product.
- **No compliance disclaimer on the on-page results/landing UI.** `PRODUCT_VISION.md` already requires the "not a compliance guarantee" disclaimer on "every report, every results page, and every marketing page... as a stated fact of what the product is." The generated PDF has one (in `generatePDF`'s footer); the on-screen results card and the hero's "DPDP Act 2023 Compliant" badge don't. A gap against a rule this project already committed to, not a new one invented here.

### Accessibility

- The 15 answer options are `<div onclick>` elements with custom `.option`/`.option-radio` styling — not `<input type="radio">`/`<label>` or `role="radio"` + `aria-checked`. No accessible name/role/state reaches assistive tech beyond the visible text.
- Keyboard support is one global `keydown` listener with hardcoded key mappings (`1`/`y`/`Y`, `2`/`n`/`N`, arrow keys) over non-focusable divs, instead of native interactive elements that get keyboard operability for free. A keyboard-only or screen-reader user gets no signal these are the controls, or which one is currently selected.
- The progress bar and risk-score circle are purely visual — no `role="progressbar"`, no `aria-valuenow`/`aria-valuemin`/`aria-valuemax`.
- Direct gap against the bar Titan's own design system already holds itself to (`jsx-a11y` + `axe-core` on every interactive component, per `DEVELOPER_GUIDE.md`). Module 17's quality gate applies to Module 1 the same as everywhere else.

### Performance

- Chart.js (unused) and jsPDF (~500KB+, only needed once a user reaches results and downloads/submits) both load unconditionally and render-blocking, instead of being deferred or lazy-loaded until actually needed.
- Google Fonts requests seven weights of Inter (`300;400;500;600;700;800;900`); worth auditing which weights the CSS actually renders before a modularized version ships the request forward unexamined.

### Testing

Zero automated tests exist for this file today, including on the scoring logic this document's own testing strategy already designates the highest-priority target. The `maxScore` bug above is exactly the class of defect that priority exists to catch.

## Tech stack — recommendations, not decisions

| Layer | Recommendation | Rationale | Alternative considered |
|---|---|---|---|
| Frontend (app) | React 19 + TypeScript + Vite | Matches existing repo conventions and dependencies already in `package.json`; no new frontend paradigm to learn | Next.js app router — rejected for the *app* since nothing behind auth needs SSR |
| Frontend (marketing) | Static/SSG pages, same approach as the existing site's 16 static pages, or a lightweight SSG (Astro/Next.js static export) if templated content generation (blog, resource pages) becomes worth automating | SEO is a Module 1 requirement; the existing site already proves this pattern works and is already audited for it | Full SSR framework for the whole app — rejected, adds infrastructure complexity for pages that don't need it |
| Backend | **Decided: Cloudflare Workers.** Business logic behind a Repository Pattern — never a direct D1 dependency (see below) | Cloudflare-native per the Phase 2 master prompt's explicit architectural directive; pairs with Pages/D1/R2/Queues under one platform, one account, one bill | Node.js + Express / Fastify / NestJS — the prior recommendation, superseded by the Phase 2 directive, not by a technical reversal of the reasoning |
| Database | **Decided: Cloudflare D1** (SQLite-based), accessed only through a Repository Pattern layer — application/business logic must never import a D1 client directly | Per the Phase 2 master prompt; the repository boundary keeps the door open to swapping the underlying store later without a business-logic rewrite, which matters more with D1's narrower feature set than Postgres's | PostgreSQL — the prior recommendation (full relational feature set); superseded because the hosting decision below makes D1 the same-platform default, not because Postgres's fit for this data model changed |
| Auth | **Decided: self-hosted Auth.js**, behind an authentication abstraction layer (application code depends on the abstraction, not on Auth.js's APIs directly) | Per the Phase 2 master prompt; still a vetted library rather than hand-rolled sessions, matching Module 15's OWASP-grade requirement — the abstraction layer means a managed provider stays swappable later without a call-site rewrite | A managed provider (Clerk/Auth0) — the prior recommendation's other option; superseded by the explicit self-hosted directive |
| AI Insights | Google Gemini via `@google/genai` | Already a dependency in this repo, already integrated in `server.ts` for a different feature — reuse, don't introduce a second AI provider without reason | — |
| PDF generation | Headless-browser HTML-to-PDF (Playwright, already available in this environment) rendering a templated report | Produces pixel-accurate, brand-consistent reports from the same design system as the web UI; avoids maintaining a second, parallel PDF-layout system | A dedicated PDF library (pdf-lib, etc.) — more control, more manual layout work; revisit if headless-browser rendering proves too slow at volume |
| Email | Needs a transactional email provider — **not yet chosen, no candidate currently in this repo's dependencies** | Required for Module 11 (Automation) and the whole lead/report-delivery flow | Decision needed at Phase 0 |
| Payments | **Not in the original module list at all — flagged as a gap in `PRODUCT_VISION.md`.** Recommendation when addressed: a payment gateway with strong India support (Razorpay is the common default for Indian SaaS; Stripe also supports India) | Four of seven business tiers require charging money | Decision needed before any real paid-tier transaction can occur |
| CRM | Build a lightweight CRM data model inside Titan's own database (Module 9's "CRM" tab) rather than integrate a third-party CRM initially | Avoids an external dependency and its cost/complexity before there's proven lead volume to justify it; the data model is simple (lead, activity, pipeline stage) | Integrate HubSpot/Salesforce/Zoho — revisit once lead volume or team size makes an internal CRM UI insufficient |
| Booking | Embed an existing scheduling tool (Calendly-equivalent) initially rather than build calendar/timezone logic from scratch | Calendar/timezone handling is a notoriously easy place to introduce subtle bugs; an embed gets Module 12 working correctly on day one | Build native scheduling — revisit if embed limitations (branding, data ownership) become a real problem |
| Deployment target (Titan app) | **Decided: Cloudflare, full platform** — Pages (app shell), Workers (backend/API), D1 (database), R2 (object storage, e.g. generated PDFs), Queues (async work, e.g. email/report delivery), Turnstile (bot mitigation), plus Cloudflare's CDN/WAF/Analytics | Per the Phase 2 master prompt | A traditional Node host (Render/Railway/Fly.io) + Postgres — the prior recommendation; superseded by the explicit directive |

## Data model (entities, not full schema — schema is Phase 0 implementation work)

```
Organization ──< User (admin | customer role)
Organization ──< Assessment ──< Response >── Question ──< QuestionCategory
Assessment ──1 RiskScore ──< RiskFinding
Assessment ──< Recommendation
Assessment ──1 Report (generated PDF artifact)
Lead ──1 Organization (nullable until qualified)
Lead ──< CRMActivity
Lead ──0..1 Booking
User ──< AuditLogEntry
```

Every entity above needs a tenant boundary (`organization_id` or equivalent) enforced at the query layer, not just the application layer — this is the highest-severity security requirement for a multi-tenant SaaS handling organizations' self-reported security posture data, and belongs in Module 15's acceptance criteria explicitly, not as an assumed default.

## Security architecture (Module 15, elaborated)

- **Tenant isolation**: every data access path scoped by organization ID, enforced with row-level security or an equivalent query-layer guarantee — not just checked in application code, which is one missed check away from a cross-tenant leak.
- **Auth**: see Tech Stack table — a vetted library, not custom.
- **Secrets**: environment-variable-injected at the hosting layer, never committed (this repo already has a clean track record here — `PRODUCTION_SCORECARD.md` confirms zero secrets found across five audit stages — the same discipline carries forward).
- **Input validation**: schema validation (e.g., Zod) at every API boundary, particularly the questionnaire-response endpoints, which are the highest-volume, most user-controlled input surface.
- **Rate limiting**: required on the free-assessment start endpoint specifically (abuse/scraping vector) and the AI Insights endpoint (cost-abuse vector — the existing repo's own architecture audit already flagged this exact risk class on its current Gemini-backed endpoint).
- **Audit logging**: every admin action, every access to another organization's data (support access), append-only.
- **Encryption**: TLS in transit (standard for any modern host); at-rest encryption via the database host's native support (Postgres providers generally offer this by default) rather than custom application-layer encryption, which is a common source of key-management bugs.

## Observability & testing strategy (approach, not implementation)

- **Logging**: structured (JSON) application logs, correlation IDs per request.
- **Monitoring/health checks**: a `/health` endpoint from Phase 0 onward — this repo's own `PROGRAM_BACKLOG.md` #9 already flags the *current* site's total absence of this as a real gap; Titan should not repeat it.
- **Error reporting**: a hosted error-tracking service (Sentry-class) from Phase 0 — same rationale.
- **Testing pyramid**: unit tests for the risk-scoring engine specifically get the highest priority and coverage bar, since a scoring bug is a correctness bug with real consequences for what an organization is told about their compliance posture. Integration tests for API boundaries. E2E tests for the critical path (landing → questionnaire → results, and admin login → view assessment). Accessibility and performance tests run in CI, not manually, from Phase 0 — retrofitting them later, as this repo's own architecture audit found for the *existing* site, is far more expensive than building them in from the start.

## Open decisions

### Decided (see `DECISION_LOG.md` for the full record)

- ~~Application hosting target~~ → Cloudflare (Pages/Workers/D1/R2/Queues/Turnstile), per the Phase 2 master prompt.
- ~~Auth provider~~ → self-hosted Auth.js behind an abstraction layer, per the Phase 2 master prompt.
- Database engine (a consequence of the hosting decision) → Cloudflare D1, behind a Repository Pattern.

### Still open (need a human answer before the relevant phase starts)

1. Payments provider (before real paid-tier transactions can occur — no free-to-paid conversion is possible without this)
2. Email provider (before automated report-delivery/lead-notification email can be built — Phase G/H)
3. Whether the DPDP assessment framework content (`DPDP_ASSESSMENT_FRAMEWORK.md`) gets expert legal review before real use, or ships labeled "draft" and gets reviewed in parallel — recommend the former, but this is a business risk tradeoff, not a technical one
