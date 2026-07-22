# Incident Response Guide (OPS-1)

What to do when something breaks. A framework and templates, written honestly for what this project actually is today — not a fabricated org chart, on-call rotation, or paging system this project doesn't have. Companion to `MONITORING_GUIDE.md` (what detects a problem) and `DISASTER_RECOVERY.md` (data-loss-specific recovery procedures, which this guide doesn't duplicate).

## The honest starting point

This project has never had a deployed Cloudflare environment, a real user base, or a real production incident (`DECISION_LOG.md`). There is one maintainer, no on-call rotation, and no paging system — because there is nothing deployed to page anyone about. Everything below is a real, usable framework for the day that changes, not a claim that an incident-response team or process is already operating. Pretending otherwise would be exactly the kind of fabricated operational readiness this program's engineering principles rule out.

## Severity matrix

| Severity | Definition | Example (once deployed) | Response target |
|---|---|---|---|
| **SEV1 — Critical** | Full outage, or real data loss/corruption risk | `readiness.not_ready`, `configuration.invalid`, or any `service.unreachable.*` alert (`MONITORING_GUIDE.md`) firing in production | Immediate — stop what you're doing |
| **SEV2 — High** | A critical user path is degraded but not fully down | `error_rate.5xx.critical` or `latency.p95.critical` firing on a core endpoint | Same business day |
| **SEV3 — Medium** | A non-critical path is degraded | A `warning`-severity alert, or a single repository's elevated latency without a broader error-rate impact | Next business day |
| **SEV4 — Low** | Cosmetic or minor, no real user impact | A stale dashboard figure, a documentation gap | Scheduled, non-urgent |

Severity maps directly onto `observability/alerts.ts`'s own `critical`/`warning` severities where an alert is the detection source — SEV1/SEV2 for `critical` alerts, SEV3 for `warning` alerts — rather than inventing a second, disconnected taxonomy.

## Detection sources

Real ones, not fabricated monitoring:

1. The Operations Center's Alerts panel and Operational Summary banner (`/admin/operations`), backed by `GET /api/operations/summary`'s `alerts` field.
2. `/health` and `/health/ready` failing (`smoke-test.mjs`, `check-operational-thresholds.mjs`, or a real orchestrator's own readiness probe once deployed).
3. `titan-ci.yml`/`titan-deploy.yml` failures (a build/test/deploy-pipeline break is itself an operational signal).
4. Direct user or maintainer report (today, via this repository's own issue tracker — there is no separate support/ticketing system for operational incidents; CPP-1's in-app Support Requests are a product feature for organization members, not an operational-incident channel).

## Response procedure

1. **Acknowledge.** Note when you started looking at it.
2. **Assess severity** using the matrix above, from real evidence (the Operations Center, logs, the specific alert that fired) — not a guess.
3. **Mitigate.** For a data-loss scenario, go to `DISASTER_RECOVERY.md` instead of improvising here. For a bad deploy, `DEPLOYMENT_GUIDE.md`'s rollback section (`wrangler rollback`). For a misconfiguration, `ENVIRONMENT_GUIDE.md` plus `GET /api/operations/summary`'s `configuration` field tells you exactly which variable is wrong.
4. **Communicate**, using the templates below — even an audience of one (today) benefits from a written record to check back against later.
5. **Resolve and verify** — confirm the specific alert or check that detected the problem has genuinely cleared (re-check `/api/operations/summary`, don't assume).
6. **Postmortem** for any SEV1/SEV2, using the template below — while it's fresh, not weeks later.

## Escalation path

**Today**: there is one maintainer and no deployed environment. "Escalation" is a note-to-self to come back to something, not a call tree. Named honestly rather than filled in with fabricated roles.

**Once a real team/on-call exists**: this section is where that rotation, its paging tool, and its escalation tiers get documented — a real decision this project hasn't needed to make yet, the same standing reason `ARCHITECTURE.md`'s "Still open" list hasn't picked a payments or email provider. Fill this in when the decision is real, not before.

## Communication templates

**Initial notification**
```
[SEV<N>] <short title>
Detected: <time>, via <detection source>
Impact: <what's actually affected, in plain terms>
Status: Investigating
```

**Status update**
```
[SEV<N>] <short title> — update
Since last update: <what changed>
Current status: <Investigating | Mitigating | Monitoring | Resolved>
Next update by: <time>
```

**Resolution**
```
[SEV<N>] <short title> — resolved
Resolved: <time>
Root cause: <one sentence, real, not speculative>
Follow-up: <link to postmortem if SEV1/SEV2, or "none needed">
```

## Postmortem template (SEV1/SEV2)

```
# Postmortem: <title>

Date: <date>          Severity: SEV<N>          Duration: <detection to resolution>

## Timeline
<Real timestamps: detected, acknowledged, mitigated, resolved>

## Impact
<What actually happened, to whom, for how long — no rounding up or down>

## Root cause
<The real, verified cause — not the first plausible guess>

## What went well
## What could have gone better

## Action items
| Action | Owner | Done by |
|---|---|---|
```

## Explicitly not built

A real paging/on-call tool, a public status page, and an automated incident-declaration workflow — all genuinely blocked on the same "no deployed environment, no real team" constraint as everything else in this guide, not overlooked. `MONITORING_GUIDE.md`'s "How alerts surface today, and what's still blocked" names the identical constraint from the detection side.
