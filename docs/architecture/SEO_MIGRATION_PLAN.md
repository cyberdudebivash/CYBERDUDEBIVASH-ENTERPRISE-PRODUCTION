# SEO Migration Plan

Required deliverable before any Phase 1.0 code, per the program's own
instruction: classify every existing SEO-related artifact as REUSE,
REFACTOR, REPLACE, or RETIRE, with a migration sequence and rollback
strategy. Builds directly on `SEO_ARCHITECTURE.md` (Phase 0 findings)
and its Decision Record (static pages are Phase 1's target; SPA views
are explicitly out of scope; branch is `claude/seo-rocket-engine`) —
read those first. This document doesn't re-investigate; it classifies
what was already found, plus a small amount of new evidence gathered
specifically to make the classifications accurate (exact page count,
exact schema-type inventory).

## Classification definitions (as applied here)

- **REUSE** — content or behavior is correct and stays exactly as-is;
  the new engine either doesn't touch it or simply carries its values
  forward unchanged into config data.
- **REFACTOR** — the underlying content/intent is correct and kept, but
  *how it's produced* changes (hand-authored → generated from shared
  config), or its data moves to become an input to the new system
  rather than a hand-maintained standalone artifact.
- **REPLACE** — the current mechanism is superseded outright because it
  actively causes the duplication/hardcoding problem this program
  exists to fix; the new engine produces an equivalent-or-better result
  through a different means.
- **RETIRE** — archived (never deleted, per this repo's established
  `_archive/` convention — see `CANONICAL_ARCHITECTURE.md`), because it
  is either non-functional here or fully superseded with nothing worth
  carrying forward.

## Asset inventory and classification

### Metadata (title / description / canonical / OpenGraph / Twitter Card)

| Asset | Classification | Rationale |
|---|---|---|
| Per-page `<title>`, `<meta description>` text content (17 static HTML pages, see full list below) | **REUSE** (content) / **REPLACE** (mechanism) | `SEO_FOUNDATION.md` confirmed all 20 sampled titles are unique and well-crafted — the actual strings are good and move verbatim into `seo.config.ts`/per-page config as data. What's replaced is *how* they reach the page: hand-typed per file → generated from config so one source of truth exists. |
| `rel="canonical"` tags (18/19 real pages have one) | **REPLACE** (mechanism), content mostly **REUSE** | Same pattern — existing canonical URLs are correct where present; generated going forward so `item.html`'s gap (still confirmed open) is fixed as a byproduct, not a one-off patch. |
| OpenGraph / Twitter Card tags (18/19 real pages) | **REPLACE** (mechanism) | Same generation pattern; existing `og:image`/`twitter:image` asset references get validated and reused where they point at real, current assets. |
| Root `index.html` vs `_vite_entry.html` head content | **REFACTOR** | These are two different files serving overlapping purposes (see `SEO_ARCHITECTURE.md` Finding 3) — `_vite_entry.html` is the real Vite build source; root `index.html` is a build-sync artifact patched by `deploy.yml`'s sed commands. The new Metadata Manager targets `_vite_entry.html`'s content as the source; root `index.html`'s sync mechanism is left as the deploy workflow already handles it, not duplicated in the new engine. |

### Structured Data / Schema (JSON-LD)

| Asset | Classification | Rationale |
|---|---|---|
| Generic `Organization` + `sameAs` block injected identically into 19 files by `scripts/god_mode_seo_engine.py` | **REPLACE** | This is the exact "duplicated, hardcoded schema" anti-pattern the program's rules name directly. Becomes one `Organization` singleton, generated once from `organization.config.ts`, included on every page by the new engine — same information, zero physical duplication. |
| Page-specific schema already in place and accurate: `FAQPage` (5 files, incl. `compliance.html` — spot-checked, real questions/answers, not placeholders), `Service` (16 instances), `SoftwareApplication` (2), `Product` (1), `LocalBusiness` (2, with real `GeoCoordinates`/`PostalAddress`/`OpeningHoursSpecification`), `WebSite`+`SearchAction` (3), `BreadcrumbList` (12), `ContactPage`, `Brand`, `AboutPage` | **REFACTOR** | This is real, substantive, page-appropriate structured data — not boilerplate. Content and schema-type choices are correct and directly inform `knowledge-graph.config.ts` / per-entity configs (services, products). What changes is authorship: hand-typed per file → generated from the same config every page's metadata comes from, so a future content change updates schema and visible copy together instead of independently drifting. |
| `public/ecosystem-graph.json` (organization/platform/social-profile graph, generated once by the God-Mode script) | **REFACTOR** | Confirmed not referenced anywhere in app runtime (`grep -rn ecosystem-graph src/ *.html` → zero matches) — it's a standalone artifact served at a URL for external AI-citation crawlers, per its own generation script's comment. Its data becomes the seed for `organization.config.ts`; the JSON file itself becomes a **generated output** of the new config (so it can never drift from what pages actually show) rather than a hand-maintained file only updatable by re-running a foreign script. |
| `scripts/god_mode_seo_engine.py` | **RETIRE** | Non-reusable here (hardcoded to a different machine's filesystem path — see `SEO_ARCHITECTURE.md` Finding 2), and fully superseded once the `Organization` singleton generator exists. Archived to `_archive/scripts/`, not deleted, consistent with this repo's established convention — its `ecosystem_urls` list is the direct source for `organization.config.ts`'s `sameAs` array, so nothing in it is lost. |

### Sitemap & Robots

| Asset | Classification | Rationale |
|---|---|---|
| `sitemap.xml` (repo root, 16 URLs) and `public/sitemap.xml` (23 URLs) | **REPLACE** | Both collapse into one sitemap generated from the same page-config data every other part of the engine reads from. **Sequencing constraint, not yet resolvable:** which file path search engines actually fetch today (Finding 3 — which GitHub Pages deployment mechanism is live) must be confirmed before choosing where the generated file is written, so the cutover doesn't accidentally stop serving the one that currently works. This is the one item in this plan blocked on a manual check rather than a technical decision. |
| `robots.txt` | **REUSE**, mostly | Content is deliberate and reasonable: crawler-specific `Allow`/`Crawl-delay` rules, an explicit AI-scraper block list (`GPTBot`, `ClaudeBot`, `CCBot`, `anthropic-ai`, etc.), and real path exclusions (`/react-portal/src/`, `/.git/`, build scripts). None of this needs to change. Only the `Sitemap:` line needs updating once the sitemap consolidation (above) lands, and going forward it should be generated alongside the sitemap so the two can never point at each other incorrectly — that one line is **REFACTOR**, everything else is **REUSE**. |

### Analytics

| Asset | Classification | Rationale |
|---|---|---|
| GA4 measurement ID `G-MDT720X9YW` | **REUSE, pending verification** | `ANALYTICS_VALIDATION.md` already flagged this as unverified (stale placeholder-looking setup comment). Not this program's job to silently replace it — someone with `analytics.google.com` access confirms ownership first (that report's own recommendation, unchanged by this plan). Once confirmed, the ID itself is reused as-is. |
| AdSense publisher ID `ca-pub-8343951291888650` | **REUSE** | Structurally consistent everywhere, no placeholder signal. |
| GA4/AdSense coverage gaps (7 pages missing GA4, esp. `vciso.html`/`compliance.html`/`soc-services.html`) | **REFACTOR** | Becomes systematic: the new engine includes the analytics snippet on every generated page from one config flag, so "missing on 7 pages" becomes structurally impossible rather than something to remember to fix per file. |
| Consent Mode v2 setup (`_vite_entry.html`) + `CookieConsent.tsx` | **REUSE, unchanged** | `ANALYTICS_VALIDATION.md` confirmed this is genuinely correct, non-superficial GDPR/DPDP consent handling. Out of scope for replacement — this program touches SEO metadata/schema, not consent logic. |

### Deployment

| Asset | Classification | Rationale |
|---|---|---|
| `.github/workflows/deploy.yml`'s two coexisting Pages mechanisms (Actions-artifact vs branch-based root-`index.html`/`assets/` sync) | **Flagged, not classified yet** | This isn't strictly an "SEO asset," but the sitemap REPLACE above depends on knowing which one is live. No action recommended here beyond the manual check already requested in `SEO_ARCHITECTURE.md`'s decision record. Once confirmed, whichever mechanism turns out to be vestigial gets its own classification in a follow-up note — not guessed here. |

### Explicitly out of scope (SPA-side)

Per the Phase 0 decision record ("both, explicitly reconciled" — static
pages are this program's target, SPA views are untouched):

| Asset | Classification | Rationale |
|---|---|---|
| `src/App.tsx`'s per-view `document.title` logic | **REUSE, unchanged** | Not touched by this program. Left exactly as Phase 0.2 built it. |
| `public/404.html`'s `?redirect=` mechanism and its URL-erasing interaction with `App.tsx` (`SEO_ARCHITECTURE.md` Finding 1) | **REUSE, unchanged** | A real architectural gap, but resolving it would mean giving the SPA real routing — explicitly the option *not* chosen in the decision record. Not this program's problem to fix. |
| `src/design-system/*` (Phase 0.3 component library) | **REUSE, unchanged** | Available for later phases (e.g. an SEO health dashboard built from `EnterprisePanel`/`StatCard`) but not modified by this program. |

### External uploaded package

| Asset | Classification | Rationale |
|---|---|---|
| `CYBERDUDEBIVASHSEORocketEnginev1.0.0_2.zip` (Python monitoring/content/backlink/email toolkit) | **RETIRE** (as a source of code or baseline data) | Already established in `SEO_ARCHITECTURE.md`: zero web-app code, references a product ("SPECTER™") absent from this repository, fabricated-relative-to-reality baseline metrics. Not integrated, not referenced by any classification above. Its *shape* (technical health monitor, content calendar, backlink tracker) may loosely inform Phase 1.5/2 automation design later, but no content or number from it ships as-is. |

## Full static-page inventory (verified count, supersedes "20" in `SEO_FOUNDATION.md`)

`header.html` was archived between that report and now (Phase 0.1's own
recommendation, already executed). Current real count at repo root:
**17 static HTML pages** — `about.html`, `apps.html`, `bug-bounty.html`,
`compliance.html`, `contact.html`, `dark-web-monitor.html`, `index.html`,
`item.html`, `platforms.html`, `pricing.html`, `privacy.html`,
`research.html`, `services.html`, `soc-services.html`, `status.html`,
`threat-intel.html`, `vciso.html` — plus `_vite_entry.html` as the SPA's
distinct build entry (18 total HTML entry points). All 17 (plus
`_vite_entry.html`) are in scope for Phase 1's Metadata/Schema/Sitemap
generation.

## Migration sequence

Ordered to respect real dependencies — each step needs the previous
step's output to exist and be verified before it can safely run:

1. **Phase 1.0 (data model) first, nothing else can start before it.**
   Populate `seo.config.ts`, `site.config.ts`, `organization.config.ts`,
   etc. by porting the *content* already classified REUSE/REFACTOR above
   (existing titles, descriptions, canonical paths, the God-Mode script's
   `ecosystem_urls` list, the accurate page-specific schema data) — not
   invented fresh. This is transcription + structuring, not new copy.
2. **Phase 1.1 (engine)** consumes the Phase 1.0 config to generate
   metadata/OG/Twitter/JSON-LD/breadcrumbs/robots-fragment for one pilot
   page first (recommend `about.html` — simplest schema shape,
   `AboutPage`+`BreadcrumbList`+the generic `Organization` block, no
   commerce-specific schema to get wrong on the first attempt). Diff the
   generated output against the current file byte-for-byte-equivalent
   in meaning (exact wording may normalize, but no field should be lost)
   before rolling out to the remaining 16 pages.
3. Roll out to the remaining static pages **one at a time**, per the
   "never perform large rewrites" rule, verifying the quality gate after
   each.
4. **Only after every page is confirmed generating correctly**: retire
   `scripts/god_mode_seo_engine.py` (archive to `_archive/scripts/`) and
   collapse the two `sitemap.xml` files into one generated file — this
   step is gated on the still-open "which Pages mechanism is live"
   question so the generated sitemap lands where it's actually served.
5. **Phase 1.2 (Knowledge Graph)**, **1.3 (Internal Linking)**, **1.4
   (Commercial SEO fields)**, **1.5 (automation/validation)**, and
   **Phase 2 (analytics integrations)** proceed in the program's stated
   order, each gated on the previous phase's quality gate passing.

## Rollback strategy

Every static HTML page is a checked-in file, not ephemeral build
output — the existing "archive, never delete" convention and normal git
history make rollback mechanical at every step:

- **Per-page rollout (step 3)**: if a generated page regresses
  (`npm run build` fails, a smoke test finds missing/wrong metadata, a
  visual check finds broken OG image references), `git revert` the
  single commit for that page. Because rollout is one page at a time,
  blast radius of any single bad commit is one file.
- **Script retirement (step 4)**: reversible by definition — the
  archived script sits in `_archive/scripts/`, `git mv` back if a gap is
  found in the new engine's schema generation that the old script
  covered and the new one missed.
- **Sitemap cutover (step 4)**: keep both legacy files present
  (unarchived) until the generated sitemap has been live for a defined
  verification window (recommend: confirmed fetched by Google Search
  Console at least once) — only archive the legacy files after that
  confirmation, not on generation-success alone.
- **Analytics coverage additions**: purely additive (adding a snippet
  to pages that lack one) — rollback is removing the snippet, no
  existing behavior is at risk.

## What does not change

Restated explicitly, since the program's rules require it: this plan
introduces no UI redesign, no rewrite of working systems, no removal of
working features, and no changes to the SPA, the design system, consent
logic, or the two analytics IDs' actual values. It changes *how*
metadata and schema reach 17 static pages (from hand-duplicated to
generated from one config), and retires exactly one non-functional
script plus consolidates exactly two redundant sitemap files into one —
nothing else.
