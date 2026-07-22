# Changelog — Project Titan

All notable changes to `titan/`, in [Keep a Changelog](https://keepachangelog.com/) style. This is a distilled, scannable index — `DECISION_LOG.md` has the full reasoning behind every entry below, `FEATURE_MATRIX.md` has the per-feature test evidence, and `PLATFORM_FOUNDATION.md` has each phase's own fresh verification numbers. Every package under `titan/` has carried version `0.1.0` since Stage 4; this project has never had a tagged release or a deployment, so there is no prior version to diff against — this file's own existence, and the version bump below, are themselves GA-1 deliverables.

## [0.1.0-rc.1] — 2026-07-22 (GA-1: Release Candidate)

The first labeled Release Candidate snapshot. No application code changed to produce this tag — GA-1 is a validation, documentation, and release-engineering pass over the already-verified EAP-1–8/CPP-1/COM-1/PRD-1/OPS-1/SEC-1 baseline, per its own brief ("not feature development, not architectural redesign"). See `RELEASE_CANDIDATE_GUIDE.md` for the audit and `GLOBAL_LAUNCH_GUIDE.md` for the GA checklist.

### Added
- `CHANGELOG.md`, `RELEASE_NOTES.md`, `RELEASE_CANDIDATE_GUIDE.md`, `GLOBAL_LAUNCH_GUIDE.md` (this phase).
- `0.1.0-rc.1` version label across all 5 `package.json` files (root + 4 workspaces) — the first version identifier this project has ever carried beyond the unchanging `0.1.0` every package shipped with since Stage 4.
- A `v0.1.0-rc.1` annotated git tag, created locally on the commit this Release Candidate is cut from. **Could not be pushed to the remote**: `git push origin v0.1.0-rc.1` failed with `403`, the identical class of permission restriction as the `actions:write` gate found while attempting to trigger `titan-deploy.yml` (`RELEASE_CANDIDATE_GUIDE.md`) — this development session's own git/GitHub access appears scoped to pushing the designated branch, not creating tag refs. The tag will not persist beyond this session; the commit it points to (pushed, real, addressable by SHA) is the durable artifact. Re-creating the tag from a context with full push access is a real, trivial follow-up (`git tag -a v0.1.0-rc.1 <sha> && git push origin v0.1.0-rc.1`), not something this pass could complete itself.

### Changed
- Nothing in application behavior. `README.md`, `ARCHITECTURE.md`, `PLATFORM_FOUNDATION.md`, `ROADMAP.md`, `DEPLOYMENT_GUIDE.md`, `OPERATIONAL_RUNBOOK.md`, `SECURITY_GUIDE.md` each gain a GA-1 status paragraph.

### Verified (not changed)
- Full workspace `typecheck`/`lint`/`format`/`build`/`test` — 1072/1072 tests, identical to SEC-1's own count (no regression, no code touched).
- Full 11-spec, 39-test Playwright E2E suite re-run fresh this pass — see `RELEASE_CANDIDATE_GUIDE.md`'s "End-to-end validation" section for the exact result and how it reconciles against OPS-1's own documented sandbox-timing finding.
- A fresh `wrangler deploy --dry-run` Worker bundle measurement: 452.47 KiB / gzip 93.17 KiB (materially unchanged from OPS-1's 452.05 KiB / 93.13 KiB).
- `titan-deploy.yml` still has zero historical runs; `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` still don't exist anywhere in this project. No real deployment occurred as part of producing this Release Candidate.

## [Unreleased history prior to GA-1]

Each phase below shipped real, tested, additive work at package version `0.1.0` (never bumped) with no git tag. Chronological, newest first — full detail in `DECISION_LOG.md`.

### SEC-1 — Enterprise Security & Compliance (2026-07-22)
- **Fixed**: `frame-ancestors 'none'` added to both CSP variants (`http/finalizeResponse.ts`) — CSP3's `frame-ancestors` never inherited from `default-src 'none'`, so clickjacking protection had rested entirely on the legacy `X-Frame-Options` header.
- **Fixed**: rate limiting extended to `POST /api/portal/support` and `POST`/`PATCH /api/portal/commercial/subscription` — closed an inconsistency where `POST /api/organizations`, a peer authenticated write, already had it.
- **Changed**: explicit least-privilege `permissions: contents: read` added to `titan-ci.yml`/`titan-deploy.yml`.
- **Security**: a fresh `npm audit` found 3 high-severity CVEs in `sharp` (transitive via `miniflare`→`wrangler`, devDependency-only, unreachable from application code) — classified and deferred with full reasoning (`THREAT_MODEL.md` SEC-1-01), not force-fixed.
- **Added**: `SECURITY_ARCHITECTURE.md`, `THREAT_MODEL.md`, `COMPLIANCE_GUIDE.md`.
- Tests: 1072 (+4 over OPS-1).

### OPS-1 — Enterprise Operations & Site Reliability Engineering (2026-07-22)
- **Added**: `observability/aggregate.ts` (p50/p95/p99 latency, 4xx/5xx error rate), `observability/alerts.ts` (evidence-backed alert evaluation against named thresholds).
- **Changed**: `GET /health/ready` and `GET /api/operations/summary` share one `computeReadiness` function — a `staging`/`production` deployment with invalid configuration now fails readiness on its own terms, not only on database unreachability. `GET /api/operations/summary` gains `requestSummary`/`alerts` fields.
- **Added**: Operations Center gains an Alerts panel, a Request Health section, and an Operational Summary banner. `check-operational-thresholds.mjs` script.
- **Added**: `OPERATIONS_GUIDE.md`, `MONITORING_GUIDE.md`, `INCIDENT_RESPONSE_GUIDE.md`, `SRE_GUIDE.md`.
- **Fixed**: a real bug where the first version of `evaluateAlerts` double-fired a generic and a specific alert for the same root cause.
- Tests: 1068 (+43 over PRD-1).

### PRD-1 — Enterprise Production Infrastructure (2026-07-22)
- **Added**: `wrangler.toml` `[env.staging]`/`[env.production]` blocks, `config/validateEnv.ts`'s `validateProductionConfig`, `titan-deploy.yml` (manual-only CI/CD), six release-automation scripts (`packages/platform/scripts/`).
- **Verified**: a real disaster-recovery drill — full local D1 wipe, restored with an exact row-count match across 5 tables, zero data loss.
- **Added**: `DEPLOYMENT_GUIDE.md`, `DISASTER_RECOVERY.md`, `ENVIRONMENT_GUIDE.md`.
- **Found**: `@titan/web`'s main bundle exceeds Vite's 500 kB chunk-size guidance (826.13 kB at the time) — named as a real follow-up, not fixed this phase.
- Tests: 1025 (+14 over COM-1).

### COM-1 — Enterprise Commercial Platform (2026-07-22)
- **Added**: `SubscriptionRepository`/`LicenseRepository`, a code-defined Plan catalog (Starter/Professional/Enterprise), `resolveEntitlements`, 8 new commercial routes, Customer Portal `/portal/subscription`, admin `/admin/commercial`.
- Provider-agnostic by design — no payment gateway, no card/invoice data anywhere in this system.
- Tests: 1011 (+130 over CPP-1).

### CPP-1 — Enterprise Customer Portal (2026-07-21)
- **Added**: a real, separate `/portal` shell (Dashboard, Assessments, Reports, Support, Account), `resolvePortalOrganizationId` as the sole security mechanism deriving organization scope server-side, `SupportRequestRepository` (the one genuinely new entity this phase needed).
- Tests: 881 (+58 over EAP-8).

### EAP-8 — Enterprise Reporting & Analytics (2026-07-21)
- **Added**: `GET /api/reports/summary`/`/trends`/`/export`, `TrendSparkline`, the Enterprise Reporting & Analytics Workspace.
- Tests: 823 (+34 over EAP-7).

### EAP-7 — Enterprise Operations Center (2026-07-21)
- **Added**: `GET /api/operations/summary`, `Metrics.getCounts()`/`.getDurations()` promoted onto the interface, the Enterprise Operations Center workspace.
- Tests: 789 (+20 over EAP-6).

### EAP-6 — Enterprise Audit Center (2026-07-21)
- **Added**: `GET /api/audit/search`/`/export`, the Enterprise Audit Workspace, Investigation View.
- **Fixed**: a real cross-origin CORS gap (`Access-Control-Expose-Headers` never set, hiding `Content-Disposition` from browser JS).
- Tests: 769 (+96 over EAP-5).

### EAP-5 — Enterprise Identity & User Management (2026-07-21)
- **Added**: the Enterprise User Directory, User Details (Role Assignment — grant/change/revoke), `wouldRemoveLastPlatformAdministrator` guard.
- Tests: 713 (+104 over EAP-4).

### EAP-4 — Enterprise Organization Management Platform (2026-07-21)
- **Added**: Organization Workspace/Details (Health, Relationships, Administration), `POST`/`GET`/`PATCH /api/organizations*`.
- Tests: 609 (+112 over EAP-3).

### EAP-3 — Enterprise Assessment Center (2026-07-21)
- **Added**: Assessment Workspace/Details, Compliance Intelligence panel, `GET /api/assessments/search`.
- Tests: 497 (+65 over EAP-2).

### EAP-2 — Lead Intelligence Platform (2026-07-21)
- **Added**: Lead Workspace/Details, Lead Lifecycle management, Risk Intelligence panel.
- **Fixed**: CORS missing `PATCH`, a `useLeadDetail` StrictMode race.
- Tests: 432 (+132 over EAP-1).

### EAP-1 — Enterprise Administration Foundation (2026-07-21)
- **Added**: the authenticated admin application shell, the Dashboard module, `GET /api/me`/`/organizations`/`/assessments`/`/audit`.
- **Fixed**: CSP `form-action` blocking cross-origin sign-out redirect.
- Tests: 300 (+56 over the Security Release Blocker Sprint).

### Security Release Blocker Sprint (2026-07-20)
- **Security**: `GET /api/leads` gated behind Platform Administrator (was unauthenticated — HIGH, ERP-1 finding). `POST /api/leads`/`POST /api/assessments` recompute `result` server-side, discarding client-submitted values (tampering finding, ERP-1).
- Tests: 244.

### ERP-1 — independent release audit (2026-07-20)
- Found the two findings fixed immediately above. Closed two real WCAG AA failures a real Lighthouse audit caught. Supply-chain review: clean at the time.

### RC1 and earlier (Stage 0–4, Phase 2 sub-phases A–F, K, L)
- The DPDP assessment flow, question bank, risk-scoring engine, Cloudflare Workers + D1 backend foundation (5 repositories, Auth.js, RBAC), and the initial threat model / OWASP ASVS review. See `ROADMAP.md`'s own phase table for the full sub-phase mapping.
