# Platform Foundation — Status

Describes what's actually implemented under `titan/` as of this pass. Nothing below is aspirational — every claim has a passing check behind it, verified fresh, not carried over from a plan. See `ROADMAP.md` for what comes next and why it's sequenced this way.

## What exists

| Workstream (from the Phase 1 brief) | Status | Evidence |
|---|---|---|
| 1. Repository foundation | ✅ Done | `titan/` monorepo, npm workspaces (`apps/*`, `packages/*`), fully isolated from the existing marketing site's build — confirmed by rebuilding the site after adding `titan/` and re-checking `verify-dist` (still 7/7) |
| 2. Design system | ⚠️ **Started, not complete** | Tokens (color/spacing/typography) + 2 components (`Button`, `Alert`), real and tested — not the full 15-category list the brief specifies (Forms, Cards, Tables, Badges, Modals, Dialogs, Navigation, Loading/Empty/Error states are not built yet). Scoped down deliberately rather than build 15 shallow, undertested components — see `DEVELOPER_GUIDE.md` |
| 3. Application shell | ⚠️ **Started, not complete** | Layout, Header, Sidebar (data-driven, not hardcoded), Footer, routing, 404, global error boundary, skip link — all real, tested. Breadcrumbs, toast/notification system, and loading skeletons are not built yet (nothing yet needs them — no multi-step flows or async data loading exist in this phase) |
| 4. Authentication foundation | ⛔ **Not started** | Blocked on the auth-approach decision (`ARCHITECTURE.md` open decision #4) |
| 5. Authorization (RBAC) | ⛔ **Not started** | Depends on #4 |
| 6. Database foundation | ⛔ **Not started** | Blocked on hosting-target and database-engine decisions (`ARCHITECTURE.md` open decisions #2) — no database exists, no schema, no migrations |
| 7. API foundation | ⛔ **Not started** | Depends on #6 (and, for auth middleware, #4) |
| 8. Observability | ⛔ **Not started** | No backend exists yet to instrument. Nothing to health-check. |
| 9. Security | ⚠️ **Partial** | Frontend-applicable pieces only: input validation isn't relevant yet (no forms that submit anywhere), but the ESLint `jsx-a11y` ruleset and ARIA-correct component patterns (see `Button`/`Alert`) are enforced from day one. Headers, CSRF, rate limiting, secrets management all require a real backend, which doesn't exist yet |
| 10. Testing | ⚠️ **Partial** | Unit + component testing: real, working (Vitest + Testing Library + jsdom), 28/28 tests passing. Integration, API, and E2E testing frameworks aren't set up — there's no API or multi-page flow yet to test against |
| 11. Developer experience | ✅ Done | ESLint (flat config, type-aware, `jsx-a11y` + `react-hooks` rulesets), Prettier, strict TypeScript, `.nvmrc`, workspace-wide scripts (`lint`, `format`, `typecheck`, `test`, `build`) |
| 12. Documentation | ✅ This pass | This document + `DEVELOPER_GUIDE.md` |

## Fresh verification evidence (this pass)

| Check | Result |
|---|---|
| `npm run typecheck` (both packages) | ✅ Clean |
| `npm run lint` (`--max-warnings=0`) | ✅ Clean |
| `npm run format` (Prettier `--check`) | ✅ Clean |
| `npm run build` (both packages) | ✅ Clean — `@titan/web` 439KB JS / 132KB gzip, `@titan/design-system` 13.6KB JS / 4.4KB gzip |
| `npm run test` | ✅ **28/28 passing** (11 in `@titan/web`, 17 in `@titan/design-system`) |
| `npm run test:coverage` | ✅ Runs; `@titan/web` 94% statement coverage on components, `@titan/design-system` 94% on components (token modules show 0% since they're plain data exports with no branching logic to exercise) |
| Existing marketing site build, re-run after adding `titan/` | ✅ Unaffected — `verify-dist` still 7/7, zero files outside `titan/` and one new CI workflow touched |

## Two real bugs this pass's own tests caught (worth recording, not hiding)

1. **`Button`'s loading state changed its accessible name.** The spinner's `aria-label="Loading"` merged into the button's computed accessible name ("Loading Submit" instead of "Submit"), caught by the component's own test suite before this was ever used anywhere. Fixed: the spinner is now `aria-hidden`, and `aria-busy` on the button itself is the correct signal to assistive tech.
2. **`NotFound` nested a `<button>` inside an `<a>`** (`Link` wrapping `Button`) — invalid HTML, ambiguous for screen readers. Fixed: replaced with `useNavigate()` + a real `Button` click handler.

## What "accessibility passes" and "security review completed" mean at this stage — and what they don't

- **Accessibility**: `jsx-a11y` lint rules run in CI; `axe-core` runs against every design-system component's rendered output in tests, with the `color-contrast` rule explicitly disabled and documented as to why (jsdom doesn't render real pixels — `DEVELOPER_GUIDE.md` explains this limitation and what would close the gap). This means: structural accessibility (ARIA correctness, keyboard operability, focus management) is genuinely checked. Color contrast, real screen-reader behavior, and full-page accessibility are **not** verified by anything in this repository yet — that needs either a real browser test run or manual audit, and should not be assumed from a green CI run.
- **Security review**: nothing in this phase handles user input, auth, or secrets, so there is no security surface to review yet beyond "the dependency tree has 0 known vulnerabilities" (`npm audit`, confirmed this pass) and "ARIA/DOM patterns don't introduce injection vectors" (no `dangerouslySetInnerHTML` anywhere in this codebase — confirmed by direct search). A real security review starts being meaningful once Workstreams 4, 6, and 7 exist.

## What's next

Blocked on the same open decisions as before (`ARCHITECTURE.md`): hosting/runtime target, database engine, auth approach. `ROADMAP.md`'s Phase 0/1 sequencing is unchanged by this pass — this document records that the shell/tooling/design-system slice of "Foundation" is real and passing, not that the phase is complete.
