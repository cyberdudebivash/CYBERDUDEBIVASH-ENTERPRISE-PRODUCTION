# SEO Foundation Report

Phase 0.1, Task 11. Per-page tag coverage, structured data, sitemap, and internal-linking findings.

## Coverage summary (across the 20 root static pages)

| Element | Coverage | Gaps |
|---|---|---|
| `<title>` | 20/20, sampled titles are unique and well-crafted | None found |
| `viewport` meta | 19/20 | **`header.html`** — but this is a 9-line `<header>` fragment with no `<html>`/`<head>` at all, not a real page; see Cleanup Report. Effectively 19/19 real pages. |
| `rel="canonical"` | 18/20 | **`header.html`** (same fragment, N/A) and **`item.html`** (a real page — genuine gap) |
| `og:title` / OpenGraph | 18/19 real pages | `header.html` fragment only |
| `twitter:card` | 18/19 real pages | `header.html` fragment only |
| `application/ld+json` structured data | 19/20 have *some* JSON-LD present | `header.html` fragment only; **depth of schema not verified per-page beyond the two spot-checked in the architecture audit** (`index.html`/`_vite_entry.html`'s Organization/WebSite schema, `compliance.html`'s FAQPage schema — both already corrected for accuracy in prior commits on this branch) |

**Real, non-fragment gap to fix:** `item.html` is missing a canonical tag.

## Sitemap — the one active conflict

Two different `sitemap.xml` files exist with different content:

| File | URL count | Namespaces |
|---|---|---|
| `sitemap.xml` (repo root) | 16 | `xmlns:xhtml` |
| `public/sitemap.xml` | 23 | `xmlns:news` |

`robots.txt` points at `https://www.cyberdudebivash.com/sitemap.xml`. Vite copies `public/` into the build output root by convention, meaning **`public/sitemap.xml` (23 URLs) is very likely what actually wins** at that path post-build — but the root-level `sitemap.xml` (16 URLs) sits right next to it in the source tree looking equally authoritative, which is exactly how this kind of drift causes real confusion later (a future edit is as likely to land in the wrong one as the right one). This is audit finding #2/#5, rated Medium; resolving it is a one-file decision, not a redesign.

## Internal linking

- The "Client Portal" link (`./react-portal/build/portal-landing.html`) appears identically across 5 pages — consistent, no issue.
- The shared footer link block (`gm-footer-cert-row` pattern, fixed for wording accuracy in prior commits) appears near-identically across 7+ pages, confirming those pages do cross-link to each other's core sections (Services, Pricing, Contact, Privacy, Status) consistently.
- **Not verified in this pass:** a full sitewide link graph (which pages link to which, orphan-page detection beyond what surfaced incidentally — e.g. `portal/index.html`, confirmed genuinely unlinked from anywhere, and `dark-web-monitor.html`, which appears in the react-portal link list but wasn't independently checked for inbound links from elsewhere). A proper crawl-based link audit is recommended as a Phase 5 task with real tooling (Screaming Frog or equivalent) rather than repo-text-search, since some links may be JS-rendered from the SPA.

## Keyword / content-strategy observation (flagged, not scored)

`compliance.html`, `pricing.html`, and `vciso.html` target broad, competitive terms ("ISO 27001," "SOC 2," "compliance automation") that are also the primary keywords for well-funded, established competitors (Vanta, Drata, Secureframe). This is a strategic content question, not a technical SEO defect — flagged for Phase 2/5 content planning rather than scored as a finding here.

## Recommendation

1. Resolve the sitemap conflict (1–2 hours) — pick one file, delete or archive the other, confirm which one the built `dist/` actually serves.
2. Add `rel="canonical"` to `item.html`.
3. Archive `header.html` (unlinked fragment, not a real page — see Cleanup Report) so it stops appearing as a false gap in coverage audits like this one.
4. Schedule a real crawl-based link audit for Phase 5, once URL structure is stable post-Phase 1/2.
