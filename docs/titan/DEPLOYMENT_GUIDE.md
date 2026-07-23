# Deployment Guide — Titan (PRD-1)

How Titan gets deployed — the real automation this phase built, what it does and doesn't prove, and the exact checklist a future session needs to complete before any of it deploys somewhere real. See `ENVIRONMENT_GUIDE.md` for what "staging"/"production" mean in this codebase today, and `DISASTER_RECOVERY.md` for backup/restore/rollback procedures.

**This project has never had a Cloudflare account, API token, custom domain, or deployed Worker/Pages project in any environment it has run in.** Everything below is real, structurally-verified automation and documentation — not a claim that a deployment has happened. Every command in this guide that requires real Cloudflare credentials has been run against this repository and confirmed to fail with exactly the expected authentication error, not a code or config bug (`DECISION_LOG.md`'s PRD-1 entry has the full evidence).

## Deployment targets (`ARCHITECTURE.md`'s own, pre-existing "Decided" row)

| Component | Cloudflare product | Deployed via |
|---|---|---|
| `@titan/platform` (backend/API) | Workers | `wrangler deploy --env <staging\|production>` |
| `@titan/web` (app shell — `/admin`, `/portal`, `/assessment/dpdp`) | Pages | `wrangler pages deploy dist --project-name=titan-web-<env>` |
| Database | D1 | `wrangler d1 migrations apply <db> --env <env> --remote` |

R2 (object storage) and Queues (async work) are named in the original Phase 2 master prompt's "full platform" recommendation but **are not wired anywhere in this codebase** — nothing generates a server-side PDF to store or dispatches an async email/report job yet (no email provider has ever been decided, `ARCHITECTURE.md`). Adding either binding now would be dead configuration with nothing to exercise it; they become real work items the day server-side PDF storage or async delivery actually gets built, not before. Turnstile (bot mitigation) is the same story — no public form in this codebase has ever needed it evaluated as a real requirement. None of the three is deferred by oversight; each is a named, evidence-based "not yet justified," not a gap.

## Environments

See `ENVIRONMENT_GUIDE.md` for the full picture. In short: `wrangler.toml` has `[env.staging]` and `[env.production]` blocks (PRD-1), each structurally verified via `wrangler deploy --dry-run --env <name>` (works with zero Cloudflare credentials — confirms every binding resolves correctly). Neither has real `database_id`/`ALLOWED_ORIGIN` values yet; both still carry this project's own literal `REPLACE_WITH_REAL_*` placeholders, checked by `npm run config:check:staging`/`config:check:production` (`packages/platform`).

## CI/CD pipeline

Two independent GitHub Actions workflows touch `titan/`:

| Workflow | Trigger | Does |
|---|---|---|
| `titan-ci.yml` (pre-existing, untouched by PRD-1) | Every push/PR touching `titan/**` | typecheck → lint → format → build → test |
| `titan-deploy.yml` (PRD-1, new) | **Manual only** (`workflow_dispatch`, an `environment` choice input) | validate → config/secrets check → migrate → deploy Worker → deploy Pages → smoke test |

`titan-deploy.yml` is deliberately never triggered by a push or tag — an accidental push should never attempt a real deployment. It is fully independent of `titan-ci.yml` and of `deploy.yml` (the marketing site's own, separate pipeline): no shared jobs, no shared secrets, no way for a run of one to affect either of the others.

Its six jobs, in dependency order: `validate` (the same quality gate `titan-ci.yml` runs, duplicated rather than shared — see "Known limitations" below) → `config-and-secrets-check` (this phase's own `check-wrangler-config.mjs`/`validate-secrets.mjs`) → `migrate-database` (`wrangler d1 migrations apply --remote` — every migration in this repository is additive-only, verified by grepping all 12 files for `DROP TABLE`/`DROP COLUMN`, none found — so applying before the new Worker code deploys is the safe "expand" half of an expand/contract schema change) → `deploy-worker` → `deploy-pages` (parallel with the migrate/deploy-worker chain, since Pages doesn't depend on the Worker being live first) → `smoke-test` (this phase's own `smoke-test.mjs`, skippable via the workflow's own input).

This workflow has never completed a real run — every job past `config-and-secrets-check` needs `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` repository or environment secrets that don't exist in this repository. Its YAML syntax is verified (parses cleanly, `python3 -c "import yaml; yaml.safe_load(...)"`, and its job dependency graph matches the design above exactly) and its `wrangler` command flags are verified against this project's real installed `wrangler` 4.112.0 (`wrangler <subcommand> --help`, not assumed from memory — two real flag mistakes were caught and fixed exactly this way while building it: `wrangler secret list` needs `--format json`, not `--json`; `wrangler d1 execute --local` requires the target database name to already exist in `wrangler.toml`).

## Release automation scripts (`packages/platform/scripts/`, all real, all tested locally)

| Script | What it does | Verified how |
|---|---|---|
| `check-wrangler-config.mjs --env <tier>` | Fails if `wrangler.toml`'s `[env.<tier>]` block still has an unfilled `REPLACE_WITH_REAL_*` placeholder | Run for real against both `staging`/`production` (correctly found both real placeholders) and against a locally-simulated filled-in config (correctly found none) |
| `validate-secrets.mjs --local` | Checks `.dev.vars` has the required secret names set, without ever printing a value | Run for real against this container's own `.dev.vars` — confirmed `AUTH_SECRET` present |
| `validate-secrets.mjs --env <tier>` | Same check via `wrangler secret list --env <tier> --format json` (Cloudflare's own API only ever returns secret *names*, never values — write-only by design) | Run for real; fails with the expected `CLOUDFLARE_API_TOKEN` authentication error, not a script bug |
| `db-backup-local.mjs` | Wraps `wrangler d1 export --local` with a timestamped output path under `backups/` (gitignored) | Run for real — produced a 1341-line, 1183-INSERT-statement real export of this session's own accumulated local D1 data |
| `smoke-test.mjs --base-url <url>` | Hits `/health`, `/health/ready`, and two representative authorization-gated routes, asserting real status codes | Run for real against a live local `wrangler dev` instance (4/4 pass) and against an unreachable URL (correctly reports 0/4 and exits non-zero) |
| `release.mjs --env <tier>` | Orchestrates config check → secrets check → `wrangler deploy` → a smoke-test reminder | Run for real — correctly stops at step 1 today (unfilled placeholders), exits 1 |

Also wired into `packages/platform/package.json`: `db:backup:local`, `config:check:staging`/`:production`, `secrets:validate:local`/`:staging`/`:production`, `smoke-test`, `deploy:dry-run:staging`/`:production` (real, safe, credential-free — see below), `release:staging`/`:production`, `rollback:staging`/`:production`.

## What's safe to run today vs. what needs real credentials

| Command | Needs Cloudflare credentials? | Status |
|---|---|---|
| `npm run config:check:staging` / `:production` | No | ✅ Real, run, correctly fails today (placeholders still present) |
| `npm run secrets:validate:local` | No | ✅ Real, run, passes |
| `npx wrangler deploy --dry-run --env staging` / `--env production` | No | ✅ Real, run, prints real resolved bindings |
| `npm run db:backup:local` | No (local D1 only) | ✅ Real, run, produces a real export |
| `npm run smoke-test -- --base-url http://localhost:8787` | No (local Worker) | ✅ Real, run, 4/4 pass |
| `npm run secrets:validate:staging` / `:production` | **Yes** | Fails with a real, expected `CLOUDFLARE_API_TOKEN` error |
| `npm run deploy:staging` / `:production` (i.e. `wrangler deploy --env <tier>`) | **Yes** | Never run — would fail the same way |
| `npm run rollback:staging` / `:production` | **Yes** | Never run |
| `.github/workflows/titan-deploy.yml` past its `config-and-secrets-check` job | **Yes** | Never completed a real run |

**GA-1's own new finding: a second, independent gate exists before the credentials one.** Actually attempting to trigger `titan-deploy.yml` via `workflow_dispatch` from a development session requires the caller's own GitHub API token/App installation to hold `actions:write` on this repository — a development session's own integration was confirmed this pass to lack it (`403 Resource not accessible by integration`, encountered immediately, before `config-and-secrets-check` would even start). A real deploy therefore needs **both** a human with real repository access clicking "Run workflow" in the GitHub UI (or a token/App scoped with `actions:write`) **and** the `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` secrets below — neither alone is sufficient, and this document's own "First real deploy checklist" step 8 assumes the former without previously stating it explicitly.

## First real deploy checklist

Everything below is a real, external, one-time action a future session (or a human) needs to take — none of it can be done from inside this repository alone:

1. **Create a real Cloudflare account** (if one doesn't already exist for this project).
2. **Create two real D1 databases**: `npx wrangler d1 create titan-platform-staging-db` and `...-production-db`. Paste each real `database_id` into `wrangler.toml`'s matching `[env.<tier>.d1_databases]` block, replacing the `REPLACE_WITH_REAL_*_D1_DATABASE_ID` placeholder.
3. **Deploy `@titan/web` to Cloudflare Pages once** (via `wrangler pages deploy` or the dashboard) to get a real frontend origin per tier, then paste it into `wrangler.toml`'s matching `ALLOWED_ORIGIN`, replacing the `REPLACE_WITH_REAL_*_FRONTEND_ORIGIN` placeholder.
4. **Set real secrets per environment** — never in `wrangler.toml` (`SECURITY_GUIDE.md`'s "Secrets management"): `npx wrangler secret put AUTH_SECRET --env staging` (and `--env production`, with a different real value — see `SECURITY_GUIDE.md` on secret rotation/separation), plus `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`/`AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` if/when real OAuth app credentials exist (optional — the app runs correctly with only Email sign-in configured, same as local dev today), and `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (from the Razorpay Dashboard's own Settings → API Keys) before the DPDP Compliance Scanner's paywall can process a real payment — optional in the identical sense the OAuth vars are: `worker.ts` only constructs `razorpayCredentials` when both are present, so the Razorpay routes correctly serve a real 503 rather than crash if they're left unset.
5. **Create the repository secrets `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`** (GitHub repo Settings → Secrets) so `titan-deploy.yml` can authenticate. A token scoped to exactly Workers/Pages/D1 edit permissions on this account only — not a full account-owner token.
6. **(Recommended) Configure GitHub Environment protection rules** for the `staging`/`production` environments this workflow already references (`environment: ${{ inputs.target_environment }}`) — required reviewers, a wait timer — via repo Settings → Environments. This is a GitHub web-UI/API setting, not a file in this repository, so it cannot be done from here.
7. Run `npm run config:check:staging` locally — should now report no placeholders.
8. Trigger `titan-deploy.yml` manually with `target_environment: staging` first. Once verified (real smoke test passing, a real manual walkthrough of `OPERATIONAL_RUNBOOK.md`'s existing curl checks against the real staging URL), repeat for `production`.
9. Set a real custom domain + DNS + TLS (Cloudflare's own dashboard) once ready to move off the default `*.workers.dev`/`*.pages.dev` subdomains — genuinely out of this repository's reach until a real domain is chosen for Titan specifically (the existing `cyberdudebivash.com` marketing site's own domain/DNS are unrelated and untouched by any of this).

## Rollback

`npm run rollback:staging`/`:production` wraps `wrangler rollback --env <tier>`, Cloudflare's own built-in instant Worker rollback to a previous deployment. Two things this does **not** do, stated plainly: it rolls back Worker *code*, not D1 *schema* — a migration already applied to a real remote D1 database is not undone by rolling back the Worker that shipped alongside it (see `DISASTER_RECOVERY.md`'s "Migration rollback" section for what a schema rollback actually requires); and Cloudflare Pages has its own separate rollback mechanism (redeploying a previous Pages deployment via the dashboard or `wrangler pages deployment list` + a redeploy) — `wrangler rollback` only ever targets Workers.

## Promotion

Cloudflare Workers deploys from source on every `wrangler deploy` call — there is no "promote this exact staging artifact to production" primitive the platform provides. The real, correct equivalent this project's tooling supports: validate a specific commit against staging (`titan-deploy.yml` with `target_environment: staging` at that commit), then re-run the identical workflow with `target_environment: production` **at the same commit SHA** (checking out that exact ref, not `main`'s current tip) — the same code, re-deployed to a different target, rather than a fabricated "promotion" step this platform doesn't actually have.

## Known limitations

- `titan-ci.yml` and `titan-deploy.yml`'s own `validate` job duplicate the same five quality-gate steps rather than sharing one reusable workflow — a deliberate choice to avoid modifying `titan-ci.yml` at all (`DECISION_LOG.md`'s "never redesign a stable system" discipline, applied here to CI itself), accepted as minor, real technical debt rather than hidden.
- No artifact-promotion mechanism exists because Cloudflare Workers doesn't have one (see "Promotion" above) — not a gap in this repository's own tooling.
- `titan-deploy.yml`'s `deploy-pages` job assumes `VITE_API_BASE_URL`/`TITAN_API_BASE_URL` are set as real GitHub Actions Variables once a real backend URL exists — neither is configured today (no real deployment to point at yet).
