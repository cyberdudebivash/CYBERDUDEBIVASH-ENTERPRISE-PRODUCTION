# Program Backlog

Living document — remaining work, prioritized. Updated in place as items resolve or new ones are found. See `PROGRAM_STATUS.md` for current overall state, `RISK_REGISTER.md` for the risk each item drives.

## P0 — Blocks production activation

| # | Item | Owner | Exact action | Effort |
|---|---|---|---|---|
| 1 | Cloudflare Pages build configuration | Cloudflare project owner (dashboard only) | In Cloudflare Pages → `cyberdudebivash-enterprise-production` → Settings → Builds & deployments: Build command `npm ci --ignore-scripts && npm run build`; Build output directory `dist`; Root directory `/` (unchanged); Env var `NODE_VERSION=22` | ~5 minutes, dashboard only. No repository access exists to do this — confirmed repeatedly (no `CLOUDFLARE_*`/`CF_*` env vars, no `wrangler` config, no dashboard session, across five stages) |

**Verification after applying:** re-run `LIVE_OPERATIONAL_DASHBOARD.md`'s full checklist. Every artifact-parity row is expected to flip to correct by construction (`dist/` becomes what's served, structurally, per `DECISION_LOG.md`). Report back with real results, not the prediction.

## P1 — Real, but not activation-blocking

| # | Item | Owner | Notes |
|---|---|---|---|
| 2 | Re-investigate why `_redirects` doesn't take effect under the current Cloudflare configuration | Cloudflare project owner (needs dashboard/support access this session never had) | Attempted twice this engagement (unforced, then forced with `404!`); both failed live; a control test ruled out "existing file wins." `_headers` works, `_redirects` doesn't, under identical repo-root-serving conditions — unexplained. Likely moot after item 1 (a real Cloudflare build is the well-documented, standard way `_redirects` is meant to be consumed), but worth understanding independently since the same mechanism may matter for future needs |
| 3 | HSTS zone-level `max-age` below the value authored in `_headers` | Cloudflare project owner | Live: `max-age=15552000` (180d), no `preload`. Authored: `63072000` (2yr) + `preload`. Likely a separate zone-level HSTS dashboard setting taking precedence. Still fully HSTS-compliant either way — hardening, not a defect |
| 4 | GA4 property (`G-MDT720X9YW`) ownership unverified | Whoever has `analytics.google.com` access | Homepage source still carries the unedited "replace this ID" setup comment. Determines whether any conversion data collected to date is real |
| 5 | Blogger auto-publish secrets unverified | Whoever has GitHub repo secrets / Blogger account access | `publish-posts.yml` depends on 5 secrets whose validity can't be observed from the repository |
| 5a | Decide the one canonical contact email (currently 3 live: personal Gmail modeled as the legal contact, the `.com` domain address actually rendered publicly, and a retired `.in` domain address) | Founder/Business owner | `RISK_REGISTER.md` risk 12. A business decision, not an engineering task — see `organization.config.ts` header comment for the full drift history |
| 5b | Provide an evidentiary basis for, or soften, unverified commercial stats ("2,500+ Engagements Completed", "97% Critical Findings Rate", "500K+ Threat IOCs Tracked", "99.9% Platform SLA Uptime", "50+ Countries Protected") | Founder/Business owner | `RISK_REGISTER.md` risk 13. Cannot be resolved from the repository either way — inventing a "correct" number would be as wrong as leaving it unverified |

## P2 — Repository-owned, not blocking, no external dependency

| # | Item | Owner | Notes |
|---|---|---|---|
| 6 | `POST /api/security/analyze` has no rate limiting or request validation | Engineering | Not exposed via either live static deployment target today (only relevant if `server.ts` is ever run as a public Node process). `express-rate-limit` + payload validation, ~0.5–1 day |
| 7 | `item.html` missing `rel="canonical"` | Engineering | 1 of 20 pages, ~5 minutes |
| 8 | 41% of mobile interactive elements under the 24×24px WCAG tap-target minimum; one heading-concatenation accessibility regression | Engineering | Measured, not inferred (Playwright, mobile viewport). Component-level sizing rule + a <1hr heading fix |
| 9 | No application logging, uptime monitoring, or error reporting | Engineering/Operational | Nothing currently implemented claims to provide this — a genuine gap for a live commercial site, not a regression |
| 10 | SPA/static-page navigation duplication; `App.tsx` monolith (1,498 lines, 45 `useState` hooks) | Engineering | Pre-existing architectural debt, `docs/audit/history/PLATFORM_FEATURE_INVENTORY.md` §C and the Phase 0 architecture audit (`docs/audit/history/`) for full detail. Not a production blocker |

## Phase 2 — gated, do not start early

| # | Item | Owner | Gate condition |
|---|---|---|---|
| 11 | Remove `deploy.yml`'s `[TEMPORARY]` bridge step | Engineering | Item 1 verified working |
| 12 | Delete root `index.html`, `assets/`, `sitemap.xml`, `robots.txt` (superseded once Cloudflare builds from `dist/`) | Engineering | Item 1 verified working |

**Do not perform 11–12 before item 1 is confirmed live** — doing so removes the only thing currently keeping Cloudflare correct, with no fallback.

## Closed this program

| Item | Resolution |
|---|---|
| Favicon bridge regression | Fixed Stage 2.6, confirmed live every stage since |
| `_headers` never copied into `dist/` (would have silently broken security headers on cutover) | Fixed Stage 5, confirmed live |
| 22 pre-existing lint errors | Resolved (files that carried them no longer exist in `src/`) — noticed, not caused, by this program |
| `server.ts` AI system prompt falsely asserted formal ISO 27001/SOC 2 certification | Fixed — now composes `COMPLIANCE_DISCLOSURE`, the same single source of truth the frontend uses |
| "CERT-In Empanelled Organization" / "CERT-In Notified" unsupported certification-style claims | Fixed — softened to "Guidelines Aligned" / routed through the existing `aligned()` helper |
| Exploit Mitigation Lab shell/nginx/YARA generation had no input validation (injection risk via crafted IP/domain/hash) | Fixed — strict format validation added before interpolation |
