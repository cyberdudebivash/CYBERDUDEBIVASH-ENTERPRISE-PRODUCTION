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
# [] on a fresh DB, or seed.sql's one lead if seeded

curl -s -X POST http://localhost:8787/api/assessments \
  -H "Content-Type: application/json" \
  -d '{"framework":"dpdp","frameworkVersion":"v1","answers":{},"result":{"score":0,"riskLevel":"low","breakdown":{"critical":0,"high":0,"medium":0,"low":0,"total":0},"gaps":[],"scoredQuestionCount":12},"createdAt":"2026-01-01T00:00:00.000Z"}'
# 201, returns the saved assessment with a generated id

curl -s http://localhost:8787/api/auth/session
# null (no session cookie) — confirms Auth.js + the D1 adapter are wired correctly
```

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

`.env.local` is gitignored (`*.local` in `titan/.gitignore`). The Worker's default `ALLOWED_ORIGIN` (`wrangler.toml`) is `http://localhost:5173`, matching Vite's default port — if you run Vite on a different port, update `ALLOWED_ORIGIN` in `.dev.vars` or `wrangler.toml` to match, or CORS will reject the frontend's requests (by design).

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

## What this runbook does not cover

Deployment. There is no deployment runbook because there has never been a deployment — no Cloudflare account or credentials have existed in any environment this project has run in. Writing deployment steps now would be speculative instructions for infrastructure that doesn't exist; this document only covers what has actually been run and verified.
