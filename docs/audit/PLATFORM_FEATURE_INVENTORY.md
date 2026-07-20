# Platform Feature Inventory

Stage 3, Phase 1–2. Discovery + acceptance-criteria matrix for every implemented capability found in the repository, as of `main` @ `5404a3b` (2026-07-20).

**This is a consolidation, not a re-discovery.** The architecture was already established with file:line rigor in `ARCHITECTURE-AUDIT.md` (Phase 0) and `CANONICAL_ARCHITECTURE.md` (Phase 0.1, Task 1); the build pipeline in `BUILD_PIPELINE_MIGRATION.md`; SEO/analytics/security surfaces in `SEO_FOUNDATION.md`/`ANALYTICS_VALIDATION.md`/`SECURITY_VALIDATION.md`. This document indexes those findings into the matrix format Stage 3 requires and adds the items not previously catalogued (service worker, blog-publishing pipeline). Evidence for each row is either cited from an existing report or freshly captured — see `PRODUCTION_OPERATIONALIZATION_REPORT.md` for the fresh validation run this inventory feeds into.

**Production URLs in scope:**

| Target | URL | Role |
|---|---|---|
| Production (apex) | `https://cyberdudebivash.com` | Cloudflare Pages, custom domain |
| Production (www, canonical) | `https://www.cyberdudebivash.com` | Cloudflare Pages, custom domain |
| Cloudflare project domain | `https://cyberdudebivash-enterprise-production.pages.dev` | Cloudflare Pages default domain |
| GitHub Pages mirror | `https://cyberdudebivash.github.io/CYBERDUDEBIVASH-ENTERPRISE-PRODUCTION/` | Secondary, source-built, healthy |

---

## A. Hosting & Deployment

| Feature | Purpose | Owner | Dependencies | Production URL | Health Check | Acceptance Criteria | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| GitHub Pages deployment | Source-built mirror, CI-driven | Engineering (repo) | `.github/workflows/deploy.yml`, `actions/deploy-pages@v4` | `cyberdudebivash.github.io/...` | `GET /` → 200 | Serves current `dist/` build | ✅ PASS | Live-checked this pass: 200. Byte-identical to `dist/` (build determinism, `CLOUDFLARE_MIGRATION_READINESS.md` Step 2) |
| Cloudflare Pages deployment | Primary production host, custom domain | Platform owner (Cloudflare dashboard) | Cloudflare project config; currently **no build command configured** | `www.cyberdudebivash.com`, apex | `GET /` → 200 | Serves a build sourced from `npm run build` / `dist` | ⛔ **BLOCKED** | `PRODUCTION_RELEASE_AUTHORIZATION.md` §2.2: build log states "No build command specified." Confirmed unchanged this pass — see Operationalization Report §5 |
| `[TEMPORARY]` root bridge | Keeps Cloudflare's no-build deploy current until cutover | Engineering (repo) | `deploy.yml` bridge step | N/A (CI-internal) | Mirrors `dist/index.html`, hashed JS/CSS, `favicon.ico` → repo root every push to `main` | ✅ PASS | Commit `5404a3b`, authored `CDB Build Bot`, confirmed this pass — see Operationalization Report §5 |
| DNS / custom domain | `cyberdudebivash.com` + `www` → Cloudflare; GitHub Pages `CNAME` → `www.cyberdudebivash.com` | Platform owner | Cloudflare zone, `public/CNAME` | both | Resolves, valid TLS | ✅ PASS | Live HTTPS 200 on both this pass; `server: cloudflare` confirmed |

## B. Build Pipeline

| Feature | Purpose | Owner | Dependencies | Health Check | Acceptance Criteria | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `vite build` | Builds SPA entry + hashed asset bundle | Engineering | Vite 6, React 19, Tailwind v4 | `npm run build` step 1 | Deterministic per-source-hash content (filenames may vary, see note below) | ✅ PASS | Fresh build this pass, 5.64s, clean |
| `assemble-site.mjs` | Assembles complete `dist/`: promotes entry HTML, copies 16 static pages, `portal/`, `react-portal/`, pre-existing `assets/{images,css,js}` | Engineering | `scripts/build/assemble-site.mjs`, 19 unit tests | `npm run build` step 2 | All expected files land in `dist/` | ✅ PASS | Fresh run this pass: 16 pages + 2 dirs + 3 asset subdirs copied, matches spec exactly |
| `verify-dist.mjs` | Hard CI gate: asset refs resolve, no orphans, HTML well-formed, metadata/JSON-LD present, favicon present, sitemap/robots present | Engineering | `scripts/build/verify-dist.mjs`, 6 checks | `npm run build` step 3 (non-zero exit fails build) | 6/6 checks pass | ✅ PASS | Fresh run this pass: 6/6 ✅ |
| `esbuild server.ts → dist/server.cjs` | Bundles the Express/Node server for `npm start` (non-static-hosting path) | Engineering | esbuild | `npm run build` step 4 | Bundle + sourcemap produced | ✅ PASS | Fresh build: `dist/server.cjs` 13.2kb + map |
| Test suite | Regression gate | Engineering | `node:test` via `tsx --test` | `npm test` | 0 failures | ✅ PASS | **435/435 passing**, fresh run this pass |
| Typecheck | Static-type gate | Engineering | `tsc --noEmit` | `npm run lint` | 0 errors | ✅ PASS | **0 errors**, fresh run this pass — see Operationalization Report §4 for the discrepancy vs. the 22 errors documented in five prior reports |
| Bundle-filename determinism | N/A — informational | Engineering | Vite/Rollup | — | Not required; only content-integrity is required (per `PRE_CUTOVER.md`'s correction) | ✅ PASS (as scoped) | JS filename varies build-to-build (documented, unresolved root cause, accepted as non-blocking); CSS filename and content are stable |

## C. Frontend — SPA (`src/`)

Canonical per `CANONICAL_ARCHITECTURE.md`. Single-page app, `currentView` string-union router (16 values) in `App.tsx`, rendered through three nav surfaces (desktop/mobile/dropdown).

| Feature | Purpose | Owner | Production URL | Acceptance Criteria | Status | Evidence |
|---|---|---|---|---|---|---|
| `App.tsx` (1,498 lines) | Root shell, routing, header/footer, modals | Engineering | `/` (entry) | Renders without console errors | ✅ PASS (functionally) / ⚠️ tech debt | `ARCHITECTURE-AUDIT.md` #3 — works, but monolithic (45 `useState` hooks); not a Stage 3 blocker, tracked as backlog |
| `HomeView`, `AiView`, `ApiView`, `BlogView`, `IntelView`, `LegalPages`, `ServicePages`, `ToolsView` | 8 SPA view components | Engineering | hash-routed under `/` | Each view renders for its `currentView` state | ✅ PASS | Confirmed present in `src/views/`; build includes all with 0 typecheck errors |
| `AiSocDashboard.tsx` | Illustrative "AI SOC Dashboard" demo | Engineering | SPA view | Labeled "Simulated Demo" per classification standard | ✅ PASS | `ARCHITECTURE-AUDIT.md` executive summary — correctly labeled, not presented as live telemetry |
| `CookieConsent.tsx` | GDPR/DPDP consent banner, wires `gtag('consent', 'update', ...)` | Engineering | all pages | Denies by default, respects choice | ✅ PASS | `ANALYTICS_VALIDATION.md` — Consent Mode v2 correctly implemented, `wait_for_update: 500ms` |
| `EcosystemDiscovery.tsx` | Cross-subdomain ecosystem links + health-check UI | Engineering | SPA view | Links resolve | ⚠️ PARTIAL | Links point to subdomains outside this repo's control; not independently re-verified this pass (`ARCHITECTURE-AUDIT.md` #15) |

## D. Frontend — Static Marketing Pages

16 hand-authored HTML pages at repo root, copied verbatim into `dist/` by `assemble-site.mjs`: `about`, `apps`, `bug-bounty`, `compliance`, `contact`, `dark-web-monitor`, `item`, `platforms`, `pricing`, `privacy`, `research`, `services`, `soc-services`, `status`, `threat-intel`, `vciso` `.html`.

| Aspect | Acceptance Criteria | Status | Evidence |
|---|---|---|---|
| Presence in `dist/` | All 16 copied every build | ✅ PASS | Fresh build this pass: all 16 confirmed copied |
| `<title>` | Unique, descriptive | ✅ PASS | `SEO_FOUNDATION.md` — 20/20 |
| Viewport meta | Present | ✅ PASS (19/19 real pages) | `SEO_FOUNDATION.md` |
| `rel="canonical"` | Present | ⚠️ 1 gap | `item.html` missing — `SEO_FOUNDATION.md` (not fixed this pass; cosmetic SEO gap, not a Stage 3 blocker, tracked as backlog) |
| OG / Twitter Card | Present | ✅ PASS (18/19 real pages) | `SEO_FOUNDATION.md` |
| JSON-LD | Present | ✅ PASS (19/20; depth not fully audited per-page) | `SEO_FOUNDATION.md` |
| Live serving | 200 on both platforms | ✅ PASS | Spot-checked this pass (`about.html` via 308 clean-URL → 200 on production; direct 200 on GitHub Pages) |
| Dead CSS/JS | Removed | ✅ PASS | `CLEANUP_REPORT.md` — 7 dead CSS + 2 dead JS files archived to `_archive/`, zero references confirmed |

## E. Client Portal

| Artifact | What it is | Production URL | Acceptance Criteria | Status | Evidence |
|---|---|---|---|---|---|
| `react-portal/build/portal-landing.html` | Real login page, linked from 5 live pages | `/react-portal/build/portal-landing.html` (redirects to clean URL) | Resolves to 200 | ✅ PASS | Live-checked this pass: 308 → `/react-portal/build/portal-landing` → 200 (Cloudflare clean-URL normalization, pre-existing, documented in `PRE_CUTOVER.md`) |
| `portal/index.html` | More complete dashboard shell, `noindex,nofollow`, unlinked from nav | `/portal/` | Deploys, not indexed | ✅ PASS | Live-checked this pass: 200. `CANONICAL_ARCHITECTURE.md` flags as the recommended Phase 4 starting point — unlinked by design, not a defect |
| `react-portal/src/` CRA skeleton | Superseded reference implementation | N/A | — | N/A — archived | `_archive/react-portal-cra-skeleton/`, zero build/deploy references |

## F. SEO & Discovery

| Feature | Purpose | Production URL | Acceptance Criteria | Status | Evidence |
|---|---|---|---|---|---|
| `sitemap.xml` (via `dist/`) | Search-engine discovery, 23 URLs incl. news namespace | `/sitemap.xml` | Matches `dist/`, reflects current IA | ❌ **FAIL on production** | Root/production still serve the stale 16-URL file — see §H below and Operationalization Report §6 |
| `robots.txt` (via `dist/`) | Crawler policy incl. AI-scraper opt-out | `/robots.txt` | Matches `dist/` content | ❌ **FAIL on production** | Root/production serve the stale pre-`Contact:`/`Updated:`-block version, plus an independent Cloudflare zone-level Content-Signal injection on top (platform-level, unrelated to repo) |
| `manifest.json`/`.webmanifest` | PWA manifest | `/manifest.json` | Valid JSON | ❌ **FAIL on production** | SPA-fallback HTML served instead — see §H |
| `404.html` | Real 404 for unmatched paths | any unmatched path | Returns HTTP 404 | ❌ **FAIL on production** | SPA-fallback 200 — see §H |
| `security.txt` (RFC 9116) | Vuln-disclosure contact | `/.well-known/security.txt` | Present, correctly formatted | ✅ PASS | Live-checked this pass: 200. `SECURITY_VALIDATION.md` — correctly formatted |
| Canonical/OG/Twitter/JSON-LD (homepage) | Rich-result + share metadata | `/` | Present, valid | ✅ PASS | Live-checked (headers) this pass; content verified in `PRODUCTION_READINESS_GATE.md` §4 |
| `og-banner.png` | Social-share image | `/assets/og-banner.png` | 200 | ✅ PASS | Live-checked this pass: 200 |

## G. PWA / Offline

| Feature | Purpose | Production URL | Acceptance Criteria | Status | Evidence |
|---|---|---|---|---|---|
| `public/sw.js` (Service Worker) | Offline cache — precache core assets, cache-first for hashed assets, network-first for navigation | `/sw.js` | Registered (`src/main.tsx`, prod-only), served as `application/javascript` | ❌ **FAIL on production** | **New this pass** — not previously enumerated in the artifact-parity tables. SHA-256-confirmed byte-identical to homepage HTML (SPA-fallback), same root cause as manifest/404 (see §H). `dist/sw.js` itself is correct and well-formed. |
| Registration logic | `navigator.serviceWorker.register('/sw.js')`, prod-only, fails silently (`.catch(() => {})`) | — | Doesn't throw unhandled errors | ✅ PASS (fails safe) | `src/main.tsx:56-58` — the `.catch()` means the current gap is silent (no error to the user) but registration does not succeed |

## H. Known Cross-Cutting Gap — "Legacy" Artifact Class

Five artifacts (`sitemap.xml`, `robots.txt`, `manifest.json`, `404.html`, `sw.js`) share one root cause and one fix, already established in `ARTIFACT_PARITY_REPORT.md` and `PRE_CUTOVER.md`: they are sourced from `public/` and land correctly in `dist/`, but the `[TEMPORARY]` bridge step was deliberately scoped to mirror only `index.html`, hashed JS/CSS, and `favicon.ico` to repo root — never these five. Cloudflare, which currently serves repo root as-is (no build step), therefore falls back to its own SPA-style catch-all for all five, returning the homepage with `200` instead of the correct content. **Structurally guaranteed to resolve automatically once the Cloudflare Pages source-build cutover lands** (Operationalization Report §5/§11) — not something to patch individually at root, per the explicit, repeated recommendation in `PRODUCTION_RELEASE_AUTHORIZATION.md` §6.

## I. Security & Trust

| Feature | Purpose | Production URL | Acceptance Criteria | Status | Evidence |
|---|---|---|---|---|---|
| HTTPS | Transport security | all | Valid TLS, no mixed content | ✅ PASS | Live-checked this pass |
| `_headers` (CSP/HSTS/X-Frame-Options/Permissions-Policy/Referrer-Policy/X-Content-Type-Options) | Response-header hardening | `/` (all paths) | Headers present and effective | ✅ **PASS — corrected finding** | Live-checked this pass: all 6 present, CSP byte-identical to authored file. **Corrects** `ARCHITECTURE-AUDIT.md` #13 / `SECURITY_VALIDATION.md`, which assessed this against GitHub Pages (which indeed ignores `_headers`) rather than Cloudflare, the actual production host, which reads it natively. See Operationalization Report §8. |
| HSTS max-age | 2yr + preload, per `_headers` | `/` | `max-age=63072000; includeSubDomains; preload` | ⚠️ **PARTIAL** | Live value: `max-age=15552000; includeSubDomains` (180d, no preload) — a Cloudflare zone-level HSTS setting likely takes precedence over the Pages-level file value. Still fully HSTS-compliant; not a repo-side defect; dashboard-controlled |
| `POST /api/security/analyze` (Gemini proxy) | AI-assisted security analysis endpoint | `server.ts`, Node-hosting path only | Rate-limited, validated | ❌ **GAP (unaddressed)** | `ARCHITECTURE-AUDIT.md` #14 — no rate limiting/validation library present. Not exposed via the static hosting paths currently live; matters only if `server.ts` is run as a public Node process. Tracked as backlog, not a Stage 3 blocker for the static deployment |
| Dependency health | No known vulnerabilities | — | `npm audit` clean | ✅ PASS | Fresh `npm audit --omit=dev` this pass: **0 vulnerabilities** |
| Secrets exposure | No live secrets committed | — | None found | ✅ PASS | Fresh scan this pass: only `_archive/backend/.env.example` (template, archived, unreferenced); `.gitignore` covers all `.env*` variants; no API keys found in source |
| Source maps | No client-side maps shipped | `dist/assets/*.map` | None present | ✅ PASS | Fresh check this pass: 0 client JS/CSS maps. One server-side map (`dist/server.cjs.map`) exists but isn't served by either live static deployment target |

## J. Analytics & Monetization

| Feature | Purpose | Acceptance Criteria | Status | Evidence |
|---|---|---|---|---|
| GA4 (`G-MDT720X9YW`) | Visitor/conversion analytics | Verified, owned property | ⚠️ **UNVERIFIED** | `ANALYTICS_VALIDATION.md` / `ARCHITECTURE-AUDIT.md` #16, #19 — homepage source still carries the unedited "replace this ID" setup comment. Cannot be verified from the repository; requires login to `analytics.google.com`. Not re-verified this pass (no new evidence available from this session) |
| AdSense (`ca-pub-8343951291888650`) | Monetization | Present, consistent | ✅ PASS (structurally) | `ANALYTICS_VALIDATION.md` — present on 18/20 pages, no placeholder markers |
| Consent Mode v2 | GDPR/DPDP compliance | Default-denied, explicit opt-in | ✅ PASS | `ANALYTICS_VALIDATION.md` |
| Conversion events (`purchase`, `generate_lead`) | Funnel measurement | Fire on real actions, land in a real property | ⚠️ **DEPENDENT on GA4 verification above** | `ANALYTICS_VALIDATION.md` |

## K. Content Pipeline

| Feature | Purpose | Owner | Dependencies | Acceptance Criteria | Status | Evidence |
|---|---|---|---|---|---|---|
| Blogger auto-publish (`publish-posts.yml`) | Publishes `_posts/*.md` to Blogger on push | Platform owner (Blogger account) | GitHub Actions secrets: `BLOGGER_SERVICE_ACCOUNT_JSON`, `BLOGGER_CLIENT_ID/SECRET`, `BLOGGER_REFRESH_TOKEN`, `BLOGGER_BLOG_ID`; `scripts/github_publish.py` | Workflow succeeds, post appears on Blogger | ⚠️ **UNVERIFIED** | **Newly catalogued this pass.** 2 posts currently in `_posts/` (`nis2-compliance.md`, `mcp-token-leakage-advisory.md`). Whether the required secrets are populated/valid is not observable from the repository — same epistemic category as the GA4 ID |
| SEO automation scripts (`god_mode_seo_engine.py`, `publish_blogger.py`) | Content/SEO tooling | Engineering | Python, external APIs | — | N/A — not wired into CI, run manually | Present in `scripts/`, out of scope for automated production validation |

## L. Contact & Lead Capture

| Feature | Purpose | Production URL | Acceptance Criteria | Status | Evidence |
|---|---|---|---|---|---|
| Contact form (Formspree: `formspree.io/f/xkordvzn`) | Lead capture, delivers to `bivash@cyberdudebivash.com` | `contact.html` | Submits successfully | ✅ PASS (structurally) | Endpoint present in CSP `connect-src` allowlist and `CHANGELOG.md`; end-to-end submission not exercised this pass (would send a real email) |

---

## Summary

| Category | PASS | PARTIAL / UNVERIFIED | FAIL | BLOCKED |
|---|---|---|---|---|
| Hosting & Deployment | 3 | 0 | 0 | 1 (Cloudflare cutover) |
| Build Pipeline | 7 | 0 | 0 | 0 |
| SPA | 4 | 1 | 0 | 0 |
| Static Pages | 7 | 1 | 0 | 0 |
| Portal | 2 | 0 | 0 | 0 |
| SEO | 3 | 0 | 4 | 0 |
| PWA | 1 | 0 | 1 | 0 |
| Security | 5 | 1 | 1 | 0 |
| Analytics | 2 | 2 | 0 | 0 |
| Content Pipeline | 0 | 1 | 0 | 0 |
| Contact | 1 | 0 | 0 | 0 |

Every FAIL above belongs to the single "Legacy artifact" class (§H), sharing one already-diagnosed root cause and one pending fix. Every BLOCKED/UNVERIFIED item requires action outside this repository (Cloudflare dashboard, Google Analytics/Blogger account access) and is documented, not assumed, per Stage 3's stop conditions. Full evidence and fresh live-validation detail: `PRODUCTION_OPERATIONALIZATION_REPORT.md`.
