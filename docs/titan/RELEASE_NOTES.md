# Release Notes — Project Titan 0.1.0-rc.1

**This is a Release Candidate, not a General Availability release, and nothing described below is deployed anywhere.** Every capability in this document is real, built, and verified against a real local Cloudflare Workers + D1 stack (`wrangler dev`) — see `RELEASE_CANDIDATE_GUIDE.md` for the full audit and `GLOBAL_LAUNCH_GUIDE.md` for what still has to be true before this can go live. If you're looking for the terse, chronological version of this same information, see `CHANGELOG.md`.

## What's in this Release Candidate

**Admin Application** (`/admin`) — nine complete modules, each Platform-Administrator-gated (unless noted) and reading real data from a real local D1 instance:
- Dashboard — executive overview across every module below
- Lead Intelligence — search/filter/sort/paginate, lifecycle management, risk intelligence, audit history
- Assessment Center — search/filter/sort/paginate, results/severity/category coverage/question responses, compliance intelligence, lead linkage
- Organization Management — search/filter/sort/paginate, create/archive/restore, Health/Relationships/Administration
- Identity & User Management — user directory, Role Assignment (grant/change/revoke, guarded against zero Platform Administrators)
- Audit Center — cross-entity search/filter/sort/paginate over every audit event, Investigation View, CSV/JSON export
- Operations Center — real per-service reachability, real request/repository metrics, alerts, readiness
- Reporting & Analytics — Executive Dashboard, Business Reports, Analytics trends, CSV/JSON export
- Commercial — cross-organization subscription/license administration

**Customer Portal** (`/portal`) — a real, separate application for an organization member (not a Platform Administrator concept): Dashboard, Assessments (read-only), Reports (with export), Support (submit + own history), Account, and Subscription (self-service plan selection/upgrade/downgrade/cancel/renew).

**Public assessment flow** (`/assessment/dpdp`) — the original DPDP risk-scan questionnaire, unchanged in scope since Stage 4, still the product's own lead-generation entry point.

**Platform foundation**: Auth.js (database sessions), a 3-value RBAC model (`member`/`admin`/`owner`) plus a Platform Administrator sentinel convention, a Repository Pattern with in-memory and D1 implementations for every entity, append-only audit logging, route-scoped CSP/CORS/security headers, Origin-based CSRF protection, rate limiting on every anonymous write plus the customer-facing authenticated writes, structured logging with request correlation, and 12 additive-only D1 migrations.

**Production engineering** (not yet exercised against a real deployment): named `staging`/`production` environments, a production-configuration validator, a manual-only deploy pipeline (6 jobs: validate → secrets check → migrate → deploy Worker → deploy Pages → smoke test), 6 release-automation scripts, a verified disaster-recovery drill, real p50/p95/p99 latency and error-rate aggregation, evidence-backed alert evaluation, a security findings register, and penetration-test preparation material.

## What this Release Candidate does not include

- **A real deployment.** No Cloudflare account, API token, or account ID has ever existed for this project. `titan-deploy.yml` has zero historical runs. Nothing described above has served real traffic.
- **A payment gateway.** The Commercial Platform (subscriptions/licenses/entitlements) is deliberately provider-agnostic — no card, invoice, or chargeable-transaction data exists anywhere in this system.
- **Real email delivery.** Auth.js's Email sign-in logs its magic link instead of sending it — no transactional email provider has been chosen.
- **Enterprise SSO, organization-scoped filtering on admin routes** (every cross-organization admin `GET`/search/export route is Platform-Administrator-only by design — the customer-facing `/api/portal/*` routes solve this differently, scoped server-side per caller), **a support-ticket resolution workflow, an organization switcher for multi-org members, virtualized tables, route-based code-splitting** for `@titan/web`'s 834 kB main bundle. Full list: `FEATURE_MATRIX.md`'s "Explicitly not yet features" section.
- **Any compliance certification** (SOC 2, ISO 27001, GDPR, DPDP) or **independent penetration test**. `THREAT_MODEL.md`/`COMPLIANCE_GUIDE.md` are real preparation material against this system's own real, passing tests — not a claim either has occurred.
- **Legal review of the DPDP assessment content.** `DPDP_ASSESSMENT_FRAMEWORK.md` is still labeled draft.

## Known issues carried into this Release Candidate

| Issue | Severity (real-world context) | Status |
|---|---|---|
| 3 high-severity CVEs in `sharp`, transitive via `miniflare`→`wrangler` | Medium (devDependency-only, unreachable from application code, no non-breaking fix available) | Deferred — `THREAT_MODEL.md` SEC-1-01 |
| `@titan/web` main bundle exceeds Vite's 500 kB chunk-size guidance (834.46 kB / gzip 186.43 kB) | Low (no real user-facing latency data exists to measure impact against) | Deferred — route-based code-splitting named, not built |
| `audit_events` has no retention/archival policy | Low today (373+ rows, nowhere near any real limit) | Named forward-looking capacity risk, not urgent |
| GitHub Environment protection rules for `titan-deploy.yml`'s `staging`/`production` environments are unconfigured | Medium (a real, actionable repository setting) | Open since PRD-1 |
| Full Playwright E2E suite is unreliable in this specific remote development sandbox (authenticated-flow tests time out; simple redirect tests don't) | N/A — a sandbox characteristic, not a product defect | Investigated and documented, OPS-1 and re-confirmed GA-1, see `RELEASE_CANDIDATE_GUIDE.md` |

## Upgrade notes

None — this is the first labeled version this project has ever carried. There is no prior release to migrate from.

## Verifying this Release Candidate yourself

```bash
cd titan && npm ci && npm run ci        # typecheck, lint, format, build, test — 1072/1072
cd apps/web && npx playwright test      # 39 E2E tests, see RELEASE_CANDIDATE_GUIDE.md for sandbox caveats
cd packages/platform && npx wrangler deploy --dry-run --env staging   # real, credential-free bundle/binding check
```

Full local setup: `OPERATIONAL_RUNBOOK.md`. Full RC audit and Go/No-Go decision: `RELEASE_CANDIDATE_GUIDE.md`.
