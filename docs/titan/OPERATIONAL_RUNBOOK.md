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

curl -s -X POST http://localhost:8787/api/organizations \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Fintech","slug":"acme-fintech","industry":"Financial Services","region":"APAC","tags":["enterprise"],"createdAt":"2026-01-01T00:00:00.000Z"}'
# 401 with no session cookie — EAP-4: unlike POST /api/leads/POST /api/assessments
# (anonymous, public flows), POST /api/organizations is Platform-Administrator-only
# and CSRF-checked. See "Provisioning a local Platform Administrator" below for an
# authenticated example. A duplicate slug returns 409 slug_conflict, not a 500.

curl -s "http://localhost:8787/api/organizations/search?status=active&sortBy=name&sortDirection=asc"
curl -s http://localhost:8787/api/organizations/some-org-id
curl -s -X PATCH http://localhost:8787/api/organizations/some-org-id \
  -H "Content-Type: application/json" \
  -d '{"industry":"Healthcare"}'
# 401 for all three with no session cookie — EAP-4: same Platform Administrator
# gate as the routes above. PATCH additionally requires a matching Origin header
# once authenticated, same as PATCH /api/leads/:id.
```

### Provisioning a local Platform Administrator

`GET /api/leads`, `GET /api/leads/:id`, `PATCH /api/leads/:id`, `GET /api/leads/search` (EAP-2), `GET /api/organizations`, `GET /api/assessments` (list), `GET /api/assessments/search` (EAP-3), `POST /api/organizations`, `GET /api/organizations/search`, `GET /api/organizations/:id`, `PATCH /api/organizations/:id` (EAP-4), `GET /api/users/search`, `GET /api/users/:id`, `POST /api/users/:id/profiles`, `PATCH`/`DELETE /api/users/:id/profiles/:profileId` (EAP-5), `GET /api/audit`, `GET /api/audit/search`, `GET /api/audit/export` (EAP-6), cross-organization `GET /api/assessments/:id` reads, and the admin Dashboard's four privileged sections (EAP-1, above) all require a **Platform Administrator** — a `user_profiles` row with `organization_id: NULL` and `role: 'owner'` (`SECURITY_GUIDE.md`'s "Authorization model"). There is no self-service route that grants the *very first* one — deliberately, since an endpoint that lets a caller grant themselves platform-wide access from zero privileges would itself be a privilege-escalation vulnerability. Provisioning the first one locally is a real sign-in followed by a direct SQL insert; **every Platform Administrator grant after that first one can go through `POST /api/users/:id/profiles` instead (EAP-5, step 9 below)** — a real, audited endpoint call, not a second direct SQL insert:

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

# 8. POST /api/organizations (EAP-4) resolves through the same gate, plus the
#    same Origin requirement as step 6's PATCH (this is an authenticated
#    write, unlike the anonymous POST /api/leads/POST /api/assessments):
curl -s -b cookies.txt -X POST "http://localhost:8787/api/organizations" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"name":"Acme Fintech","slug":"acme-fintech","industry":"Financial Services","region":"APAC","tags":["enterprise"],"createdAt":"'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"}'
# 201, returns the saved organization (status defaults to "active"). Records
# a real organization.created audit event.

curl -s -b cookies.txt "http://localhost:8787/api/organizations/search?status=active"
curl -s -b cookies.txt "http://localhost:8787/api/organizations/<the id from step 8's response>"
# GET /api/organizations/:id also records a real organization.viewed event.

curl -s -b cookies.txt -X PATCH "http://localhost:8787/api/organizations/<org id>" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"status":"archived","note":"Contract lapsed"}'
# 200, returns the updated organization. Records organization.archived and
# organization.note_added audit_events rows (router.ts's updateOrganization),
# visible via:
curl -s -b cookies.txt "http://localhost:8787/api/audit?entityType=organization&entityId=<org id>"
# shows organization.created, organization.viewed, organization.archived, and
# organization.note_added.

# 9. GET /api/users/search, GET /api/users/:id (EAP-5) resolve through the
#    same gate. GET /api/users/:id additionally records a real user.viewed
#    audit event, and returns the target's own real UserProfileRecord[]:
curl -s -b cookies.txt "http://localhost:8787/api/users/search?search=admin"
curl -s -b cookies.txt "http://localhost:8787/api/users/<user-id from step 3, or any other real user id>"

# POST/PATCH/DELETE /api/users/:id/profiles (EAP-5) are Role Assignment's
# real write surface — same Origin requirement as steps 6/8's writes. This
# is the real, self-service replacement for step 4's direct SQL insert, for
# every grant *after* the very first Platform Administrator:
curl -s -b cookies.txt -X POST "http://localhost:8787/api/users/<some other real user-id>/profiles" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"organizationId":null,"role":"owner"}'
# 201, returns the new profile. Records a real user.role_granted audit event.

curl -s -b cookies.txt -X PATCH "http://localhost:8787/api/users/<that user-id>/profiles/<profile id from the response above>" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"role":"admin"}'
# 200, returns the updated profile. Records a real user.role_changed event —
# unless this profile is the *only* remaining Platform Administrator, in
# which case this (and DELETE below) return 409, not 200
# (wouldRemoveLastPlatformAdministrator, router.ts).

curl -s -b cookies.txt -X DELETE "http://localhost:8787/api/users/<that user-id>/profiles/<profile id>" \
  -H "Origin: http://localhost:5173"
# 200 if at least one other Platform Administrator still exists. Records a
# real user.role_revoked event — this system's first real deletion.

curl -s -b cookies.txt "http://localhost:8787/api/audit?entityType=user&entityId=<that user-id>"
# shows user.viewed, user.role_granted, user.role_changed, user.role_revoked.
```

Steps 1–3 use Auth.js's real flow end to end (real CSRF token, real magic link, real session cookie) — nothing here is a test-only shortcut. Only step 4 (granting the *very first* Platform Administrator) is a direct database write, because no route can exist to do that one any other way — every subsequent grant (step 9) is a real, audited endpoint call instead (EAP-5).

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

## Managing organizations through the Admin Application (`/admin/organizations`, EAP-4)

With a Platform Administrator session (above), the sidebar shows an **Organizations** link (`adminNavItems`), hidden entirely for a non-Platform-Administrator, the same convention as **Leads**/**Assessments**.

1. **Organization Workspace** (`/admin/organizations`): a real, server-backed table — search (debounced 300ms, matches name/slug/industry/region substrings), a status filter, sortable columns, and pagination, all driven by `GET /api/organizations/search`. **New organization** opens a real inline create form — name, identifier (auto-slugs from the name as you type, still directly editable), industry, region, and comma-separated tags — submitting calls the real `POST /api/organizations` and navigates straight to the new organization's Details page on success. **Save filter**/**Columns** work identically to Leads/Assessments (`localStorage`-backed, per-browser).
2. **Organization Details** (`/admin/organizations/:id`): click any row's name to navigate here. Shows Metadata (identifier, industry, region, tags, created, last activity — a real `updatedAt` column, refreshed by the server on every edit, not a caller-supplied value), **Health** (current risk, average score, and a real risk distribution — all derived from this organization's own linked assessments, honestly showing "No assessments linked to this organization yet" when there are none rather than a fabricated zero), **Relationships** (real linked leads and assessments, each a working link into the existing Lead Details/Assessment Details pages — not a copy of either), **Administration** (edit name/industry/region on blur, add/remove tags, archive/restore, add internal notes — every change a real `PATCH`), and **Activity & audit history** (a real timeline sourced from `GET /api/audit?entityType=organization&entityId=...`).
3. **Administrative changes apply immediately** — each metadata edit, tag change, archive/restore, or note is its own `PATCH /api/organizations/:id` call, not staged behind a separate "Save" step, and each lands as its own `audit_events` row (`organization.updated`, `organization.archived`, `organization.restored`, `organization.note_added` — `router.ts`'s `updateOrganization`), visible immediately in the same page's activity timeline.
4. **Archiving does not delete anything** — an archived organization stays fully visible (filterable by status in the Workspace, still reachable at its own Details URL) and can be restored at any time. There is no delete operation anywhere in this module, matching every other repository in this codebase.

This whole flow is also covered by a committed Playwright E2E suite (`apps/web/e2e/organization-workspace.spec.ts`) that drives a real create-via-form flow and seeds a real organization/assessment/lead directly in D1 for the Health/Relationships/Administration/audit checks — see `DEVELOPER_GUIDE.md`'s Playwright section to run it.

## Managing users through the Admin Application (`/admin/users`, EAP-5)

With a Platform Administrator session (above), the sidebar shows a **Users** link (`adminNavItems`), hidden entirely for a non-Platform-Administrator, the same convention as **Leads**/**Assessments**/**Organizations**.

1. **User Workspace** (`/admin/users`): a real, server-backed table — search (debounced 300ms, matches name/email substrings) and sortable Name/Email columns, driven by `GET /api/users/search`. **No "New user" control exists** — a person appears here only after they've actually signed in for the first time (Auth.js's own real sign-in is the only path that creates a row in `users`), and the page says so in plain text rather than offering a control that couldn't work.
2. **User Details** (`/admin/users/:id`): click any row's name to navigate here. Shows Identity (email, email-verified timestamp, user id), **Role Assignment** (every organization or platform-wide role this user currently holds, each with its own role-change dropdown and Revoke button, plus a grant form to add a new one — organization or "Platform-wide"), **Relationships** (real leads assigned to this user and real assessments they created, each a working link into the existing Lead Details/Assessment Details pages), and **Activity & audit history** (a real timeline sourced from `GET /api/audit?entityType=user&entityId=...`).
3. **Every Role Assignment change is a real server round-trip** — granting calls `POST /api/users/:id/profiles`, changing a role calls `PATCH /api/users/:id/profiles/:profileId`, and revoking calls `DELETE /api/users/:id/profiles/:profileId`, each re-rendering from the server's own re-read, never an optimistic local-only update. Each lands as its own `audit_events` row (`user.role_granted`/`user.role_changed`/`user.role_revoked` — `router.ts`).
4. **Revoking is a real deletion, not an archive** — the one exception to every other module's archive-not-delete pattern in this codebase, because a role grant (unlike a lead or an organization) has no dependent data of its own to preserve (`DECISION_LOG.md`'s EAP-5 entry). Changing or revoking the system's *only* remaining Platform Administrator grant is refused with a real error message instead — `wouldRemoveLastPlatformAdministrator` (router.ts) will not let a caller lock every Platform Administrator, including themselves, out of the system.

This whole flow is also covered by a committed Playwright E2E suite (`apps/web/e2e/user-management.spec.ts`) that seeds a real user/organization directly in D1 and drives a real search→detail→grant→change→revoke round trip through a real browser, including this codebase's first real `DELETE` request — see `DEVELOPER_GUIDE.md`'s Playwright section to run it.

## Managing the audit trail through the Admin Application (`/admin/audit`, EAP-6)

With a Platform Administrator session (above), the sidebar shows an **Audit** link (`adminNavItems`), hidden entirely for a non-Platform-Administrator, the same convention as **Leads**/**Assessments**/**Organizations**/**Users**.

1. **Audit Workspace** (`/admin/audit`): a real, server-backed table over every audit event any module has ever recorded — search (debounced, matches action/entity type/entity id substrings), filters for entity type, action, actor id, organization id, and a date range, sortable by timestamp, saved filters and column preferences (actor/organization/metadata columns, toggleable), driven by `GET /api/audit/search`. Existing per-entity audit panels (a lead's/assessment's/organization's/user's own "Activity & audit history") are unchanged — this is an additional, consolidated view over the same table, not a replacement for those.
2. **Audit Details**: click any row's timestamp to open an inline detail panel (not a separate page/route) showing actor, action, timestamp, entity (linked to that record's own detail page when one exists), organization, and the event's raw metadata — plus a "related events" list, the same entity's own trail (`GET /api/audit?entityType=...&entityId=...`, the pre-existing per-entity endpoint). The panel states plainly that this event log has no request-context (request id/IP/user-agent) or result-status column, rather than leaving those fields blank with no explanation.
3. **Investigation View**: the **Investigation** toggle switches the same filtered result set from a table to grouped cards — by entity, actor, or organization — each rendered as a `Timeline`, the same component every per-entity audit panel already uses. Groups only the currently-loaded page of results, not every matching row across every page.
4. **Export**: **Export CSV**/**Export JSON** downloads the current filter's matching events (capped at 10,000 rows) as a real file via `GET /api/audit/export` — respects every filter currently applied, not just the visible page.

This whole flow is also covered by a committed Playwright E2E suite (`apps/web/e2e/audit-center.spec.ts`) that seeds real audit events directly in D1 and drives a real search→filter→detail/Investigation→export round trip through a real browser, including asserting on the actual downloaded CSV file's content — see `DEVELOPER_GUIDE.md`'s Playwright section to run it.

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
