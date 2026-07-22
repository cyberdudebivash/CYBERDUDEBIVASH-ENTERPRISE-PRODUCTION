# Operations Guide (OPS-1)

The entry point for "how is Titan operated" — as distinct from `DEVELOPER_GUIDE.md` ("how do I build a feature in `titan/`"). Start here; it indexes every other operational document and says which one answers which question.

## Operational architecture

Titan is one Cloudflare Worker (`titan-platform`, `packages/platform`) behind Cloudflare's edge network, backed by one Cloudflare D1 database, serving a JSON API. The frontend (`@titan/web`) is a static-built SPA intended for Cloudflare Pages. There is no other running service: no separate background worker, no cron/scheduled task, no queue consumer — confirmed absent by `wrangler.toml` having no `[[queues]]`, `durable_objects`, or `[triggers]` block, and by the Operations Center's own "Background operations" panel stating this plainly rather than fabricating a queue view (EAP-7).

```
Browser / API client
       │
       ▼
Cloudflare edge (Worker: titan-platform)
       │                    │
       ▼                    ▼
  Cloudflare D1        Auth.js (in-process
  (env.DB)             library, not a
                        separate service)
```

Neither Worker nor D1 has ever been deployed — every real dependency edge above is exercised locally today (`wrangler dev` + local D1), verified structurally via `wrangler deploy --dry-run` for `staging`/`production` (`DEPLOYMENT_GUIDE.md`), never against a real Cloudflare account (`DECISION_LOG.md`).

## Dependency map

| Dependency | Required? | Checked by |
|---|---|---|
| Cloudflare D1 (`env.DB`) | Yes — every route ultimately reads/writes through it | `GET /health/ready` (real `SELECT 1`), `GET /api/operations/summary`'s per-repository reachability checks |
| `AUTH_SECRET` / `ALLOWED_ORIGIN` (production tier) | Yes, once `ENVIRONMENT` is `staging`/`production` | `config/validateEnv.ts`'s `validateProductionConfig`, surfaced via readiness (OPS-1) and `configuration` (PRD-1) |
| Auth.js OAuth providers (Google/GitHub) | No — optional, inactive without real credentials | Not health-checked; absence doesn't degrade readiness |
| Any third-party API | No — none exists. This system calls no external service at request time beyond D1 and (optionally) Auth.js's own OAuth token exchange | N/A |

## Service inventory

The six logical services the Operations Center checks (`GET /api/operations/summary`), each backed by a real repository over the one real D1 database above — not six separate deployed services:

| Service | Backs |
|---|---|
| `leads` | Lead Intelligence (EAP-2) |
| `assessments` | Assessment Center (EAP-3) |
| `organizations` | Organization Management (EAP-4) — optional, `configured: false` if a deployment doesn't wire it |
| `users` | Identity & User Management (EAP-5) — optional |
| `userProfiles` | Role assignment / RBAC membership (EAP-5) — optional |
| `audit` | Audit Center (EAP-6) |

## Operational responsibilities

**Today**: one maintainer is responsible for everything — build, test, deploy-readiness, and the design of the monitoring/alerting/incident-response frameworks this phase adds. There is no separate on-call, SRE team, or support desk, because there is no deployed environment or real user base yet (`INCIDENT_RESPONSE_GUIDE.md`'s own honest framing).

**Once deployed**, the natural split (a real decision for that day, not made speculatively here): a deploy owner (follows `DEPLOYMENT_GUIDE.md`), an on-call rotation (follows `INCIDENT_RESPONSE_GUIDE.md`), and whoever reviews `SRE_GUIDE.md`'s SLOs against real traffic periodically.

## Production workflows

| Workflow | Document |
|---|---|
| Deploying (CI/CD, release scripts, rollback) | `DEPLOYMENT_GUIDE.md` |
| Adding/configuring an environment | `ENVIRONMENT_GUIDE.md` |
| Backup and disaster recovery | `DISASTER_RECOVERY.md` |
| What's measured and alert thresholds | `MONITORING_GUIDE.md` |
| Responding to an incident | `INCIDENT_RESPONSE_GUIDE.md` |
| SLOs and capacity planning | `SRE_GUIDE.md` |
| Local running/troubleshooting | `OPERATIONAL_RUNBOOK.md` |

## Support workflows

There is no separate operational-support ticketing system. A real user-facing support request (a real organization member asking Titan's own product a question) goes through CPP-1's existing in-app Support Requests (`GET`/`POST /api/portal/support`) — a product feature, not an operational-incident channel. An operational problem (something actually broken) is tracked via this repository's own issue tracker today, per `INCIDENT_RESPONSE_GUIDE.md`'s honest "one maintainer, no separate tooling" framing — not a fabricated second system.

## Automation scripts

All under `packages/platform/scripts/`, every one actually run and verified against real local state (`DEPLOYMENT_GUIDE.md`, `DECISION_LOG.md`):

| Script | Purpose |
|---|---|
| `check-wrangler-config.mjs` | Flags unfilled `REPLACE_WITH_REAL_*` placeholders in `wrangler.toml` before a real deploy (PRD-1) |
| `validate-secrets.mjs` | Confirms required secret *names* exist, locally or against a real deployment (PRD-1) |
| `db-backup-local.mjs` | Real local D1 export (PRD-1) |
| `smoke-test.mjs` | 4 unauthenticated liveness/authorization checks against a running Worker (PRD-1) |
| `release.mjs` | Orchestrates config/secrets checks + `wrangler deploy` (PRD-1) |
| `check-operational-thresholds.mjs` | Real single-request latency check against `/health`/`/health/ready`, classified against `MONITORING_GUIDE.md`'s thresholds — a fast, no-auth-required operational sanity check (OPS-1) |

## Operations Center dashboard

`/admin/operations` (Platform-Administrator-gated except for the role-agnostic health/readiness panels), backed by `GET /api/operations/summary`. Panels: Platform health, Readiness, **Alerts** (OPS-1), Service status, Runtime metrics (now including OPS-1's real error-rate/latency-percentile "Request health" section), Background operations (honest "none exists" note), System overview, and an **Operational summary** banner (OPS-1) combining the above into one line. Full detail: `MONITORING_GUIDE.md`, `DEVELOPER_GUIDE.md`'s "Enterprise Operations & SRE usage" section.
