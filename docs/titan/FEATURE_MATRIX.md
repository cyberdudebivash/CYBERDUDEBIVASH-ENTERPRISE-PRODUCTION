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

## Explicitly not yet features (don't add rows for these until they're real)

Authentication, authorization, any database-backed data, any API, CRM, payments, admin portal, customer portal, AI insights, PDF generation, booking, email — all out of scope for this phase (`ROADMAP.md`). The assessment engine above is real, tested logic with no UI consumer yet — nothing in `@titan/web` renders a questionnaire; wiring one up is separate, not-yet-done work. Nothing above should be read as implying progress on anything not explicitly listed.
