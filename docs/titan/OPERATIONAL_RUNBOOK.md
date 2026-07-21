# Operational Runbook — Titan Platform (`@titan/platform`)

How to run, verify, and troubleshoot the Titan Cloudflare backend locally. Everything in this document is **local-only** — this project has never had Cloudflare account credentials in any environment it has run in, so nothing here deploys anywhere, and no step below produces a production system. See `PLATFORM_FOUNDATION.md` for what's actually been verified and how.

## Prerequisites

- Node 22 (`titan/.nvmrc`)
- `cd titan && npm install` (installs `wrangler` as a dev dependency of `@titan/platform` — no global install needed; commands below use `npx wrangler`)

## First-time local setup

```bash
cd titan/packages/platform
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and generate a real `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Paste the result in as `AUTH_SECRET=...`. Leave `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`/`AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` blank unless you have real OAuth app credentials to test against — Google/GitHub sign-in simply won't be offered without them (`auth/config.ts`), which is expected, not broken.

`.dev.vars` is gitignored. Never commit it, even though nothing in it is a real production secret today.

## Running migrations and seeding

```bash
cd titan/packages/platform
npm run db:migrations:apply:local   # wrangler d1 migrations apply titan-platform-db --local
npm run db:seed:local                # wrangler d1 execute --local --file=./seed.sql
```

Both commands operate entirely on a local SQLite file under `.wrangler/state/v3/d1` — no network call, no real Cloudflare API involved, regardless of what `wrangler.toml`'s placeholder `database_id` says. Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`/`CREATE INDEX IF NOT EXISTS`); `seed.sql` uses `INSERT OR IGNORE` against fixed ids, so re-running either after the state already exists is a safe no-op.

### Resetting local state

```bash
rm -rf titan/packages/platform/.wrangler
```

Then re-run the two commands above. `.wrangler/` is gitignored.

### Adding a new migration

Add a new `NNNN_description.sql` file to `titan/packages/platform/migrations/` (next sequential number), then re-run `db:migrations:apply:local` — `wrangler d1 migrations apply` only applies files it hasn't already recorded as applied, tracked in the local D1 instance's own migrations table.

## Running the Worker locally

```bash
cd titan/packages/platform
npm run dev   # wrangler dev — listens on http://localhost:8787 by default
```

On startup, `wrangler dev` prints the bindings it resolved (`env.DB`, `env.ALLOWED_ORIGIN`, `env.AUTH_SECRET`, etc.) — confirm `env.AUTH_SECRET` shows `(hidden)` rather than being absent; an absent `AUTH_SECRET` means `.dev.vars` wasn't picked up, and `/api/auth/*` will 404 (by design — `worker.ts` only builds an `AuthConfig` when a secret is present, rather than crashing on startup without one).

## Verifying the Worker is actually working

These are the same checks used to verify Stage 4 (`PLATFORM_FOUNDATION.md`'s verification table) — a quick way to confirm your local setup is healthy, not a substitute for the full test suite (`npm run test` in `titan/`).

```bash
curl -s http://localhost:8787/health
# {"status":"ok","service":"titan-platform","timestamp":"..."} — liveness only, never touches D1

curl -s http://localhost:8787/health/ready
# {"status":"ready","service":"titan-platform"} — RC1: a real dependency check
# (a trivial `SELECT 1` against env.DB, worker.ts). Returns 503 if D1 is
# unreachable instead of a false-positive 200 — use this one for readiness
# probes, /health for liveness probes.

curl -s http://localhost:8787/api/leads
# 401 {"error":{"code":"unauthorized",...}} — Security Release Blocker Sprint:
# this route requires a Platform Administrator session now. See "Provisioning
# a local Platform Administrator" below for an authenticated curl example.

curl -s -X POST http://localhost:8787/api/assessments \
  -H "Content-Type: application/json" \
  -d '{"framework":"dpdp","frameworkVersion":"1.0.0","answers":{},"result":{"score":0,"riskLevel":"low","breakdown":{"critical":0,"high":0,"medium":0,"low":0,"total":0},"gaps":[],"scoredQuestionCount":12},"createdAt":"2026-01-01T00:00:00.000Z"}'
# 201, returns the saved assessment with a generated id. frameworkVersion must
# match a real @titan/assessment-core question bank (dpdpV1.version, "1.0.0")
# — the server now recomputes `result` from `answers` against that bank
# rather than trusting the client's `result`, and rejects an unrecognized
# framework/frameworkVersion pair with 400 unsupported_framework.

curl -s http://localhost:8787/api/auth/session
# null (no session cookie) — confirms Auth.js + the D1 adapter are wired correctly

curl -s http://localhost:8787/api/me
# 401 {"error":{"code":"unauthorized",...}} — EAP-1: any authenticated caller
# may read this (no Platform Administrator role required, unlike the routes
# below), but it still requires *some* real session. With a real session
# cookie: {"userId":"...","email":"...","profiles":[...],"isPlatformAdministrator":false}
# — the admin app's Dashboard uses this exact response to decide what to show.

curl -s http://localhost:8787/api/organizations
curl -s http://localhost:8787/api/assessments
curl -s http://localhost:8787/api/audit
# 401 for all three with no session cookie — EAP-1: same Platform
# Administrator gate as /api/leads (see "Provisioning a local Platform
# Administrator" below), backing the admin Dashboard's org/assessment/audit
# metrics.

curl -s "http://localhost:8787/api/assessments/search?riskLevel=critical&sortBy=riskScore&sortDirection=desc"
# 401 with no session cookie — EAP-3: same Platform Administrator gate,
# backing the Assessment Workspace. framework/riskLevel filter, sortBy
# (createdAt/riskScore/framework)/sortDirection, page/pageSize all validated
# the same strictness as GET /api/leads/search (an unrecognized value is a
# real 400, not silently ignored).

curl -s http://localhost:8787/api/leads/some-lead-id
curl -s -X PATCH http://localhost:8787/api/leads/some-lead-id \
  -H "Content-Type: application/json" \
  -d '{"status":"contacted"}'
curl -s "http://localhost:8787/api/leads/search?status=new&page=1&pageSize=20"
# 401 for all three with no session cookie — EAP-2: same Platform
# Administrator gate as /api/leads, enforced by the same requireLeadsAccess
# helper. PATCH additionally requires a matching Origin header once
# authenticated (security/csrf.ts's isTrustedOrigin) — see "Provisioning a
# local Platform Administrator" below for a real authenticated example of
# all three.

curl -s "http://localhost:8787/api/audit?entityType=lead&entityId=some-lead-id"
# 401 with no session cookie — EAP-2: GET /api/audit now accepts optional
# entityType/entityId query filters (used by the Lead Details page's
# activity timeline). Omitting them still returns the full unfiltered list,
# unchanged from EAP-1.

curl -s "http://localhost:8787/api/leads/search?assessmentId=some-assessment-id"
# 401 with no session cookie — EAP-3: GET /api/leads/search now accepts an
# optional assessmentId filter (used by Assessment Details' "Lead linkage"
# panel — which real leads, if any, this assessment produced).
```

### Provisioning a local Platform Administrator

`GET /api/leads`, `GET /api/leads/:id`, `PATCH /api/leads/:id`, `GET /api/leads/search` (EAP-2), `GET /api/organizations`, `GET /api/assessments` (list), `GET /api/assessments/search` (EAP-3), `GET /api/audit`, cross-organization `GET /api/assessments/:id` reads, and the admin Dashboard's four privileged sections (EAP-1, above) all require a **Platform Administrator** — a `user_profiles` row with `organization_id: NULL` and `role: 'owner'` (`SECURITY_GUIDE.md`'s "Authorization model"). There is no self-service route that grants this — deliberately, since an endpoint that lets a caller grant themselves platform-wide access would itself be a privilege-escalation vulnerability. Provisioning one locally is a real sign-in followed by a direct SQL insert:

```bash
# 1. Get a CSRF token and start a real sign-in (dev-mode Email provider —
#    logs the magic link instead of sending it, auth/config.ts)
curl -s -c cookies.txt http://localhost:8787/api/auth/csrf
# {"csrfToken":"<token>"}

curl -s -b cookies.txt -c cookies.txt -X POST http://localhost:8787/api/auth/signin/email \
  --data-urlencode "email=admin@titan.local" \
  --data-urlencode "csrfToken=<token from above>" \
  --data-urlencode "callbackUrl=http://localhost:8787/"
# 302. Find the real magic link in wrangler dev's own stdout:
#   {"message":"sign-in link generated (dev mode — not actually emailed)", "url":"http://localhost:8787/api/auth/callback/email?...&token=...&email=admin%40titan.local"}

# 2. Follow it to complete sign-in — this sets the real session cookie
curl -s -b cookies.txt -c cookies.txt "<the url from the log line above>"

# 3. Confirm the session and note the user id
curl -s -b cookies.txt http://localhost:8787/api/auth/session
# {"user":{"id":"<user-id>","email":"admin@titan.local"},"expires":"..."}

# 4. Grant that user id a Platform Administrator profile directly in D1
npx wrangler d1 execute titan-platform-db --local --command="
  INSERT INTO user_profiles (id, user_id, organization_id, role, created_at)
  VALUES (lower(hex(randomblob(16))), '<user-id from step 3>', NULL, 'owner', '$(date -u +%Y-%m-%dT%H:%M:%S.000Z)')"

# 5. GET /api/leads now returns 200 with real data for this same cookie jar
curl -s -b cookies.txt http://localhost:8787/api/leads

# 6. GET /api/leads/:id, PATCH /api/leads/:id, and GET /api/leads/search
#    (EAP-2) all resolve through the same requireLeadsAccess gate as step 5.
#    PATCH additionally requires a matching Origin header — curl doesn't
#    send one by default, so add it explicitly or isTrustedOrigin
#    (security/csrf.ts) rejects the request with 403, exactly as it does
#    for a forged anonymous POST /api/leads:
curl -s -b cookies.txt "http://localhost:8787/api/leads/search?status=new"

curl -s -b cookies.txt "http://localhost:8787/api/leads/<a real lead id from step 5's response>"

curl -s -b cookies.txt -X PATCH "http://localhost:8787/api/leads/<lead id>" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"status":"contacted","note":"Reached out via email"}'
# 200, returns the updated lead. Also records lead.status_changed and
# lead.note_added audit_events rows (router.ts's updateLead) — visible via:
curl -s -b cookies.txt "http://localhost:8787/api/audit?entityType=lead&entityId=<lead id>"

# 7. GET /api/assessments/search (EAP-3) resolves through the same gate.
#    GET /api/assessments/:id additionally records a real assessment.viewed
#    audit event on this same authenticated read:
curl -s -b cookies.txt "http://localhost:8787/api/assessments/search?riskLevel=critical"

curl -s -b cookies.txt "http://localhost:8787/api/assessments/<a real assessment id>"
curl -s -b cookies.txt "http://localhost:8787/api/audit?entityType=assessment&entityId=<assessment id>"
# shows the real assessment.created (from creation) and assessment.viewed
# (from the read just above) events.
```

Steps 1–3 use Auth.js's real flow end to end (real CSRF token, real magic link, real session cookie) — nothing here is a test-only shortcut. Only step 4 (granting the role) is a direct database write, because no route exists to do it any other way.

To check what actually landed in the database (not just trusting the HTTP response):

```bash
npx wrangler d1 execute titan-platform-db --local \
  --command="SELECT * FROM leads ORDER BY created_at DESC LIMIT 5"
```

## Running the frontend against the local Worker

```bash
# terminal 1
cd titan/packages/platform && npm run dev        # :8787

# terminal 2
cd titan/apps/web
echo "VITE_API_BASE_URL=http://localhost:8787" > .env.local
npm run dev                                        # :5173
```

`.env.local` is gitignored (`*.local` in `titan/.gitignore`). The Worker's default `ALLOWED_ORIGIN` (`wrangler.toml`) is `http://localhost:5173`, matching Vite's default port — if you run Vite on a different port, update `ALLOWED_ORIGIN` in `.dev.vars` or `wrangler.toml` to match, or CORS will reject the frontend's requests (by design). This same value also has to match what the admin app needs below — it's the one Worker var that CORS, the Auth.js `redirect` callback, and the CSP `form-action` allowlist all read from (`ARCHITECTURE.md`'s "Admin Application architecture" section), so changing Vite's port means updating exactly one place, not three.

## Signing in to the Admin Application (`/admin`, EAP-1)

With both servers running (previous section), visit `http://localhost:5173/admin` in a real browser.

1. **Unauthenticated:** you're redirected to the real Auth.js sign-in page at `http://localhost:8787/api/auth/signin`, with a `callbackUrl` back to `/admin`. This is a real, full-page navigation (`window.location.href`), not an in-app modal — `RequireAuth` doesn't implement its own login form, it links to Auth.js's own hosted one.
2. **Sign in** with the dev-mode Email provider: enter any email, submit — `wrangler dev`'s stdout logs the real magic link (`"sign-in link generated (dev mode — not actually emailed)"`) instead of sending it. Open that URL (same browser, so the CSRF-protected sign-in cookie carries over) to complete sign-in.
3. You land back on `/admin`, signed in, seeing the Dashboard. Every section that doesn't need the Platform Administrator role (platform health, system status) shows real data immediately. The four privileged sections (org/lead/assessment metrics, audit summary) show **"Platform Administrator role required to view this"** — an honest state, not an error — until the signed-in user is actually granted that role (below).
4. **Grant Platform Administrator** to the account you just signed in with, using "Provisioning a local Platform Administrator" below — then reload `/admin`. The four previously-forbidden sections now render real data from the same local D1 instance.
5. **Sign out** via the header's real "Sign out" link (`Header`'s `session` prop, `AdminLayout.tsx`) — another real, full-page navigation to Auth.js's own sign-out confirmation page, which redirects back to the public site's home page once confirmed. If this redirect appears to hang or silently fail after clicking the sign-out page's own "Sign out" button, see "Common problems" below — this exact path had a real bug (CSP blocking the cross-origin redirect) that's now fixed, but is worth knowing about if it ever regresses.

This whole flow (steps 1–3, 5) is also covered by a committed Playwright E2E suite (`apps/web/e2e/admin-dashboard.spec.ts`) that seeds a session directly in D1 rather than driving the Email provider's UI — see that file's own top comment for why, and `npm run test:e2e --workspace=@titan/web` (`DEVELOPER_GUIDE.md`) to run it.

## Managing leads through the Admin Application (`/admin/leads`, EAP-2)

With a Platform Administrator session (previous section), the sidebar shows a **Leads** link (`adminNavItems`, `apps/web/src/features/admin/layout/navItems.ts`) — hidden entirely for a non-Platform-Administrator, not shown-then-blocked, since `me.isPlatformAdministrator` (`GET /api/me`) is already known client-side by the time the shell renders.

1. **Lead Workspace** (`/admin/leads`): a real, server-backed table — search (debounced 300ms, `useLeadSearch.ts`), status/priority/assigned-to filters, sortable columns (click a column header to sort, click again to reverse), and pagination, all driven by `GET /api/leads/search`. **Save filter** stores the current search/filters/sort under a name in the browser's `localStorage` (`leadWorkspacePreferences.ts`) — a per-browser convenience, not a server-side saved view; it does not sync across devices or sessions. **Columns** (the `<details>` disclosure above the table) toggles optional columns (email, assigned to, tags, created date) — also `localStorage`-backed.
2. **Lead Details** (`/admin/leads/:id`): click any row to navigate here. Shows identity/organization, the real submitted assessment (risk breakdown and findings grouped by severity, derived from the same server-computed `result` `SECURITY_GUIDE.md`'s Surface 1 table describes — never a fabricated "recommendations" list, since no recommendations engine exists in this codebase), lifecycle controls (status/priority/assignment/tags/notes), and a real activity/audit timeline sourced from `GET /api/audit?entityType=lead&entityId=...` — not client-side filtering of the whole audit table.
3. **Lifecycle changes apply immediately** — each status/priority/assignment/tag/note change is its own `PATCH /api/leads/:id` call (`useLeadDetail.ts`'s `updateLifecycle`), not staged behind a separate "Save" step. Each one also lands as its own `audit_events` row (`lead.status_changed`, `lead.priority_changed`, `lead.assigned`, `lead.tags_changed`, `lead.note_added` — `router.ts`'s `updateLead`), visible immediately in the same page's activity timeline.
4. **Assignment is "assign to me" or "unassign" only** — there is no user directory to pick a different real person from. Deliberate, not missing functionality; see `SECURITY_GUIDE.md`'s "Known, accepted gaps" for why.

This whole flow is also covered by a committed Playwright E2E suite (`apps/web/e2e/lead-workspace.spec.ts`) that seeds real leads directly in D1 and drives real search/filter/lifecycle-update/reload interactions through a real browser — see `DEVELOPER_GUIDE.md`'s Playwright section to run it.

## Managing assessments through the Admin Application (`/admin/assessments`, EAP-3)

With a Platform Administrator session (above), the sidebar shows an **Assessments** link (`adminNavItems`), hidden entirely for a non-Platform-Administrator, the same convention as **Leads**.

1. **Assessment Workspace** (`/admin/assessments`): a real, server-backed table — search (debounced 300ms, matches id/organizationId/createdBy substrings — an assessment has no name/email/company the way a lead does), framework/risk-level filters, sortable columns, and pagination, all driven by `GET /api/assessments/search`. A **Compliance Intelligence** panel above the table shows aggregate risk distribution, framework status, outstanding findings by DPDP section, and month-over-month risk trend — computed client-side from `GET /api/assessments` (the same full-list endpoint the Dashboard already uses), not a new aggregation endpoint. **Save filter**/**Columns** work identically to Leads (`localStorage`-backed, per-browser).
2. **Assessment Details** (`/admin/assessments/:id`): click any row's reference link to navigate here. Shows metadata (framework/version, an honest "Completed" status — an assessment has no draft/in-progress lifecycle to represent, `DECISION_LOG.md`'s EAP-3 entry — completion timestamp, organization, owner), Risk & compliance results (risk badge/score, severity breakdown, findings by severity, category coverage by DPDP section, and every question's own real answer with a Pass/Gap status for scored questions — all from the assessment's own server-computed `result`, never recomputed here), Lead linkage (real leads this assessment produced, via `GET /api/leads/search?assessmentId=...`), and a real audit timeline (`assessment.created`/`assessment.viewed`) sourced from `GET /api/audit?entityType=assessment&entityId=...`.
3. **Nothing here is editable** — unlike Leads, an assessment has no lifecycle to change, so there is no "Save"/PATCH step anywhere on this page.

This whole flow is also covered by a committed Playwright E2E suite (`apps/web/e2e/assessment-center.spec.ts`) that seeds real assessments/leads directly in D1 and drives real search/filter/detail-navigation/lead-linkage interactions through a real browser — see `DEVELOPER_GUIDE.md`'s Playwright section to run it.

## Structured logs

Every request produces one JSON log line (`observability/logger.ts`) with `level`, `message`, `timestamp`, and a `requestId` that also appears as an `X-Request-Id` response header — grep `wrangler dev`'s output for a specific `requestId` to trace one request, or for `"level":"error"` to find failures. Audit-write failures log at `error` level but never fail the request they describe (`router.ts`'s `recordAuditEvent`).

## Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| `/api/auth/*` returns 404 | `AUTH_SECRET` not set | Check `.dev.vars` exists and `wrangler dev`'s startup output shows `env.AUTH_SECRET ("(hidden)")` |
| Frontend lead submission fails with a network error | Worker not running, or `VITE_API_BASE_URL` not set/wrong | Confirm `wrangler dev` is running on the port `.env.local` points at |
| Frontend lead submission fails with a CORS error in the browser console | `ALLOWED_ORIGIN` doesn't match the Vite dev server's actual origin | Match `ALLOWED_ORIGIN` (`.dev.vars` or `wrangler.toml`) to the Vite server's real `http://localhost:PORT` |
| `wrangler d1 migrations apply` reports migrations already applied | Expected — migrations are idempotent and tracked per-database; re-running is safe | No action needed |
| Rate-limit (429) responses appear unexpectedly during local testing | The in-memory rate limiter (`security/rateLimiter.ts`) is per-`wrangler dev`-process and doesn't reset between runs within the same window | Wait out the window (60s default), or restart `wrangler dev` |
| Signing in to `/admin` succeeds, but the browser never lands back on the app (session/CORS errors in the console, or the fetch to `/api/me` fails) | `ALLOWED_ORIGIN` doesn't match `/admin`'s real origin, or `.dev.vars`/`wrangler.toml` predates EAP-1's CORS-credentials change | Confirm `ALLOWED_ORIGIN` matches Vite's real origin exactly (scheme+host+port); restart `wrangler dev` after any `.dev.vars`/`wrangler.toml` edit — CORS/redirect/CSP allowlists are all read once at request time from the same `env.ALLOWED_ORIGIN` |
| Sign-out on `/admin` appears to hang, or lands somewhere unexpected, after clicking the Auth.js confirmation page's own "Sign out" button | If this ever regresses: the CSP `form-action` directive also restricts the *redirect* a form submission causes, not just its POST target — `http/finalizeResponse.ts`'s `authPagesCsp` must allowlist the admin app's origin, not just `'self'` (`DECISION_LOG.md`'s EAP-1 entry has the full finding) | Confirm `authPagesCsp(allowedOrigin)` is actually being passed the real `allowedOrigin` (not a hardcoded `'self'`-only policy) on `/api/auth/*` responses |
| A lifecycle change on `/admin/leads/:id` (status/priority/assignment/tags/notes) silently has no effect, and the browser console shows `Method PATCH is not allowed by Access-Control-Allow-Methods` | If this ever regresses: a browser's CORS preflight (`OPTIONS`) checks the real request's method against the `Access-Control-Allow-Methods` response header and blocks the real request client-side if it's missing — invisible to any test that calls `handleRequest`/`worker.fetch` directly, since neither implements real preflight enforcement (`DECISION_LOG.md`'s EAP-2 entry has the full finding, first caught by this feature's own real-browser Playwright verification) | Confirm `http/cors.ts`'s `ALLOWED_METHODS` lists every method any route actually uses, including `PATCH` |

## What this runbook does not cover

Deployment. There is no deployment runbook because there has never been a deployment — no Cloudflare account or credentials have existed in any environment this project has run in. Writing deployment steps now would be speculative instructions for infrastructure that doesn't exist; this document only covers what has actually been run and verified.
