# Developer Guide — Titan

How to work in `titan/`. Assumes you're already set up for the main repository (Node 22 — `titan/.nvmrc` pins the same version).

## Layout

```
titan/
  apps/
    web/                  # @titan/web — the application shell (routing, layout, error handling)
      src/features/dpdp-assessment/  # the public DPDP scan route (/assessment/dpdp) — its own visual system, not @titan/design-system
      src/features/admin/            # the authenticated admin app (/admin, EAP-1) — auth/, layout/, dashboard/, leads/ (EAP-2), assessments/ (EAP-3), organizations/ (EAP-4), users/ (EAP-5), audit/ (EAP-6), operations/ (EAP-7), reporting/ (EAP-8), commercial/ (COM-1), uses @titan/design-system
      src/features/portal/            # the authenticated Customer Portal (/portal, CPP-1) — a separate sibling shell to /admin, not nested under it — layout/, dashboard/, assessments/, reports/, account/, support/, subscription/ (COM-1), reuses @titan/design-system and several admin/ modules directly (fetchAssessment, AssessmentResultsPanel, RiskBadge, auditActionLabel)
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

Eleven specs exist (this list previously drifted out of sync with the codebase — it stopped being updated after EAP-5 even though the "Not yet wired into CI" discussion below it kept mentioning newer specs by name; corrected here to list all eleven): `dpdp-assessment.spec.ts` (the public assessment flow, RC1), `admin-dashboard.spec.ts` (the admin app's sign-in-required redirect, a full Platform Administrator flow including real cross-origin sign-out, and a non-admin's honest forbidden messaging — EAP-1), `lead-workspace.spec.ts` (real search/filter/pagination against real seeded D1 leads, navigation into Lead Details, and a lifecycle update that persists across a real page reload — EAP-2), `assessment-center.spec.ts` (real search/filter/pagination against real seeded D1 assessments, navigation into Assessment Details, and real Findings/Category coverage/Question responses/audit history/lead linkage — EAP-3), `organization-workspace.spec.ts` (real organization creation through the Workspace's own form, real search, navigation into Organization Details, and real Health/Relationships/Administration(archive)/audit history — EAP-4), `user-management.spec.ts` (real user search, navigation into User Details, and a real grant→change→revoke round trip through Role Assignment — EAP-5), `audit-center.spec.ts` (real seeded-event search via the entity-type filter, Audit Details, Investigation View grouping, and a real CSV file download verified by its actual downloaded content — EAP-6), `operations-center.spec.ts` (unauthenticated redirect, non-admin honest-forbidden messaging with role-agnostic health still visible, and a Platform Administrator view whose Runtime Metrics table reflects a real prior request this same test sent through the running Worker — EAP-7), `reporting-center.spec.ts` (unauthenticated redirect, non-admin honest-forbidden messaging, and a Platform Administrator view whose Executive Dashboard/Business Reports/Analytics all reflect a real, freshly seeded lead, plus a real downloaded-CSV-content assertion — EAP-8), `customer-portal.spec.ts` (unauthenticated redirect to the real sign-in page, an honest "no organization membership" message with the nav hidden entirely for a profile-less caller, a real organization member's Dashboard/Assessments/Reports — including a real CSV download — all reflecting only their own organization's data, the core cross-tenant-isolation proof (navigating directly to another organization's assessment by id never returns its data), and a real support-request submit-and-view-history flow — CPP-1), and `commercial-platform.spec.ts` (a real organization member starting a self-service trial subscription through the Portal's own Plan Selection UI, then upgrading it — both persisting across a real page reload — and a Platform Administrator's Commercial Workspace search landing on the same real subscription's Detail page with an admin-only plan reassignment that reflects immediately — COM-1). The latter ten seed an Auth.js session directly in D1 (`seedSession()`, its own top-of-file comment explains why) rather than driving the Email provider's sign-in UI, to stay fast and focused on what each phase actually changed rather than re-testing Auth.js's own already-verified sign-in mechanics.

`lead-workspace.spec.ts`'s own top comment documents two real findings its own real-browser verification caught that no unit/jsdom test could have: a CORS `Access-Control-Allow-Methods` gap that silently broke every real `PATCH /api/leads/:id` call (`SECURITY_GUIDE.md`'s Surface 2 table has the full finding), and a React 19 `StrictMode` double-invocation race in `useLeadDetail.ts`'s data-fetching effect. `assessment-center.spec.ts` found a real, pre-existing bug in `LeadWorkspacePage.tsx` (an invalid `sortBy=risk` sort-column id) while building its own analogous flow, and recorded — rather than "fixed" — a real, dev-mode-only React `<StrictMode>` characteristic (two `assessment.viewed` audit events per real page view in this environment specifically; see the spec's own inline comment and `DECISION_LOG.md`'s EAP-3 entry for why that's not a defect). `organization-workspace.spec.ts` found a real, pre-existing bug in `leadApi.ts`'s `searchLeads` (silently dropped the `assessmentId`/`organizationId` query params it claimed to accept) while wiring its own analogous call, and hit — then fixed in the test itself, not the app — an ambiguous `getByText("Critical")` match against the Health panel's own lowercase risk-distribution label (`DECISION_LOG.md`'s EAP-4 entry has the full reasoning for both). `user-management.spec.ts` proactively verifies this codebase's first-ever real `DELETE` request (Role Assignment's revoke action) actually works in a real browser, learning directly from `lead-workspace.spec.ts`'s own CORS finding rather than waiting to find the same class of bug after shipping — and, while diagnosing this spec, found and fixed a real *environmental* gap: this container had never had `packages/platform/.dev.vars` provisioned, so every authenticated scenario in *every* spec silently resolved as anonymous until `AUTH_SECRET` was set following `OPERATIONAL_RUNBOOK.md`'s own already-documented setup step (`DECISION_LOG.md`'s EAP-5 entry has the full root-cause account). `audit-center.spec.ts` found a third real CORS gap in the same family: `Access-Control-Expose-Headers` was never set at all, so a real cross-origin browser `fetch()` silently hid the `Content-Disposition` header the Audit Export feature's filename depends on — every mocked-`fetch` component test passed regardless, and only asserting on the real downloaded file's actual filename (not just "a download happened") caught it; fixed in `http/cors.ts`, with a new router-level regression test asserting the header going forward (`DECISION_LOG.md`'s EAP-6 entry). `operations-center.spec.ts` proves the Runtime Metrics panel is reading real, live counters rather than a static fixture: it sends a real `GET /api/audit` request through the running Worker via `page.request.get`, then asserts the Operations Workspace's own request-counts table reflects that exact request — something no mocked-`fetch` component test could ever meaningfully verify, since the "real request" and the "assertion" would be the same fabricated data. `reporting-center.spec.ts` proves the Executive Dashboard/Business Reports/Analytics panels reflect a real, freshly seeded lead — not a static or memoized value — and that Report Export is a real file download (asserted on the actual downloaded CSV's content, the same discipline `audit-center.spec.ts` established for its own export); this was the first spec in this suite whose own real-browser verification pass came back clean, reusing every CORS/CSRF/blanket-header fix the prior seven specs already found and fixed rather than needing one of its own. `customer-portal.spec.ts` (CPP-1) is the second: it seeds two real organizations with one assessment each and proves, in a real browser, that a real organization member's Dashboard/Assessments/Reports never surface the other organization's name or data, and that navigating directly to the other organization's assessment by id — not through any UI affordance — returns the honest "not available to your organization" message the existing `requireAssessmentAccess` gate (EAP-2/EAP-3) already produces, rather than the data; it also found no new CORS/CSRF gap of its own, reusing every fix the prior nine specs already established. `commercial-platform.spec.ts` (COM-1) found no new CORS/CSRF gap either, but did catch a real flake in itself during development: `page.waitForURL()` with a glob pattern after a client-side React Router navigation (clicking from the admin Commercial Workspace's search results into a subscription's Detail page) timed out unreliably even though the navigation had genuinely succeeded — fixed by asserting on the resulting page's actual visible content instead, the same convention every other spec in this suite already followed; don't reintroduce `waitForURL` after a client-side link click without checking `DECISION_LOG.md`'s COM-1 entry first. All eleven specs pass `waitUntil: "domcontentloaded"` to `page.goto`/`page.reload` rather than Playwright's default (`"load"`) — the default additionally blocks on this sandbox's external Google Fonts request settling, which can be slow through the environment's outbound proxy and isn't something any assertion here depends on; every navigation is already followed by a real, specific `expect(...).toBeVisible()`, which is what actually proves the app loaded.

`playwright.config.ts` also sets `workers: 1` — all eleven spec files share one real, persistent local D1 instance with no per-test transaction isolation, and `fullyParallel: false` alone only serializes tests *within* one file, not across files. With the default multi-worker behavior, a test in one file (e.g. `lead-workspace.spec.ts` inserting a lead) can run concurrently with another file's test that snapshots-then-asserts a global count (`admin-dashboard.spec.ts`'s Dashboard metrics test) and race it — a real, reproduced failure (`DECISION_LOG.md`'s EAP-2 entry), not a hypothetical one. Adding `assessment-center.spec.ts` (EAP-3), `organization-workspace.spec.ts` (EAP-4), `user-management.spec.ts` (EAP-5), `audit-center.spec.ts` (EAP-6), `operations-center.spec.ts` (EAP-7), `reporting-center.spec.ts` (EAP-8), `customer-portal.spec.ts` (CPP-1), and `commercial-platform.spec.ts` (COM-1) all kept `workers: 1` rather than removing it for speed, and each stayed stable across multiple consecutive full-suite runs (EAP-8: two consecutive clean 31/31 runs; CPP-1: two consecutive clean 35/35 runs; COM-1: two consecutive clean 39/39 runs) — if you add a twelfth spec file, do the same; these tests were never designed for cross-file isolation.

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

Seven repositories exist now (`Lead`, `Organization`, `Assessment`, `UserProfile`, `Audit`, `Subscription`, `License` — the latter two added in COM-1), each following the same shape: `*Record`/`New*` types + a `*Repository` interface in `repositories/types.ts`, an in-memory implementation, a D1 implementation, one shared contract test suite (`*.contract.ts`) run against both. When adding an eighth (e.g. `ReportRepository` — the `reports` table already exists, migrations/0006), follow that same pattern rather than writing ad hoc tests per implementation that could silently drift apart.

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
  <Route path="leads" element={<LeadWorkspacePage />} /> {/* EAP-2 */}
  <Route path="leads/:id" element={<LeadDetailPage />} /> {/* EAP-2 */}
  <Route path="assessments" element={<AssessmentWorkspacePage />} /> {/* EAP-3 */}
  <Route path="assessments/:id" element={<AssessmentDetailPage />} /> {/* EAP-3 */}
  <Route path="organizations" element={<OrganizationWorkspacePage />} /> {/* EAP-4 */}
  <Route path="organizations/:id" element={<OrganizationDetailPage />} /> {/* EAP-4 */}
  <Route path="users" element={<UserWorkspacePage />} /> {/* EAP-5 */}
  <Route path="users/:id" element={<UserDetailPage />} /> {/* EAP-5 */}
  {/* a future module's route nests here the same way */}
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

## Lead Intelligence usage (`@titan/web`'s `/admin/leads`, EAP-2)

The first real business module built on top of EAP-1's shell — the pattern a future module (Assessment Management, Organization Management, etc.) should follow, not a one-off.

```ts
import { fetchLead, updateLead, searchLeads, fetchLeadAuditTrail } from "../leads/leadApi.js";
// Thin wrappers over apiClient's getJson/patchJson — no fetch() calls
// anywhere else in features/admin/leads/. searchLeads builds a
// URLSearchParams from a LeadSearchOptions object; fetchLeadAuditTrail
// calls GET /api/audit?entityType=lead&entityId=... server-side, never
// filters a client-side copy of the whole audit table.
```

- **`useLeadSearch.ts`** owns the Lead Workspace's filters/sort/page state and re-fetches via `searchLeads` on change — the same `SectionState<T>` pattern as `useDashboardData.ts`, reused, not reimplemented. Only `search` is debounced (300ms); filter/sort/page changes apply immediately.
- **`useLeadDetail.ts`** owns a single lead's fetch/refetch — its data-fetching `useEffect` uses a `let cancelled = false` guard checked before every `setState` in every `.then()`/`.catch()`. This isn't defensive boilerplate: an earlier version without it shipped a real bug, only visible under React 19's `<StrictMode>` double-invocation in a real browser (jsdom-based tests never trigger it) — see `DECISION_LOG.md`'s EAP-2 entry. Match this shape in any new data-fetching hook under `features/admin/`, not a bespoke pattern per hook.
- **`leadWorkspacePreferences.ts`** is the one place saved filters/visible columns are read from/written to `localStorage` — both wrapped in `try/catch` (a corrupt or disabled `localStorage` degrades to "no saved preferences," never a crash). A future module persisting its own per-browser preferences should follow this same isolated-module shape rather than reading `localStorage` inline in a component.
- **`StatusBadge.tsx`/`RiskBadge.tsx`/`PriorityBadge.tsx`** live in `features/admin/leads/`, not `@titan/design-system`, even though they render as badges — `@titan/design-system` is a leaf package with zero `@titan/*` dependencies (`ARCHITECTURE.md`'s audit), and these three need the `LeadStatus`/`RiskLevel`/`LeadPriority` domain types from `@titan/platform`. Each wraps the design system's generic `Badge` with a domain-specific label/tone map. Follow the same split for any future domain-aware badge: the generic primitive lives in the design system, the domain mapping lives in the feature.

## Enterprise Assessment Center usage (`@titan/web`'s `/admin/assessments`, EAP-3)

The second business module built on top of EAP-1's shell, read-only end to end (an assessment has no lifecycle to mutate — `DECISION_LOG.md`'s EAP-3 entry).

```ts
import { fetchAssessment, searchAssessments, fetchAssessmentAuditTrail } from "../assessments/assessmentApi.js";
// Same thin-wrapper shape as leadApi.ts — no fetch() calls anywhere else in
// features/admin/assessments/. searchAssessments builds a URLSearchParams
// from an AssessmentSearchOptions object; fetchAssessmentAuditTrail calls
// GET /api/audit?entityType=assessment&entityId=... server-side.
```

- **`useAssessmentSearch.ts`**/**`useAssessmentDetail.ts`** follow `useLeadSearch.ts`/`useLeadDetail.ts`'s exact shape — same `SectionState<T>` convention, same debounced-search-only pattern. `useAssessmentDetail.ts` applies a fix from the start that `useLeadDetail.ts` only gained this same phase: its audit-trail fetch is sequenced to start only *after* the record fetch resolves, not fired in parallel with it — closes a real race between the view-triggered audit write and an independently-dispatched audit-trail read that has no ordering guarantee against it. Match this sequencing in any future detail hook that both fetches a record and that record's own audit trail.
- **`RiskBadge`** is imported directly from `../leads/RiskBadge.js` — not duplicated. It depends only on `@titan/assessment-core`'s `RiskLevel` and `@titan/design-system`'s `Badge`, nothing lead-specific, so a cross-feature import is the correct call here (the same precedent `useLeadDetail.ts` already set by importing `SectionState` from `../dashboard/useDashboardData.js`). Don't duplicate a component just to keep it "inside" a feature folder when it has no real dependency on that feature.
- **`FrameworkBadge.tsx`** is genuinely new (framework + version, two real consumers: the Workspace table and Details metadata panel) — lives in `features/admin/assessments/`, same reasoning as the lead badges above.
- **`AssessmentResultsPanel.tsx`** uses the static DPDP question bank (`@titan/assessment-core`) purely as label/section metadata — every score/gap/pass-fail fact still comes from the assessment's own server-computed `result`. Don't add a second scoring computation here if you extend this component; cross-reference `result.gaps`/`result.score` against the bank's question text/section, never recompute.
- **`ComplianceIntelligencePanel.tsx`** fetches `GET /api/assessments` (the same unfiltered full-list endpoint `useDashboardData.ts` already calls) and aggregates client-side — the pattern to follow for any future cross-record aggregate view: reuse an existing full-list endpoint rather than adding a new aggregation endpoint until real evidence says the client-side approach doesn't scale.

## Enterprise Organization Management usage (`@titan/web`'s `/admin/organizations`, EAP-4)

The third business module built on top of EAP-1's shell, and the first with a real administrative write surface (unlike Assessments, which is read-only).

```ts
import {
  fetchOrganization,
  searchOrganizations,
  createOrganization,
  updateOrganization,
  fetchOrganizationAuditTrail,
} from "../organizations/organizationApi.js";
// Same thin-wrapper shape as leadApi.ts/assessmentApi.ts — no fetch() calls
// anywhere else in features/admin/organizations/. createOrganization/
// updateOrganization are this module's own postJson/patchJson calls,
// following leadApi.ts's updateLead as the write-call template.
```

- **`useOrganizationSearch.ts`** follows `useAssessmentSearch.ts`'s exact shape, with one deliberate difference: it defaults to `sortBy: "name"`/`sortDirection: "asc"` (an organization directory's natural order, matching `OrganizationRepository.list()`'s own existing convention), not `createdAt`/`desc` (which suits an activity feed, not a directory). `setSort`'s per-click toggle behavior still matches the rest of the app exactly (clicking a new column starts descending) — only the *initial* state differs, a frontend UX choice, not a backend inconsistency.
- **`useOrganizationDetail.ts`** follows `useAssessmentDetail.ts`'s exact shape (sequenced audit-trail fetch, `SectionState<T>` everywhere) but also owns `isSubmitting`/`submitError`/`update` — the same write-state shape `useLeadDetail.ts` established, since Organizations, like Leads and unlike Assessments, have something to write. `linkedLeads`/`linkedAssessments` are fetched once here and shared by both `OrganizationHealthPanel` and `OrganizationRelationshipsPanel`, not fetched twice.
- **`OrganizationAdministrationPanel.tsx`** seeds its name/industry/region edit buffers from props once per organization (`useEffect` keyed on `organization.id`, not on the whole `organization` object) — deliberately preserves in-progress typing across a same-organization refetch (e.g. clicking Archive mid-edit on an unrelated field shouldn't wipe unsaved keystrokes), while still resyncing correctly if this same component instance gets reused for a *different* organization (React Router reuses a route's element across a `:id` param change). Match this keying if you add another free-text edit-on-blur field anywhere in `features/admin/`.
- **`OrganizationHealthPanel.tsx`** takes already-fetched `assessments`/`leads` as props (from `useOrganizationDetail`) rather than fetching independently — the same "aggregate over an already-fetched list" pattern `ComplianceIntelligencePanel.tsx` established for EAP-3. Don't add a second fetch here if you extend it.
- **`OrganizationRelationshipsPanel.tsx`** deep-links into `/admin/leads/:id`/`/admin/assessments/:id` — the existing Lead Intelligence/Assessment Center modules — rather than rendering its own copy of either's detail view. Follow this for any future module that needs to show "this record's related X" — link to the module that owns X, don't duplicate its rendering.
- **No `riskLevel`/`assessmentStatus` filter on `OrganizationSearchOptions`** — investigated and deliberately not added, not an oversight. `assessmentStatus` has no backing field (assessments have no lifecycle); `riskLevel` would require a cross-repository join no repository in this codebase supports (each is constructed independently with its own private store). Don't add either without first reading `DECISION_LOG.md`'s EAP-4 entry and `ARCHITECTURE.md`'s reasoning in full — the constraint is architectural, not a missing query parameter.

## Enterprise Identity & User Management usage (`@titan/web`'s `/admin/users`, EAP-5)

The fourth business module built on top of EAP-1's shell — a real user directory and Role Assignment write surface, read-only for identity itself.

```ts
import {
  fetchUser,
  searchUsers,
  grantUserProfile,
  updateUserProfile,
  revokeUserProfile,
  fetchUserAuditTrail,
  type UserWithProfiles,
} from "../users/userApi.js";
// Same thin-wrapper shape as organizationApi.ts/assessmentApi.ts/leadApi.ts —
// no fetch() calls anywhere else in features/admin/users/. There is no
// createUser/updateUser — identity itself is never written by this app
// (UserRecord's own doc comment, @titan/platform).
```

- **`useUserSearch.ts`** is deliberately smaller than `useOrganizationSearch.ts`/`useAssessmentSearch.ts`/`useLeadSearch.ts` — no `FilterPanel`, no saved filters, no column toggle. `UserSearchOptions` has no categorical field the way `OrganizationSearchOptions.status` does (role/membership live on a different repository entirely), so there's nothing for a filter panel to filter by; don't add one speculatively just to match the other three Workspaces' shape.
- **`useUserDetail.ts`** follows `useOrganizationDetail.ts`'s exact shape (sequenced audit-trail fetch, `SectionState<T>` everywhere) and additionally owns `isSubmitting`/`submitError`/`grant`/`changeRole`/`revoke` — three write actions, not one `update`, since Role Assignment has three distinct operations rather than a single patch. It also fetches `GET /api/organizations` (unfiltered, the same call `useDashboardData.ts` already makes) to resolve each profile's `organizationId` to a real name and to populate the grant form's dropdown — not `SectionState`-wrapped, since a Platform Administrator (the only caller who reaches this page) always has access to it, and a failure degrades to raw ids rather than blocking the page.
- **`RoleAssignmentPanel.tsx`** is the real write surface — every control (grant/change/revoke) a direct server call through `useUserDetail`, re-rendering from the server's own re-read, the same "never optimistic-only" discipline as `OrganizationAdministrationPanel.tsx`. The server enforces the last-Platform-Administrator lockout guard (`wouldRemoveLastPlatformAdministrator`, router.ts); this panel surfaces whatever 409 that produces via `submitError` rather than re-implementing the same check client-side, where it could drift from the real policy — don't add a client-side "is this the last admin" check here.
- **`RoleBadge.tsx`** names its prop `userRole`, not `role` — a plain `role` prop on a JSX element is indistinguishable, to both eslint-plugin-jsx-a11y's static `aria-role` check and a future reader, from the DOM's own ARIA `role` attribute. Follow this naming for any future badge/component whose domain concept happens to be called "role."
- **`UserRelationshipsPanel.tsx`** deep-links into `/admin/leads/:id`/`/admin/assessments/:id` rather than rendering its own copy of either's detail view — the same reuse discipline `OrganizationRelationshipsPanel.tsx` established. Backed by `LeadSearchOptions.assignedTo` (EAP-2, previously only ever driven by the "assign to me"/"unassigned" sentinels) and the new `AssessmentSearchOptions.createdBy` (EAP-5) — no new repository capability beyond that one filter addition.
- **No `organizationId`/`role` filter on `UserSearchOptions`** — investigated and deliberately not added, not an oversight, for the identical reason `OrganizationSearchOptions` has no `riskLevel` filter: it would require a cross-repository join (`UserRepository` reading `UserProfileRepository`'s data) no repository in this codebase supports. Don't add one without first reading `DECISION_LOG.md`'s EAP-5 entry and `ARCHITECTURE.md`'s reasoning in full.

## Enterprise Audit Center usage (`@titan/web`'s `/admin/audit`, EAP-6)

The fifth business module built on top of EAP-1's shell — a consolidated, cross-entity read surface over `audit_events`, the exact same table every prior module already writes to. No new writer, no new schema.

```ts
import { searchAuditEvents, exportAuditEvents } from "../audit/auditApi.js";
// Same thin-wrapper shape as organizationApi.ts/assessmentApi.ts/userApi.ts —
// no fetch() calls anywhere else in features/admin/audit/.
import { auditActionLabel, auditEntityTypeLabel, auditEntityDetailPath } from "../audit/auditActionLabels.js";
// The canonical action/entity-type vocabulary — import this instead of
// writing a new ACTION_LABELS map. Lead/Assessment/Organization/User's own
// audit panels already import from here too; don't reintroduce a private copy.
```

- **`useAuditSearch.ts`** manages a sort *direction* only, not a sort *field* — `AuditSortField` has exactly one member (`"createdAt"`), so there is nothing else to make configurable. Don't add a `sortBy` control to the Workspace UI without first adding a second real field to `AuditSortField` (`repositories/types.ts`) that a real consumer actually needs sorted by.
- **`GET /api/audit/export` is a real file download, not JSON** — `apiClient.ts`'s `getBlob` (not `getJson`) is the only correct way to call it from the frontend; it reads the server-chosen filename from `Content-Disposition`, which depends on `http/cors.ts`'s `Access-Control-Expose-Headers` actually listing that header (a real gap this phase found and fixed — see the Playwright section below). If you add a second export-like endpoint, remember this header requirement; a mocked-`fetch` component test will not catch its absence.
- **`AuditWorkspacePage.tsx`'s Investigation view groups only the currently-loaded page of search results** — it's a pure client-side transform of `state.data.events`, not a second query. Don't wire it to fetch additional pages to "see everything" without first re-reading `DECISION_LOG.md`'s EAP-6 entry on why that would be the "speculative correlation engine" the brief explicitly ruled out.
- **`AuditEventDetailPanel.tsx`'s "related events" section reuses the pre-existing `GET /api/audit?entityType=...&entityId=...` endpoint** (the same one every per-entity audit panel already calls) rather than a new one. If you need a genuinely new query shape for audit data, prefer extending `AuditSearchOptions`/`search()` over adding a third read path.
- **The four existing per-entity audit panels (`LeadAuditPanel`/`AssessmentAuditPanel`/`OrganizationAuditPanel`/`UserAuditPanel`) now import `auditActionLabel` from `auditActionLabels.ts` instead of keeping their own private `ACTION_LABELS` map.** Add any new action's label there, once, not in a panel-local map — a sixth private copy is exactly the duplication this consolidation closed.

## Enterprise Operations Center usage (`@titan/web`'s `/admin/operations`, EAP-7)

The sixth business module built on top of EAP-1's shell — the first that reads operational, not business, data. No new repository, no new table.

```ts
import { fetchOperationsSummary } from "../operations/operationsApi.js";
// The one new endpoint only. /health and /health/ready are called directly
// via getJson (lib/apiClient.js), the same way useDashboardData.ts already
// does — don't add a second thin wrapper for those two.
```

- **`Metrics.getCounts()`/`.getDurations()` (`observability/metrics.ts`) are now part of the interface, not just the in-memory implementation's own extra methods.** Any new `Metrics` implementation (e.g. an Analytics-Engine-backed one, the day a real Cloudflare account exists) must implement both read methods too, not just `increment`/`recordDuration`.
- **`checkSearchableService`/`checkUserProfilesService` (`router.ts`) are the only place that calls a repository's `search()`/`list()` purely to check reachability** — reused for every service in `operationsSummary`. If you add a seventh repository to this system, add one more `checkSearchableService(ctx, "name", deps.name)` call there, not a bespoke health check.
- **`ServiceStatus.error` deliberately returns a caught exception's real message** — a documented, scoped exception to this codebase's general "never leak internal errors" rule (`SECURITY_GUIDE.md`'s "Authorization model"). Don't copy this pattern into a route any caller below Platform Administrator could ever reach.
- **`SystemOverview.version`/`.environment` (`router.ts`'s `PLATFORM_VERSION`/`RUNTIME_ENVIRONMENT`) are manually-maintained literals, not a `package.json` read.** Keep `PLATFORM_VERSION` in sync with every package's own `version` field by hand; there is no build step that does this for you.
- **The Operations Workspace's "Background operations" panel is a static note, not a component with any state.** Don't build queue-visualization UI here without first confirming real queue/Durable Object/cron infrastructure actually exists (`wrangler.toml`) — there is none today.

## Enterprise Reporting & Analytics usage (`@titan/web`'s `/admin/reporting`, EAP-8)

The eighth business module built on top of EAP-1's shell — the first that is pure composition over every prior module's own data. No new repository, no new table, and despite the name, no interaction with the pre-existing `reports` table (a different concept — see `DECISION_LOG.md`'s EAP-8 entry before assuming the two are related).

```ts
import { fetchReportingSummary, fetchReportTrends, exportReportingSummary } from "../reporting/reportingApi.js";
// Same thin-wrapper shape as auditApi.ts/operationsApi.ts — no fetch() calls
// anywhere else in features/admin/reporting/. exportReportingSummary uses
// getBlob (apiClient.ts), the same non-JSON helper auditApi.ts's
// exportAuditEvents already established.
```

- **`useReportingData.ts`** owns the Executive Dashboard/Business Reports' shared `SectionState<ExecutiveSummary>` — the same `useDashboardData.ts` convention every sibling Workspace's own top-level hook already follows. **`useTrendSeries.ts`** owns the Analytics panel's own `SectionState<TrendSeries>` independently, re-fetching whenever the selected entity or day-window changes.
- **`ExecutiveSummaryPanel.tsx`** renders real `MetricCard`s only — an unconfigured `organizations`/`identity` report renders "—" with a "Not configured" hint (`DashboardPage.tsx`'s own `overviewMetricProps` idiom), never a zero indistinguishable from a real one. Don't add a fabricated placeholder value here if you extend it for a new KPI a future deployment might not have configured either.
- **`BusinessReportsPanel.tsx`** is every breakdown rendered through the shared `DataTable` primitive — the same tabular primitive `ServiceStatusPanel.tsx`/`RuntimeMetricsPanel.tsx` already established. Don't build a bespoke table per report; add a new `BreakdownTable` call if you add a new breakdown.
- **`AnalyticsPanel.tsx`** is this module's one interactive control surface — an entity/date-range selector, `localStorage`-backed (`reportingWorkspacePreferences.ts`, the same per-browser saved-view convention every sibling Workspace already uses). It renders `TrendSparkline` (`@titan/design-system`) alongside a real, accessible `DataTable` of the identical per-day counts — **never render `TrendSparkline` alone**; its own doc comment is explicit that the exact numbers it necessarily summarizes belong in an adjacent real table, or a screen-reader user is left with a decorative shape and nothing else.
- **`GET /api/reports/trends`'s five entities read three different real data paths** (`ARCHITECTURE.md`'s EAP-8 section has the full reasoning) — don't assume adding a sixth entity is as simple as one more `case` reading `list()`; check whether the repository backing it has a real date-range filter first (only `Audit`/`Identity` do today), or you'll need the same in-memory-filter-a-full-list approach `leads`/`assessments`/`organizations` already use.
- **`GET /api/reports/export` needs no row cap the way `GET /api/audit/export`'s `AUDIT_EXPORT_MAX_ROWS` does** — its output is one row per known enum value or observed free-form key, not one per underlying record. If you add a new export column that could ever contain a raw, individual-record field (a name, an email, a raw id list), stop and re-read `SECURITY_GUIDE.md`'s EAP-8 paragraphs first — that would change this export's whole security posture from "aggregate-only" to something that needs the same row cap and CSV-injection review `GET /api/audit/export` already went through.

## Enterprise Customer Portal usage (`@titan/web`'s `/portal`, CPP-1)

The first business module built for a customer rather than a Platform Administrator — a real, separate sibling shell to `/admin`, not nested under it. If you're extending this module, the one rule that matters more than any other: **every new portal route must derive its organization scope server-side, the same way every existing one does — never add a route that reads `organizationId` from a query string, path segment, or request body.**

```ts
import { fetchPortalOrganization, fetchPortalAssessments, fetchPortalComplianceSummary, exportPortalComplianceSummary, fetchPortalActivity, fetchPortalSupportRequests, createPortalSupportRequest } from "../portal/portalApi.js";
// Same thin-wrapper shape as reportingApi.ts/auditApi.ts — no fetch() calls
// anywhere else in features/portal/. exportPortalComplianceSummary uses
// getBlob (apiClient.ts), the same non-JSON helper every other export button
// in this codebase already uses.
```

- **`resolvePortalOrganizationId` (`router.ts`) is the one function every portal handler depends on** — it derives the organization id from the caller's own `UserProfileRecord[]` and returns it as a plain value/`Response` union. If you add a new `/api/portal/*` route, call this first, exactly like every existing one does, and pass its result as a function parameter into whatever repository call backs the new route. Do not accept an `organizationId` from `url.searchParams` or the request body on any portal route, even one that seems read-only — that would silently reopen the exact cross-tenant gap this module exists to close.
- **Assessment Detail deliberately has no dedicated `/api/portal/assessments/:id` route** — it reuses `GET /api/assessments/:id` directly (`usePortalAssessmentDetail.ts` calls the admin feature folder's own `fetchAssessment`), because `requireAssessmentAccess` already grants exactly the access a portal customer needs. Don't add a redundant portal-specific route for this; if a future need requires a materially different response shape for the portal specifically, extend the existing route's response rather than forking it.
- **`portalNavItems`/`hasPortalOrganizationMembership` (`layout/portalNavItems.ts`) return nothing at all — not a disabled or grayed-out link — for a caller with no real organization membership.** `PortalLayout.tsx` renders an honest "No organization membership" `Alert` instead of `<Outlet/>` in that case. Don't change either to show navigation items that then 403 when clicked — the nav itself should never imply access that doesn't exist.
- **`AssessmentSummaryCard` (`features/portal/`) is the one shared component this module added, and it deliberately does not live in `@titan/design-system`** — it composes `RiskBadge`/`MetricCard`, both domain-aware or already-feature-folder-scoped, so adding it to the design system would be the first `@titan/*` dependency that leaf package has ever had. If you add a second real consumer for a new component in `features/portal/`, keep following this precedent unless the component is genuinely dependency-free.
- **`SupportRequestRepository` is deliberately minimal — `save`/`listByUser` only, one status (`"open"`), no admin-side read or update anywhere in this codebase.** If a future phase adds a real ticketing workflow, that's new schema and a new admin-facing surface, not an extension of `listPortalSupportRequests` — don't bolt a `status` transition onto the customer-facing `POST /api/portal/support` route itself; a customer submitting a request should never be the same action as an admin resolving one.
- **The Account page (`features/portal/account/PortalAccountPage.tsx`) follows the `*Content`-prop-driven testability convention every sibling admin detail page uses** (`AssessmentDetailPage`/`AssessmentDetailContent`, `ReportingWorkspacePage`/`ReportingWorkspaceContent`) — the exported, tested component (`PortalAccountContent({me})`) takes its data as a prop; only the thin outer `PortalAccountPage()` calls `useSession()`. Follow this same split for any new portal page rather than calling `useSession()`/routing hooks directly inside the component under test.

## Enterprise Commercial Platform usage (`@titan/web`'s `/portal/subscription` and `/admin/commercial`, COM-1)

The first business module built on top of both CPP-1's Customer Portal shell and every prior EAP admin module at once — a customer-facing self-service surface (`features/portal/subscription/`) and an admin-facing management surface (`features/admin/commercial/`) reading and writing the same two new repositories. If you're extending this module, the rules that matter most:

```ts
import { fetchPlans, fetchPortalCommercialSummary, createPortalSubscription, updatePortalSubscription } from "../portal/commercialApi.js";
// features/admin/commercial/commercialApi.ts has the admin-facing equivalents
// (searchCommercialSubscriptions, fetchCommercialSubscription,
// updateCommercialSubscription, searchCommercialLicenses) — same thin-wrapper
// shape as every other *Api.ts file, no fetch() calls anywhere else in
// either feature folder.
```

- **Every portal-facing commercial route calls `resolvePortalOrganizationId` first, exactly like every CPP-1 route already does** — `getPortalCommercialSummary`/`createPortalSubscription`/`updatePortalSubscription` (router.ts) never accept an `organizationId` from a query string, path segment, or request body. Do not add a new `/api/portal/commercial/*` route that breaks this pattern, even one that seems read-only.
- **The Plan catalog (`commercial/planCatalog.ts`) is a hardcoded array, not a database table** — the same "content ships with the app" precedent `@titan/assessment-core`'s `dpdpV1` question bank already established. Don't add a `plans` table or a `POST /api/commercial/plans` route without a real go-ahead; today's three plans (Starter/Professional/Enterprise) are a deliberate, small, code-reviewable set.
- **`applySubscriptionPatch` (router.ts) is the one shared function both the customer-facing `PATCH /api/portal/commercial/subscription` and the admin-facing `PATCH /api/commercial/subscriptions/:id` routes call** — it derives the upgrade/downgrade/cancel/renew audit event from a before/after diff and keeps the linked license's status in lockstep. If you extend subscription-patch behavior, extend this one function; don't duplicate its diff-and-audit logic in either handler.
- **`isSelfServicePlan(plan)` (currently `plan.trialDays > 0`) gates the customer-facing PATCH's allowed plan choices, not the admin-facing one** — a Platform Administrator can assign any plan (including sales-assisted ones like Enterprise) to any organization; a customer can only self-serve between plans that actually offer a trial. This is a deliberate authorization *asymmetry*, not a bug — both routes still require the same underlying authorization gate (`resolvePortalOrganizationId` or Platform Administrator), they just apply different business-rule validation after it. Don't collapse the two checks into one without re-reading `DECISION_LOG.md`'s COM-1 entry.
- **`resolveEntitlements(plan, subscription)` (`commercial/entitlements.ts`) is a pure function, computed only for display** — called solely inside `getPortalCommercialSummary` to render the Dashboard's Entitlements panel. Nothing in this codebase gates a request on its output today. Don't wire it into an existing EAP/CPP-1 route to "enforce" a feature limit without a real go-ahead — that would be extending the Assessment/Reporting Engine or the Customer Portal's existing authorization model, both explicitly out of scope for this phase (`ARCHITECTURE.md`'s COM-1 section has the full reasoning).
- **Seat usage (`getPortalCommercialSummary`'s `seatsUsed`, and `getCommercialSubscription`'s equivalent) is a live `userProfiles.findByOrganizationId(...).length` count, not a column on `licenses`** — the same "compose from an existing repository rather than duplicate its data" discipline `PortalComplianceSummary` (CPP-1) already established for assessment counts. Don't add a `seats_used` column to the `licenses` table; it would immediately drift from the real membership count.
- **No payment amount, currency, invoice, card, or token field exists anywhere in `subscriptions`/`licenses` or their TypeScript types, and none should be added in this phase** — COM-1 is provider-agnostic commercial modeling, not payment processing (`ARCHITECTURE.md`/`ROADMAP.md`). A future Billing Integration phase adds a real payment-provider adapter behind this same subscription model; it does not turn `subscriptionRepository.ts` itself into a payments table.
- **`PlanCard`/`SeatUsageMeter`/`EntitlementBadge`/`SubscriptionStatusBadge` (`features/admin/commercial/`) are reused as-is by the portal's own `PortalSubscriptionPage.tsx`** — not duplicated into `features/portal/subscription/`. This is the same cross-feature-import precedent `RiskBadge`/`AssessmentResultsPanel`/`auditActionLabel` already set for CPP-1; a component with a real second consumer stays where it is, it doesn't get copied.

## Adding a new component to the design system

1. `packages/design-system/src/components/YourComponent.tsx` + co-located `.css` + `.test.tsx`.
2. Export it from `packages/design-system/src/index.ts`.
3. Tests: rendering, every interactive behavior, an `axe()` check with `color-contrast` disabled (see existing components for the pattern).
4. `npm run ci`-equivalent locally (`typecheck && lint && format && build && test`) before opening a PR — matches exactly what `titan-ci.yml` will run.

## What NOT to do (things this stage deliberately doesn't have yet)

- Protected routes/session context/sign-in-and-out are now real (`features/admin/auth/`, EAP-1) — don't build a second, parallel version of any of it for a new module. A new admin page nests under the existing `/admin` route tree (`AdminLayout`'s `<Outlet/>`) and reads `useSession()`/`GET /api/me` the way `DashboardPage.tsx` does, rather than re-resolving "who's signed in" itself. Don't build a custom login/sign-out form either — `RequireAuth`/`Header`'s sign-out link deliberately link to Auth.js's own hosted pages instead (`ARCHITECTURE.md`'s "Admin Application architecture" section has the reasoning).
- Don't build Billing/Payment Gateway Processing, PCI card storage, Accounting, Tax Engines, a Marketplace, Affiliate Programs, CRM, ERP, Cloudflare Production, a Release Candidate, or General Availability surface without a real go-ahead — EAP-1 deliberately built only the shell and one module (Dashboard); EAP-2 through EAP-8 each deliberately built exactly one more (Lead Intelligence, Assessment Center, Organization Management, Enterprise Identity & User Management, Enterprise Audit Center, Enterprise Operations Center, Enterprise Reporting & Analytics) — every module the original EAP-1 brief named, plus this roadmap-recommended eighth one; CPP-1 then built the first customer-facing module (the Enterprise Customer Portal); COM-1 then built the commercial/entitlement layer (Subscriptions, Licenses, Entitlements) on top of all nine — explicitly *not* the payment gateway logic that would actually charge a card. The rest are sequenced, not forgotten (`ROADMAP.md`).
- Don't rebuild the Customer Portal shell, `resolvePortalOrganizationId`, or `SupportRequestRepository` from scratch for a future module that happens to touch customer-facing data — extend what CPP-1 built (`features/portal/`) the same additive way every EAP phase extended the admin side, rather than starting a second, parallel customer-facing surface. Don't add an organization switcher, a support-request ticketing workflow, or password/notification-preferences/multi-session UI to the Account page without first building the real backing service each needs (a multi-organization decision, an admin-side resolution endpoint, a credentials/settings/session-enumeration service respectively) — none exists today, and building the UI first would fabricate a feature with nothing real behind it (`DECISION_LOG.md`'s CPP-1 entry).
- Don't rebuild the Commercial Workspace/Subscription Detail UI, `SubscriptionRepository`, `LicenseRepository`, or the Plan catalog from scratch for a future module that happens to touch commercial data — extend what COM-1 built (`features/admin/commercial/`, `features/portal/subscription/`, `commercial/planCatalog.ts`) the same additive way every prior phase extended its own predecessor. Don't add a payment gateway integration, real card/invoice storage, a per-user License assignment table (seat usage is a live count, not a table — see above), dynamic plan CRUD, multiple subscriptions per organization, or entitlement *enforcement* on any existing route without a real go-ahead — none of these exist today, and COM-1's own master prompt explicitly scoped payment gateway logic, PCI storage, accounting, tax, marketplace, affiliate, CRM, and ERP concerns out of this phase (`DECISION_LOG.md`'s COM-1 entry).
- Don't add organization-scoped filtering to any existing admin route (`GET /api/leads`, `GET /api/assessments/search`, `GET /api/organizations/search`, etc.) as a shortcut to giving an organization's own admin visibility into their own data — that's a different, still-open gap (`SECURITY_GUIDE.md`'s "Known, accepted gaps") from what CPP-1 solved. CPP-1's own `/api/portal/*` routes are a deliberately separate, narrower surface for a different caller (an organization member viewing only their own organization); don't conflate the two or try to serve both needs from one set of routes.
- Don't build a producer for the pre-existing `reports` table (`migrations/0006`) as a side effect of extending the Reporting & Analytics module — that table tracks a different concept (generated PDF report artifacts, Roadmap Module H) still blocked on an undecided email/storage pipeline, not something EAP-8 was ever scoped to unblock (`DECISION_LOG.md`'s EAP-8 entry).
- Don't build a self-service "Create User" form anywhere in `features/admin/users/` — identity is created only by a real Auth.js sign-in (`UserRecord`'s own doc comment, `@titan/platform`); a person appears in the directory once they've signed in, never before. `UserRepository` has no `save` on purpose — don't add one.
- Don't rebuild the Lead Workspace/Lead Details UI, `LeadRepository`, or the lead lifecycle data model from scratch for a future module that happens to touch leads — extend what EAP-2 built (`features/admin/leads/`, `LeadRepository.findById`/`update`/`search`) the same additive way EAP-3/EAP-4 themselves extended `LeadRepository.search()` with `assessmentId`/`organizationId` filters, without touching `list()`/the lifecycle fields at all (`DECISION_LOG.md`'s EAP-2/EAP-3/EAP-4 entries). Don't rebuild the Assessment Workspace/Assessment Details UI or `AssessmentRepository` either, for the same reason — extend `features/admin/assessments/`/`AssessmentRepository.search()` additively (EAP-5 added `createdBy` to it exactly this way). Don't rebuild the Organization Workspace/Organization Details UI or `OrganizationRepository` either — extend `features/admin/organizations/`/`OrganizationRepository` additively, the same way. Don't rebuild the User Workspace/User Details UI, `UserRepository`, or `UserProfileRepository` either — extend `features/admin/users/`/those two repositories additively.
- Don't add a `riskLevel`/`assessmentStatus` filter to `OrganizationSearchOptions` (or any future cross-organization search) without first confirming the field actually exists on the record being filtered, and that computing it doesn't require one repository to depend on another's data — every repository in this codebase (Lead, Assessment, Organization, Audit, UserProfile) is constructed independently with its own private store, and there is no precedent anywhere for one reaching into another's (`DECISION_LOG.md`'s EAP-4 entry, `ARCHITECTURE.md`'s EAP-4 section).
- Don't widen `ALLOWED_ORIGIN`/the Auth.js `redirect` callback allowlist/the CSP `form-action` allowlist (`auth/config.ts`, `http/finalizeResponse.ts`) to more than one real, known frontend origin, and don't switch any of them to a wildcard for convenience — each is a deliberately closed allowlist of exactly the origins this project actually controls (`SECURITY_GUIDE.md`'s "Authorization model"), and widening any one without the other two changes the security properties silently.
- Don't bump this workspace's Vitest 3 → 4 as a side effect of some other task, even though `@cloudflare/vitest-pool-workers` wants it — that's a deliberate, workspace-wide decision on its own, not a dependency bump to absorb quietly (`DECISION_LOG.md`). sql.js-backed repository tests close most of the practical gap in the meantime.
- Don't add a Credentials (username/password) auth provider — only Email/Google/GitHub were asked for (Stage 4's own scope); a fourth provider nobody requested is exactly the kind of unrequested parallel implementation this program's rules warn against (`DECISION_LOG.md`).
- Don't add real email sending to the Auth.js Email provider without an actual email-provider decision first (`ARCHITECTURE.md`'s "still open" list) — the dev-mode logger is a deliberate placeholder, not an oversight to "fix" unilaterally.
- Don't add a route that lets a caller grant themselves (or anyone) the Platform Administrator role — that would be a privilege-escalation vulnerability, not a convenience feature. Provisioning is a direct D1 insert on purpose (`OPERATIONAL_RUNBOOK.md`, `SECURITY_GUIDE.md`).
- Don't reach for the main repository's `node:test`/`tsx` conventions inside `titan/` — this workspace has its own toolchain, documented above.
