# SRE Guide: SLOs and Capacity (OPS-1)

Service level objectives and capacity planning for Titan. Companion to `MONITORING_GUIDE.md` (what's measured and how) and `OPERATIONS_GUIDE.md` (operational architecture and responsibilities).

**Read this framing before anything else below**: this project has never had a deployed Cloudflare environment or real production traffic (`DECISION_LOG.md`). Every SLO below is a **target this system is designed against**, not a measurement of real production performance — none exists to measure. Presenting these as already-met production numbers would be exactly the fabricated operational readiness this program's engineering principles rule out. They are real in the sense that matters today: concrete, testable against the real metrics infrastructure that already exists (`MONITORING_GUIDE.md`), ready to be checked against real data from the first day real traffic exists.

## Service Level Indicators (SLIs)

Each SLI is backed by a real, already-computed metric — not a new one invented for this document:

| SLI | Source |
|---|---|
| **Availability** | `GET /health` (liveness) and `GET /health/ready` (readiness — real D1 reachability + configuration validity, `router.ts`'s `computeReadiness`) returning 200 |
| **Request success rate** | `1 - requestSummary.errorRate.serverErrorRate` from `GET /api/operations/summary` (`observability/aggregate.ts`'s `computeErrorRate`) |
| **Latency** | `requestSummary.latency.p95`/`.p99` from the same endpoint (`computeLatencyPercentiles`) |
| **Repository latency** | `requestSummary.repositoryLatency` — isolates D1 query time from total request time, the same distinction `withOperationTiming`'s own doc comment already draws |

## Service Level Objectives (SLOs) — targets, not measurements

| SLO | Target | Rationale |
|---|---|---|
| Availability (readiness) | 99.9% of readiness checks succeed | Standard "three nines" starting target for a single-region-logic service on a globally-distributed edge platform |
| Request success rate | ≥ 99.5% non-5xx (≤ 0.5% server error rate) | Ten times tighter than `MONITORING_GUIDE.md`'s own 5% *warning* alert threshold — the SLO is the aspiration, the alert threshold is "act now," and they are deliberately not the same number |
| Latency | p95 ≤ 300ms, p99 ≤ 800ms | Tighter than the alert thresholds (500ms/2000ms) for the identical reason — an SLO breach is a trend to address, an alert is an immediate signal |

## Error budget

Illustrative math against the request-success-rate SLO above, for a hypothetical 30-day window once real traffic exists:

```
SLO: 99.5% success rate
Error budget: 100% - 99.5% = 0.5% of requests may fail
Over 1,000,000 requests/month: budget = 5,000 failed requests
```

If real 5xx responses consume the budget faster than the window allows, that's the signal to pause new feature work and prioritize reliability — the standard SRE error-budget policy. This is presented as the *mechanism* Titan is designed to use, not a claim that a budget is currently being tracked against real traffic (it isn't, because there is none).

## Measurement strategy

Once deployed: `GET /api/operations/summary` (Platform-Administrator-only) already computes every SLI above on demand, from real per-isolate data. The honest limitation is the same one `MONITORING_GUIDE.md` names — per-isolate, not durable/global — so a real SLO *tracked over time* (not just observed at one instant) needs either a real cross-isolate metrics backend (Workers Analytics Engine, blocked on a deployed Cloudflare account) or an external polling process that samples this endpoint on a schedule and stores the results somewhere durable. Neither is built, because building either without real traffic to validate against would be speculative infrastructure with nothing to exercise it — the identical reasoning PRD-1 used to defer R2/Queues bindings.

## Capacity planning (Workstream 8)

### Current real data volumes

From the actual disaster-recovery drill (`DISASTER_RECOVERY.md`), the real accumulated row counts across this project's own development/testing history:

```
leads: 65   assessments: 43   organizations: 62   audit_events: 373   subscriptions: 22
```

Total: ~565 rows across the five largest tables. This is real development data, explicitly **not** production load — there has never been real production traffic to measure capacity against.

### Cloudflare's published platform limits

Fetched directly from Cloudflare's current documentation (`developers.cloudflare.com/workers/platform/limits/` and `/d1/platform/limits/`) — cite the source and re-check it before relying on these for a real capacity decision, since Cloudflare revises these over time and this project has no deployed account to observe them against directly:

| Resource | Free plan | Paid plan |
|---|---|---|
| Worker compressed size | 3 MB | 10 MB |
| Worker CPU time (HTTP request) | 10 ms | 30s default, up to 5 min |
| D1 max database size | 500 MB | 10 GB |
| D1 max storage per account | 5 GB | 1 TB |
| D1 max row/string/BLOB size | 2 MB | 2 MB |
| D1 queries per Worker invocation | 50 | 1,000 |
| D1 max SQL statement length | 100 KB | 100 KB |

### Headroom check against real numbers

- **Worker bundle**: 93.13 KiB gzip (`MONITORING_GUIDE.md`'s fresh measurement) against a 3 MB (free) / 10 MB (paid) compressed limit — no concern at any realistic growth rate for this codebase.
- **D1 size**: ~565 rows of real development data is negligible against even the free tier's 500 MB database cap. No near-term concern.
- **Queries per invocation**: `GET /api/operations/summary` alone issues up to 6 real repository reads plus 1 readiness check (7 total real I/O calls) per call (`router.ts`'s `operationsSummary`) — comfortably inside the free tier's 50-query-per-invocation cap, with no endpoint in this codebase close to that limit.

### Real, named growth risk

`audit_events` is the one table every write-path in this system appends to, with **no retention or archival policy** — every lead/assessment/organization/subscription/user-profile change writes a new row, forever, and nothing ever deletes one (`SECURITY_GUIDE.md`'s Audit Export cap is a 10,000-row *export* limit, not a retention policy — the table itself is unbounded). At today's real volume (373 rows across this project's entire development history) this is not an active problem, but it is the one table worth planning a retention policy for before real production traffic makes it one. Named here as real, forward-looking capacity work — not fabricated urgency, since 373 rows is nowhere near any limit above, and not silently ignored either.

### Future scaling

Cloudflare's own architecture (D1 is "inherently single-threaded, processing queries one at a time" per its own documentation) means a real scaling conversation, if D1 ever became a bottleneck, is about query efficiency and read patterns first — not a lever this project can pull today, since there's no real load to profile against. Named as a real, deferred consideration, not solved speculatively.
