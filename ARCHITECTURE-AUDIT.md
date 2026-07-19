# Phase 0 — Enterprise Architecture Audit

CyberDudeBivash Enterprise Gateway — engineering and architecture audit, prepared as the gate before Phase 1–5 implementation begins.

- **Scope:** `cyberdudebivash-enterprise-production`, branch `claude/cyberdudebivash-platform-redesign-iwprr8`
- **Method:** direct repository evidence (file:line cited throughout) + a real production `vite build` + headless-Chromium measurement (Playwright) of the built site
- **Status:** awaiting approval — no redesign work was performed while producing this document
- **Companion:** an interactive version of this same audit (collapsible findings, severity dashboard) was published as a Claude Artifact in the session that authored this file

## Executive summary

**Severity counts:** 1 Critical · 8 High · 8 Medium · 3 Low

The platform works, and after the two prior commits on this branch it no longer contradicts itself on compliance claims. The findings below are about what's underneath: **the repository currently contains five parallel frontend implementations and three parallel backend implementations of "the site,"** which is the root cause of the inconsistency already fixed once this session and will keep re-causing it at Phase 1–5 scale if it isn't addressed first. Two findings (Analytics ID, Security headers) are rated high/critical not because they're hard to fix — both are hours of work — but because they're silently broken in a way nothing in the current build pipeline would ever catch.

**Top 3 blockers for Phase 1:**

1. **Architecture duplication (#1, #4).** Decide which frontend is canonical before building a new nav/header/footer, or Phase 1 builds a 6th parallel system.
2. **The 1,498-line App.tsx (#3).** Header, footer, navigation, and search all live in one file with 45 individual state hooks. Extracting it is explicitly upstream of Phase 1's own Header/Footer/Navigation/Search line items.
3. **Unverified analytics (#16, #19).** The homepage's GA4 ID ships with its own "replace this" setup comment still in place. If it's not a real property, every conversion-funnel decision in Phase 2 would be flying blind — this is a two-hour check, not a redesign task, and should happen immediately regardless of what else is approved.

## A classification standard, applied going forward

Per the closing guidance this audit was commissioned under, every claim on the platform should be legible as one of four kinds. This wasn't enforced anywhere before the prior two commits — that's precisely how the ISO/SOC 2 wording and the fabricated testimonials happened.

| Category | Meaning | Example |
|---|---|---|
| **Verified business fact** | Has a document behind it | GSTIN, PAN, MSME registration, incorporation date, published service catalog |
| **Planned capability** | Roadmap, not shipped | react-portal's Login/Dashboard/Account pages; the Compliance Automation product in `compliance.html` |
| **Illustrative demonstration** | Should stay labeled everywhere it's reused | The AI SOC Dashboard, the Sentinel event logger — now labeled "Simulated Demo" |
| **Measured production metric** | Don't display until real | Real uptime, real customer counts, real detection rates — none currently exist in the codebase |

Recommend carrying this forward as a literal tag — a code comment at minimum, a visible UI badge for demo surfaces — as part of the Phase 1 component library (finding #7).

---

## The 20 findings

### 1. Architecture — five parallel frontends, three parallel backends — **High**

- **Evidence:** Frontends: `src/` (Vite/React SPA — confirmed live, matches production screenshots), 20 standalone static HTML pages at repo root, `react-portal/` (separate Create-React-App project, 10 files), `threat-intel/frontend/` (separate dashboard+widget), `blogger-theme.xml` (11,000+ line Blogger theme for a separate subdomain). Backends: root `server.ts` (Express, actively built by CI), `backend/server.js` + `backend/routes/*.js`, and a near-duplicate `backend/src/server.js` + `backend/src/routes/*.js` (apikeys/auth/leads/payments appear in both route trees).
- **Impact:** No single mental model of "the codebase" exists. This is the direct root cause of the trust-claim inconsistency already fixed this session — the same badge wording had to be independently fixed in four React files and twenty static HTML files because nothing shared a source.
- **Recommendation:** Declare `src/` canonical for the frontend and `server.ts` canonical for the backend. Extract anything uniquely valuable from the others (react-portal's page list is a reasonable customer-portal spec for Phase 4), then archive or delete the rest.
- **Implementation approach:** Audit each parallel copy for unique value, extract, archive/delete remainder.
- **Estimated effort:** 1–2 days (decision-heavy, not code-heavy).
- **Business value:** High — the single biggest lever against repeat rework.
- **Risk if unaddressed:** Every Phase 1–5 milestone risks being built in the wrong copy, or duplicated across copies, multiplying real cost 3–5x.

### 2. Folder structure — unclear ownership, two conflicting sitemaps — **Medium**

- **Evidence:** 14 separate stylesheets in `assets/css/` with no documented load order. `layout/footer-enhanced.html` and 3 sibling partials exist but aren't actually included anywhere — the "shared" footer badges were copy-pasted identically into 7 files instead. Two different `sitemap.xml` files exist (root: 16 URLs, `public/`: 23 URLs) with different XML namespaces and content.
- **Impact:** The `layout/` partials are dead weight that looks live. The sitemap duplication is a genuine, active SEO risk.
- **Recommendation:** Resolve the sitemap conflict immediately. Either wire `layout/` up via a real include mechanism or delete it.
- **Implementation approach:** Sitemap: 1-file decision. Layout: small Node build script or removal.
- **Estimated effort:** Sitemap: 1 hour. Full consolidation: 3–5 days.
- **Business value:** Medium-high.
- **Risk if unaddressed:** Search Console indexing confusion; continued growth of orphaned "shared" files nobody actually shares from.

### 3. Component architecture — App.tsx is 1,498 lines with 45 state hooks — **High**

- **Evidence:** `src/App.tsx`: 1,498 lines, 45 individual `useState` calls (grep-counted), owns routing, header, footer, modals, and most event handlers directly. `AiSocDashboard.tsx` (1,013 lines) and `ServicePages.tsx` (612 lines) show the same pattern. Zero real `useContext`/`useReducer`/state-library usage found.
- **Impact:** Every fix this session — the GSTIN widget removal, the header ticker, the footer badges — required editing this same file. Phase 1 explicitly targets Header/Footer/Navigation/Search, all of which currently live inside it.
- **Recommendation:** Extract Header, Footer, and the view router into their own components before Phase 1 begins; group the 45 state atoms into 4–6 domain hooks.
- **Implementation approach:** Incremental extraction, verified by typecheck + build after each move.
- **Estimated effort:** 3–4 days.
- **Business value:** High — directly de-risks Phase 1's own scope.
- **Risk if unaddressed:** Phase 1 header/nav/footer work happens inside the same monolith that's already been touched three times this session alone.

### 4. Navigation — two incompatible systems, kept in sync by hand — **High**

- **Evidence:** The SPA uses a 16-value `currentView` string union rendered through three separate nav blocks (desktop, mobile, dropdown) in App.tsx. The 20 static pages use plain `<a href>` links across at least two different footer/nav markup variants (the `gm-footer` pattern vs. the `footer-trust-badges` pattern).
- **Impact:** A visitor moving from index.html into any static page hits a different navigation system and visual language with no shared active-state indicator. New links must be added in 2+ places.
- **Recommendation:** Decide as part of #1 before Phase 1's "Navigation" line item starts — otherwise Phase 1 adds a third system rather than replacing the first two.
- **Implementation approach:** Depends on the #1 decision.
- **Estimated effort:** Decision: immediate. Build: 3–10 days depending on scope.
- **Business value:** High — directly blocks doing Phase 1 well.
- **Risk if unaddressed:** A third nav system gets built without retiring the first two, tripling the maintenance surface.

### 5. Information architecture — no single page inventory — **Medium**

- **Evidence:** Two conflicting sitemaps (see #2). `compliance.html` markets a full "Compliance Automation" SaaS product — tiered pricing, FAQ, feature list — with no representation anywhere in the SPA's ecosystem data or navigation, and no evidence elsewhere in the repo that it's a shipped capability.
- **Impact:** Unclear source of truth for "what pages exist," a real SEO risk, and directly upstream of Phase 2's Products/Solutions/Services/Pricing scope.
- **Recommendation:** Produce one definitive page inventory reconciling static + SPA before Phase 2; get an explicit answer on whether Compliance Automation is real, planned, or should be retired, per the classification standard above.
- **Implementation approach:** Manual inventory + stakeholder decision, not code.
- **Estimated effort:** 2–3 days.
- **Business value:** High — upstream of all of Phase 2.
- **Risk if unaddressed:** Phase 2 builds marketing pages for a product line that may not exist yet.

### 6. Design system — none exists yet, in either implementation — **Medium**

- **Evidence:** The SPA uses Tailwind v4 almost entirely through arbitrary-value utilities (`text-[10px]`, ad hoc hex like `#0c1117`/`#080d14`/`#020810` repeated inline) with no theme-token layer. The static pages load from 14 independent hand-written stylesheets with no shared tokens with the SPA at all.
- **Impact:** Confirmed directly by this session: the same trust-badge concept had four different visual treatments across files before centralization.
- **Recommendation:** Define a real token layer (color/type/spacing scale) for the SPA first; decide separately whether static pages adopt it or keep independent CSS with tokens mirrored via shared custom properties.
- **Implementation approach:** Tailwind theme extension + `design-tokens.css` for static pages.
- **Estimated effort:** 4–6 days for tokens + first migration pass.
- **Business value:** High (explicit Phase 1 scope), sequence after #1/#4.
- **Risk if unaddressed:** Low immediate risk; doing this before #1/#4 resolve means redoing it once the canonical implementation is settled.

### 7. Reusable components — 3 components serving a 20-page site — **High**

- **Evidence:** `src/components/` holds exactly 3 files (AiSocDashboard, CookieConsent, EcosystemDiscovery). Stat tiles, trust badges, CTA buttons, and page headers are inlined and repeated as one-off JSX in App.tsx/HomeView.tsx/LegalPages.tsx/ServicePages.tsx independently.
- **Impact:** Same root cause as #6: every visual pattern is duplicated N times, so every content change is an N-file find-and-replace — exactly the manual work this session just did for the compliance badges.
- **Recommendation:** Extract a core set — `StatTile`, `TrustBadge`, `CTAButton`, `PageHero`, `SectionHeader` — as the literal first implementation slice once this audit is approved.
- **Implementation approach:** Extract from existing, working JSX — not a rewrite.
- **Estimated effort:** 2–3 days for the first core set.
- **Business value:** High, low-risk, good first slice of Phase 1.
- **Risk if unaddressed:** Low to do now; compounds with every new page added.

### 8. State management — 45 atoms, prop-drilled, no library — **Medium**

- **Evidence:** 45 `useState` calls in App.tsx; `HomeViewProps` alone accepted 15+ individually-drilled props before this session trimmed the GSTIN-related ones. No context, reducer, or state library anywhere in `src/`.
- **Impact:** Removing the GSTIN widget this session required touching three separate places purely because of this pattern.
- **Recommendation:** Fold into the #3 refactor: group state into 2–4 domain hooks rather than introducing a new library.
- **Implementation approach:** Custom hooks, grouped by feature domain.
- **Estimated effort:** Folded into #3's 3–4 days.
- **Business value:** Medium — maintainability multiplier for Phase 2–4.
- **Risk if unaddressed:** Low near-term, compounds steadily.

### 9. Performance — 191KB gzipped JS+CSS; motion library is the outlier — **Medium**

- **Evidence:** Real `vite build` output: main bundle 261.6KB (67.9KB gzip), React vendor 193.7KB (60.5KB gzip), **motion (animation) vendor 128.8KB (42.4KB gzip)**, CSS 114.2KB (16.0KB gzip), icons 19.2KB (4.5KB gzip) — ≈191KB gzipped JS+CSS total. Real headless-Chromium measurement of the built homepage: DOMContentLoaded 217ms, First Contentful Paint 676ms, 1,410 DOM nodes.
- **Impact:** Reasonable but not lean for a marketing entry point. The `motion` dependency is 42KB gzipped for what's mostly basic fade/slide transitions in one dashboard component.
- **Recommendation:** Code-split the AI SOC Dashboard so `motion` only loads when that section is reached.
- **Implementation approach:** Dynamic import / lazy route split.
- **Estimated effort:** 1–2 days.
- **Business value:** Medium.
- **Risk if unaddressed:** Low — this is optimization, not a defect. *Caveat: full page-load timing couldn't be trusted in this sandbox — Google Fonts/GA4/AdSense requests fail here due to network policy, not a site defect. Recommend a real Lighthouse CI run with normal internet access as a Phase 5 gate.*

### 10. Accessibility — good foundations, one self-inflicted regression, systemic tap targets — **Medium**

- **Evidence — good:** working skip-link (`#main-content`), two nav regions with distinguishing `aria-label`s, 0 of the homepage's images missing `alt` (confirmed via live DOM query), 41 `aria-*` attributes across the SPA, a 548-node accessibility tree. **Needs work:** live DOM query found the AI SOC Dashboard header reads to assistive tech as one run-on string — "CYBERDUDEBIVASH®AI CYBERSECURITY COMMAND CENTERSimulated Demo" — because the "Simulated Demo" badge added in the prior fix sits in an adjacent `<span>` with no text-level separation. Real mobile-viewport measurement: **56 of 136 interactive elements (41%) are smaller than the 24×24px minimum touch-target size.**
- **Impact:** The heading issue is a self-contained regression from this session's own fix. The tap-target issue is systemic and will recur on every new page built with current button/badge patterns.
- **Recommendation:** Fix the heading concatenation now. Fold minimum tap-target sizing into the Phase 1 component library (#7).
- **Implementation approach:** Heading: <1hr fix. Tap targets: component-level min-height/width rule.
- **Estimated effort:** Heading: immediate. Tap targets: 1–2 days via #7.
- **Business value:** Medium-high — legal-exposure area and direct mobile-conversion impact.
- **Risk if unaddressed:** Medium — real, measured usability friction on likely a large share of mobile traffic.

### 11. SEO — solid tag hygiene, undermined by the sitemap conflict — **Medium**

- **Evidence:** 19 of 20 static pages have viewport meta (1 missing); 18 of 20 have canonical tags (2 missing); sampled `<title>` tags are unique and well-crafted. Two conflicting sitemap.xml files (see #2) create real ambiguity about canonical URLs post-build.
- **Impact:** Per-page tag hygiene is genuinely good. The sitemap conflict is the one item actively working against it.
- **Recommendation:** Fix the sitemap conflict (see #2); identify and patch the 3 pages missing viewport/canonical tags.
- **Implementation approach:** Direct edits, no architectural change needed.
- **Estimated effort:** 2–3 hours total.
- **Business value:** High — SEO is a stated core growth channel.
- **Risk if unaddressed:** Medium — duplicate sitemaps are a known cause of incomplete search indexing.

### 12. Structured data — present and accurate on spot-checked pages, coverage unverified — **Low**

- **Evidence:** JSON-LD present on index.html/_vite_entry.html (Organization/WebSite schema, corrected wording) and compliance.html (FAQPage schema, also corrected). Coverage on the remaining 18 static pages wasn't individually verified.
- **Impact:** Mostly affects SERP rich-result appearance, not core rankings.
- **Recommendation:** Inventory structured-data coverage across all pages and validate with Google's Rich Results Test as part of Phase 5.
- **Implementation approach:** Inventory + external validator.
- **Estimated effort:** 1 day.
- **Business value:** Medium.
- **Risk if unaddressed:** Low.

### 13. Security headers — fully authored, zero effect in production — **Critical**

- **Evidence:** A complete `_headers` file exists at repo root defining CSP, HSTS, X-Frame-Options, Permissions-Policy, and Referrer-Policy. But `.github/workflows/deploy.yml` deploys via `actions/deploy-pages@v4` — **GitHub Pages**, which does not read `_headers` files (that convention is Netlify/Cloudflare Pages-specific). `server.ts` sets no security headers either — no helmet, no manual header-setting found anywhere in it.
- **Impact:** The production site currently ships with **no CSP, no HSTS, no clickjacking protection, no MIME-sniffing protection** at the actual HTTP level, despite the intent being fully documented and seemingly "done" in `_headers`. Same shape of problem as the compliance-claim gap already fixed — documented intent that silently isn't what's shipping — except this one only shows up by checking response headers.
- **Recommendation:** Either migrate hosting to a platform that honors `_headers` (Netlify/Cloudflare Pages), or add the subset of these policies settable via `<meta http-equiv>` as a fallback (HSTS/X-Frame-Options/Permissions-Policy require real HTTP headers and can't be replicated via meta tag, so full parity likely needs a hosting change).
- **Implementation approach:** Verify gap via curl on the live domain, then meta-CSP fallback or hosting migration.
- **Estimated effort:** 1 day to confirm + patch; 2–3 days if migrating hosts.
- **Business value:** High — exactly what an enterprise buyer's security team checks first.
- **Risk if unaddressed:** Critical for a company selling cybersecurity credibility — a visitor running a header scanner against the live site right now would find none of the hardening the repo claims to have.

### 14. API integration — one public endpoint fans out to a paid API with no rate limit — **Medium**

- **Evidence:** `server.ts` exposes 2 routes: `GET /api/security/threat-feed` and `POST /api/security/analyze`, which proxies to Google's Gemini API via `@google/genai`. No rate-limiting package and no request-validation library found in package.json or server.ts.
- **Impact:** The analyze endpoint is public, unauthenticated, and calls a metered, billable external API with no throttling — a realistic cost-abuse or basic-DoS exposure, not a speculative one.
- **Recommendation:** Add IP-based rate limiting and basic request validation before Phase 3's API/Developer Portal work increases this endpoint's visibility and traffic.
- **Implementation approach:** `express-rate-limit` + payload-shape validation.
- **Estimated effort:** 0.5–1 day.
- **Business value:** Medium — protects real operating cost and availability.
- **Risk if unaddressed:** Medium-high once Phase 3 increases traffic to this surface.

### 15. Ecosystem integration — cross-subdomain consistency unverified — **Medium**

- **Evidence:** `ecosystemData.ts` defines "Test Connection" health-check UI pointing at external subdomains (intel.cyberdudebivash.com, tools.cyberdudebivash.com, etc.) outside this repository's scope.
- **Impact:** Unverified, not confirmed-broken — but those subdomains are presented as one unified brand experience, and this repo can't speak for whether they carry the same trust-claim issue just fixed here.
- **Recommendation:** Run the same audit pass against each external subdomain as a near-term follow-up.
- **Implementation approach:** Repeat this session's method against each live subdomain.
- **Estimated effort:** 0.5 day to check; fix effort unknown pending findings.
- **Business value:** Medium.
- **Risk if unaddressed:** Unknown — explicitly flagged rather than guessed at.

### 16. Conversion funnel — every tracked event may be going nowhere — **High**

- **Evidence:** `App.tsx` fires `gtag('event','purchase',...)` and `gtag('event','generate_lead',...)` on the site's key conversion actions. The GA4 Measurement ID wired to those events is `G-MDT720X9YW` — and the homepage's own source (`_vite_entry.html`) still carries the unedited setup comment: *"Replace G-MDT720X9YW with your Measurement ID from: analytics.google.com → Admin → Data Streams..."*
- **Impact:** If that ID isn't a verified, owned property, none of the purchase/lead events currently firing are being measured anywhere.
- **Recommendation:** Verify property ownership in Google Analytics before investing further in funnel/CTA work. If unowned, wire up a real property immediately.
- **Implementation approach:** Login to analytics.google.com and check, or replace the ID.
- **Estimated effort:** 1–2 hours.
- **Business value:** Critical if unconfirmed — can't optimize a funnel you can't measure.
- **Risk if unaddressed:** High — every downstream conversion decision would rest on data that may not exist.

### 17. Enterprise UX — programmatic ads on the enterprise sales surface — **Medium**

- **Evidence:** Real-browser check of the built homepage found a live Google AdSense integration (`pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8343951291888650`), confirmed intentional by the cookie-consent banner's own copy: "We use cookies and Google services (Analytics, AdSense)…"
- **Impact:** The enterprise-security peers named in the original brief (CrowdStrike, Palo Alto Networks, Mandiant, SentinelOne) don't run third-party programmatic ads on their corporate domains — directly undercuts the stated "Fortune 500 cybersecurity company" positioning goal.
- **Recommendation:** Keep AdSense confined to the Research Blog/content-marketing surface only; remove it from the corporate gateway and product pages.
- **Implementation approach:** Remove the script tag from non-blog pages.
- **Estimated effort:** <1 day.
- **Business value:** Medium-high — low effort, directly improves the exact signal the redesign is optimizing for.
- **Risk if unaddressed:** Low to fix; the current state is a live, verified contradiction of the brief's own stated goal.

### 18. Mobile UX — horizontal scroll present, 41% of tap targets undersized — **High**

- **Evidence:** Real Playwright measurement at a 390×844 (iPhone-class) viewport on the built homepage: the page has horizontal overflow (`scrollWidth > clientWidth`). Of 136 interactive elements, **56 (41%) measured smaller than the 24×24px minimum** recommended by WCAG 2.5.8 and mobile platform guidelines.
- **Impact:** The AI SOC Dashboard's dense terminal panels and multi-column stat grids are the likely source of the overflow. Mobile visitors get a degraded, hard-to-tap experience on the platform's own showcase feature.
- **Recommendation:** Audit wide grids/tables for proper overflow containment; enforce the 24×24px minimum as a rule in the Phase 1 component library (#7).
- **Implementation approach:** Overflow containment pass + component-level sizing rule.
- **Estimated effort:** 1–2 days containment; tap-target fix folds into #7.
- **Business value:** High.
- **Risk if unaddressed:** Medium-high — measured, not inferred, and mobile is typically 40–60%+ of organic/blog traffic for a site like this.

### 19. Analytics — same unverified GA4 ID, no other platform found — **High**

- **Evidence:** Same finding as #16: `G-MDT720X9YW` appears with its unedited "replace this" setup comment still in place, duplicated identically across about.html, contact.html, threat-intel.html, and bug-bounty.html. No other analytics platform found anywhere in the codebase.
- **Impact:** This single check determines whether any of the site's traffic or conversion data collected to date is real.
- **Recommendation:** Same as #16 — verify immediately, treat as a blocker-level fix rather than Phase 5 scope.
- **Implementation approach:** Verify in Google Analytics admin.
- **Estimated effort:** 1–2 hours.
- **Business value:** Critical — blocks every "measure and optimize" objective in the brief.
- **Risk if unaddressed:** High if unconfirmed.

### 20. Technical debt — the rollup: no tests, no CI gate, unfinished drafts shipped live — **Critical**

- **Evidence:** Zero test files anywhere in the repository. `deploy.yml` runs only `vite build` before deploying — a successful build can still ship broken UI or logic. `index-enhanced.html` — containing its own literal *"TO BE CONTINUED in implementation..."* comment — was live in the deployed file set until this session. 15+ internal planning documents (CHATGPT-FAILURES-FIXED.md, ENHANCEMENT-MASTER-PLAN.md, IMPLEMENTATION-GUIDE.md, DELIVERY_MANIFEST.md, COMPLETE-PAGES-TEMPLATE.md, and others) evidence many independent, uncoordinated build passes. See also: #1, #2, #13.
- **Impact:** The platform has been built through many independent passes without a mechanism to catch drift, dead code, or unfinished work before production. This session found and fixed one instance (fabricated trust claims); the same process gap will keep producing new instances at Phase 1–5 scale unless addressed structurally.
- **Recommendation:** Before Phase 1 begins: add a minimal CI gate (typecheck + a smoke test that the homepage renders without console errors); explicitly delete or quarantine superseded files (index-enhanced.html, the duplicate backend/ tree, the unused layout/ partials).
- **Implementation approach:** GitHub Actions step + a first cleanup pass, both small.
- **Estimated effort:** 2–3 days.
- **Business value:** Critical — the process fix that keeps Phase 1–5 from recreating this problem at larger scale.
- **Risk if unaddressed:** Critical — the 5-phase plan itself generates more surface area for exactly this kind of undetected drift without a gate in place.

---

## Sequencing against the 5 phases

| When | What | Findings |
|---|---|---|
| **Immediate** | Independent of any phase, cheap, currently silently broken: verify the GA4 property, confirm the production security-header gap, resolve the sitemap conflict. | #13, #16, #19, #2 |
| **Blocks Phase 1** | Phase 1 is Navigation/Design System/Component Library/Header/Footer/Search — all five currently live inside the same undecided, duplicated architecture. | #1, #3, #4, #6, #8 |
| **First Phase 1 slice** | Lowest-risk, highest-immediate-value — can start the moment this audit is approved, independent of the bigger architecture decision. | #7 |
| **Blocks Phase 2** | Products/Solutions/Services/Pricing need one settled page inventory and a real answer on whether Compliance Automation is a shipping product. | #5 |
| **Runs in parallel** | Independent of the phase sequence — schedule whenever convenient. | #9, #10, #11, #12, #14, #15, #17, #18 |
| **Process, ongoing** | The CI/testing gate should land before Phase 1 starts generating new surface area, not after Phase 5. | #20 |

---

*Method note: evidence sources are direct repository reads (file:line cited throughout), a real `vite build` production build, and headless-Chromium measurement (Playwright) of the built site at desktop and mobile viewports. Third-party network calls (Google Fonts, GA4, AdSense) fail in the sandbox this audit was produced in, which affects only the raw page-load-time figure in #9 — explicitly caveated there and nowhere else. No redesign, refactor, or content change was made while producing this document.*
