# Live Operational Dashboard

Living document — raw endpoint-by-endpoint evidence, the data layer behind `PRODUCTION_SCORECARD.md`'s judgments. Every row below is a real check performed against the live systems, not inferred. **Last verified: 2026-07-20, Stage 5**, immediately after the last deploy of that stage. Re-run and update in place after any Cloudflare configuration change, or if asked to re-verify — do not assume these results still hold indefinitely, but do not re-fetch them just to re-confirm something unchanged either.

## Targets

| Target | URL | Role |
|---|---|---|
| Production (canonical) | `https://www.cyberdudebivash.com` | Cloudflare Pages, custom domain — **not building from source** |
| Production (apex) | `https://cyberdudebivash.com` | Same Cloudflare project |
| GitHub Pages | `https://cyberdudebivash.github.io/CYBERDUDEBIVASH-ENTERPRISE-PRODUCTION/` | Source-built via `actions/deploy-pages`, fully healthy |

## Artifacts (production)

| Path | HTTP | Content-Type | Notes |
|---|---|---|---|
| `/` | 200 | `text/html` | Correct, matches `dist/` |
| `/favicon.ico` | 200 | `image/vnd.microsoft.icon` | SHA-256 `c32eca02...` — byte-identical across root/`dist`/production |
| `/assets/index-CVf7Rv3z.css` | 200 | — | SHA-256 confirmed byte-identical to fresh `dist/` build |
| Hashed JS (`index-CP5ZVCTF.js` at last check) | 200 | — | Filename varies build-to-build (`DECISION_LOG.md` D6), reference resolves, not a defect |
| `/manifest.json` | 200 | `text/html` | **SPA-fallback** — SHA-256 identical to `/`'s body |
| `/robots.txt` | 200 | `text/plain` | Stale — byte-identical to git-tracked root `robots.txt`, not `dist/`'s (23-URL-era) version. Also wrapped in a Cloudflare zone-level Content-Signal block at the HTTP layer (platform setting, not a repo file) |
| `/sitemap.xml` | 200 | `application/xml` | Stale — 16 `<url>` entries, byte-identical to git root; `dist/` has 23 |
| `/sw.js` | 200 | `text/html` | **SPA-fallback** — SHA-256 identical to `/`'s body. Service worker registration (`src/main.tsx`, prod-only) silently fails as a result |
| `/.well-known/security.txt` | 200 | `text/html` | **SPA-fallback** — SHA-256 identical to `/`'s body |
| Unmatched path (e.g. `/nonexistent-xyz-check`) | 200 | `text/html` | SPA-fallback instead of a real `404` |
| `/portal/` | 200 | `text/html` | Correct |
| `/react-portal/build/portal-landing.html` | 308 → clean URL → 200 | — | Correct — Cloudflare's own clean-URL normalization, pre-existing, not a defect |
| `/downloads/CYBERDUDEBIVASH®_...GEOS...pdf` | 200 | `text/html` | SPA-fallback — but confirmed unlinked from any live page (`grep -rl` across all HTML/TSX source), zero current user impact |

## Security headers (production, on `/`)

| Header | Value |
|---|---|
| `content-security-policy` | Byte-identical to authored `_headers` — confirmed |
| `strict-transport-security` | `max-age=15552000; includeSubDomains` (authored: `63072000` + `preload` — see `RISK_REGISTER.md` #5) |
| `x-frame-options` | `SAMEORIGIN` |
| `x-content-type-options` | `nosniff` |
| `permissions-policy` | `camera=(), microphone=(), geolocation=(self), payment=(), interest-cohort=()` |
| `referrer-policy` | `strict-origin-when-cross-origin` |

## Source/config exposure (production only — confirmed absent on GitHub Pages)

| Path | HTTP | Real content? |
|---|---|---|
| `/src/App.tsx` | 200 | **Yes** — 47,538 bytes, real source |
| `/server.ts` | 200 | **Yes** — 13,518 bytes, byte-identical to repo |
| `/vite.config.ts` | 200 | **Yes** — 1,380 bytes |
| `/tsconfig.json` | 200 | **Yes** — 757 bytes |
| `/package.json` | 200 | **Yes** — 1,156 bytes |
| `/package-lock.json` | 200 | **Yes** — 150,351 bytes |
| Same paths on GitHub Pages | 404 | No — confirmed isolated to Cloudflare's no-build config |
| `_redirects` mitigation attempted (unforced, then forced `404!`) | No change either time | See `DECISION_LOG.md` D8 for the full diagnostic trail, including the control test that ruled out "file precedence" |

## Dev/debug endpoints correctly NOT exposed

| Path | HTTP | Real content? |
|---|---|---|
| `/.env` | 200 | No — SPA-fallback (file isn't tracked in git at all) |
| `/.git/config` | 200 | No — SPA-fallback |
| `/node_modules/` | 200 | No — SPA-fallback |
| `/index-enhanced.html` | 200 | No — SPA-fallback (archived to `_archive/`, no longer at a path Cloudflare's root-serving would find) |

## Deployment runs checked this program (all via `mcp__github__actions_get`, never assumed)

| Run ID | Commit | Conclusion | Duration |
|---|---|---|---|
| `29730205584` | `183494d` (Stage 4 cert) | `success` | ~50s |
| `29731811086` | `e670e7d` (`_headers`/`_redirects` fix) | `success` | ~59s |
| `29732114405` | `3db4723` (forced `_redirects`) | `success` | ~61s |
| `29732585387` | `dc8bdaf` (doc correction) | `success` | ~61s |
| `29732838289` | `fb0b15f` (go-live authorization) | `success` | ~50s |

## How to re-run this checklist

```bash
BASE="https://www.cyberdudebivash.com"
curl -sI "$BASE/manifest.json" | grep -i content-type   # expect application/json post-cutover
curl -so /dev/null -w '%{http_code}\n' "$BASE/nonexistent-path-check"  # expect 404 post-cutover
curl -s "$BASE/sitemap.xml" | grep -c '<url>'            # expect 23 post-cutover
curl -sI "$BASE/sw.js" | grep -i content-type             # expect a JS type post-cutover
curl -sI "$BASE/.well-known/security.txt" | grep -i content-type  # expect text/plain post-cutover
curl -so /dev/null -w '%{http_code}\n' "$BASE/src/App.tsx" # expect 404 post-cutover
curl -sI "$BASE/" | grep -i content-security-policy       # expect unchanged (still present)
```
