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
| DPDP assessment flow — landing, 15-question flow (real radio/fieldset/progressbar semantics), results, risk meter, upsell tiers, client-side PDF report (lazy-loaded), lead capture (`localStorage`-backed, real email validation, not yet wired to a real API) | `@titan/web` (`features/dpdp-assessment`) | 48 tests across 8 files, incl. axe a11y checks on every component and one full golden-path integration test; verified once end-to-end in a real Chromium browser (not just jsdom) | ✅ Implemented |
| `LeadRepository` — Repository Pattern, in-memory + D1 implementations, contract-tested against real SQLite (sql.js) | `@titan/platform` | 14 tests | ✅ Implemented |
| `OrganizationRepository` — save/findBySlug/list, in-memory + D1 | `@titan/platform` | 10 tests | ✅ Implemented |
| `AssessmentRepository` — save/findById/list, in-memory + D1 | `@titan/platform` | 12 tests | ✅ Implemented |
| `UserProfileRepository` — RBAC/org-membership persistence, in-memory + D1 | `@titan/platform` | 10 tests | ✅ Implemented |
| `AuditRepository` — append-only audit event persistence, in-memory + D1 | `@titan/platform` | 10 tests | ✅ Implemented |
| D1 migrations (Auth.js core, organizations, user_profiles, assessments, leads, reports, audit_events — 7 files) | `@titan/platform` | Applied and round-tripped against a **real local D1 SQLite instance** (`wrangler d1 migrations apply --local`) | ✅ Implemented & verified |
| Worker HTTP layer — `GET /health`, `POST`/`GET /api/leads`, `POST /api/assessments`, `GET /api/assessments/:id` — validation, structured errors, security headers, CORS, request correlation, rate-limit hook | `@titan/platform` | 18 tests (router) + 3 (worker, against real SQLite) | ✅ Implemented & verified against real local D1 via `wrangler dev` |
| Auth.js foundation — D1-adapter session persistence, `/api/auth/*` mounted, provider abstraction (Email dev-mode, Google/GitHub wired-but-inactive without credentials) | `@titan/platform` | 5 (config) + 2 (session) tests | ✅ Implemented & verified against real local D1 via `wrangler dev` |
| RBAC + organization-membership foundation | `@titan/platform` | 6 tests | ✅ Implemented |
| Audit event recording on lead/assessment creation | `@titan/platform` | Covered in router tests | ✅ Implemented & verified against real D1 |
| Structured logging, request correlation, basic metrics hooks | `@titan/platform` | Covered in router tests | ✅ Implemented |
| DPDP lead capture — real Worker API submission (no `localStorage`), server error messages surfaced, retry-by-resubmission | `@titan/web` | 7 (LeadCaptureForm) + 14 (leadStore) tests | ✅ Implemented & verified in a real browser against the real Worker |

## Explicitly not yet features (don't add rows for these until they're real)

Admin portal, customer portal, AI insights, booking, payments, real (deployed) Cloudflare infrastructure, email delivery (Auth.js's Email provider logs instead of sending), enterprise SSO, CSRF protection on the custom JSON endpoints — all out of scope for this stage or explicitly deferred (`ROADMAP.md`, `DECISION_LOG.md`). Nothing above should be read as implying progress on anything not explicitly listed.
