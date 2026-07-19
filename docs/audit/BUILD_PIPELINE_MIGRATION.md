# Build Pipeline Migration — Cloudflare Pages as Primary Build System

Phase 2.0.1. Companion to the Cloudflare deployment investigation earlier in this engagement (PR #17–#19), which traced production drift to a `[skip ci]` tag collision and fixed it. This migration removes the underlying condition that made that class of bug possible: a second, hand-synced copy of the production HTML.

## Before / after

**Before:** Vite builds `_vite_entry.html` → `dist/`. `deploy.yml` then copies static pages/`portal/`/`react-portal/`/pre-existing assets into `dist/` (for GitHub Pages, via `actions/deploy-pages`), and *separately* `sed`-patches two lines of a hand-maintained root `index.html` and copies hashed bundle files into root `assets/` (for Cloudflare, which has no build step and deploys the repo root as committed). Two independently-produced files, one auto-generated fully, one patched by hand for two specific lines — everything else in the patched copy can drift, and did (a missing font-preconnect pair, confirmed in the prior verification pass).

**After:** One script (`npm run build`) does the entire thing — `vite build`, then `scripts/build/assemble-site.mjs` (the copy-in logic, extracted and now testable), then `scripts/build/verify-dist.mjs` (a hard gate — non-zero exit fails the build). `dist/` is the one artifact. Root `index.html` is retired.

## What's new

| File | Purpose |
|---|---|
| `scripts/build/assemble-site.mjs` | Renames `dist/_vite_entry.html` → `dist/index.html`; copies the 16 static pages, `portal/`, `react-portal/`, and pre-existing `assets/{images,css,js}` into `dist/`. Pure exported functions + thin CLI entry. |
| `scripts/build/verify-dist.mjs` | Post-assembly gate: asset references resolve, no orphaned hashed assets, HTML structurally sound, meta/canonical/JSON-LD present and JSON-LD parses, `sitemap.xml`/`robots.txt` present and well-formed. Exits non-zero on any failure. |
| `scripts/build/tests/*.test.ts` | 19 tests (`node:test`, same convention as the existing 74) covering both scripts, correct-input and deliberately-broken-fixture cases. |

`package.json`'s `"build"` script now runs all of this — the same command everywhere, not an equivalent one. Added a `"test"` script (`tsx --test`) wiring up every existing + new test with zero new dependencies (Node's built-in test runner auto-discovers `*.test.ts` with no arguments needed).

## Verification results

- **Tests:** 413 passing before (baseline, confirmed) → **432 passing after** (19 new, 0 regressions).
- **Lint** (`tsc --noEmit`): **22 pre-existing errors**, in `src/components/EcosystemDiscovery.tsx`, `src/components/footer/Footer.tsx`, `src/design-system/components/Hero/Hero.tsx`, `src/main.tsx`, `src/views/{HomeView,LegalPages,ServicePages}.tsx` — all React `key`-prop-in-typed-spread issues, entirely unrelated to this change, unchanged before/after. Not fixed here — out of scope for a build-pipeline change; flagging so it isn't mistaken for something this migration introduced.
- **Real `npm run build` run:** completes end-to-end; `verify-dist.mjs` passes all 5 checks; all 16 static pages + `portal/` + `react-portal/` land in `dist/`.
- **Hash comparison:** `dist/assets/index-Cu9Oqa8k.js`, `index-1a65p6lM.css`, and all three vendor chunks are byte-for-byte the same hashes Vite already produced before this refactor — confirms this changes *how* the site gets assembled, not what Vite itself outputs.
- **Correction to the prior verification pass:** that pass attributed a doubled favicon filename (`favicon-D6GVHMFz-D6GVHMFz.ico`) to `www`'s stale copy — re-checking the diff direction, that's backwards. The doubled name is what the *current, correct* build has always produced (the source file at `assets/favicon-D6GVHMFz.ico` already carries what looks like a hash in its own name; Vite's own content-hashing appends its hash on top, deterministically, every build). Harmless, pre-existing, unrelated to drift — not something to fix here. The actual drift symptom (missing font-preconnect tags) is now structurally impossible to recur, since there's only one HTML source.

## Cloudflare Pages settings (owner action — no API access from this session)

When ready to cut over, in the Cloudflare Pages project's **Settings** tab:

- **Build command:** `npm ci --ignore-scripts && npm run build`
- **Build output directory:** `dist`
- **Root directory:** unchanged (`/`)

The `--ignore-scripts` flag matches the existing, already-proven GitHub Actions convention — a plain `npm ci`/`npm install` hits an unrelated, pre-existing `tsx`→nested-`esbuild` postinstall binary-version-validation failure in this sandbox (`Expected "0.28.1" but got "0.25.12"`, confirmed reproducible via both `npm install` and `npm ci`, confirmed to have nothing to do with this migration's own dependencies). `--ignore-scripts` sidesteps it and is confirmed to still produce a fully working build and test run. Unknown whether the underlying issue would reproduce in Cloudflare's own build environment — using the already-proven-safe flag either way rather than assuming it wouldn't.

## Phase 2 — after Cloudflare is confirmed building from source

Once the above settings are saved and a build has succeeded on Cloudflare (check its Deployments tab for a green build sourced from the new build command):

1. Delete root `index.html` and root `assets/` (the `[TEMPORARY]` bridge step's own output, and the pre-existing accumulated stale hash files it was mirroring).
2. Delete the `"[TEMPORARY] Mirror dist/ to root for Cloudflare"` step from `.github/workflows/deploy.yml`.
3. Re-run the full verification (tests + a real `npm run build` + `verify-dist.mjs`) to confirm GitHub Pages is unaffected (it was never sourced from root in the first place).

## Rollback plan

- **This PR, unmerged or reverted:** trivial — `git revert`, or don't merge. Zero production exposure either way; nothing here touches Cloudflare or DNS.
- **After merge, before Cloudflare settings changed:** no risk — the `[TEMPORARY]` bridge step keeps mirroring `dist/` to root exactly as today's `sed`-patch did (just as a full-file replace instead), so Cloudflare's current "deploy repo root" mode keeps receiving current content regardless of timing.
- **After Cloudflare settings changed:** reverting is a dashboard action — clear the build command/output directory fields (back to "no build command"), which returns Cloudflare to serving the repo root as-is. As long as Phase 2's root-file deletion hasn't happened yet, that root still has valid content from the bridge step. If Phase 2 *has* already run, Cloudflare Pages' own deployment history allows an instant one-click rollback to the last known-good deployment, independent of any of the above.
