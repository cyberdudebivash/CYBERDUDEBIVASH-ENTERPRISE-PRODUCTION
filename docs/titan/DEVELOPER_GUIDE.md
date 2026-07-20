# Developer Guide — Titan

How to work in `titan/`. Assumes you're already set up for the main repository (Node 22 — `titan/.nvmrc` pins the same version).

## Layout

```
titan/
  apps/
    web/                  # @titan/web — the application shell (routing, layout, error handling)
      src/features/dpdp-assessment/  # the public DPDP scan route (/assessment/dpdp) — its own visual system, not @titan/design-system
      src/features/admin/            # the authenticated admin app (/admin, EAP-1) — auth/, layout/, dashboard/, uses @titan/design-system
  packages/
    design-system/        # @titan/design-system — tokens + reusable UI components (for the authenticated app shell only)
    assessment-core/       # @titan/assessment-core — question banks + risk-scoring engine (framework-agnostic)
    platform/               # @titan/platform — Cloudflare Worker, D1 migrations, Repository Pattern, Auth.js foundation
    config/                # @titan/config — shared tsconfig/eslint, not a runtime package
  package.json             # workspace root — npm workspaces, scoped to titan/ only
```

This is a separate npm workspace from the repository root — `titan/` has its own `package.json`, its own `package-lock.json`, its own dependency tree. Running `npm install` at the repo root does not touch `titan/`, and vice versa. This is deliberate (`ARCHITECTURE.md`): the marketing site's build pipeline has five audit stages of hard-won stability behind it, and nothing about Titan should be able to put that at risk.

## Getting started

```bash
cd titan
npm install
npm run dev          # starts @titan/web on Vite's default dev port (5173)
```

That starts the frontend only. To exercise the real backend too, see "Running the Cloudflare backend locally" below — `titan/apps/web`'s DPDP lead capture calls the Worker API for real (Workstream 4), so without it running, lead submission will fail with a network error (by design — this is not silently falling back to `localStorage` anymore).

## Running the Cloudflare backend locally

Everything below is local-only. This project has never had Cloudflare account credentials in any environment — nothing here deploys anywhere, and none of it should be read as implying otherwise. See `docs/titan/OPERATIONAL_RUNBOOK.md` for the full step-by-step, including troubleshooting; this is the short version.

```bash
cd titan/packages/platform
cp .dev.vars.example .dev.vars   # generate a real AUTH_SECRET yourself: openssl rand -base64 32

npm run db:migrations:apply:local   # applies migrations/*.sql against a local D1 SQLite instance
npm run db:seed:local                # applies seed.sql (idempotent — safe to re-run)
npm run dev                          # starts `wrangler dev` on :8787
```

Then, in `titan/apps/web`, create `.env.local` with `VITE_API_BASE_URL=http://localhost:8787` and run `npm run dev` as usual — the frontend (port 5173, the Worker's default `ALLOWED_ORIGIN`) will call the real local Worker.

To reset local state entirely (e.g. after a migration change): delete `titan/packages/platform/.wrangler/` and re-run the two `db:*` commands above. `.wrangler/` and `.dev.vars` are both gitignored — never commit either.

## Everyday commands (from `titan/`)

| Command | What it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` across every package |
| `npm run lint` | ESLint, `--max-warnings=0` — a warning fails CI the same as an error |
| `npm run format` | Prettier `--check` (use `format:write` to auto-fix) |
| `npm run build` | Production build of every package |
| `npm run test` | Full test suite (Vitest) |
| `npm run test:coverage` | Same, with a coverage report |
| `npm run test:watch` (per-package) | Watch mode while developing |

CI (`.github/workflows/titan-ci.yml`) runs typecheck → lint → format → build → test, in that order, only on changes under `titan/**`. It is fully independent of `deploy.yml` — no shared steps, no shared install, no way for a Titan CI failure to block or affect the marketing site's deploy, or vice versa.

## Testing conventions

- **Vitest + Testing Library + jsdom**, not this repo's main convention (`node:test`, used by the marketing site's build scripts). This is intentional, not drift: Titan is a fully separate workspace, and Vitest's jsdom/React integration is meaningfully better suited to component testing than hand-wiring `node:test` for the same purpose would be.
- Query by role/label/text (`screen.getByRole(...)`), the way a real user or assistive-technology user would find the element — not by test IDs or CSS selectors, which don't verify the thing actually being asked for (accessibility).
- Every interactive component gets: a rendering test, an interaction test (click/keyboard, via `@testing-library/user-event`, not `fireEvent` — `user-event` fires the fuller sequence of real browser events), and an `axe-core` structural accessibility check.

### What the `axe-core` checks in this repo do and don't catch

`vitest-axe` runs `axe-core` against jsdom-rendered output. jsdom does not do real layout or paint — there's no real canvas, no real computed visual styles. This means:

- **Caught**: missing/incorrect ARIA attributes, invalid roles, missing accessible names, invalid nesting patterns axe can detect structurally.
- **Not caught**: color contrast (explicitly disabled in every `axe()` call in this codebase, with a comment at each call site — don't remove the disable without understanding why it's there), real focus-order/visibility issues, anything that depends on actual rendering.

Closing that gap for good needs a real browser test runner wired into CI or a recurring manual/automated review — not implemented as a standing part of CI; not implied to be covered by "accessibility passes" in CI. As of RC1, a real Playwright suite now exists (`apps/web/e2e/`) and is verified passing locally — see below — but it isn't wired into `titan-ci.yml` yet, so don't assume every CI run exercises it.

### Running the Playwright E2E suite (`apps/web/e2e/`)

```bash
cd titan/apps/web
npm run test:e2e
```

`playwright.config.ts`'s `webServer` array starts the real backend (migrations + `wrangler dev`, port 8787) and the real frontend (`vite`, port 5173) itself — you don't need either running beforehand, though it'll reuse them if they already are (`reuseExistingServer`). If a run hangs with no output, check for a stale `wrangler dev`/`workerd` process already bound to port 8787 from an earlier manual session (`lsof -i :8787`) and kill it first — a stale server whose `.wrangler/` state has since been deleted is a real way to hang a run silently, not a Playwright bug.

Two specs exist: `dpdp-assessment.spec.ts` (the public assessment flow, RC1) and `admin-dashboard.spec.ts` (the admin app's sign-in-required redirect, a full Platform Administrator flow including real cross-origin sign-out, and a non-admin's honest forbidden messaging — EAP-1). The latter seeds an Auth.js session directly in D1 (`seedSession()`, its own top-of-file comment explains why) rather than driving the Email provider's sign-in UI, to stay fast and focused on what EAP-1 actually changed rather than re-testing Auth.js's own already-verified sign-in mechanics.

Not yet wired into `titan-ci.yml` — see `DECISION_LOG.md`'s RC1 entry for why (a GitHub Actions runner needs its own Playwright browser download; this sandbox's pre-installed Chromium at `/opt/pw-browsers` is environment-specific).

## Design system usage

```tsx
import { Button, Alert, colors, spacing } from "@titan/design-system";

<Button variant="primary" onClick={handleSave} isLoading={isSaving}>
  Save changes
</Button>

<Alert variant="error" title="Couldn't save">
  Check your connection and try again.
</Alert>
```

Component CSS currently hand-mirrors the token values in `src/tokens/` (see the comment at the top of `Button.css`/`Alert.css`) — there's no build-time step that generates CSS custom properties from the TypeScript token modules yet. If you change a token value, update the corresponding CSS by hand and note it in the PR; a token→CSS pipeline is a reasonable improvement, not built here to keep this phase's scope honest about what's actually automated versus manually kept in sync.

## Assessment engine usage

```ts
import { dpdpV1, scoreAssessment, type Answers } from "@titan/assessment-core";

const answers: Answers = { has_dpo: false, consent_mechanism: true /* ... */ };
const result = scoreAssessment(dpdpV1.questions, answers);
// result.score (0-100), result.riskLevel ("low"|"medium"|"high"|"critical"),
// result.breakdown (counts per level), result.gaps (failed questions with penalty/section)
```

`titan/apps/web/src/features/dpdp-assessment/DpdpAssessmentPage.tsx` is the real consumer — it imports `dpdpV1`/`scoreAssessment` directly, holds no question data or scoring logic of its own. `scoreAssessment` always derives its denominator from the question bank (`getScoredQuestions`) rather than a hardcoded count — don't reintroduce a hardcoded count anywhere that consumes this; that's the exact bug Phase 2's Discovery pass (`ARCHITECTURE.md`) found in the original scanner, and the reason this module exists as tested code instead of inline `<script>`. Adding a second framework (ISO/SOC/etc., per `PRODUCT_VISION.md`'s "DPDP is the first module, not the whole product") means adding a new file next to `questions/dpdp-v1.ts`, not changing anything in `risk-engine/` — the engine takes a `Question[]` and doesn't know what framework it's scoring.

## Repository Pattern usage (`@titan/platform`)

```ts
import { createInMemoryLeadRepository, createD1LeadRepository } from "@titan/platform";

// Anything that needs leads depends on the LeadRepository interface, never a
// concrete store:
async function handle(leads: import("@titan/platform").LeadRepository) {
  const saved = await leads.save({ name, email, company, answers, result, timestamp, source });
  const all = await leads.list();
}
```

Five repositories exist now (`Lead`, `Organization`, `Assessment`, `UserProfile`, `Audit`), each following the same shape: `*Record`/`New*` types + a `*Repository` interface in `repositories/types.ts`, an in-memory implementation, a D1 implementation, one shared contract test suite (`*.contract.ts`) run against both. When adding a sixth (e.g. `ReportRepository` — the `reports` table already exists, migrations/0006), follow that same pattern rather than writing ad hoc tests per implementation that could silently drift apart.

D1 implementations are tested against real SQLite (`repositories/testUtils/testD1.ts`, backed by `sql.js` — SQLite compiled to WASM — running this package's actual `migrations/*.sql`), not a hand-written fake. This is real SQL parsing/constraints/joins, not string matching, but it is still not `workerd`/real D1 itself — `@cloudflare/vitest-pool-workers` is the right tool for that remaining gap, but needs Vitest 4; this workspace is on Vitest 3 everywhere else (`DECISION_LOG.md` has the reasoning for not bumping that silently). Local `wrangler dev` verification (see above) covers real Workers-runtime behavior manually in the meantime.

## Auth.js usage (`@titan/platform`)

```ts
import { createAuthConfig, getSession, hasAtLeastRole } from "@titan/platform";

const authConfig = createAuthConfig({ db: env.DB, secret: env.AUTH_SECRET });
// Mount this in a Worker: any request to /api/auth/* is handled by Auth.js
// directly once `authConfig` is passed through Dependencies.authConfig
// (router.ts). getSession(request, authConfig) reads the current session;
// hasAtLeastRole/findProfileForOrganization/canAccessOrganization/
// isPlatformAdministrator (auth/rbac.ts) check a UserProfileRecord[] once you
// have one — router.ts's resolveCaller is the reference pattern for turning a
// session into that UserProfileRecord[] (getSession + userProfiles.findByUserId).
```

Google/GitHub only appear in the provider list when real credentials are configured (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`/`AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` in `.dev.vars`) — this project has never had either. The Email provider works today in a dev-mode configuration that logs the sign-in link instead of emailing it (no email provider decided yet — `DECISION_LOG.md`).

## Admin Application usage (`@titan/web`'s `/admin`, EAP-1)

```tsx
// App.tsx's real route tree for everything under /admin:
<Route
  path="/admin"
  element={
    <SessionProvider>
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    </SessionProvider>
  }
>
  <Route index element={<DashboardPage />} />
  {/* a future module's route nests here, e.g.: */}
  {/* <Route path="leads" element={<LeadsPage />} /> */}
</Route>
```

`AdminLayout` documents (and its own tests enforce) that it assumes a `RequireAuth` ancestor — it reads `useSession()` expecting an already-resolved, authenticated session rather than re-deriving loading/redirect logic itself. A new module page goes inside this same `<Route path="/admin">` tree, as a route nested under `AdminLayout`'s `<Outlet/>`, and gets the header/sidebar/breadcrumbs/session context for free.

**Adding a nav entry for a new module:** `features/admin/layout/navItems.ts`'s `adminNavItems(me: MeResponse): SidebarItem[]` is the one place this is decided — add a conditional entry there (e.g. gated on `me.isPlatformAdministrator` if the module should be), not a per-page decision.

**Fetching data for a new module:** follow `features/admin/dashboard/useDashboardData.ts`'s pattern — a `SectionState<T> = loading | ready | forbidden | error` per independent section, a 403 from `ApiError` mapped to `"forbidden"` (never rendered as a generic error or a fabricated empty state), gated sections skipped client-side entirely for a caller that `GET /me` already says can't read them.

```ts
import { fetchMe, type MeResponse } from "../auth/session.js";
import { useSession } from "../auth/SessionContext.js";
// useSession() gives you `{ status: "authenticated", me }` once RequireAuth
// has already confirmed a session exists — a new module component reads
// `me.isPlatformAdministrator` from there, exactly as DashboardPage.tsx does,
// rather than calling fetchMe() again itself.
```

## Adding a new component to the design system

1. `packages/design-system/src/components/YourComponent.tsx` + co-located `.css` + `.test.tsx`.
2. Export it from `packages/design-system/src/index.ts`.
3. Tests: rendering, every interactive behavior, an `axe()` check with `color-contrast` disabled (see existing components for the pattern).
4. `npm run ci`-equivalent locally (`typecheck && lint && format && build && test`) before opening a PR — matches exactly what `titan-ci.yml` will run.

## What NOT to do (things this stage deliberately doesn't have yet)

- Protected routes/session context/sign-in-and-out are now real (`features/admin/auth/`, EAP-1) — don't build a second, parallel version of any of it for a new module. A new admin page nests under the existing `/admin` route tree (`AdminLayout`'s `<Outlet/>`) and reads `useSession()`/`GET /api/me` the way `DashboardPage.tsx` does, rather than re-resolving "who's signed in" itself. Don't build a custom login/sign-out form either — `RequireAuth`/`Header`'s sign-out link deliberately link to Auth.js's own hosted pages instead (`ARCHITECTURE.md`'s "Admin Application architecture" section has the reasoning).
- Don't build Lead Management, Assessment Management, Organization Management, User Management, an Audit Center, or an Operations Center as full modules without a real go-ahead for that EAP phase — Phase 1 (EAP-1) deliberately built only the shell and one module (Dashboard); the rest are sequenced, not forgotten (`ROADMAP.md`'s EAP-1 section).
- Don't widen `ALLOWED_ORIGIN`/the Auth.js `redirect` callback allowlist/the CSP `form-action` allowlist (`auth/config.ts`, `http/finalizeResponse.ts`) to more than one real, known frontend origin, and don't switch any of them to a wildcard for convenience — each is a deliberately closed allowlist of exactly the origins this project actually controls (`SECURITY_GUIDE.md`'s "Authorization model"), and widening any one without the other two changes the security properties silently.
- Don't bump this workspace's Vitest 3 → 4 as a side effect of some other task, even though `@cloudflare/vitest-pool-workers` wants it — that's a deliberate, workspace-wide decision on its own, not a dependency bump to absorb quietly (`DECISION_LOG.md`). sql.js-backed repository tests close most of the practical gap in the meantime.
- Don't add a Credentials (username/password) auth provider — only Email/Google/GitHub were asked for (Stage 4's own scope); a fourth provider nobody requested is exactly the kind of unrequested parallel implementation this program's rules warn against (`DECISION_LOG.md`).
- Don't add real email sending to the Auth.js Email provider without an actual email-provider decision first (`ARCHITECTURE.md`'s "still open" list) — the dev-mode logger is a deliberate placeholder, not an oversight to "fix" unilaterally.
- Don't add a route that lets a caller grant themselves (or anyone) the Platform Administrator role — that would be a privilege-escalation vulnerability, not a convenience feature. Provisioning is a direct D1 insert on purpose (`OPERATIONAL_RUNBOOK.md`, `SECURITY_GUIDE.md`).
- Don't reach for the main repository's `node:test`/`tsx` conventions inside `titan/` — this workspace has its own toolchain, documented above.
