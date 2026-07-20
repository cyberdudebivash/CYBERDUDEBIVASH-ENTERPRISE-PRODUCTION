# Production Incident Register

Stage 5, Phase 2–3. Every known production issue, current as of `main` @ `2915d00` (2026-07-20). This register consolidates findings from Stage 2 through Stage 5 rather than re-discovering them — each row cites where it was first found and, where applicable, where it was last reconfirmed. New Stage 5 findings/fixes are marked explicitly.

| # | Issue | Severity | Owner | Root Cause | Status |
|---|---|---|---|---|---|
| 1 | Cloudflare Pages not building from source | **Critical** | Cloudflare (dashboard) | No build command configured — deploys repo root as committed. Confirmed via owner-supplied build log ("No build command specified") and reconfirmed behaviorally every stage since | ⛔ BLOCKED — external action required, unchanged since Stage 2 |
| 2 | `manifest.json` SPA-fallback on production | Medium | Cloudflare (same as #1) | `public/manifest.json` lands correctly in `dist/`; bridge never mirrors it to root; Cloudflare's catch-all serves the homepage instead | ❌ Open — resolves automatically on #1 |
| 3 | `404.html` / unmatched-path fallback | Medium | Cloudflare (same as #1) | Same as #2 — `public/404.html` never reaches root | ❌ Open — resolves automatically on #1 |
| 4 | `robots.txt` stale content on production | Low–Medium | Cloudflare (same as #1) | Root has its own separate, stale `robots.txt`; production serves that, not `dist/`'s current one | ❌ Open — resolves automatically on #1 |
| 5 | `sitemap.xml` stale content (16 vs. 23 URLs) | Low–Medium | Cloudflare (same as #1) | Same class as #4 | ❌ Open — resolves automatically on #1 |
| 6 | `sw.js` SPA-fallback on production | Medium | Cloudflare (same as #1) | Same class as #2; service worker registration silently fails on production, offline caching not functional | ❌ Open — resolves automatically on #1 |
| 7 | `security.txt` SPA-fallback on production | Low–Medium | Cloudflare (same as #1) | Same class as #2. **Found Stage 4** — five prior verification passes checked it by status code (`200`) only | ❌ Open — resolves automatically on #1 |
| 8 | Raw application source downloadable from production | Medium | Cloudflare (root cause) / **Repository (interim mitigation)** | Cloudflare serves the literal repo tree; `src/**`, `server.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json` all confirmed byte-for-byte retrievable. **Found Stage 4.** Not present on GitHub Pages (dist-only) | ✅ **Mitigated Stage 5** — `_redirects` added (commit `2915d00`), 404s these paths immediately (repo-root convention, doesn't require #1). Permanent resolution still gated on #1 |
| 9 | `_headers` would silently stop working on Cloudflare cutover | Medium (forward-looking) | Repository | `_headers` was never copied into `dist/` by `assemble-site.mjs` — only read from repo root. Applying fix #1 without this would have traded six Legacy gaps for the loss of all security headers. **Found and fixed Stage 5**, before it could ever manifest | ✅ **Resolved Stage 5** (commit `2915d00`) — `dist/_headers` now present, `verify-dist`'s new `checkHeaders` guards against regression |
| 10 | HSTS `max-age` below authored value | Low | Cloudflare (dashboard, unconfirmed) | Live: `max-age=15552000` (180d), no `preload`. Authored in `_headers`: `63072000` (2yr) + `preload`. Likely a separate Cloudflare zone-level HSTS setting taking precedence | ❌ Open — not repository-fixable; still fully HSTS-compliant either way |
| 11 | Downloadable PDF broken at canonical path | Low | Cloudflare (same as #1) | `/downloads/....pdf` is SPA-fallback on production; same root cause as #2. Confirmed **unlinked** from any live page — zero current user impact | ❌ Open, no live impact — resolves automatically on #1 |
| 12 | GA4 property ownership unverified | Medium | Unknown (Google Analytics account) | Homepage source still carries the original "replace this ID" setup comment (`ARCHITECTURE-AUDIT.md` #16/#19) | ⚠️ Unverifiable from this repository |
| 13 | Blogger auto-publish secrets unverified | Low | Unknown (Blogger/GitHub secrets) | `publish-posts.yml` depends on 5 GitHub Actions secrets whose validity can't be observed from the repo (`PLATFORM_FEATURE_INVENTORY.md` §K) | ⚠️ Unverifiable from this repository |
| 14 | `POST /api/security/analyze` unrated/unrate-limited | Low–Medium | Repository (backlog) | No rate-limiting or request-validation library in `server.ts` (`ARCHITECTURE-AUDIT.md` #14). Not exposed via either live static deployment target today | ❌ Open, backlog — not a Stage 5 blocker |
| 15 | `item.html` missing canonical tag | Low | Repository (backlog) | `SEO_FOUNDATION.md` — 1 of 20 pages | ❌ Open, backlog |
| 16 | Mobile tap targets / heading concatenation | Medium | Repository (backlog) | `ARCHITECTURE-AUDIT.md` #10, #18 — 41% of interactive elements under 24×24px; one accessibility regression from a prior session's own fix | ❌ Open, backlog — not re-measured live this stage (see `FINAL_PRODUCTION_CERTIFICATION.md` §7) |
| 17 | No application logging / uptime monitoring / error reporting | Medium | Repository/Operational (backlog) | No Sentry-equivalent, no synthetic monitoring anywhere in the codebase (`PRODUCTION_OPERATIONALIZATION_REPORT.md` §9) | ⚠️ Gap, not a blocker — nothing implemented claims to provide this |

## Severity legend

- **Critical** — blocks full production parity; single point of truth for every downstream Legacy issue
- **Medium** — real functional or security-relevant gap, no data exposure or availability impact
- **Low** — cosmetic, backlog-appropriate, or already mitigated

## Owner legend

- **Cloudflare** — requires the Cloudflare Pages dashboard, project owner only
- **Repository** — fixable by committing code; issues 8 and 9 were
- **Unknown** — requires access to a third-party account (Google Analytics, Blogger) this repository can't observe

## Summary

Of 17 catalogued issues: **1 Critical** (all-controlling), **2 resolved this stage** (#8 mitigated, #9 fully fixed), **6 Medium/Low issues** share the Critical issue's exact root cause and resolve automatically once it's fixed, **2 are unverifiable from this repository**, **4 are pre-existing backlog items** unrelated to production activation. Zero issues found this stage are new regressions — every one is either a fresh finding surfaced by deeper validation (#7, #8, #9) or a previously-catalogued, unchanged gap.
