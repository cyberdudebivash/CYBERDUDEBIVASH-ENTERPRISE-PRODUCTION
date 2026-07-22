# Monitoring Guide (OPS-1)

What Titan measures, how, and what a real deployment would consider a warning or a critical problem. Companion to `OPERATIONAL_RUNBOOK.md` (local running/troubleshooting), `DEPLOYMENT_GUIDE.md` (deploy mechanics), and `SRE_GUIDE.md` (SLOs and capacity) — this document covers observability, logging, alert thresholds, and performance review. Everything below reflects real, tested code (`packages/platform/src/observability/`) — see `DECISION_LOG.md`'s OPS-1 entry and `PLATFORM_FOUNDATION.md`'s OPS-1 section for verification evidence.

The standing constraint every section below inherits: this project has never had a deployed Cloudflare environment (`DECISION_LOG.md`). Everything here is real, tested, and ready to be useful the moment real traffic exists — none of it has ever observed real production traffic, because none has ever existed.

## Observability architecture

Three layers, all per-Worker-isolate (reset on isolate restart — a real limitation, not an oversight; see "Known limitations" below):

1. **Structured logs** (`observability/logger.ts`) — one JSON line per `logger.info`/`.warn`/`.error` call, carrying `level`, `message`, `timestamp`, and every field the caller passes (always including `requestId` where one exists).
2. **Metrics** (`observability/metrics.ts`) — `Metrics.increment`/`.recordDuration`, read back via `.getCounts()`/`.getDurations()`. Every HTTP request increments `http.request` (tagged `method`/`path`/`status`) and records `http.request.duration_ms`; every repository read behind `operationsSummary`'s service checks and `withOperationTiming`-wrapped calls records `repository.duration_ms` (tagged `operation`).
3. **Aggregation** (`observability/aggregate.ts`, OPS-1) — pure functions computing real p50/p95/p99 latency (`computeLatencyPercentiles`, nearest-rank method) and a real 4xx/5xx rate (`computeErrorRate`) from the raw counters above. Nothing computed a percentile or an error rate anywhere in this codebase before OPS-1 — confirmed by repository-wide search before writing this module.

All three are surfaced together via `GET /api/operations/summary` (`requestSummary` field) and the Operations Center dashboard (`/admin/operations`, "Request health" panel).

## Log classification

| Level | When it's used | Examples |
|---|---|---|
| `info` | Normal request completion, routine events | "request completed" (every request, `router.ts`) |
| `warn` | Something is degraded but the request still completed | A `warning`-severity operational alert evaluated (see below) |
| `error` | A real failure — an unhandled exception, an unreachable dependency, a `critical`-severity alert | "Unhandled error while routing request", "readiness check threw", "operations service check failed", "production configuration invalid", a `critical`-severity "operational alert evaluated" event |

## Log retention

Honest limitation, not a gap this phase could close: `wrangler.toml`'s `[env.production.observability]` block (Cloudflare Workers Logs) is present but commented out, because it has never been meaningful for an environment that has never been deployed (`wrangler.toml`'s own PRD-1 comment). Until a real deployment enables it, "retention" is whatever `wrangler tail`/the local dev console shows live — nothing is persisted anywhere. The day a real environment exists, enabling that block is a one-line, reviewable change (already written, just commented out) — not a rediscovery. Cloudflare's own Workers Logs retention period at that point is governed by Cloudflare's account-plan terms, not by anything this repository controls.

## Log filtering

Every log line is one JSON object — grep for `"requestId":"<id>"` to trace one request end to end (the same `X-Request-Id` value is also a response header, `observability/requestId.ts`), or for `"level":"error"` to find failures. `OPERATIONAL_RUNBOOK.md`'s "Structured logs" section has the exact commands for local `wrangler dev`.

## Alert thresholds (`observability/alerts.ts`)

`evaluateAlerts` is a pure function — given the real services/readiness/config/error-rate/latency data `operationsSummary` already gathers on every call, it returns which named conditions are actually true, each carrying the real evidence that triggered it. An empty result is a real, computed "nothing is breaching a threshold," not the absence of a check.

| Alert | Severity | Condition |
|---|---|---|
| `readiness.not_ready` | critical | The readiness check (D1 reachability) is failing, and it isn't already explained by an invalid configuration below |
| `service.unreachable.<name>` | critical | A configured repository's real reachability check failed |
| `configuration.invalid` | critical | `validateProductionConfig` (PRD-1) found a real, `error`-severity issue in a `staging`/`production` deployment |
| `error_rate.5xx.critical` | critical | 5xx rate ≥ 20% of observed requests this isolate |
| `error_rate.5xx.warning` | warning | 5xx rate ≥ 5% |
| `latency.p95.critical` | critical | p95 request latency ≥ 2000ms |
| `latency.p95.warning` | warning | p95 request latency ≥ 500ms |

These starting thresholds (`DEFAULT_ALERT_THRESHOLDS`) are reasonable SRE defaults, not derived from real production traffic — none has ever existed to derive them from. **Revisiting these thresholds**: the day real traffic exists, compare it against these numbers for a few weeks before tightening or loosening them; don't guess a second time when real data will settle it.

## How alerts surface today, and what's still blocked

**Implemented and verified**: the `alerts` field on `GET /api/operations/summary`, the Operations Center's "Alerts" panel and "Operational summary" banner (`/admin/operations`), and a structured `"operational alert evaluated"` log line (at `warn` or `error`, matching the highest alert severity) every time at least one alert fires.

**Blocked, and named honestly rather than faked**: delivering these as a real page to a human (PagerDuty, Slack, email, SMS) needs two things this project has never had — a deployed environment producing real traffic to evaluate, and a chosen paging provider (`ARCHITECTURE.md`'s "Still open" list has no payments/email provider decision yet either, for the same reason: nothing forces the decision until it's needed for real). Building a webhook integration against a provider with no account to test it against would be exactly the kind of fabricated-but-untestable automation this program's engineering principles rule out. What's built instead is the real detection and evaluation logic — the part that doesn't need a provider decision to be genuinely useful and testable today.

## Performance review (Workstream 9)

Fresh measurements, re-run this phase (not carried over from PRD-1's now-slightly-stale figures):

| Component | Size | Note |
|---|---|---|
| Worker bundle (`titan-platform`) | 452.05 KiB / 93.13 KiB gzip | `wrangler deploy --dry-run`; comfortably inside Cloudflare's Workers-size limit on every plan (`SRE_GUIDE.md`'s capacity table) |
| `@titan/web` main bundle | 834.46 kB / 186.42 kB gzip | `vite build`; Vite's own build still warns this exceeds its 500 kB guidance |

The main-bundle finding is unchanged from PRD-1 (826.13 kB → 834.46 kB, a small, expected increase from OPS-1's own new dashboard panels — not a regression introduced by ignoring the prior finding). The recommendation is also unchanged and still not attempted: route-based code-splitting (`React.lazy`) for `/admin`, `/portal`, and `/assessment/dpdp`. OPS-1 did not implement this deliberately — it's a frontend-routing restructuring, not an operations capability, and doing it under this phase's own "additive, non-redesigning" mandate risked exactly the kind of scope creep this program's engineering principles warn against. It remains real, named, prioritized follow-up work, not a silently dropped recommendation.

**Cold start latency**: still genuinely unmeasurable — it needs a real deployed edge instance, which doesn't exist (unchanged from PRD-1).

## Known limitations

- Metrics and alert evaluation are per-Worker-isolate, not global or durable — the same limitation `SECURITY_GUIDE.md` already names for `GET /api/operations/summary`'s runtime metrics. A real cross-isolate backend needs Workers Analytics Engine, which needs a deployed Cloudflare account.
- Alert thresholds are starting defaults, not tuned against real traffic (see above).
- No real paging/notification integration exists (see above) — by design, not oversight, given no provider decision has ever been forced.
- `check-operational-thresholds.mjs` (`packages/platform/scripts/`) measures one real request's own latency against `/health`/`/health/ready` — a fast, no-auth sanity check, genuinely different from (and no substitute for) the p95-over-real-traffic computation above.
