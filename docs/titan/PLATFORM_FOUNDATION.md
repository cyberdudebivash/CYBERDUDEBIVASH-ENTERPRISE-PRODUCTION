# Platform Foundation — Status

Describes what's actually implemented under `titan/` as of this pass. Nothing below is aspirational — every claim has a passing check behind it, verified fresh, not carried over from a plan. See `ROADMAP.md` for what comes next and why it's sequenced this way.

## What exists

| Workstream (from the Phase 1 brief) | Status | Evidence |
|---|---|---|
| 1. Repository foundation | ✅ Done | `titan/` monorepo, npm workspaces (`apps/*`, `packages/*`), fully isolated from the existing marketing site's build — confirmed by rebuilding the site after adding `titan/` and re-checking `verify-dist` (still 7/7) |
| 2. Design system | ⚠️ **Started, not complete** | Tokens (color/spacing/typography) + 2 components (`Button`, `Alert`), real and tested — not the full 15-category list the brief specifies (Forms, Cards, Tables, Badges, Modals, Dialogs, Navigation, Loading/Empty/Error states are not built yet). Scoped down deliberately rather than build 15 shallow, undertested components — see `DEVELOPER_GUIDE.md` |
| 3. Application shell | ⚠️ **Started, not complete** | Layout, Header, Sidebar (data-driven, not hardcoded), Footer, routing, 404, global error boundary, skip link — all real, tested. Breadcrumbs, toast/notification system, and loading skeletons are not built yet (nothing yet needs them — no multi-step flows or async data loading exist in this phase) |
| 4. Authentication foundation | ⛔ **Not started** | Approach now decided — self-hosted Auth.js behind an abstraction layer (`DECISION_LOG.md`) — but nothing is built: no login, no session handling, no abstraction layer code exists yet |
| 5. Authorization (RBAC) | ⛔ **Not started** | Depends on #4 |
| 6. Database foundation | ⚠️ **Started, not complete** | `titan/packages/platform`: D1 schema (`db/schema.sql`, the `leads` table) and a Repository Pattern (`LeadRepository`, in-memory + D1 implementations, proven interchangeable by a shared contract test suite) exist and are tested — against a fake D1 double, not a real D1 instance (no Cloudflare account/credentials in this environment; nothing deployed; `ROADMAP.md`'s "What Stage 4 needs") |
| 7. API foundation | ⚠️ **Started, not complete** | `titan/packages/platform`'s Worker: `GET /health`, `POST /api/leads` with real request validation, tested. Not deployed, and `@titan/web` doesn't call it yet (`leadStore.ts` is still `localStorage`-only) — auth middleware still depends on #4, which is unstarted |
| 8. Observability | ⛔ **Not started** | No backend exists yet to instrument. Nothing to health-check. |
| 9. Security | ⚠️ **Partial** | Frontend-applicable pieces only: input validation isn't relevant yet (no forms that submit anywhere), but the ESLint `jsx-a11y` ruleset and ARIA-correct component patterns (see `Button`/`Alert`) are enforced from day one. Headers, CSRF, rate limiting, secrets management all require a real backend, which doesn't exist yet |
| 10. Testing | ⚠️ **Partial** | Unit + component testing: real, working (Vitest + Testing Library + jsdom), 119/119 tests passing across 4 packages. Integration-shaped tests now exist too — a full multi-step-flow test (`DpdpAssessmentPage.test.tsx`) and HTTP-level Worker tests (`@titan/platform`) — but there's no standing E2E framework in CI (one golden-path browser check ran manually this pass, not committed as a repeatable suite), and nothing tests against a real, deployed API or database yet |
| 11. Developer experience | ✅ Done | ESLint (flat config, type-aware, `jsx-a11y` + `react-hooks` rulesets), Prettier, strict TypeScript, `.nvmrc`, workspace-wide scripts (`lint`, `format`, `typecheck`, `test`, `build`) |
| 12. Documentation | ✅ This pass | This document + `DEVELOPER_GUIDE.md` |

## Fresh verification evidence (this pass)

| Check | Result |
|---|---|
| `npm run typecheck` (all four packages) | ✅ Clean |
| `npm run lint` (`--max-warnings=0`) | ✅ Clean |
| `npm run format` (Prettier `--check`) | ✅ Clean |
| `npm run build` (all four packages) | ✅ Clean — `@titan/web` 488KB main JS / 141KB gzip (jsPDF, 391KB/129KB gzip, is a separate lazy-loaded chunk, confirmed not in the main bundle), `@titan/assessment-core` 6.4KB / 2.2KB gzip, `@titan/design-system` 13.6KB JS / 4.4KB gzip, `@titan/platform` 2.6KB / 1.0KB gzip |
| `npm run test` | ✅ **119/119 passing** (60 in `@titan/web`, 25 in `@titan/assessment-core`, 17 in `@titan/design-system`, 17 in `@titan/platform`) |
| `npm run test:coverage` | ✅ Runs; `@titan/web` 94% statement coverage on components, `@titan/assessment-core` 100% on the question bank and risk engine, `@titan/design-system` 94% on components (token modules 0%, plain data), `@titan/platform`'s repository/router logic covered via its contract + router/worker tests |
| Golden-path browser check (Playwright + the pre-installed Chromium, not committed as a permanent test) | ✅ Full flow (landing → 15 questions → results → lead submit → real PDF download) works in a real browser; confirmed jsPDF isn't requested until the lead form is actually submitted; the only console errors are Google Fonts failing to load, specific to this sandbox's restricted network egress, not a code defect |
| Existing marketing site build, re-run after adding `titan/` | ✅ Unaffected — `verify-dist` still 7/7, zero files outside `titan/` and one new CI workflow touched (last confirmed when `titan/` was first added; unaffected again this pass since nothing outside `titan/` changed) |

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

**Not done:** the original `dpdpriskscan.html` is still untouched (kept alongside the rebuild, not deleted). `@titan/web`'s lead form still writes to `localStorage`, not to the real `POST /api/leads` endpoint. No Auth.js code exists (Phase F). No admin or customer portal (Phase I/J). No deployed Worker or real D1 instance — everything backend-shaped in this pass is tested against fakes, not real Cloudflare infrastructure (no account/credentials in this environment). This is real, tested progress on two fronts, not a claim that Module 1 is fully integrated end to end.

## What's next

`ROADMAP.md`'s "What Stage 4 needs" has the full detail. In short: wire `@titan/web` to actually call the API instead of `localStorage`, and decide whether to upgrade this workspace's Vitest 3 → 4 so `titan/packages/platform` can be tested against real Workers runtime (`@cloudflare/vitest-pool-workers`) instead of a hand-written fake D1.
