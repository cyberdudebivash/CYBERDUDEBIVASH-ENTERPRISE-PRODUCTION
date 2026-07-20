# Program Status

Living document. Updated only when evidence changes — not on a fixed schedule, not "one per stage." Last updated **2026-07-20** after Stage 5 closed out. Companions: `PROGRAM_BACKLOG.md`, `RISK_REGISTER.md`, `DECISION_LOG.md`, `PRODUCTION_SCORECARD.md`, `LIVE_OPERATIONAL_DASHBOARD.md`. Full historical stage-by-stage evidence (12 reports, Phase 0 through Stage 5) is preserved in `docs/audit/history/` — read it for "why," not for "what's true now." These six documents are what's true now.

## What this platform is

`cyberdudebivash-enterprise-production` — a Vite/React 19 SPA plus 16 hand-authored static HTML pages, a client portal, and an Express/Node backend (`server.ts`), built by one unified `npm run build` and deployed to two targets: GitHub Pages (source-built, fully healthy) and Cloudflare Pages (`cyberdudebivash.com` / `www` — the actual production domain, currently **not** building from source).

## Current authorization

# ACTIVATION BLOCKED

Repository-side engineering is complete and clean. The platform cannot be certified fully production-ready because production (Cloudflare) does not yet serve what the repository actually builds, and the one action that fixes this is outside every session's access in this entire engagement. Full scorecard: `PRODUCTION_SCORECARD.md`. Full live evidence: `LIVE_OPERATIONAL_DASHBOARD.md`.

## The one blocker, unchanged since Stage 2

Cloudflare Pages has no build command configured — it deploys the repository root exactly as committed, not `dist/`. Fixing this requires the Cloudflare project owner to apply a fully-specified dashboard change (`PROGRAM_BACKLOG.md` item 1). No repository change, no amount of further audit, and no session's cleverness substitutes for this. Every other open item either shares this exact root cause (and resolves automatically the moment it's fixed) or is unrelated backlog.

## What's true right now, in one paragraph

Build, test, lint, and dependency-audit are all clean (440/440 tests, 0 lint errors, 0 vulnerabilities, `verify-dist` 7/7). GitHub Pages is fully correct on every dimension checked. Production (Cloudflare) correctly serves `index.html`, the hashed CSS bundle, `favicon.ico`, `portal/`, and the client-portal link, and — genuinely surprising the first time it was checked — effective security headers (CSP/HSTS/etc.), because Cloudflare reads the repository's `_headers` file natively even without a build step. Production does *not* correctly serve `manifest.json`, unmatched-path `404`s, `sitemap.xml`, `robots.txt`, `sw.js`, or `security.txt` (all silently fall back to the homepage), and it currently serves raw application source code (`src/**`, `server.ts`, and other build/config files) directly and downloadably, because Cloudflare deploys the literal repo tree. An attempted repository-side mitigation for the source-exposure issue (a `_redirects` file) was tried twice and, per live verification both times, does not work under the current Cloudflare configuration — this is documented, not concealed, in `DECISION_LOG.md`.

## How this program is run from here

Per the standing instruction that started this program: **no more one-report-per-iteration.** These six documents are updated in place when evidence changes. New stage-numbered certification reports are not created going forward. If a future check reveals something new, it lands in the relevant document above (usually `LIVE_OPERATIONAL_DASHBOARD.md` for a fresh live-check result, or `PROGRAM_BACKLOG.md`/`RISK_REGISTER.md` for a newly-found issue) — not in a new file.

## Escalation path to PRODUCTION ACTIVATED

1. Cloudflare project owner applies the build configuration (`PROGRAM_BACKLOG.md` item 1, exact values there).
2. Any session with repository access re-runs `LIVE_OPERATIONAL_DASHBOARD.md`'s checklist against what Cloudflare then actually serves — not against what it's expected to serve.
3. If every check flips as predicted (structurally guaranteed for the artifact-parity items, per `DECISION_LOG.md`'s reasoning; not guaranteed but expected for `_redirects`, given it didn't work under the current configuration for reasons not fully diagnosed), `PRODUCTION_SCORECARD.md` and this document are updated to **PRODUCTION ACTIVATED** in place.
4. If anything doesn't flip as expected, that's investigated as a fresh, specific finding — not assumed away.
