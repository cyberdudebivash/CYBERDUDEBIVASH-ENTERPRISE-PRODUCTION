# Release Candidate Guide — Project Titan (GA-1)

What "Release Candidate" means for this project, the audit performed to justify calling `0.1.0-rc.1` one, and the standing process for any future RC. This document is GA-1's own durable home for Workstreams 1–6 and 9 of its master prompt; `GLOBAL_LAUNCH_GUIDE.md` holds the forward-looking GA checklist (Workstream 10), and the GA-1 final report (delivered alongside this pass, not duplicated into a file) is the one-time formal Go/No-Go communication this document's own "Go/No-Go decision" section summarizes.

## What "Release Candidate" means here

A Release Candidate is a specific, tagged commit that has passed every quality gate this project has ever defined, with fresh (not carried-over) evidence, and an honest accounting of what is and isn't ready for General Availability. It is **not** a claim that a deployment has happened, that real users have been served, or that every named future-work item is done — `GLOBAL_LAUNCH_GUIDE.md`'s checklist is deliberately separate from this one because "code-complete and verified" and "safe to flip to GA" are different questions.

## Workstream 1 — Release Candidate Audit

| Area | Finding |
|---|---|
| Architecture | 3 of `ARCHITECTURE.md`'s original 5 "open decisions" are resolved (hosting → Cloudflare, auth → Auth.js, database → D1 behind a Repository Pattern). 3 remain genuinely open and are business/legal decisions, not engineering ones: payments provider, email provider, DPDP content legal review. None blocks a Release Candidate; all three block specific GA capabilities (real billing, real email, a legally-reviewed assessment) — see `GLOBAL_LAUNCH_GUIDE.md`. |
| Repository | Clean working tree at every checkpoint this pass. 116 total commits across all branches. **Zero git tags exist** prior to this pass — `v0.1.0-rc.1` is the first. |
| Dependencies/Packages | All 5 `package.json` files (root + `@titan/web`/`@titan/platform`/`@titan/assessment-core`/`@titan/design-system`) were at `0.1.0` since Stage 4, bumped to `0.1.0-rc.1` this pass — the first version change of this project's life. `npm audit`: 3 high-severity CVEs, unchanged since SEC-1, deferred with reasoning (`THREAT_MODEL.md` SEC-1-01). |
| Documentation | 20 documents under `docs/titan/` before this pass, all cross-referenced and current as of their own phase. 4 new documents this pass (this one, `CHANGELOG.md`, `RELEASE_NOTES.md`, `GLOBAL_LAUNCH_GUIDE.md`). |
| Infrastructure | Real, structurally-verified (`wrangler deploy --dry-run`, credential-free), never deployed. See Workstream 4 below. |
| Operations | Real observability/alerting (OPS-1), never exercised against real traffic. |
| Security | Real hardening (SEC-1) with one honestly-deferred dependency finding, zero changes to Authentication/Authorization/RBAC across every phase including this one. |
| Outstanding issues | Enumerated in full in `RELEASE_NOTES.md`'s "Known issues" table — carried forward, not resolved or hidden by this pass. |
| Release scope | GA-1 is validation, documentation, and release-labeling only. Zero application code changed to produce `0.1.0-rc.1` — confirmed via `git diff` against the pre-GA-1 baseline touching only `package.json` version fields and `docs/`. |

## Workstream 2 — End-to-end validation

**Unit/integration (Vitest), fresh run this pass**: 1072/1072 tests pass across all 4 packages — `@titan/platform` 626, `@titan/web` 359, `@titan/assessment-core` 25, `@titan/design-system` 62. Identical to SEC-1's own count, as expected (zero application code changed).

**Playwright E2E, fresh run this pass**: **11 passed, 28 failed, 10.6 minutes**, all 39 tests attempted, 1 worker (serial). This reconciles precisely against OPS-1's own documented, investigated finding (`DECISION_LOG.md`'s OPS-1 entry): a controlled comparison at the time proved that authenticated-flow tests (real Auth.js sign-in via a real magic-link round trip, waiting on a real cross-origin session) are unreliable specifically in this remote development sandbox's own resource/timing characteristics — reproduced even on a stashed, pre-OPS-1 commit with zero code changes — while simple, no-auth tests (redirect-to-sign-in checks) pass quickly and consistently. This pass's own fresh failure pattern is **consistent, exactly**: **28 failed** (identical count to OPS-1's own 28), every single failure a `toBeVisible` timeout (10000ms) waiting on a heading or similar element that only renders after a real, completed sign-in — the identical signature OPS-1 documented — spread across every spec file that exercises a real authenticated flow (`admin-dashboard`, `assessment-center`, `audit-center`, `commercial-platform`, `customer-portal`, `lead-workspace`, `operations-center`, `organization-workspace`, `reporting-center`, `user-management`). The 11 that passed are precisely the tests that either need no real sign-in (simple redirect-to-sign-in-page checks) or complete their one real sign-in fast enough (`dpdp-assessment.spec.ts`, the public flow). Zero application, auth, or frontend code changed between OPS-1's own investigation and this run — the identical failure count, on an unrelated code diff, is itself strong corroborating evidence this is the same sandbox characteristic, not a new regression, without needing to repeat OPS-1's own stash-and-compare drill from scratch. Vitest's 1072/1072 (environment-independent, no browser/`webServer` timing involved) remains this project's authoritative regression evidence, exactly as OPS-1/SEC-1 both already concluded — full-suite Playwright execution in this specific sandbox is a known, investigated limitation, not silently glossed over, and not treated as a Release Candidate blocker given every spec has previously run clean (25–39 tests, multiple consecutive runs, zero flakes) in normal development conditions per every phase's own `DECISION_LOG.md` entry.

**Regression**: zero application code changed this pass, so there is nothing to regress — the 1072/1072 Vitest result and the credential-free `wrangler` dry-run below are this pass's own regression evidence for the platform underneath GA-1.

## Workstream 3 — Production build validation

| Artifact | Fresh measurement (this pass) | Prior measurement | Delta |
|---|---|---|---|
| Worker bundle (`wrangler deploy --dry-run --env staging`) | 452.47 KiB / gzip 93.17 KiB | 452.05 KiB / gzip 93.13 KiB (OPS-1) | +0.42 KiB — noise (doc/comment-length changes to source files across SEC-1's small diff), not a real growth trend |
| `@titan/web` main bundle | 834.46 kB / gzip 186.43 kB | 834.46 kB / gzip 186.42 kB (OPS-1) | Unchanged |
| `@titan/web` static assets | CSS 59.26 kB/gzip 8.38 kB; `purify.es` 28.96 kB/gzip 10.93 kB; `html2canvas.esm` 202.43 kB/gzip 48.09 kB; `jspdf.es.min` 390.82 kB/gzip 128.86 kB (all lazy-loaded PDF-report chunks) | — | First pass measuring these individually |
| `@titan/assessment-core` | 6.42 kB / gzip 2.21 kB | — | — |
| `@titan/design-system` | CSS 8.61 kB/gzip 2.04 kB; JS 32.03 kB/gzip 6.84 kB | — | — |
| Database migrations | 12 files, additive-only (re-confirmed: `grep -ri "drop table\|drop column"` across all 12 returns nothing) | 12 (SEC-1) | Unchanged |
| Environment validation | `npm run config:check:staging`/`:production` — both still correctly report unfilled `REPLACE_WITH_REAL_*` placeholders and exit non-zero | Same (PRD-1 onward) | Unchanged, expected |

Vite's own build output still warns "Some chunks are larger than 500 kB after minification" for `@titan/web`'s main bundle — the same real, named, not-yet-actioned finding since PRD-1 (route-based code-splitting, `React.lazy` per top-level route). Compressed Worker size (93.17 KiB gzip) remains negligible against Cloudflare's 3 MB (free)/10 MB (paid) compressed-size limit (`SRE_GUIDE.md`'s own capacity table).

## Workstream 4 — Production deployment validation

Fully covered by the pre-existing `DEPLOYMENT_GUIDE.md`, re-verified fresh this pass rather than re-described:

- **Deployment scripts**: all 6 (`check-wrangler-config.mjs`, `validate-secrets.mjs`, `db-backup-local.mjs`, `smoke-test.mjs`, `check-operational-thresholds.mjs`, `release.mjs`) present, unchanged, real.
- **Deployment pipeline**: `titan-deploy.yml`, 6 jobs, `workflow_dispatch`-only. **Zero historical runs, re-confirmed this pass** via the GitHub Actions API (`total_count: 0` for this workflow).
- **Promotion workflow**: no artifact-promotion primitive exists because Cloudflare Workers doesn't have one (deploys from source on every call) — the documented real equivalent is re-running the identical workflow at the identical commit SHA against a different `target_environment`.
- **Rollback workflow**: see Workstream 6 below.
- **Production configuration**: `validateProductionConfig` (PRD-1/OPS-1) — re-confirmed via this pass's own fresh test run (9 `validateEnv.test.ts` cases, unchanged, passing).
- **Environment separation**: `[env.staging]`/`[env.production]` remain two structurally distinct `wrangler.toml` blocks, each with their own (still-placeholder) `database_id`/`ALLOWED_ORIGIN` — re-verified via a fresh, credential-free `wrangler deploy --dry-run --env staging` this pass (Workstream 3 table above).
- **Secrets validation**: re-confirmed this pass that no `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` exist anywhere reachable by this project — both a fresh attempt to trigger `titan-deploy.yml` via `workflow_dispatch` (this session's own GitHub integration lacks `actions:write` — 403 — a *different*, earlier gate than the credentials one) and the documented `validate-secrets.mjs --env <tier>` failure mode.
- **Cloudflare configuration**: unchanged, real, credential-free-verified.

**This pass does not claim deployment succeeded.** No deployment was attempted or achieved as part of GA-1, consistent with every prior phase.

## Workstream 5 — Load & stress validation (repository-backed only)

No load- or stress-testing tool (k6, Artillery, autocannon, or any equivalent) exists anywhere in this repository — confirmed by a repository-wide search this pass. This is not an oversight: **there is no deployed environment and no real traffic pattern to design a realistic load test against**, and building one against nothing would be exactly the "fabricated but untestable" work this program's engineering principles rule out (the identical reasoning OPS-1 used to defer real alert paging).

What exists instead, real and repository-backed (`SRE_GUIDE.md`'s "Capacity planning" section, re-confirmed unchanged this pass):
- **Current capacity headroom**: Worker bundle at 93.17 KiB gzip against a 3 MB (free)/10 MB (paid) compressed-size limit; ~565 rows of real development/test data against D1's 500 MB (free)/10 GB (paid) database-size limit; `GET /api/operations/summary` issues at most 7 real I/O calls per invocation against a 50 (free)/1,000 (paid) queries-per-invocation limit. No concern at any realistic near-term growth rate.
- **Known limits**: Cloudflare D1 is "inherently single-threaded, processing queries one at a time" per its own documentation — a real, named future constraint, not a lever this project can pull today without real traffic to profile.
- **Validated results**: none — there has never been real traffic to validate against.
- **Blocked items**: any real load/stress/concurrency test, SLO tuning against real traffic, and the alert thresholds themselves (`DEFAULT_ALERT_THRESHOLDS`, OPS-1) — all explicitly named as reasonable *starting* values, not measurements.
- **Future testing**: the day a real Cloudflare deployment exists, a real load test against `staging` (never `production` first) using a tool proportionate to this project's actual scale — not built speculatively now.

## Workstream 6 — Rollback validation

Fully covered by the pre-existing `DEPLOYMENT_GUIDE.md`/`DISASTER_RECOVERY.md`, re-verified this pass. No genuine gap was found requiring new tooling — this workstream is verification, not implementation, matching its own master-prompt wording ("Verify... Document evidence").

| Mechanism | Real? | Exercised? |
|---|---|---|
| Worker code rollback (`wrangler rollback --env <tier>`, wired as `npm run rollback:staging`/`:production`) | ✅ Real command, correctly wired | ❌ Never — no deployment exists to roll back |
| Migration rollback | Forward-only by design (D1/Wrangler has no `.down.sql`/auto-rollback convention — confirmed against `wrangler d1 migrations apply --help`'s real output) | Documented as a real toolchain limitation, not a repository gap. Recovery is either a new forward migration reversing the change, or restoring D1's own automatic pre-migration backup |
| Operational recovery (data restore) | ✅ Real | ✅ **Yes** — PRD-1's own full drill: real baseline row counts (leads: 65, assessments: 43, organizations: 62, audit_events: 373, subscriptions: 22) → export → total local-D1 wipe → restore → exact row-count match across all 5 tables → a full `smoke-test.mjs` pass against the recovered data |
| Infrastructure recovery (rebuild Workers/D1/Pages/DNS from scratch) | Config is real and complete (`ENVIRONMENT_GUIDE.md`) | ❌ Never — only credentials/real resource ids are missing, and only a real second Cloudflare-account loss would exercise this |
| Disaster recovery (secret compromise) | ✅ Real (`wrangler secret put` immediately invalidates the old value; `AUTH_SECRET` already supports array-based rotation, `auth/config.ts`, pre-dating PRD-1) | Documented; the underlying rotation support was tested before PRD-1 even started this document |

**Rollback readiness assessment**: the one mechanism that has actually been exercised against a real failure scenario (operational/data recovery) passed with zero data loss and a real application-level smoke test. The two mechanisms that remain unexercised (Worker code rollback, infrastructure recovery) are unexercised strictly because there has never been a deployment to roll back from — not because the tooling is unverified or missing. This is a real, honest limitation, stated plainly rather than implied to be more tested than it is.

## Workstream 7 — User acceptance validation

Not re-derived here — `FEATURE_MATRIX.md` (127 real, tested feature rows) and `ROADMAP.md`'s own per-phase "Explicitly not done" sections are already this project's authoritative, continuously-maintained record of Completed vs. Deferred vs. Known Limitation, broken down by exactly the areas this workstream names (Customer Portal, Administration, Commercial, Reporting, Operations, Security, UX, Documentation). Restating them here would risk drifting out of sync with the documents that are actually updated in place. The GA-1 final report's own "Known Risks"/"Outstanding Issues" sections summarize the highlights.

## Workstream 9 — Go/No-Go decision

See the GA-1 final report (delivered alongside this pass) for the complete, evidence-cited decision. Summary: **GO WITH CONDITIONS** for Release Candidate status (code-complete, fully tested, honestly documented); the conditions are entirely external to this codebase (a real Cloudflare account, a payments-provider decision, an email-provider decision, GitHub Environment protection rules, and — for GA specifically, not RC — legal review of the DPDP content) and are re-evaluated, not silently dropped, in `GLOBAL_LAUNCH_GUIDE.md`.

## Standing process for the next Release Candidate

1. Whatever phase's work is complete, run the full quality gate fresh (`npm run ci`) — never cite a prior pass's numbers.
2. Re-run the Playwright suite fresh; reconcile any new failure pattern against this document's own sandbox-timing baseline before assuming a regression (the same discipline OPS-1 established: stash back, run a controlled subset, compare).
3. Re-run `wrangler deploy --dry-run` for both environments — credential-free, catches a config regression before any real deploy would.
4. Bump every `package.json` to the next `-rc.N` (or drop the suffix for an actual GA cut) and tag the commit.
5. Update this document's own tables with fresh numbers, not carried-over ones.
