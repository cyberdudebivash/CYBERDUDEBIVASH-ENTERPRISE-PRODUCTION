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
| `LeadRepository` — Repository Pattern, in-memory + D1 implementations proven interchangeable by a shared contract suite | `@titan/platform` | 10 tests | ✅ Implemented |
| Worker HTTP layer — `GET /health`, `POST /api/leads` with real request validation | `@titan/platform` | 7 tests | ✅ Implemented |
| D1 schema (`leads` table) | `@titan/platform` | N/A (SQL, not applied to a real D1 instance yet — see `ROADMAP.md`'s "What Stage 4 needs") | ✅ Implemented |

## Explicitly not yet features (don't add rows for these until they're real)

Authentication, authorization, real (deployed) database access, CRM, payments, admin portal, customer portal, AI insights, booking, email delivery — all out of scope for this phase (`ROADMAP.md`). The Worker/repository layer above is real and tested against a fake D1 double, not a deployed Worker or real D1 instance, and `@titan/web` does not call it yet — the lead form still writes to `localStorage`. Nothing above should be read as implying progress on anything not explicitly listed.
