# Risk Register

Living document — active risks and their mitigations, distinct from `PROGRAM_BACKLOG.md` (concrete action items). A risk stays here even once "understood"; it leaves only when actually mitigated or accepted.

| # | Risk | Severity | Likelihood | Current mitigation | Status |
|---|---|---|---|---|---|
| 1 | Cloudflare never gets reconfigured; platform stays permanently split between two deployment targets with different content | Critical if permanent | Depends entirely on the project owner acting on `PROGRAM_BACKLOG.md` item 1 | None available from any session — fully specified, documented, actionable instructions are the only lever this program has | Open, external |
| 2 | Promoting to Phase 2 (bridge/root-legacy removal) before Cloudflare cutover is confirmed | Critical if it happened | Low — explicitly gated, documented in three separate places (`DECISION_LOG.md`, `PROGRAM_BACKLOG.md` items 11–12, `LIVE_OPERATIONAL_DASHBOARD.md`) | Every report since Stage 2 has refused to recommend this until Gate/Action 1 is verified; the bridge remains untouched | Open, well-guarded |
| 3 | Raw application source (`src/**`, `server.ts`, config files) directly downloadable from production | Medium | Certain — confirmed, ongoing, as long as risk 1 is open | Attempted `_redirects` mitigation does not work (see `DECISION_LOG.md`). No secrets found in exposed content, so impact is IP/implementation disclosure, not credential leak | Open, unmitigated |
| 4 | Six artifacts (`manifest.json`, `404` handling, `sitemap.xml`, `robots.txt`, `sw.js`, `security.txt`) silently wrong on production | Low–Medium | Certain, ongoing | None currently possible without risk 1 resolving; each was deliberately not patched individually at root (see `DECISION_LOG.md` — patching root is throwaway work superseded by the real fix) | Open, by design not patched |
| 5 | HSTS `max-age` below the value `_headers` authors | Low | Certain, ongoing | None — likely a separate Cloudflare zone-level setting outside repository control | Open, low priority |
| 6 | GA4 conversion data may not be real (unverified property ID) | Medium | Unknown — genuinely unverifiable from this repository | None possible without `analytics.google.com` access | Open, unverifiable here |
| 7 | No application monitoring, logging, or error reporting | Medium | Certain — the gap exists today | None — nothing implemented claims to provide this | Open, operational backlog |
| 8 | Bundle JS filename varies across otherwise-identical builds (non-deterministic hash) | Low | Confirmed to occur, root cause not conclusively identified | Verification methodology already adjusted to check content/behavior, not filenames, for build artifacts (see `DECISION_LOG.md`) | Open but fully mitigated by process — not a functional risk |
| 9 | `POST /api/security/analyze` unauthenticated, unrate-limited, fans out to a paid third-party API | Medium if `server.ts` is ever run as a public process | Currently zero — not exposed via either live static deployment target | None yet — tracked as `PROGRAM_BACKLOG.md` item 6 | Open, dormant |
| 10 | 41% of mobile tap targets under WCAG minimum size | Medium | Certain — measured | None yet | Open, backlog |
| 11 | Cloudflare Pages' zone-level Content-Signal injection wraps whatever `robots.txt` production serves | None | N/A | Confirmed independently decoupled from anything this repository or deployment controls — a platform-level setting | Informational only, not a real risk |

## Risks retired

| # | Risk | How it closed |
|---|---|---|
| — | Favicon silently served as HTML on production (SPA-fallback, no real icon) | Fixed Stage 2.6, confirmed live every stage since — genuinely closed, not just documented |
| — | `_headers` would have silently stopped working the instant Cloudflare cutover happened | Fixed Stage 5 (`assemble-site.mjs` now copies it into `dist/`, `verify-dist` gates on its presence) — this was a live landmine specifically defused before it could detonate |
