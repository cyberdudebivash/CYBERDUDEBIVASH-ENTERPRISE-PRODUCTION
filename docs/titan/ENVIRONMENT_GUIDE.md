# Environment Guide — Titan (PRD-1)

What "environment" means in this codebase, what actually exists for each one today, and how to add a new one. Written from direct verification of `titan/packages/platform/wrangler.toml` and `titan/packages/platform/src/config/validateEnv.ts` (PRD-1) — not a plan, a description of what's actually configured.

## The four tiers

| Tier | Exists today | Where it's defined | Purpose |
|---|---|---|---|
| **Development** | ✅ Real, used every session | `wrangler.toml`'s default (unnamed) block + `.dev.vars` (gitignored, from `.dev.vars.example`) | A developer's own machine/container: `wrangler dev`, local D1 under `.wrangler/state` |
| **Test** | ✅ Real, runs on every `npm run test`/CI push | No `wrangler.toml` env — Vitest's own in-memory/sql.js-backed repositories (`repositories/testUtils/testD1.ts`) and Playwright's own `webServer`-managed `wrangler dev` instance | Fully isolated per test run, never touches a developer's own local D1 state |
| **Staging** | ⚠️ Configuration exists; never deployed | `wrangler.toml`'s `[env.staging]` block (PRD-1) | Where a real deploy would be validated before production — no real Cloudflare database/domain assigned yet (placeholders, see below) |
| **Production** | ⚠️ Configuration exists; never deployed | `wrangler.toml`'s `[env.production]` block (PRD-1) | The real, customer-facing tier — no real Cloudflare database/domain assigned yet (placeholders, see below) |

**This project has never had a Cloudflare account, API token, or deployed Worker in any environment it has run in** (a standing fact recorded in `DECISION_LOG.md` since Stage 4, still true after PRD-1). Staging and production are real, structurally-verified *configuration* — not real, deployed *infrastructure*. See `DEPLOYMENT_GUIDE.md`'s "First real deploy checklist" for exactly what turns a tier from configured to real.

## What actually differs between environments

`config/validateEnv.ts`'s `validateProductionConfig` is the one place this codebase encodes environment-tier behavior — everything else (routes, repositories, authorization) is identical code across every tier; only the `env.*` values differ.

| Var | Development | Staging/Production |
|---|---|---|
| `ENVIRONMENT` | unset (falls back to `"local development (never deployed)"`, `config/validateEnv.ts`'s `DEFAULT_ENVIRONMENT_NAME`) | `"staging"` / `"production"` (`wrangler.toml`'s own `[vars]` per environment) |
| `DB` (D1 binding) | `titan-platform-db`, a local SQLite file under `.wrangler/state` | `titan-platform-staging-db` / `titan-platform-production-db` — **real `database_id` values are still `REPLACE_WITH_REAL_*` placeholders** (verified: `npm run config:check:staging`/`config:check:production` in `packages/platform`, PRD-1) |
| `ALLOWED_ORIGIN` | `http://localhost:5173` (Vite's default dev port) | Real placeholder text (`REPLACE_WITH_REAL_*_FRONTEND_ORIGIN`) until a real Pages deployment exists |
| `AUTH_SECRET` | Real, generated locally (`openssl rand -base64 32`, never committed) in `.dev.vars` | A real `wrangler secret put AUTH_SECRET --env <tier>` value — never in `wrangler.toml`, never in this repository (`SECURITY_GUIDE.md`'s "Secrets management") |

A caller can distinguish which tier a deployment is running as via `GET /api/operations/summary`'s `overview.environment` (Platform-Administrator-only, EAP-7) — real, not guessed from any other signal (request origin, hostname, etc.).

## How `validateProductionConfig` behaves per tier

- **Development/test** (`ENVIRONMENT` unset or anything other than `"staging"`/`"production"`): no checks run at all — `isProductionTier: false`, always `valid: true`. A local `.dev.vars` missing `AUTH_SECRET` degrades to "no `/api/auth/*` routes" (worker.ts's own existing behavior since RC1), not a validation failure — this is expected, not a gap.
- **Staging/production**: `AUTH_SECRET` must be set and must not equal the literal placeholder shipped in `.dev.vars.example`; `ALLOWED_ORIGIN` must be set, must not contain `localhost`/`127.0.0.1`, and should be `https://` (a `http://` value in a real tier is a warning, not an error — still flagged, never silently accepted).
- The result is surfaced two ways: once as a real, one-time-per-isolate `logger.error` call (`worker.ts`) if invalid, and continuously via `GET /api/operations/summary`'s new `configuration` field (`{valid, issues[]}`) — every issue names the field and a human-readable reason, **never a secret's actual value**.
- Verified end to end (not just unit-tested in isolation) — `worker.test.ts`'s two PRD-1 tests drive a real `env.ENVIRONMENT: "production"` through the actual `worker.ts` wiring, once misconfigured (missing `ALLOWED_ORIGIN`, confirms a real issue is reported) and once fully configured (confirms `valid: true`, zero issues).

## Adding a new environment

1. Add a new `[env.<name>]` block to `wrangler.toml`, following `[env.staging]`'s exact shape: a `name`, a `[[env.<name>.d1_databases]]` block (its own `database_name`/`database_id`, `migrations_dir = "migrations"`), and a `[env.<name>.vars]` block setting at least `ENVIRONMENT` and `ALLOWED_ORIGIN`.
2. Extend `scripts/check-wrangler-config.mjs`'s `["staging", "production"]` allow-list (and `scripts/validate-secrets.mjs`'s, `scripts/release.mjs`'s) to include the new name — each currently hardcodes exactly two names, on purpose (this repository has exactly two real target tiers today; adding a third is a deliberate, reviewable one-line change per script, not a speculative generic N-environment system built ahead of a second real use case).
3. Extend `config/validateEnv.ts`'s `PRODUCTION_TIER_ENVIRONMENTS` set if the new environment should be held to the same production-grade config checks (a pre-production tier like a second staging slot probably should; a genuinely different-purpose tier might not).
4. Verify structurally before doing anything else: `npx wrangler deploy --dry-run --env <name>` (no Cloudflare credentials required — resolves and prints every real binding, the same check used to verify `staging`/`production` throughout PRD-1).
5. Add a new `[env.<name>]` row to this document's own "What actually differs" table and a new job (or parameterize the existing ones) in `.github/workflows/titan-deploy.yml`'s `workflow_dispatch` `target_environment` choice list.

## What this document does not cover

Real Cloudflare account setup, DNS, custom domains, and TLS certificate provisioning — none of these can be configured from this repository alone (they require a real Cloudflare account and a real domain this project has never had). `DEPLOYMENT_GUIDE.md`'s "First real deploy checklist" names the exact real-world steps a future deployer needs to take outside this repository before any environment here stops being configuration-only.
