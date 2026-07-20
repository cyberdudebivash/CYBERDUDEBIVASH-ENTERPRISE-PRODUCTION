# Favicon Bridge Hotfix

Stage 2.6. A minimal, isolated fix for the single confirmed repository-side defect identified in `PRODUCTION_RELEASE_AUTHORIZATION.md` (Stage 2.5, NO-GO). No unrelated changes — one file, two functional lines.

## Executive Summary

Production's `/favicon.ico` was silently serving the homepage HTML instead of an icon, because the `[TEMPORARY]` bridge step in `.github/workflows/deploy.yml` still searched for a hashed filename pattern (`dist/assets/favicon-*.ico`) that stopped existing when PR #21 moved the favicon to the unhashed `public/favicon.ico` convention (`dist/favicon.ico`). The bridge's own `|| true` swallowed the resulting failure every run since, so nothing ever alerted on it. This hotfix replaces the obsolete lookup with a direct, unconditional mirror of `dist/favicon.ico` → root `favicon.ico`. Validated clean: full build, full test suite, and an isolated dry-run of the corrected logic producing a root file byte-for-byte identical to `dist/favicon.ico`. This does not touch, and does not resolve, the separate Cloudflare source-build cutover — that remains the sole blocker to a GO decision.

## Problem Statement

| | |
|---|---|
| Observed | `GET /favicon.ico` on production returns `HTTP 200`, `content-type: text/html` |
| Actual content | Byte-identical to `/`'s homepage body (SHA-256-confirmed) — the Cloudflare SPA-fallback response, not an icon |
| Impact | Cosmetic/branding only — broken browser-tab icon, broken PWA icon, some social-share surfaces. No security or data exposure. |
| Discovered | Stage 2.5 (`PRODUCTION_RELEASE_AUTHORIZATION.md`), via checksum + content-type verification |
| Why it went undetected | Six prior verification passes (Phase 1.5, 1.6, 1.6A, the PR #21 resolution re-check, `PRODUCTION_READINESS_GATE.md`) all checked `favicon.ico` by HTTP status code alone. `200` looked fine every time; none of them checksummed the body or checked `content-type`. |

## Root Cause

1. PR #21 (commit `5f23358`) moved the favicon's source of truth from a hashed build artifact (`assets/favicon-D6GVHMFz.ico`) to `public/favicon.ico` — Vite's standard convention, copied verbatim and unhashed to `dist/favicon.ico` on every build.
2. The bridge step's favicon logic was never updated to match:
   ```
   ls dist/assets/favicon-*.ico >/dev/null 2>&1 && cp dist/assets/favicon-*.ico assets/ || true
   ```
   This looks for a file at a path (`dist/assets/favicon-*.ico`) that has not existed since that same PR.
3. `.github/workflows/deploy.yml` has not been modified since Phase 1 (commit `3f04a5f`) — confirmed via `git log --oneline -- .github/workflows/deploy.yml` — meaning this line has been dead code for the bridge's entire post-PR-#21 lifetime.
4. The `|| true` guard, added defensively for a different reason (tolerating an absent favicon on very old commits), had the side effect of making this exact failure mode permanently silent: no build failure, no CI warning, nothing — just a root directory that quietly never received a `favicon.ico`, confirmed via `git ls-tree HEAD` showing no such file tracked at repository root.
5. With no `favicon.ico` at root, every request for it fell through to Cloudflare's existing SPA-style catch-all behavior (the same fallback already documented for other unmatched paths in `PRE_CUTOVER.md`), returning the homepage with a `200` instead of either the real icon or a `404`.

## Implementation

**File changed:** `.github/workflows/deploy.yml` only.

```diff
           set -euo pipefail
           find assets -maxdepth 1 -type f \( -name "index-*.js" -o -name "index-*.css" -o -name "vendor-*.js" -o -name "favicon-*.ico" \) -delete
           cp dist/assets/*.js dist/assets/*.css assets/ 2>/dev/null || true
-          ls dist/assets/favicon-*.ico >/dev/null 2>&1 && cp dist/assets/favicon-*.ico assets/ || true
+          # favicon.ico moved to public/ (PR #21) and builds unhashed to dist/favicon.ico,
+          # not dist/assets/favicon-*.ico — mirror it to root directly, unconditionally
+          # (verify-dist's checkFavicon already guarantees it exists by the time we get here).
+          cp dist/favicon.ico favicon.ico
           cp dist/index.html index.html

           git config --local user.email "ci@cyberdudebivash.com"
           git config --local user.name "CDB Build Bot"
-          git add assets/ index.html
+          git add assets/ index.html favicon.ico
           if ! git diff --staged --quiet; then
             git commit -m "chore: mirror dist/ to root for Cloudflare (temporary bridge — see BUILD_PIPELINE_MIGRATION.md)"
             git push
```

Design notes:

- **Unconditional, not defensively guarded.** `verify-dist.mjs`'s `checkFavicon` (added alongside PR #21) already hard-fails the build if `dist/favicon.ico` is ever missing or empty — by the time this step runs, its presence is already guaranteed. An unconditional `cp` is strictly more correct than reintroducing a silent `|| true`: if this guarantee is ever violated, the step now fails loudly (the script runs under `set -euo pipefail`) instead of silently mirroring nothing, which is the exact failure class being fixed here.
- **Mirrors to root, not `assets/`.** `dist/favicon.ico` lives at the `dist/` root (unhashed), and `index.html` references it as `/favicon.ico` — so the bridge target is repository-root `favicon.ico`, not `assets/favicon.ico`.
- **Left the existing cleanup pattern in place.** The `find assets … -name "favicon-*.ico" -delete` line is now a no-op (nothing matches it) but is harmless to keep — a safety net if a stray hashed favicon file ever reappears in root `assets/`. Removing it wasn't necessary to fix the defect, so it was left untouched per the smallest-possible-fix mandate.
- **Nothing else in the step changed.** `robots.txt`, `sitemap.xml`, `manifest.json`, `404.html` are not part of this bridge step at all (by design — see `ARTIFACT_PARITY_REPORT.md`) and remain exactly as they were; they resolve only once the separate Cloudflare cutover lands.

## Validation Evidence

| Check | Result |
|---|---|
| `npm ci --ignore-scripts` | Clean |
| `npm run build` | Clean — `vite build` → `assemble-site` → `verify-dist`, all succeed |
| `verify-dist` (6 checks) | ✅ assetReferences, ✅ noOrphanedAssets, ✅ htmlWellFormed, ✅ metadataAndSchema, ✅ favicon (`dist/favicon.ico` present), ✅ sitemapAndRobots |
| Full test suite | **435/435 passing**, 0 regressions |
| Isolated dry-run of the corrected bridge commands | Executed in a scratch environment (not the working tree) seeded with the current committed root state plus this build's `dist/`. Result: root `favicon.ico` created, **SHA-256 `c32eca027242259084d38a97a69f67c4c46f663d76487a92094d1ef82e0f7309` — byte-for-byte identical to `dist/favicon.ico`**. `file(1)` confirms `MS Windows icon resource, 1 icon, 32x32, 32 bits/pixel` — a real icon, not HTML. |
| Diff vs `main` | `.github/workflows/deploy.yml` only — 5 insertions, 2 deletions. Explicit zero-diff confirmed for `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `index.html`, `assets/`, `public/`, `src/`, `package.json`, `package-lock.json`, `vite.config.ts`, `scripts/` |

### Regression validation (explicit, per Stage 2.6 requirements)

| Item | Status |
|---|---|
| `robots.txt` unchanged | ✅ zero diff vs `main` |
| `sitemap.xml` unchanged | ✅ zero diff vs `main` |
| `manifest.json`/`manifest.webmanifest` unchanged | ✅ zero diff vs `main` |
| `index.html` unchanged | ✅ zero diff vs `main` |
| Hashed assets unchanged | ✅ zero diff vs `main` (`assets/`, `src/`, `vite.config.ts` all untouched) |
| Deployment workflow unchanged except favicon copy | ✅ confirmed via full-file diff — only the favicon lookup/copy line and its `git add` line changed |

## Risk Assessment

| Item | Assessment |
|---|---|
| Blast radius | One CI step, one file (`favicon.ico`), root-level only |
| Can this affect `robots.txt`/`sitemap.xml`/`manifest.json`/`404.html`? | No — untouched code paths in the same step; those gaps are pre-existing and tracked separately, gated on the Cloudflare cutover |
| Can this affect the SPA bundle, `portal/`, `react-portal/`? | No — different lines, not modified |
| Can this affect GitHub Pages? | No — GitHub Pages deploys `dist/` directly via `actions/deploy-pages`, entirely independent of this bridge step |
| Failure mode if the fix itself is wrong | Build already gates on `verify-dist`'s `checkFavicon`; a missing/empty `dist/favicon.ico` fails the build *before* this step runs. The new unconditional `cp`, under `set -euo pipefail`, fails the workflow step loudly if its precondition is ever violated — a strict improvement over the silent failure being fixed. |
| When does this take effect in production? | Not immediately on merge. The fix corrects the *automation*; the corrected bridge step runs (and commits the real root `favicon.ico`) on the **next push to `main`** — which the merge of this PR itself will trigger. No separate manual step is required after merge. |
| Does this touch Cloudflare configuration, the bridge itself, or Phase 2 timing? | No — none of those are in scope or touched |

## Remaining Blockers

- **The Cloudflare Pages source-build cutover** (Criterion 2 of `PRODUCTION_RELEASE_AUTHORIZATION.md`) is unaffected by this hotfix and remains the sole blocker to a GO decision. Cloudflare's build log still shows "No build command specified" as of Stage 2.5; nothing in this PR changes Cloudflare's project settings.
- The three "Legacy" artifact gaps (`sitemap.xml`, `robots.txt` content, `manifest.json`, `404.html`) are likewise untouched — they were never in this hotfix's scope and remain gated on the same cutover, per `ARTIFACT_PARITY_REPORT.md`'s already-verified prediction.
- Per Stage 2.6's stop conditions, this document does not re-run or re-issue the Stage 2.5 authorization decision. `PRODUCTION_RELEASE_AUTHORIZATION.md`'s favicon-related entries are updated to reflect this repository-side resolution; its overall **Final Decision: NO-GO** is unchanged and stands until the Cloudflare cutover is independently verified.
