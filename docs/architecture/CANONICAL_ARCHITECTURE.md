# Canonical Architecture

Decision record for Phase 0.1, Task 1. This resolves finding #1 of `ARCHITECTURE-AUDIT.md` (five parallel frontends, three parallel backends) by declaring one canonical implementation per concern and archiving the rest under `_archive/` — nothing was deleted, and every move was verified with `npm run lint` (typecheck) and `npx vite build` immediately after, both passing with only the pre-existing `src/main.tsx` errors that predate this work.

## Canonical Frontend

**`src/`** — the Vite + React 19 SPA. Confirmed live: its component tree matches the production screenshots this engagement started from (`AiSocDashboard.tsx`, `HomeView.tsx`, etc.). Built by `.github/workflows/deploy.yml` via `vite build` and deployed to GitHub Pages.

## Canonical Backend

**`server.ts`** (repo root) — Express + Vite middleware + Gemini AI proxy. Referenced by every `package.json` script (`dev`, `build`, `start`). Compiled to `dist/server.cjs` via esbuild.

## Canonical Static Pages

The 20 HTML files at repo root (`about.html`, `services.html`, `vciso.html`, etc.), plus `react-portal/build/portal-landing.html` (see Client Portal below). These are copied verbatim into `dist/` by the CI workflow and served alongside the SPA. Task 1 does not resolve the SPA/static-page navigation duplication documented as audit finding #4 — that's explicitly Phase 1 scope and requires a product decision, not an architecture-layer fix.

## Canonical Client Portal — the one nuance in this pass

Three "portal" artifacts existed in the repo; they are not duplicates of each other, they're different things:

| Path | What it actually is | Disposition |
|---|---|---|
| `react-portal/build/portal-landing.html` | A real, functional login page — has working Sign In tabs and a `doLogin()` call against a real API. **Linked from 5 live pages** (`compliance.html`, `dark-web-monitor.html`, `research.html`, `soc-services.html`, `vciso.html`) as "Client Portal". | **Kept in place, unchanged.** This is canonical — it's the thing 5 pages actually point to. Its location (inside a folder named `build/`) is misleading since nothing builds it — flagged below as a Task 2 folder-structure item, not touched here since 5 external links hard-reference this exact path. |
| `portal/index.html` | A complete, more polished dashboard shell (sidebar nav, plan badges, topbar) with `<meta name="robots" content="noindex, nofollow">`. Deployed by CI (`[ -d portal ] && cp -r portal dist/`) but **not linked from anywhere** in the codebase. | **Kept as-is, flagged for Phase 4.** This looks like the more serious, further-along attempt at a real customer portal that was never wired into navigation. Recommend Phase 4 ("Customer Portal") start here rather than from scratch, and make an explicit decision on whether it supersedes `portal-landing.html` or sits behind it as the logged-in view. |
| `react-portal/src/`, `react-portal/public/` | An unbuilt Create React App skeleton (`Login.js` 32 lines, `Dashboard.js`, `Account.js`, `Tools.js` 28 lines, `Support.js` 22 lines, `Licenses.js` 28 lines) with its own `package.json` (React 18, react-router-dom, chart.js). Confirmed unreferenced by any build script, CI step, or link. | **Archived** to `_archive/react-portal-cra-skeleton/`. Its page list is a reasonable reference for what Phase 4 should eventually cover (account, tools, support, licenses, dashboard) even though the code itself was never wired up. |

## Canonical CSS

Not fully resolved in Task 1 — that's Task 4 (design tokens) and Task 7 (cleanup) territory. For now:
- SPA: Tailwind v4, compiled per-build. Canonical for `src/`.
- Static pages: `assets/css/style.css` plus 13 sibling stylesheets (`godlevel.css`, `godmode-*.css`, `elite-upgrade.css`, `enhancements.css`, `enterprise.css`, `footer-enhanced.css`, `addons.css`, `mobile-responsive.css`, `portal-evolution.css`, `revenue-engine.css`, `soc-dashboard.css`) with no documented load order. Task 7's cleanup report will determine which of these are actually `<link>`-ed from any page versus dead weight.

## Canonical Routing

- SPA: the `currentView` string-union state machine in `App.tsx` (16 values), rendered through three nav surfaces (desktop, mobile, dropdown).
- Static pages: direct file URLs, cross-linked via plain `<a href>`.
- These two systems are **not unified in this pass** — see audit finding #4. Task 1 documents the split as a known, deliberate interim state; Phase 1 resolves it.

## What moved, and why it's safe

All moves used `git mv` (history preserved) into `_archive/`, never `rm`. Each was independently confirmed unreferenced by any of: `package.json` scripts, `server.ts`, `.github/workflows/*.yml`, every `*.html`/`*.xml` file at root, and all of `src/`, before being moved — not assumed.

| Archived | Why |
|---|---|
| `backend/` (`server.js`, `routes/`, `src/routes/`, `src/middleware.js`, `src/store.js`) | A second, near-duplicate Express backend (route names overlap with its own `src/` subtree: apikeys/auth/leads/payments appear in both). Zero references anywhere in the active build/deploy path. |
| `threat-intel/` (`frontend/dashboard`, `frontend/widget`, `data/`) | A separate dashboard+widget frontend. Zero references in this repo. Unrelated to the live `intel.cyberdudebivash.com` subdomain, which is a separate deployment this repo doesn't control. |
| `threat/` (`index.html`) | Standalone page, zero references. (Not to be confused with the `/threat/` substring in a `blogger-theme.xml` fetch URL to `intel.cyberdudebivash.com/threat/data/...` — that's an external API path, unrelated to this local directory.) |
| `layout/` (`header.html`, `footer.html`, `footer-enhanced.html`, `sidebar.html`) | Intended as shared partials but never actually included by anything — the footer trust badges they define were copy-pasted directly into 7+ static pages instead (fixed for wording in the prior commits on this branch). Not matched by the CI workflow's `*.html` glob either, so archiving has zero deploy effect. |
| `index-enhanced.html` | Contains its own literal `<!-- TO BE CONTINUED in implementation... -->` and `<!-- stay within response limits -->` comments — a genuinely unfinished draft (see `IMPLEMENTATION-GUIDE.md`, which describes it as "preview/reference," never meant to go live standalone). Not linked from anywhere. Was previously live at `/index-enhanced.html` purely because the CI workflow's `*.html` glob is unselective; per audit finding #20 this was flagged as something that shouldn't have been in the deployed set at all. |
| `react-portal/src/`, `react-portal/public/`, `react-portal/package.json` | See Client Portal table above. |

**Not archived, despite looking like duplicates at first pass:** `react-portal/build/portal-landing.html` (live-linked, see above) and `portal/index.html` (deployed, unlinked, but a real and more complete artifact worth keeping for Phase 4 rather than discarding).

## Follow-up items surfaced by this pass (not fixed here — out of Task 1 scope)

- `.github/workflows/deploy.yml` still contains a no-longer-meaningful `[ -d react-portal ] && cp -r react-portal dist/` step. It's a harmless no-op now (the directory still exists, just smaller — `build/portal-landing.html` still copies correctly), but should be tightened when Task 8 (CI/CD) is done.
- `react-portal/build/portal-landing.html` living inside a directory named `build/` is misleading (nothing builds it — it's a hand-authored static file). Relocating it cleanly requires updating the 5 hard-coded `./react-portal/build/portal-landing.html` links in the same commit, verified — deferred to Task 2 rather than done opportunistically here.
- Two conflicting `sitemap.xml` files (root vs. `public/`) were identified in the audit (finding #2) but are out of scope for Task 1 specifically — tracked for the Task 7 cleanup pass.
