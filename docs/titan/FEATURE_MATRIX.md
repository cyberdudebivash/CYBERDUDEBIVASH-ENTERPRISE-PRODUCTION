# Feature Matrix

Every implemented feature under `titan/`, as of this pass. A row only appears here once it's real — built, tested, and passing — not when it's planned. Update in place as features are added; don't let this drift from `PLATFORM_FOUNDATION.md`'s status table.

| Feature | Package | Tests | Status |
|---|---|---|---|
| Design tokens (color, spacing, typography) | `@titan/design-system` | N/A (data only, no logic to test) | ✅ Implemented |
| `Button` (variants, sizes, loading state, disabled state) | `@titan/design-system` | 9 tests, incl. axe a11y check | ✅ Implemented |
| `Alert` (4 semantic variants, dismissible, correct live-region roles) | `@titan/design-system` | 8 tests, incl. axe a11y check | ✅ Implemented |
| App shell layout (header/sidebar/content/footer) | `@titan/web` | Covered via `App.test.tsx` integration tests | ✅ Implemented |
| Skip-to-content link | `@titan/web` | Tested (`App.test.tsx`) | ✅ Implemented |
| Client-side routing | `@titan/web` | Tested (`App.test.tsx`) | ✅ Implemented |
| Sidebar navigation (data-driven) | `@titan/web` | 3 tests | ✅ Implemented |
| 404 / not-found page | `@titan/web` | Covered via `App.test.tsx` | ✅ Implemented |
| Global error boundary | `@titan/web` | 3 tests | ✅ Implemented |
| DPDP v1 question bank — 15 questions, data-driven, typed, versioned | `@titan/assessment-core` | 5 tests | ✅ Implemented |
| Risk-scoring engine — score calculation, risk-level banding, gap breakdown | `@titan/assessment-core` | 20 tests, 100% statement/branch coverage | ✅ Implemented |
| DPDP assessment flow — landing, 15-question flow (real radio/fieldset/progressbar semantics, `<main>` landmark), results, risk meter, upsell tiers, client-side PDF report (lazy-loaded), lead capture (real Worker API submission, real email validation) | `@titan/web` (`features/dpdp-assessment`) | 51 tests across 8 files, incl. axe a11y checks on every component and one full golden-path integration test; verified end-to-end in a real Chromium browser (jsdom + a committed Playwright E2E suite); WCAG AA-verified via a real Lighthouse audit (100/100 accessibility, ERP-1 — jsdom+axe alone missed two real defects this closed, `PLATFORM_FOUNDATION.md`) | ✅ Implemented |
| `LeadRepository` — Repository Pattern, in-memory + D1 implementations, contract-tested against real SQLite (sql.js) | `@titan/platform` | 14 tests | ✅ Implemented |
| `OrganizationRepository` — save/findBySlug/list, in-memory + D1 | `@titan/platform` | 10 tests | ✅ Implemented |
| `AssessmentRepository` — save/findById/list, in-memory + D1 | `@titan/platform` | 12 tests | ✅ Implemented |
| `UserProfileRepository` — RBAC/org-membership persistence, in-memory + D1 | `@titan/platform` | 10 tests | ✅ Implemented |
| `AuditRepository` — append-only audit event persistence, in-memory + D1 | `@titan/platform` | 10 tests | ✅ Implemented |
| D1 migrations (Auth.js core, organizations, user_profiles, assessments, leads, reports, audit_events — 7 files) | `@titan/platform` | Applied and round-tripped against a **real local D1 SQLite instance** (`wrangler d1 migrations apply --local`) | ✅ Implemented & verified |
| Worker HTTP layer — `GET /health`, `GET /health/ready`, `POST`/`GET /api/leads`, `POST /api/assessments`, `GET /api/assessments/:id` — validation, structured errors, security headers (incl. route-scoped CSP), CORS, CSRF (Origin validation), request correlation, rate-limit hooks (general + auth-specific) | `@titan/platform` | 31 tests (router) + 4 (worker, against real SQLite) | ✅ Implemented & verified against real local D1 via `wrangler dev` |
| Auth.js foundation — D1-adapter session persistence, `/api/auth/*` mounted, provider abstraction (Email dev-mode, Google/GitHub wired-but-inactive without credentials), secret rotation | `@titan/platform` | 6 (config) + 2 (session) + 5 (D1 adapter contract) tests | ✅ Implemented & verified against real local D1 via `wrangler dev` |
| RBAC + organization-membership foundation, authorization-gate helper | `@titan/platform` | 6 (rbac) + 4 (authorize) tests | ✅ Implemented (not yet wired into a route — none are protected yet) |
| Audit event recording on lead/assessment creation | `@titan/platform` | Covered in router tests | ✅ Implemented & verified against real D1 |
| Structured logging, request correlation, basic metrics hooks (request counts/durations + per-operation repository timing) | `@titan/platform` | Covered in router tests | ✅ Implemented |
| DPDP lead capture — real Worker API submission (no `localStorage`), server error messages surfaced, retry-by-resubmission | `@titan/web` | 7 (LeadCaptureForm) + 14 (leadStore) tests | ✅ Implemented & verified in a real browser against the real Worker |
| Playwright E2E suite — real backend + frontend, full assessment flow to a real, asserted lead submission | `@titan/web` (`e2e/`) | 1 spec, verified passing (18.3s) | ✅ Implemented & verified — not yet wired into CI (`DECISION_LOG.md`) |
| Threat model + OWASP ASVS control review | `docs/titan/SECURITY_GUIDE.md` | N/A (documentation) | ✅ Implemented |

## Explicitly not yet features (don't add rows for these until they're real)

Admin portal, customer portal, AI insights, booking, payments, real (deployed) Cloudflare infrastructure, email delivery (Auth.js's Email provider logs instead of sending), enterprise SSO, server-side recomputation of client-submitted risk scores (`SECURITY_GUIDE.md`'s tampering finding) — all out of scope for this stage or explicitly deferred (`ROADMAP.md`, `DECISION_LOG.md`). Nothing above should be read as implying progress on anything not explicitly listed.

**Not a feature, an open defect:** `GET /api/leads` has no authentication check (ERP-1 — HIGH, `SECURITY_GUIDE.md`). It is listed under the Worker HTTP layer row above as implemented-and-verified because the *route* works correctly against real D1 — that row is not a claim that the route is safe to expose without an authorization gate in front of it.
