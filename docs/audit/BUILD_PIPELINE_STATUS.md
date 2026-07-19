# Build Pipeline Consolidation — Status

Single source of truth for where the Cloudflare/build-pipeline migration stands. Update this table as phases complete rather than requiring anyone to re-read every report below.

| Phase | Status | Report |
|---|---|---|
| Root cause (`[skip ci]` collision) | ✅ Fixed, merged | PR #19 |
| Phase 1 — Build pipeline consolidation | ✅ Merged | `BUILD_PIPELINE_MIGRATION.md` (PR #20) |
| Phase 1.5 — Migration readiness verification | ✅ Verified | `CLOUDFLARE_MIGRATION_READINESS.md` |
| Phase 1.6 — Pre-cutover baseline | ✅ Captured | `PRE_CUTOVER.md` |
| Phase 1.6A — Artifact parity verification | ✅ Complete | `ARTIFACT_PARITY_REPORT.md` |
| Favicon regression + recovery | ✅ Fixed, merged | `ARTIFACT_PARITY_REPORT.md` (resolution section), PR #21 |
| Phase 1.6 Step 3 — Cloudflare Pages cutover | ⏳ Pending | *(not started — awaiting go-ahead)* |
| Legacy cleanup (root `index.html`/`assets/`, stale root `sitemap.xml`/`robots.txt`) | ⏳ Pending | Phase 2, gated on cutover |
| Bridge removal (`deploy.yml`'s `[TEMPORARY]` step) | ⏳ Pending | Phase 2, gated on cutover |

## What's true right now

- `main` builds cleanly via the unified `npm run build` (vite build → assemble → verify → server bundle). 435 tests passing, 22 pre-existing unrelated lint errors.
- Cloudflare Pages is still on its original settings (no build command, deploys repo root as-is) — the `[TEMPORARY]` bridge step in `deploy.yml` keeps it current in the meantime.
- GitHub Pages is live and healthy, built by the same unified script.
- Production (`www`/apex, via Cloudflare) and GitHub Pages are byte-identical for the SPA entry (`index.html`, bundle hashes) as of the last successful bridge run.
- Three "Legacy" mismatches remain between what Cloudflare currently serves and what `dist/` actually contains — `sitemap.xml`, `robots.txt`, `manifest.json`/`404.html` — all pre-existing, all structurally guaranteed to resolve once Cloudflare builds from source (see `ARTIFACT_PARITY_REPORT.md`).

## Cloudflare settings, ready to apply when cutover begins

- Build command: `npm ci --ignore-scripts && npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION=22`
- Root directory: unchanged (`/`)

## Sequencing still to come

1. Apply the above in Cloudflare Pages' Settings tab.
2. Confirm a successful build there, sourced from the new command.
3. Full post-cutover comparison (production vs. GitHub Pages vs. local `dist/`) → `POST_CUTOVER_REPORT.md`, with an explicit READY-FOR-PHASE-2 or ROLLBACK-REQUIRED call.
4. Only after that report says ready: remove the bridge step, delete root `index.html`/`assets/`/stale `sitemap.xml`/`robots.txt`, tag the repository.
