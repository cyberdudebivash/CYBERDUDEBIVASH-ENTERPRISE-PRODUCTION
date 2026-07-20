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
| Stage 2 — Production Readiness Gate | ⛔ NO-GO | `PRODUCTION_READINESS_GATE.md` — blocked on Gate 3 (no Cloudflare deployment evidence) |
| Stage 2.5 — Production Release Authorization | ⛔ NO-GO | `PRODUCTION_RELEASE_AUTHORIZATION.md` — Cloudflare evidence supplied, showed no build command configured; also found a second favicon bridge regression |
| Stage 2.6 — Favicon bridge hotfix | ✅ Fixed, merged | `FAVICON_BRIDGE_HOTFIX.md`, PR #26 — confirmed **live in production** as of Stage 3 |
| Stage 3 — Production Operationalization | ✅ **READY WITH BLOCKERS** | `PRODUCTION_OPERATIONALIZATION_REPORT.md`, `PLATFORM_FEATURE_INVENTORY.md` — repo-side complete; sole blocker unchanged (Cloudflare cutover, below) |
| Stage 4 — Operational Cutover & Production Activation | ⛔ **ACTIVATION BLOCKED** | `FINAL_PRODUCTION_CERTIFICATION.md` — Cloudflare still not reconfigured (no session has dashboard/API access); also found production is currently serving raw `src/`/`server.ts` source (Cloudflare-only, resolves on cutover) and that `security.txt` is SPA-fallback like the other Legacy artifacts |
| Stage 5 — Master Production Incident Resolution | ⛔ **ACTIVATION BLOCKED** | `MASTER_PRODUCTION_CERTIFICATION.md`, `PRODUCTION_INCIDENT_REGISTER.md`, `INFRASTRUCTURE_ACTION_PLAN.md`, `FINAL_GO_LIVE_AUTHORIZATION.md` — fixed a real forward-looking regression (`_headers` wasn't copied into `dist/`, confirmed live); attempted a `_redirects`-based interim fix for source exposure, live-verified it does NOT work (twice), corrected the record rather than leaving the false claim standing. Sole blocker unchanged: Cloudflare cutover |
| Phase 1.6 Step 3 — Cloudflare Pages cutover | ⏳ Pending | *(not started — awaiting go-ahead; the sole remaining blocker as of Stage 5)* |
| Legacy cleanup (root `index.html`/`assets/`, stale root `sitemap.xml`/`robots.txt`) | ⏳ Pending | Phase 2, gated on cutover |
| Bridge removal (`deploy.yml`'s `[TEMPORARY]` step) | ⏳ Pending | Phase 2, gated on cutover |

## What's true right now (as of Stage 5, 2026-07-20)

- `main` builds cleanly via the unified `npm run build` (vite build → assemble → verify → server bundle). **440 tests passing, 0 lint errors**, `verify-dist` **7/7** (a `checkHeaders` check was added Stage 5).
- Cloudflare Pages is still on its original settings (no build command, deploys repo root as-is) — the `[TEMPORARY]` bridge step in `deploy.yml` keeps it current in the meantime.
- GitHub Pages is live and healthy, built by the same unified script.
- Production (`www`/apex, via Cloudflare) and GitHub Pages are byte-identical for the SPA entry (`index.html`, CSS hash) as of the last successful bridge run; **favicon.ico now matches too** (Stage 2.6 fix confirmed live).
- Security headers (`_headers`) are confirmed **effective** on production — Cloudflare reads them natively, unlike GitHub Pages. This corrects the "zero effect" framing in `ARCHITECTURE-AUDIT.md` #13 / `SECURITY_VALIDATION.md`, both written against GitHub Pages specifically. **As of Stage 5, `_headers` is also copied into `dist/`**, closing a real gap that would have silently broken this the moment Cloudflare starts building from source — found and fixed before it could ever happen.
- Six "Legacy" mismatches remain between what Cloudflare currently serves and what `dist/` actually contains — `sitemap.xml`, `robots.txt`, `manifest.json`/`404.html`, `sw.js` (Stage 3), and `security.txt` (Stage 4) — all pre-existing, all structurally guaranteed to resolve once Cloudflare builds from source.
- **Raw source exposure** (`src/App.tsx`, `server.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json` — found Stage 4): a Stage 5 `_redirects`-based interim mitigation was attempted and **confirmed live NOT to work**, even with Cloudflare's redirect-force syntax. Left in place (harmless) for when the real Cloudflare build makes it relevant; the exposure itself remains open, gated on cutover like everything else in this list. Full account: `PRODUCTION_INCIDENT_REGISTER.md` #8.

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
