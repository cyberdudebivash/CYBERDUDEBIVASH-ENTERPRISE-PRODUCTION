# Global General Availability Guide — Project Titan (GA-1)

**Global General Availability has not occurred.** This document is a checklist and readiness framework for the day it does — not a record of it having happened. Every box below is unchecked because every prerequisite it represents is genuinely, verifiably outstanding, most of them on a real Cloudflare account that has never existed (`DEPLOYMENT_GUIDE.md`). See `RELEASE_CANDIDATE_GUIDE.md` for why the codebase itself is a real Release Candidate despite none of this having happened yet — "code-complete and verified" and "safe to flip to GA" are deliberately different bars.

## Launch checklist

- [ ] A real Cloudflare account exists for this project
- [ ] `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` repository secrets configured (scoped to Workers/Pages/D1 edit only, not full account-owner — `DEPLOYMENT_GUIDE.md`)
- [ ] Real `database_id`/`ALLOWED_ORIGIN` values replace every `REPLACE_WITH_REAL_*` placeholder in `wrangler.toml`, both environments
- [ ] `titan-deploy.yml` run once with `target_environment: staging`, completed successfully, smoke test passing
- [ ] A real, human walkthrough of `OPERATIONAL_RUNBOOK.md`'s curl checks against the real staging URL
- [ ] `titan-deploy.yml` run with `target_environment: production`, at the identical commit SHA validated on staging (`DEPLOYMENT_GUIDE.md`'s "Promotion" section)
- [ ] A payments-provider decision made (if launching Commercial features as chargeable, not just provider-agnostic-real)
- [ ] An email-provider decision made (if launching with real Auth.js email delivery, not dev-mode logging)
- [ ] `DPDP_ASSESSMENT_FRAMEWORK.md` has completed expert legal review, or ships explicitly re-labeled from "draft"

## Production checklist

- [ ] Custom domain + DNS + TLS configured (Cloudflare dashboard) — genuinely out of this repository's reach until a real domain is chosen for Titan specifically, unrelated to the existing `cyberdudebivash.com` marketing site
- [ ] GitHub Environment protection rules configured for `staging`/`production` (required reviewers, a wait timer) — a repository web-UI setting, open since PRD-1, re-confirmed still open by SEC-1's `THREAT_MODEL.md` (SEC-1-10)
- [ ] `GET /api/operations/summary`'s `configuration` field confirmed non-error against the real deployed `env.ENVIRONMENT`
- [ ] A real, scheduled remote-database backup job (needs Cloudflare Cron Triggers or an external scheduler — genuinely new infrastructure, not built, since no real remote database exists yet to back up)

## Operations checklist

- [ ] Real traffic observed at least once against `GET /api/operations/summary`'s Service Status / Runtime Metrics panels
- [ ] `DEFAULT_ALERT_THRESHOLDS` (`observability/alerts.ts`) and `SRE_GUIDE.md`'s SLO targets re-evaluated against real (not hypothetical) traffic — today's values are reasonable starting defaults, not measurements
- [ ] A real paging/notification integration chosen and wired (PagerDuty/Slack/email/SMS) — `evaluateAlerts`'s output is real and tested but has never notified a human
- [ ] A retention/archival policy decided for `audit_events` (no active problem at today's volume, but the one table every write-path appends to forever)
- [ ] A cross-isolate/durable metrics backend decided (Workers Analytics Engine) if per-isolate-only metrics (`MONITORING_GUIDE.md`'s own named limitation) become insufficient

## Security checklist

- [ ] Re-run `npm audit` — confirm whether a non-breaking `wrangler`/`miniflare` release has resolved the `sharp` transitive CVE (`THREAT_MODEL.md` SEC-1-01) before assuming today's "no safe fix" conclusion still holds
- [ ] A real, independent penetration test performed against a real deployed environment (`THREAT_MODEL.md`'s 12-scenario preparation material is real test-backed preparation, not a substitute)
- [ ] Any compliance certification pursued (SOC 2, ISO 27001, GDPR, DPDP) — organizational/legal work, not something a code session can complete (`COMPLIANCE_GUIDE.md`)
- [ ] Rate limiting's known limitation re-assessed once real: today's fixed-window in-memory limiter is per-Worker-isolate, not global — a real deployment may need a durable, cross-isolate limiter (Durable Objects or an equivalent) if abuse patterns actually require it

## Support checklist

- [ ] A real support-request resolution workflow decided (today: `POST /api/portal/support` creates a request that stays `"open"` forever — no admin-side endpoint reads or resolves one)
- [ ] A real on-call rotation established (`INCIDENT_RESPONSE_GUIDE.md`'s own honest "one maintainer, nothing deployed" framing)
- [ ] A public status page decided (none exists; not fabricated ahead of a real incident history to report)

## Incident contacts

**Not populated** — `INCIDENT_RESPONSE_GUIDE.md`'s own template exists and is real, but there is no on-call rotation, paging tool, or second maintainer to list yet. Filling this in with placeholder names/numbers would be exactly the fabricated-but-untestable content this program's engineering principles rule out. Populate this section for real once a real team and rotation exist.

## Monitoring checklist

- [ ] `GET /health`/`GET /health/ready` polled by a real external uptime monitor (today: no orchestrator exists to poll them)
- [ ] `check-operational-thresholds.mjs` (or an equivalent) scheduled against the real deployed URL, not just run manually against local `wrangler dev`
- [ ] A real dashboard (Grafana, Cloudflare Analytics, or equivalent) consuming `GET /api/operations/summary`'s output on a schedule, once a durable metrics backend exists

## Rollback checklist

- [ ] `npm run rollback:staging`/`:production` exercised for real at least once in a lower environment before being trusted in an actual incident
- [ ] A real bad-migration drill run against a real (non-production) remote D1 database — today's only verified recovery drill was against local D1 (`DISASTER_RECOVERY.md`)
- [ ] Cloudflare Pages' own separate rollback mechanism (dashboard redeploy or `wrangler pages deployment list`) confirmed reachable by whoever holds on-call responsibility

## Post-launch checklist

- [ ] A real first-week traffic review against `SRE_GUIDE.md`'s SLO targets
- [ ] `MONITORING_GUIDE.md`'s alert thresholds revisited with real data within the first month
- [ ] A retrospective on this Release Candidate's own accuracy — did anything marked "Verified" here turn out not to hold under real traffic?

## Future roadmap (beyond this Release Candidate)

Unchanged from `ROADMAP.md`'s own "What Stage 5 / the next pass needs" section — not re-derived here to avoid drift between two lists. Highlights most relevant to a real launch, in the order they'd actually unblock the most: a real Cloudflare account (unblocks nearly everything else in this document), a payments-provider decision, an email-provider decision, GitHub Environment protection rules, a real assignee picker in Lead Lifecycle, organization-scoped filtering for the remaining admin-only `GET`/search/export routes, and route-based code-splitting for `@titan/web`'s main bundle.
