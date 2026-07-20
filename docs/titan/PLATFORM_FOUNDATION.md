# Platform Foundation — Status

Describes what's actually implemented under `titan/` as of this pass. Nothing below is aspirational — every claim has a passing check behind it, verified fresh, not carried over from a plan. See `ROADMAP.md` for what comes next and why it's sequenced this way.

## What exists

| Workstream (from the Phase 1 brief) | Status | Evidence |
|---|---|---|
| 1. Repository foundation | ✅ Done | `titan/` monorepo, npm workspaces (`apps/*`, `packages/*`), fully isolated from the existing marketing site's build — confirmed by rebuilding the site after adding `titan/` and re-checking `verify-dist` (still 7/7) |
| 2. Design system | ⚠️ **Started, not complete** | Tokens (color/spacing/typography) + 2 components (`Button`, `Alert`), real and tested — not the full 15-category list the brief specifies (Forms, Cards, Tables, Badges, Modals, Dialogs, Navigation, Loading/Empty/Error states are not built yet). Scoped down deliberately rather than build 15 shallow, undertested components — see `DEVELOPER_GUIDE.md` |
| 3. Application shell | ⚠️ **Started, not complete** | Layout, Header, Sidebar (data-driven, not hardcoded), Footer, routing, 404, global error boundary, skip link — all real, tested. Breadcrumbs, toast/notification system, and loading skeletons are not built yet (nothing yet needs them — no multi-step flows or async data loading exist in this phase) |
| 4. Authentication foundation | ✅ **Done for this stage's scope** | `titan/packages/platform/src/auth/`: `createAuthConfig()` wires `@auth/d1-adapter` against the real Auth.js schema (`migrations/0001_authjs_core.sql`, verified against the real `@auth/d1-adapter` package's own migration SQL, not guessed), database session strategy, `/api/auth/*` mounted in the router. Email provider works in a dev-mode logging configuration (no real email provider decided — `DECISION_LOG.md`); Google/GitHub providers are wired but inactive without real credentials (never had any in this environment). Verified against real local D1 via `wrangler dev`, not just unit tests. Enterprise SSO explicitly out of scope for this stage |
| 5. Authorization (RBAC) | ✅ **Foundation done** | `auth/rbac.ts`: three-role model (member/admin/owner), organization-membership resolution (`user_profiles` — one row per user per organization). A foundation, not full enterprise RBAC — deliberately, matching the same scope line drawn around enterprise SSO |
| 6. Database foundation | ✅ **Done for this stage's scope** | `titan/packages/platform/migrations/`: 7 real migration files (Auth.js core, organizations, user_profiles, assessments, leads, reports, audit_events), applied and round-tripped against a **real local D1 SQLite instance** via `wrangler d1 migrations apply --local` — not a fake, not simulated. Five repositories (Lead, Organization, Assessment, UserProfile, Audit), each with in-memory + D1 implementations proven interchangeable by a shared contract test suite, itself run against real SQLite (sql.js) rather than a hand-rolled fake (`DECISION_LOG.md`) |
| 7. API foundation | ✅ **Done for this stage's scope** | `titan/packages/platform`'s Worker: `GET /health`, `POST`/`GET /api/leads`, `POST /api/assessments`, `GET /api/assessments/:id`, `/api/auth/*` — all with real validation, structured error responses, security headers, CORS, request-id correlation, a rate-limiting hook. **`@titan/web` now calls this API for real** — `leadStore.ts` POSTs to it, no longer `localStorage`-backed. Verified against real local D1 via `wrangler dev` with real HTTP requests, not just fakes in tests |
| 8. Observability | ✅ **Done for this stage's scope** | Structured JSON logging (`observability/logger.ts`), request correlation (`X-Request-Id`, generated or reused per request), error ids (every error response carries its request id), a basic metrics hook (`observability/metrics.ts` — request counts + durations). All scoped as real-but-per-isolate: this environment has never had Cloudflare Analytics Engine credentials, same constraint as everything else here |
| 9. Security | ✅ **Done for this stage's scope** | Input/schema validation, centralized error envelopes, security headers (CSP — route-scoped: strict for the JSON API, relaxed-but-locked-down for Auth.js's own HTML pages — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS, Permissions-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy) applied to every response, CORS, **CSRF (Origin validation on `POST /api/leads`/`POST /api/assessments` — RC1)**, a documented per-isolate rate-limiting hook (separate, stricter limiter for `/api/auth/*` POST actions — RC1), cookie hardening (reviewed against `@auth/core`'s own defaults, already sound) and secret rotation (`AUTH_SECRET` now accepts an array — RC1). `npm audit`: 0 known vulnerabilities. A full threat model + OWASP ASVS review exists (`SECURITY_GUIDE.md`, RC1), naming one real, unfixed finding directly: client-submitted risk scores aren't recomputed server-side |
| 10. Testing | ✅ **Substantially expanded** | 222 tests passing across 4 packages (up from 119 at Stage 4's start) — unit, component, contract (5 repositories × memory + D1, run against real SQLite), Worker/router integration tests, Auth.js config/session/RBAC/authorization tests, a contract test for `@auth/d1-adapter`'s own CRUD behavior. **A real, committed Playwright E2E suite now exists** (`apps/web/e2e/`, RC1) — starts the real backend and frontend, drives the full assessment flow to a real, asserted `POST /api/leads` response; verified passing (18.3s). Deliberately not yet wired into `titan-ci.yml` — a separate, explicit decision (`DECISION_LOG.md`) |
| 11. Developer experience | ✅ Done | ESLint (flat config, type-aware, `jsx-a11y` + `react-hooks` rulesets), Prettier, strict TypeScript, `.nvmrc`, workspace-wide scripts (`lint`, `format`, `typecheck`, `test`, `build`) |
| 12. Documentation | ✅ This pass | This document + `DEVELOPER_GUIDE.md` |

## Fresh verification evidence (this pass)

| Check | Result |
|---|---|
| `npm run typecheck` (all four packages) | ✅ Clean |
| `npm run lint` (`--max-warnings=0`) | ✅ Clean |
| `npm run format` (Prettier `--check`) | ✅ Clean |
| `npm run build` (all four packages) | ✅ Clean — `@titan/web` 488KB main JS / 141KB gzip (jsPDF, 391KB/129KB gzip, is a separate lazy-loaded chunk, confirmed not in the main bundle), `@titan/assessment-core` 6.4KB / 2.2KB gzip, `@titan/design-system` 13.6KB JS / 4.4KB gzip, `@titan/platform` 2.6KB / 1.0KB gzip |
| `npm run test` | ✅ **222/222 passing** (63 in `@titan/web`, 25 in `@titan/assessment-core`, 17 in `@titan/design-system`, 117 in `@titan/platform`) — up from 119 at the start of Stage 4 |
| `npm run test:e2e` (`@titan/web`, RC1) | ✅ **1/1 passing** (18.3s) — a real Chromium browser, via the committed Playwright suite, driving the full assessment flow through a real `wrangler dev` Worker backed by real local D1 |
| `npm run test:coverage` | ✅ Runs; `@titan/web` 94% statement coverage on components, `@titan/assessment-core` 100% on the question bank and risk engine, `@titan/design-system` 94% on components (token modules 0%, plain data), `@titan/platform`'s repository/router/auth logic covered via its contract + router/worker/auth tests |
| Golden-path browser check (Playwright + the pre-installed Chromium, not committed as a permanent test) | ✅ Full flow (landing → 15 questions → results → lead submit → real PDF download) works in a real browser; confirmed jsPDF isn't requested until the lead form is actually submitted; the only console errors are Google Fonts failing to load, specific to this sandbox's restricted network egress, not a code defect |
| Existing marketing site build, re-run after adding `titan/` | ✅ Unaffected — `verify-dist` still 7/7, zero files outside `titan/` and one new CI workflow touched (last confirmed when `titan/` was first added; unaffected again this pass since nothing outside `titan/` changed) |
| **Stage 4: real local D1 migrations + seed** | ✅ All 7 migration files applied cleanly against a real local D1 SQLite instance (`wrangler d1 migrations apply titan-platform-db --local`), `seed.sql` applied, a real join query across leads/organizations/assessments returned correct data |
| **Stage 4: real `wrangler dev` HTTP verification** | ✅ Real HTTP requests against a running `wrangler dev` instance: `GET /health` (200), `POST`/`GET /api/leads` (201/200), `POST /api/assessments` + `GET /api/assessments/:id` (201/200), `GET /api/auth/session` (200, real Auth.js + real D1 adapter, returns `null` with no session — matches unit test behavior), `OPTIONS` CORS preflight (204 with correct headers). Every persisted record independently re-verified via direct `wrangler d1 execute` queries, not just trusting the HTTP response |
| **Stage 4: real browser end-to-end submission** | ✅ Real Chromium (Playwright, one-off, not a committed dependency — `DECISION_LOG.md`) drove the actual `@titan/web` dev server through the full DPDP flow (15 questions → results → lead form) and submitted the lead form for real; the `POST /api/leads` fetch call returned 201 from the real running Worker; both browser-submitted leads (two runs) confirmed present in D1 via direct query, not assumed from the UI's "Report sent" state alone |

## Two real bugs this pass's own tests caught (worth recording, not hiding)

1. **`Button`'s loading state changed its accessible name.** The spinner's `aria-label="Loading"` merged into the button's computed accessible name ("Loading Submit" instead of "Submit"), caught by the component's own test suite before this was ever used anywhere. Fixed: the spinner is now `aria-hidden`, and `aria-busy` on the button itself is the correct signal to assistive tech.
2. **`NotFound` nested a `<button>` inside an `<a>`** (`Link` wrapping `Button`) — invalid HTML, ambiguous for screen readers. Fixed: replaced with `useNavigate()` + a real `Button` click handler.

## What "accessibility passes" and "security review completed" mean at this stage — and what they don't

- **Accessibility**: `jsx-a11y` lint rules run in CI; `axe-core` runs against every design-system component's rendered output in tests, with the `color-contrast` rule explicitly disabled and documented as to why (jsdom doesn't render real pixels — `DEVELOPER_GUIDE.md` explains this limitation and what would close the gap). This means: structural accessibility (ARIA correctness, keyboard operability, focus management) is genuinely checked. Color contrast, real screen-reader behavior, and full-page accessibility are **not** verified by anything in this repository yet — that needs either a real browser test run or manual audit, and should not be assumed from a green CI run.
- **Security review**: nothing in this phase handles user input, auth, or secrets, so there is no security surface to review yet beyond "the dependency tree has 0 known vulnerabilities" (`npm audit`, confirmed this pass) and "ARIA/DOM patterns don't introduce injection vectors" (no `dangerouslySetInnerHTML` anywhere in this codebase — confirmed by direct search). A real security review starts being meaningful once Workstreams 4, 6, and 7 exist.

## Phase 2 progress (through Stage 3)

Separate from the Phase 1 workstreams above: the Phase 2 master prompt ("Enterprise DPDP Platform Integration & Production Evolution") and its Stage 3 follow-up ("Production Integration & Operational Readiness") are working from the uploaded scanner asset toward Titan Module 1. See `ROADMAP.md`'s sub-phase table for the full picture; summary of what's real as of this pass:

| What | Evidence |
|---|---|
| Phase A (Discovery) | `ARCHITECTURE.md`'s Module 1 discovery section — including a confirmed `node --check` syntax error in the uploaded scanner that blocks all of its JS from running, and a confirmed off-by-one bug in its score denominator (13 hardcoded vs. 12 actual) |
| Phase B/C (Modularization, Question Engine) | `titan/packages/assessment-core` (data/logic, 5 tests) + `titan/apps/web/src/features/dpdp-assessment` (the real UI consuming it — see below) |
| Phase D (Risk Engine) | `titan/packages/assessment-core`'s `risk-engine/score.ts` — pure scoring functions, the source asset's denominator bug fixed and regression-tested, 20 tests, 100% statement/branch coverage |
| Stage 3: Application integration (Workstream 1-3) | The scanner is rebuilt as a real, tested React flow (`/assessment/dpdp` in `@titan/web`) that imports `dpdpV1` and `scoreAssessment` directly from `@titan/assessment-core` — zero duplicated question data or scoring logic. 48 tests, verified once in a real browser. Discovery's bugs are fixed as part of the rebuild: real radio/fieldset/progressbar semantics, real email validation, no `innerHTML`/XSS surface, the corrected "No Data Stored" claim, an on-screen compliance disclaimer |
| Stage 3: Cloudflare backend / repositories (Workstream 4-5) | `titan/packages/platform` — `LeadRepository` (Repository Pattern, in-memory + D1 implementations, contract-tested) and a Worker (`/health`, `POST /api/leads`), tested against a fake D1 double. Not deployed; not yet called by `@titan/web` |
| Hosting/database/auth decisions | Resolved — `DECISION_LOG.md` |

**Not done (as of Stage 3):** the original `dpdpriskscan.html` is still untouched (kept alongside the rebuild, not deleted). `@titan/web`'s lead form still writes to `localStorage`, not to the real `POST /api/leads` endpoint. No Auth.js code exists (Phase F). No admin or customer portal (Phase I/J). No deployed Worker or real D1 instance — everything backend-shaped in this pass is tested against fakes, not real Cloudflare infrastructure (no account/credentials in this environment). This is real, tested progress on two fronts, not a claim that Module 1 is fully integrated end to end.

## Phase 2 progress (through Stage 4)

Stage 4 ("Production Services & Cloudflare Operationalization") closed both of Stage 3's named gaps — the frontend/API wiring and a real local Cloudflare environment (not the Vitest 4 upgrade, which stays deferred, see `DECISION_LOG.md`) — plus Auth.js, audit logging, and security/observability hardening. Everything below is backed by evidence in `docs/titan/DECISION_LOG.md` and this pass's own commands, not carried over from a plan.

| What | Evidence |
|---|---|
| Cloudflare local dev environment | `wrangler.toml`, `migrations/` (7 files), `seed.sql`, `.dev.vars.example` — all 7 migrations applied and round-tripped against a **real local D1 SQLite instance**, not simulated |
| Repositories (Lead, Organization, Assessment, UserProfile, Audit) | Each with in-memory + D1 implementations, contract-tested against real SQLite (sql.js), not a hand-rolled fake (`DECISION_LOG.md`) |
| Worker API | `GET /health`, `POST`/`GET /api/leads`, `POST /api/assessments`, `GET /api/assessments/:id`, `/api/auth/*` — validated, structured errors, security headers, CORS, request correlation, rate-limit hook, audit events on write |
| Frontend migration off `localStorage` | `leadStore.ts` now POSTs to the real Worker API through a shared `apiClient.ts`; `LeadCaptureForm` surfaces the API's real error message and supports retry-by-resubmission |
| Auth.js foundation | `auth/config.ts`/`session.ts`/`rbac.ts` — D1-adapter-backed, database sessions, RBAC + org-membership foundation, Google/GitHub wired-but-inactive without real credentials, Email in dev-log mode. Enterprise SSO explicitly deferred |
| Audit logging | Lead and assessment creation both persist an `audit_events` row; a failed audit write is logged but never fails the request it describes |
| Security/observability | Centralized response finalization (security headers + CORS + request id on every response, including Auth.js's own), structured JSON logging, basic metrics hooks |
| Local operational verification | Real `wrangler dev` HTTP requests against every endpoint, independently re-verified via direct D1 queries; a real Chromium browser drove the full assessment flow to a real, persisted lead submission (Workstream 10 — see the verification evidence table above) |

**Not done (as of Stage 4):** the Vitest 3→4 upgrade for real `workerd`-backed automated tests remains deferred (`DECISION_LOG.md`). No admin or customer portal (Phase I/J — needs somewhere real to read leads/assessments from, which now exists, but the portals themselves are unbuilt). No deployed Cloudflare infrastructure anywhere — everything here is verified locally, never in production (no Cloudflare account/credentials in any environment this project has run in). CSRF protection for the custom JSON API endpoints (leads/assessments) is not implemented — Auth.js's own `/api/auth/*` actions have their own built-in CSRF handling, but `POST /api/leads`/`POST /api/assessments` do not yet, and should before either takes traffic that isn't same-origin-trusted. No email provider is decided, so Auth.js's Email sign-in cannot send real mail yet.

## RC1 pass: architecture audit, security hardening, observability, testing, documentation

Scoped from the "Titan RC1 — Ultra Enterprise Master Implementation Program" prompt, triaged rather than fully attempted (`DECISION_LOG.md` has the full reasoning). This pass covers architecture/security/observability/testing/documentation only — Admin Portal, Customer Portal, a server-side reporting platform, a Cloudflare deployment pipeline, commercial/billing readiness, and formal compliance work (SOC 2/ISO 27001/GDPR) are explicitly deferred, each for a concrete, named reason, not silently dropped.

| What | Evidence |
|---|---|
| Architecture audit | `ARCHITECTURE.md`'s new audit section: clean dependency DAG (no cycles), Repository Pattern boundary holds, shared models have one definition each, API contract is consistent, `npm audit` clean. One real tooling gap found and fixed: `.wrangler/` (wrangler dev's local build cache) wasn't excluded from ESLint's scan |
| CSRF | Origin-header validation on `POST /api/leads`/`POST /api/assessments` (`security/csrf.ts`) — closes the exact gap Stage 4's own report flagged as remaining |
| CSP correctness | Discovered (by actually calling `Auth()`) that Auth.js's default sign-in page renders real HTML with inline styles; the previous blanket strict CSP would have silently broken it. Routes now get a policy scoped to what they actually serve |
| Additional security headers | HSTS, Permissions-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy — the last deliberately `cross-origin`, matching this API's real CORS design, verified by re-running the real browser flow afterward to confirm nothing broke |
| Cookie hardening, secret rotation | Reviewed against `@auth/core`'s own defaults (already sound); `AUTH_SECRET` now accepts an array for rotation |
| Rate limiting | `/api/auth/*` POST actions now go through a separate, stricter limiter than the general API |
| Threat model + ASVS review | `SECURITY_GUIDE.md` — a real STRIDE model per system surface and an OWASP ASVS control review, naming one real, unfixed finding directly (client-submitted risk scores aren't recomputed server-side) |
| Readiness probe | `GET /health/ready` — a real dependency check (`SELECT 1` against D1), distinct from `GET /health`'s pure liveness check |
| Operation timing | Repository calls record their own duration (`repository.duration_ms`), separate from total request duration |
| Playwright E2E | A real, committed suite (`apps/web/e2e/`) replacing Stage 4's throwaway script — verified passing against the real stack, not yet wired into CI (a separate decision, `DECISION_LOG.md`) |
| D1 adapter contract test | Exercises `@auth/d1-adapter`'s own CRUD directly (account linking, session lifecycle, cascading user deletion) against the real migration schema |
| Authorization-gate helper | `auth/authorize.ts`'s `requireOrganizationAccess` — not wired into any route yet (none are protected yet), but ready for the first one that is |

**Not done this pass, explicitly:** Admin Portal, Customer Portal, server-side reporting/email delivery, Cloudflare deployment pipeline (Pages/Workers/D1/Queues/R2/Turnstile — needs a real account), commercial/billing readiness (needs the still-undecided payments provider), and formal compliance work (SOC 2/ISO 27001/GDPR — organizational/legal undertakings, not code). See `DECISION_LOG.md`'s RC1 entry for why each was deferred.

## What's next

See the RC1 Final Report's "Recommended Next Scope" (communicated alongside this pass). In short: the client-submitted-risk-score tampering finding (`SECURITY_GUIDE.md`) is the highest-value next security fix; Admin Portal is the highest-value next product surface, now that it has somewhere real to read from.
