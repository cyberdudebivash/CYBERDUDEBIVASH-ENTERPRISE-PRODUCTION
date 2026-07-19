# Production Cleanup Report

Phase 0.1, Task 7. Everything below marked "archived" was moved with `git mv` into `_archive/` in this same change set — nothing was deleted. Build verified clean (`npx vite build`) immediately after.

## Dead CSS — 7 of 14 files (50%) were never linked from anywhere

Checked by searching every `*.html` file for each filename in `assets/css/`:

| File | Linked from | Disposition |
|---|---|---|
| `addons.css` | 0 pages | **Archived** |
| `elite-upgrade.css` | 0 pages | **Archived** |
| `enhancements.css` | 0 pages | **Archived** |
| `godmode-ecosystem.css` | 0 pages | **Archived** |
| `godmode-navfooter.css` | 0 pages | **Archived** |
| `revenue-engine.css` | 0 pages | **Archived** |
| `soc-dashboard.css` | 0 pages | **Archived** |
| `enterprise.css` | 9 pages | Kept — in use |
| `footer-enhanced.css` | 3 pages | Kept — in use |
| `godlevel.css` | 15 pages | Kept — in use |
| `godmode-enterprise.css` | 9 pages | Kept — in use |
| `mobile-responsive.css` | 15 pages | Kept — in use |
| `portal-evolution.css` | 15 pages | Kept — in use |
| `style.css` | 15 pages | Kept — in use |

Also cross-checked against `blogger-theme.xml` and everything already in `_archive/` from Task 1 — none of the 7 dead files are referenced there either.

## Dead JS — 2 of 10 files

| File | Referenced from | Disposition |
|---|---|---|
| `addons.js` | 0 files | **Archived** |
| `scoping_tool.js` | 0 files | **Archived** |
| `apps.js`, `enterprise.js`, `global-enterprise.js`, `godlevel.js`, `layout-loader.js`, `main.js`, `matrix.js`, `sentinel-feed.js` | 1–15 files each | Kept — in use |

## Orphaned page fragment

`header.html` (repo root, 9 lines) — a bare `<header>` snippet with no `<html>`/`<head>`/`<body>`, not a full page. Confirmed unreferenced by any other file. Contains a broken empty-href link (`<a href="">Status</a>`) and a duplicate link (both "SOC" and "soc services" point to `soc-services.html`) — further evidence it was abandoned mid-edit rather than intentionally left as-is. **Archived.** Note: this is distinct from `layout/header.html`, which was already archived in Task 1.

## Duplicate/conflicting files (documented here, not yet resolved — see cross-referenced reports)

- **Two `sitemap.xml` files** with different URL counts (16 vs. 23) and different namespaces — see `SEO_FOUNDATION.md`. Not archived in this pass since determining which one is "correct" requires confirming what `dist/` actually serves post-build, not just which is newer.
- **`react-portal/build/portal-landing.html`** living inside a folder named `build/` despite nothing building it, and despite 5 live pages hard-linking to that exact path — documented in `CANONICAL_ARCHITECTURE.md` as a Task 2 item (relocating it safely requires updating all 5 referencing links in the same commit).

## Not independently audited in this pass

- **Images** (`assets/images/`) — file-level duplicate/unused detection wasn't performed; recommend a dedicated pass (e.g., checksums for exact duplicates, then a reference-count sweep like the CSS/JS check above) as a Phase 5 item, since image assets don't affect build correctness the way dead CSS/JS do and carry lower urgency.
- **Deep content duplication** between static pages and SPA views (e.g., whether `services.html`'s content and the SPA's `pentest`/`soc` views say materially different things about the same offering) — flagged in the architecture audit (finding #5) as an Information Architecture question for Phase 2, not a file-cleanup one.

## Summary

| Category | Found | Archived this pass |
|---|---|---|
| Dead CSS files | 7 | 7 |
| Dead JS files | 2 | 2 |
| Orphaned page fragments | 1 (`header.html`) | 1 |
| Unfinished/duplicate implementations | 6 (Task 1) | 6 |
| Conflicting sitemaps | 1 pair | 0 — documented, needs a decision |

All archived paths remain fully available at `_archive/` and in git history if anything here turns out to still be needed.
