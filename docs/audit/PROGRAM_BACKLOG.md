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
| 8 | 41% of mobile interactive elements under the 24×24px WCAG tap-target minimum | Engineering | Measured, not inferred (Playwright, mobile viewport). Needs a component-level min-height/width sizing rule across the button/badge patterns — real effort (1–2 days), not a quick fix. The heading-concatenation half of this item is fixed — see "Closed this program" |
| 9 | No application logging, uptime monitoring, or error reporting | Engineering/Operational | Nothing currently implemented claims to provide this — a genuine gap for a live commercial site, not a regression |
| 10 | SPA/static-page navigation duplication; `App.tsx` monolith (1,498 lines, 45 `useState` hooks) | Engineering | Pre-existing architectural debt, `docs/audit/history/PLATFORM_FEATURE_INVENTORY.md` §C and the Phase 0 architecture audit (`docs/audit/history/`) for full detail. Not a production blocker |
| 12 | Keep `LegalPages.tsx`'s in-app About/Privacy/Terms/Copyright content in sync with the real static pages when either is updated | Engineering (process note, not a fix) | `RISK_REGISTER.md` risk 15. Correction to this program's own earlier entry: the `?redirect=` handler that reaches these views is a deliberate 404-fallback for every page type, not orphaned code — do not remove it. The two copies just have no shared source, so a future content change to one should also touch the other |

## Phase 2 — gated, do not start early

| # | Item | Owner | Gate condition |
|---|---|---|---|
| 11 | Remove `deploy.yml`'s `[TEMPORARY]` bridge step | Engineering | Item 1 verified working |
| 12 | Delete root `index.html`, `assets/`, `sitemap.xml`, `robots.txt` (superseded once Cloudflare builds from `dist/`) | Engineering | Item 1 verified working |

**Do not perform 11–12 before item 1 is confirmed live** — doing so removes the only thing currently keeping Cloudflare correct, with no fallback.

## Titan platform (separate sub-project — `titan/`, own CI/docs, tracked here only at cross-program-risk level)

| # | Item | Owner | Notes |
|---|---|---|---|
| 15 | Verify Titan's real Razorpay Subscriptions/Plan/webhook integration against a live Razorpay account | Founder/Business owner (needs a real Razorpay account + credentials) | `RISK_REGISTER.md` risk 16c. Every layer this project's own environment can test — real HMAC cryptography, real D1, real browser E2E — is verified and passing; only a live external account can close this last gap. Not an engineering task until real credentials exist |
| 16 | Decide whether/when to push Titan's `claude/auth-callback-production-incident-dccvc9` branch to `main` and deploy | Founder/Business owner (decision) | `docs/titan/DECISION_LOG.md`'s 2026-07-23 "every gap ... fixed" entry deliberately stopped short of `main`/deploy — every audited gap is fixed and verified as thoroughly as this environment allows, but that decision is the founder's to make with item 15's own honest disclosure in hand |

## Closed this program

| Item | Resolution |
|---|---|
| Favicon bridge regression | Fixed Stage 2.6, confirmed live every stage since |
| `_headers` never copied into `dist/` (would have silently broken security headers on cutover) | Fixed Stage 5, confirmed live |
| 22 pre-existing lint errors | Resolved (files that carried them no longer exist in `src/`) — noticed, not caused, by this program |
| `server.ts` AI system prompt falsely asserted formal ISO 27001/SOC 2 certification | Fixed — now composes `COMPLIANCE_DISCLOSURE`, the same single source of truth the frontend uses |
| "CERT-In Empanelled Organization" / "CERT-In Notified" unsupported certification-style claims | Fixed — softened to "Guidelines Aligned" / routed through the existing `aligned()` helper |
| Exploit Mitigation Lab shell/nginx/YARA generation had no input validation (injection risk via crafted IP/domain/hash) | Fixed — strict format validation added before interpolation |
| Terms of Service and Copyright & IP had no dedicated page anywhere (SPA-only, unreachable by URL); Terms/Privacy links on 12 static pages pointed at raw `.md` files or nothing | Fixed — created `terms.html`/`copyright.html`, fixed all affected footer links, added to sitemap, pointed SPA footer at the real URLs |
| The entire `.gm-footer*` class system (13 static pages) had zero CSS anywhere — every footer rendered as an unstyled bullet list with the matrix-rain canvas bleeding through | Fixed — added `assets/css/gm-footer.css`, linked into all 14 affected pages (13 + threat-intel.html's wrapper); also gave `compliance.html`/`dark-web-monitor.html`/`vciso.html` a real footer for the first time |
| `POST /api/security/analyze` had no rate limiting or request validation despite fanning out to paid third-party AI APIs on every call | Fixed — `express-rate-limit` (20 req/15min per IP), plus content type and 8,000-char length validation. Functionally verified: 22 rapid requests correctly return 429 after the limit, oversized payload returns 413, non-string content returns 400 (previously would have thrown unhandled on `.trim()`), unrelated `/api/security/threat-feed` route confirmed unaffected |
| `item.html` missing `rel="canonical"` (former item 7) | Fixed — added `<link rel="canonical" href="https://www.cyberdudebivash.com/item.html">`, matching the convention already used on the other 19 static pages |
| `AiSocDashboard.tsx` heading-concatenation accessibility regression (former half of item 8) — assistive tech read the panel header as one run-on string ("CYBERDUDEBIVASH®AI CYBERSECURITY COMMAND CENTERSimulated Demo") because three sibling `<span>`s had no text-level separation | Fixed — added an explicit `aria-label` on the `<h2>` for the non-simulation state ("CYBERDUDEBIVASH® AI Cybersecurity Command Center — Simulated Demo"), giving assistive tech a correct accessible name without changing the visual layout. The incident-simulation branch (single `<span>`) was never affected |
| Two new CVEs disclosed since Stage 5's last dependency audit: `body-parser` (DoS via silently-disabled size limit, GHSA-v422-hmwv-36x6) and `protobufjs` (DoS via infinite loop in `.proto` parsing, GHSA-j3f2-48v5-ccww) — found this pass via a fresh `npm audit --omit=dev`, not present at Stage 5 | Fixed — `npm audit fix`, lockfile-only change (no direct dependency version bumps), re-verified: `npm audit --omit=dev` now reports 0 vulnerabilities |
| Root `npm test` (`tsx --test`, no path scoping) silently swept up `titan/`'s test files by Node's default recursive test discovery, even though `titan/` is a fully separate project with its own `package.json`/lockfile/CI (`titan-ci.yml`, which correctly runs in `working-directory: titan`). In a fresh environment where `titan/`'s own dependencies (e.g. `vitest`) aren't installed, this made the root suite report 44 spurious failures out of 484 "tests" — undermining the reliability of this program's own documented `npm test` PASS gate | Fixed — scoped the root `test` script to explicit globs (`scripts/**/*.test.ts`, `src/**/*.test.ts`), the actual and only locations of the root project's own tests. Re-verified: 440/440 passing, deterministically, regardless of whether `titan/`'s separate dependencies are installed |
| Titan production magic-link email — dev-mode only, never sent real email (`RISK_REGISTER.md` former risk 16a) | Fixed — real Resend integration (`titan/packages/platform/src/auth/resendEmail.ts`), and verified genuinely live 2026-07-23: a real `POST /api/auth/signin/email` against the production Worker returned Auth.js's real success redirect after fixing `EMAIL_FROM` (was on an unverified domain) and replacing an invalid `RESEND_API_KEY` with a new, dedicated, least-privilege key. See `docs/titan/DECISION_LOG.md`'s 2026-07-23 "confirmed genuinely live" entry |
| Titan: no self-service organization-creation path (former item 14, `RISK_REGISTER.md` former risk 16b) | Fixed — real `POST /api/portal/organization` + `PortalOnboarding.tsx` form; any authenticated caller with zero organization memberships can now create one and become its owner, no Platform Administrator involved |
| Titan customer-lifecycle production-readiness audit found 7 real gaps: free self-service renewal bypassed payment entirely, no automated subscription expiry, plan entitlements unenforced, Razorpay was INR-only one-time-Orders with no webhook reconciliation, no transactional notifications beyond the magic link, no admin-facing support queue, no self-service org creation (`RISK_REGISTER.md` risk 16) | Fixed, all seven, same pass — real Razorpay Subscriptions API (multi-currency INR/USD/EUR/GBP), real webhook reconciliation, an hourly Cloudflare Cron Trigger enforcing expiry, a real entitlement gate on report export, real transactional billing emails, a real Admin Support Queue, real self-service org creation. `npm run ci` clean, 836+386 unit/integration tests, 45/45 real-browser E2E specs. See `docs/titan/DECISION_LOG.md`'s 2026-07-23 "every gap from the production-readiness audit fixed" entry. Not verified against a live Razorpay account — see item 15 above |
| Marketing site: clicking a footer/header service link (e.g. "DPDP Act Compliance Scans") while scrolled down appeared to do nothing | Fixed — `onNavigate` was wired directly to `setCurrentView` everywhere with no scroll handling; added `window.scrollTo(0, 0)` to the existing view-change effect in `App.tsx`. Affected every footer/header service link, not just DPDP |
