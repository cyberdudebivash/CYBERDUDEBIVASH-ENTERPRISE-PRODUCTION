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

## Enterprise architecture audit (RC1 pass)

A real audit of `titan/` as it stands after Stage 4, not a self-assessment — every claim below was checked with an actual command, not asserted from memory.

**Package dependency graph — clean, no cycles.** Checked directly against each package's `package.json`:

```
@titan/design-system   (no @titan deps — leaf)
@titan/assessment-core (no @titan deps — leaf)
@titan/platform        → @titan/assessment-core
@titan/web              → @titan/assessment-core, @titan/design-system, @titan/platform
```

`@titan/web` is the only consumer of all three others; nothing depends back on `web`. Confirmed no package under `assessment-core`/`design-system` imports `@titan/platform` or `@titan/web` (`grep` across both packages' `src/`, zero matches).

**Repository Pattern boundary — held.** `router.ts` never imports a concrete `*.d1.ts`/`*.memory.ts` repository module — only the interfaces from `repositories/types.ts`, with concrete implementations injected via `Dependencies` from `worker.ts`. `grep` for `D1Database` across `packages/platform/src` returns matches only in the expected files (`*.d1.ts`, `worker.ts`, `testD1.ts`, `auth/config.ts`) — no business logic anywhere touches D1 directly.

**Shared models — single source of truth, no duplication.** `LeadRecord`/`AssessmentRecord`/`OrganizationRecord`/etc. are defined exactly once, in `@titan/platform/src/repositories/types.ts`; `grep` for a second definition anywhere in `apps/web` or `packages/assessment-core` returns nothing. `titan/apps/web`'s `leadStore.ts` re-exports `NewLead` under the name its callers use, rather than redefining the shape.

**API contract — consistent, not accidentally.** The Worker's error envelope (`http/responses.ts`'s `jsonError`: `{ error: { code, message }, requestId }`) and the frontend's parsing of it (`apiClient.ts`'s `ErrorEnvelope`) agree on shape. The client intentionally does not import the server's internal `ApiError` type — an HTTP client parsing a wire contract shouldn't need to import the server's internal response-building types, and a minimal local shape for parsing purposes is standard practice, not duplication of business logic.

**Dependency health.** `npm audit` (root workspace, all packages): 0 known vulnerabilities. `vitest`/`@vitest/coverage-v8` versions are consistent (`^3.0.0`) across all four packages — no accidental drift from the deliberate Vitest-4-deferral decision (`DECISION_LOG.md`).

**Scaling risk identified, deliberately not acted on:** `router.ts`'s route dispatch is a hand-written if/else chain. This is the right amount of structure for today's 6 routes (easy to read top-to-bottom, no framework overhead) but will not scale gracefully if an Admin/Customer Portal (`ROADMAP.md`, deferred this pass) adds the dozens of routes those need. **Recommendation, not action taken:** revisit with a real route-table/matcher once route count materially grows — introducing that abstraction now, for 6 routes, would be solving a problem that doesn't exist yet (this repository's own stated engineering principle: refactor only where measurable value exists).

**No XSS surface found.** `grep` for `dangerouslySetInnerHTML` across `apps/web/src`: zero matches, confirming Stage 3's original finding still holds after all of Stage 4's additions.

**Tooling gap found and fixed:** `packages/config/eslint.base.mjs` ignored `dist/`, `coverage/`, `node_modules/` but not `.wrangler/` — `wrangler dev`'s own local build cache (gitignored, but not excluded from ESLint's scan). This was invisible until Stage 4's real local operational verification actually ran `wrangler dev` for the first time in this workspace, which generates that directory; anyone following `OPERATIONAL_RUNBOOK.md`'s local dev instructions would hit the same `npm run lint` failure. Fixed by adding `**/.wrangler/**` to the shared ignore list.

## Admin Application architecture (EAP-1 Phase 1)

The first real, authenticated product surface built on top of the RBAC/API foundation above — an "Enterprise Administration Platform" (EAP) built as an explicitly phased program, not one pass. Phase 1's scope, set directly by the user rather than the EAP-1 master prompt's own (much larger) request: the authenticated application shell, session lifecycle, protected-route middleware, role-aware navigation, a reusable admin UI framework, and exactly one complete module (Dashboard) — architected so Lead/Assessment/Organization/User Management, an Audit Center, and an Operations Center can plug in as later phases, not built speculatively ahead of them. This section documents what that shell actually is, evidenced against the real code, the same way the RC1 audit section above does for the rest of the platform.

**Where it lives:** `titan/apps/web/src/features/admin/` (`auth/`, `layout/`, `dashboard/`), mounted at `/admin` in `App.tsx` as a sibling route tree to the public DPDP assessment flow (Stage 3's decision, `DECISION_LOG.md`) — not nested inside it, and not sharing its unauthenticated, non-`@titan/design-system` visual system. `/admin` is the first real consumer of `@titan/design-system`'s app-shell components (`Header`/`Sidebar`/`Footer`, already built in Phase 1/Stage 3 but unused by the public flow) and of the two new components this phase added (`MetricCard`, `Panel`).

**Session lifecycle — real, cross-origin, cookie-based, no parallel auth system:**

- `SessionContext`/`useSession()` (`features/admin/auth/SessionContext.tsx`) calls `GET /api/me` once on mount and exposes a `loading | authenticated | unauthenticated | error` state — no client-side session storage of its own; the Auth.js session cookie remains the single source of truth, this is only a cache of what it currently says.
- `RequireAuth` (`features/admin/auth/RequireAuth.tsx`) redirects an unauthenticated visit via `window.location.href = signInUrl(callbackPath)` — a real, full-page navigation to Auth.js's own hosted `/api/auth/signin` page (real HTML, real CSRF token, real provider list), not a custom login form duplicating what `@auth/core` already does correctly. Same for sign-out (`signOutUrl`) — `AdminLayout`'s header renders it as a real link to `/api/auth/signout`, Auth.js's own confirm-and-redirect flow.
- This only works because the SPA (`http://localhost:5173` in local dev) and the Worker (`http://localhost:8787`) are different origins, and a database-session-strategy cookie has to survive that round trip in both directions. Three changes made that real, not simulated:
  1. `http/cors.ts`'s `corsHeaders()` now sets `Access-Control-Allow-Credentials: true` (paired with `apiClient.ts`'s `fetch(..., { credentials: "include" })`) — required by the Fetch spec before a browser will expose a credentialed cross-origin response to page JS at all.
  2. `auth/config.ts`'s `redirect` callback allowlists one additional origin (`AuthConfigOptions.allowedOrigin`, threaded from the same `resolveAllowedOrigin(env.ALLOWED_ORIGIN)` CORS already uses in `worker.ts` — CORS and the redirect allowlist can't drift apart because they're the same value). `@auth/core`'s *default* redirect callback (traced directly against `lib/init.js`, not assumed) only allows a `callbackUrl` that's relative or shares the Worker's own origin — without this, every sign-in/sign-out would silently collapse back to the bare Worker root instead of returning the user to the app.
  3. **`http/finalizeResponse.ts`'s `authPagesCsp` allowlists the same origin in its `form-action` directive — found necessary only by real-browser verification, not by any unit test or curl check.** Auth.js's real sign-out confirmation page POSTs to its own origin (satisfying a bare `form-action 'self'`) and then 302-redirects to the cross-origin SPA's `callbackUrl`. The CSP spec's `form-action` directive also restricts *redirects resulting from* a form submission, not just its immediate POST target — Chromium correctly refused to complete that redirect under the previous, narrower policy, silently breaking cross-origin sign-out. Confirmed via an isolated repro (the identical form submits successfully with no `callbackUrl`, and fails only once one pointing off-origin is present) before the fix, and via a full real-browser sign-in → dashboard → sign-out run afterward. This is the single most significant finding of Phase 1 — the kind of bug that is structurally invisible to jsdom-based component tests or a curl script, and exactly why this phase's own verification requirements insist on a real browser driving a real sign-in.

**Protected-route / layout composition:** `App.tsx` nests `<SessionProvider><RequireAuth><AdminLayout /></RequireAuth></SessionProvider>` around every `/admin/*` route. `AdminLayout` is documented (and tested) as requiring a `RequireAuth` ancestor — it reads `useSession()` assuming a resolved, authenticated session rather than re-deriving loading/redirect logic itself, so that concern exists in exactly one place. `AdminLayout` reuses `@titan/design-system`'s `Header`/`Sidebar`/`Footer` (passing the real signed-in email and a real sign-out link into `Header`'s new optional `session` prop) rather than building parallel chrome, and renders `<Breadcrumbs />` (derived from `useLocation().pathname`, title-casing hyphenated segments) plus `<Outlet />` inside a landmark `<main id="main-content">` — the mount point every future module's own route nests under.

**Role-aware navigation, built for pluggability, not just for Phase 1's one module:** `adminNavItems(me: MeResponse): SidebarItem[]` (`features/admin/layout/navItems.ts`) is the single place that decides what a signed-in caller can navigate to. It returns exactly one entry today (`Dashboard`) — Phase 1 has exactly one module — but takes the caller's real `MeResponse` as its signature specifically so a later phase adding Lead/Assessment/Organization/User Management/Audit Center/Operations Center entries (some of them plausibly Platform-Administrator-only) is a change inside this one function, not a per-page decision repeated at every new route.

**Reusable admin UI framework additions (`@titan/design-system`):** `MetricCard` (label/value/hint, `isLoading` state, `aria-live="polite"`) and `Panel` (a labeled `<section>` using `useId()` for its accessible name) — the two primitives the Dashboard's metrics/sections are built from, added to the design system rather than the `admin/dashboard/` feature folder specifically so later modules reuse them instead of building similar-but-different cards/sections independently.

**Dashboard — the one complete Phase 1 module:** `features/admin/dashboard/` (`useDashboardData.ts` + `DashboardPage.tsx`) renders Executive overview, Organization/Lead/Assessment metrics, a risk-level breakdown, recent activity, an audit summary, and platform health/system status. Two real design decisions, not incidental implementation detail:

- **Per-section data loading, not one page-level gate.** `useDashboardData`'s `SectionState<T>` (`loading | ready | forbidden | error`) is fetched independently per section. `GET /health`/`GET /health/ready` are role-agnostic and always fetched; the four Platform-Administrator-gated sections (leads, assessments, organizations, audit — the same `requirePlatformAdministrator` policy `GET /api/leads` already used) are fetched only when `me.isPlatformAdministrator` is true, and resolve straight to `"forbidden"` for anyone else without firing a request that would just 403 predictably. A non-admin who reaches `/admin` (any authenticated user can — `RequireAuth` checks for a session, not a role) sees an honest "Platform Administrator role required to view this" message per section, and real platform health/status alongside it — never a fabricated metric, never a blank page.
- **No new authorization concept.** Every gated section reuses the existing Platform Administrator role (`auth/rbac.ts`'s `isPlatformAdministrator`, unchanged since the Security Release Blocker Sprint) via `GET /api/me`'s `isPlatformAdministrator` flag — computed server-side, not inferred client-side from probing a privileged endpoint and reading its status code.

**New read endpoints backing the Dashboard**, all in `router.ts`: `GET /api/me` (any authenticated caller — 401 with no session, otherwise `{userId, email, profiles, isPlatformAdministrator}`; no role gate, since identity itself isn't privileged the way a cross-organization data list is), `GET /api/organizations`, `GET /api/assessments` (list, distinct from the existing `GET /api/assessments/:id`), and `GET /api/audit` — the latter three all Platform-Administrator-only via `auth/authorize.ts`'s `requirePlatformAdministrator` (generalized this phase from `requireLeadsAccess`, which now delegates to it), for the identical reason `GET /api/leads` already was: none of `OrganizationRepository.list()`/`AssessmentRepository.list()`/`AuditRepository.list()` filter by organization, so gating any of them at "any organization member" would be a cross-tenant leak dressed up as a fix. Full policy table: `SECURITY_GUIDE.md`'s "Authorization model."

**Explicitly not built this phase** (deferred to later EAP phases, not forgotten): Lead Management, Assessment Management, Organization Management, User Management, an Audit Center, and an Operations Center as full modules. The Dashboard reads across all four of those domains (leads/assessments/organizations/audit) for metrics, but nothing here is a management UI for any of them — no create/edit/delete, no per-record detail view, no search/filter beyond what the Dashboard's own summary needs. `ROADMAP.md`'s EAP-1 section has the phase-by-phase plan.

## Lead Intelligence Platform architecture (EAP-2)

The first complete business module built on the EAP-1 shell — a production Lead Workspace (search/filter/sort/paginate), Lead Details, Lead Lifecycle management, a Risk Intelligence panel, and audit integration, scoped explicitly to Lead Intelligence only (Assessment/Organization/User Management, an Audit Center, and an Operations Center remain unbuilt — `ROADMAP.md`'s EAP section has the sequencing).

**Data model — additive, not a redesign.** `migrations/0008_lead_lifecycle.sql` adds four columns to the existing `leads` table (`status`, `priority`, `assigned_to`, `tags_json`), each defaulted so a lead captured through the public scan flow (which never sets any of them) lands in a real, sane state (`new`/`medium`/unassigned/no tags) rather than NULL. `LeadRepository` gained three new methods (`findById`, `update`, `search`) additively — `list()`, the method EAP-1's Dashboard already depends on, is completely unchanged, both in signature and behavior. **Internal notes and activity history are not new tables** — both are `audit_events` rows (the same table Workstream 6/7 built in Stage 4), reusing its real append-only guarantee (`AuditRepository`'s interface has no `update`/`delete` at all) rather than inventing a second, parallel "things that happened to this record" concept. `AuditRepository.list()` gained an optional `{entityType, entityId}` filter, additive the same way — every existing no-args caller (EAP-1's Dashboard audit summary) is unaffected, and the filter uses `migrations/0007`'s own `(entity_type, entity_id)` index, which already anticipated exactly this query shape.

**New endpoints, all reusing the existing Platform Administrator role — no new authorization concept:** `GET /api/leads/:id` (records a `lead.viewed` audit event with a real actor, unlike the anonymous `lead.created`), `PATCH /api/leads/:id` (the lifecycle write — diffs the patch against the pre-update record so only fields that actually changed produce an audit event), and `GET /api/leads/search` (server-side search/filter/sort/pagination, a separate endpoint from `GET /api/leads` specifically because its response envelope — `{leads, total, page, pageSize}` — genuinely differs from `GET /api/leads`'s bare array, not the same endpoint branching on query-param presence). `GET /api/audit` gained optional `entityType`/`entityId` filters in place, since its response shape never changes. Full policy table: `SECURITY_GUIDE.md`.

**`PATCH /api/leads/:id` is CSRF-checked the same way the anonymous POST endpoints already are** (`security/csrf.ts`'s `isTrustedOrigin`), reused for a materially different reason: it's a cookie-authenticated route, so a forged cross-origin request would ride along with the caller's real session cookie — Origin validation is more load-bearing here, not less.

**Real finding, real-browser-only: CORS `Access-Control-Allow-Methods` never included `PATCH`.** Every write before this phase went through POST; a cross-origin `PATCH` triggers a real preflight `OPTIONS` request that a browser will silently block the real request over if the response's allowed-methods list doesn't include it — invisible to `router.test.ts`/`worker.test.ts` (call `handleRequest`/`worker.fetch` directly, bypassing the browser fetch stack) and to jsdom-based component tests (no real preflight semantics). Fixed in `http/cors.ts`. Full reasoning: `DECISION_LOG.md`'s EAP-2 entry.

**Frontend architecture, `apps/web/src/features/admin/leads/`:** `leadApi.ts` (the one place this app talks to the new endpoints), `useLeadSearch`/`useLeadDetail` (own the Lead Workspace's and Lead Details' data-loading state respectively, both reusing `useDashboardData`'s `SectionState<T>` loading/ready/forbidden/error convention rather than inventing a new one), `LeadWorkspacePage`/`LeadDetailPage` (thin `useSession()` wrappers exporting a directly-testable `*Content`/`*Body` component, matching `DashboardPage`'s established split), and `StatusBadge`/`PriorityBadge`/`RiskBadge` (domain-aware wrappers around `@titan/design-system`'s generic `Badge` — kept out of the design system itself specifically to preserve its dependency-free leaf-package status, `ARCHITECTURE.md`'s own audit further up this document).

**Design-system additions (`@titan/design-system`), all genuinely generic — no `LeadStatus`/`RiskLevel` knowledge leaks into the package:** `Badge` (tone-based, the primitive the three domain badges above wrap), `SearchBar`, `Pagination`, `EmptyState`, `LoadingSkeleton`, `FilterPanel`, `Timeline`, `DataTable`. `DataTable` renders every row it's given directly — no virtualization, since nothing in this codebase's real (local-only) data volume justifies the complexity yet.

**Explicitly not built this phase** (deferred to later EAP phases): Lead Management is complete, but Assessment Management, Organization Management, User Management, an Audit Center, and an Operations Center remain unbuilt — none of their own backing endpoints exist beyond what EAP-1's Dashboard already reads. `ROADMAP.md`'s EAP section has the recommended next phase and why.

## Enterprise Assessment Center architecture (EAP-3)

The third business module built on the EAP-1 shell — a production Assessment Workspace (search/filter/sort/paginate), Assessment Details, Assessment Results (risk summary, severity breakdown, category coverage, question-by-question responses), a Compliance Intelligence panel, and audit integration, scoped explicitly to Assessment Center only. Unlike Lead Intelligence, this module is **read-only end to end** — an assessment is one immutable row per completed run (`migrations/0004_assessments.sql`'s own comment), with no draft/in-progress state and nothing for an admin to edit, so there is no lifecycle-patch endpoint, no new CORS method, and no new CSRF-checked write.

**Data model — additive, no schema change at all.** No migration was needed: `AssessmentRecord` already had every field this module surfaces. `AssessmentRepository` gained one new method (`search`) additively — `list()`, which EAP-1's Dashboard and this phase's own Compliance Intelligence panel both depend on, is unchanged. `LeadRepository.search()` gained one new optional filter (`assessmentId`, exact match) for Assessment Details' "Lead linkage" panel — reusing `GET /api/leads/search` rather than a new nested endpoint.

**New endpoints, reusing the existing authorization gates — no new authorization concept:** `GET /api/assessments/search` (server-side search/filter/sort/pagination, Platform-Administrator-only — the same cross-organization, unfiltered-by-tenant policy as `GET /api/assessments` list and `GET /api/leads`/`GET /api/leads/search`, since `search()`'s underlying query is not organization-scoped). `GET /api/assessments/:id` (pre-existing, Security Release Blocker Sprint) now also records an `assessment.viewed` audit event with the real caller as actor, mirroring `getLead`'s `lead.viewed` — the one real gap Workstream 6 (audit integration) found once fully verified. Full policy table: `SECURITY_GUIDE.md`.

**Frontend architecture, `apps/web/src/features/admin/assessments/`:** `assessmentApi.ts` (this app's only caller of the new endpoints), `useAssessmentSearch`/`useAssessmentDetail` (own the Workspace's and Details' data-loading state, both reusing `useDashboardData`'s `SectionState<T>` convention), `AssessmentWorkspacePage`/`AssessmentDetailPage` (thin `useSession()` wrappers exporting a directly-testable `*Content`/`*Body` component, matching `DashboardPage`/`LeadWorkspacePage`'s established split), `AssessmentResultsPanel` (risk summary/severity breakdown/category coverage/question responses — the Assessment analogue of `LeadRiskPanel`, deliberately mirroring its severity-breakdown structure and labeling rather than diverging), `AssessmentAuditPanel` (the Assessment analogue of `LeadAuditPanel`, a shorter real action vocabulary — `assessment.created`/`assessment.viewed` — since there is no lifecycle to generate more), `ComplianceIntelligencePanel` (an aggregate view computed client-side from `GET /api/assessments`, the same pattern `DashboardPage.tsx`'s own risk/activity aggregation already establishes), and `FrameworkBadge` (new, two real consumers: the Workspace table and the Details metadata panel). `RiskBadge` is imported directly from the leads feature rather than duplicated — it has no lead-specific dependency, and a cross-feature import for a genuinely shared, dependency-appropriate piece already has precedent (`useLeadDetail.ts` imports `SectionState` from the dashboard feature).

**Category coverage and question responses use the static DPDP question bank (`@titan/assessment-core`) purely as label/metadata lookup — not a second scoring implementation.** Every pass/fail/score fact rendered still comes from the assessment's own server-computed `result` (Security Release Blocker Sprint: never recomputed client-side); the bank supplies question text, order, and each scored question's real `section` (the DPDP statutory section it maps to — the only real "category" taxonomy this data model has, not an invented one).

**Real finding, real-browser-only, in EAP-2's already-shipped code, surfaced while building this phase's analogous flows:** `LeadWorkspacePage.tsx`'s "Risk" column used `id: "risk"`, but `DataTable` passes a column's `id` straight through as the `sortBy` value, and only `"riskScore"` is one `router.ts` accepts — clicking it sent an invalid `sortBy=risk`, which the backend correctly 400'd, breaking the table. Fixed, and built correctly (`id: "riskScore"`) in the new Assessment Workspace from the start. A second real finding, same root class as EAP-1's CSP bug and EAP-2's CORS bug (a real browser/timing behavior no server-side-only test exercises): `useLeadDetail.ts`'s record-fetch and audit-trail-fetch fired in parallel, with no ordering guarantee against the view-triggered audit write those two requests raced against — fixed by sequencing the audit-trail fetch after the record fetch resolves, in both `useLeadDetail.ts` and the new `useAssessmentDetail.ts`. Full reasoning, plus a related React 19 `<StrictMode>` dev-mode-only double-audit-event finding that was investigated and deliberately left as-is (not a defect): `DECISION_LOG.md`'s EAP-3 entry.

**Explicitly not built this phase** (deferred to later EAP phases): Assessment Management is complete, but Organization Management, User Management, an Audit Center, and an Operations Center remain unbuilt. No `EvidencePanel` component was built — this codebase's data model has no file-upload/attachment concept anywhere; the closest real analogue (free-text/qualification answers) is already surfaced in Assessment Results' question responses, not a separate speculative component. `ROADMAP.md`'s EAP section has the recommended next phase and why.

## Open decisions

### Decided (see `DECISION_LOG.md` for the full record)

- ~~Application hosting target~~ → Cloudflare (Pages/Workers/D1/R2/Queues/Turnstile), per the Phase 2 master prompt.
- ~~Auth provider~~ → self-hosted Auth.js behind an abstraction layer, per the Phase 2 master prompt.
- Database engine (a consequence of the hosting decision) → Cloudflare D1, behind a Repository Pattern.

### Still open (need a human answer before the relevant phase starts)

1. Payments provider (before real paid-tier transactions can occur — no free-to-paid conversion is possible without this)
2. Email provider (before automated report-delivery/lead-notification email can be built — Phase G/H)
3. Whether the DPDP assessment framework content (`DPDP_ASSESSMENT_FRAMEWORK.md`) gets expert legal review before real use, or ships labeled "draft" and gets reviewed in parallel — recommend the former, but this is a business risk tradeoff, not a technical one
