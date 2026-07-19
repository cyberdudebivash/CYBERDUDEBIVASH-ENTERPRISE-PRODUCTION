# Artifact Parity Report

Phase 1.6A — verification only. No Cloudflare changes, no deletions. Rule under test: *everything served in production must originate from `dist/`.*

## Headline finding — a live regression, not a parity gap

While assembling this report, `npm run build` **failed** for the first time: `verify-dist` correctly caught that `dist/index.html` references `/assets/favicon-D6GVHMFz.ico`, which no longer exists anywhere. Root cause: the Phase 1 bridge step's cleanup pattern (`-name "favicon-*.ico"`) is too broad. It's meant to delete stale *build-output* hash copies before re-mirroring current ones, but the exact same pattern also matches `assets/favicon-D6GVHMFz.ico` — which turns out to be a real, load-bearing *source* file. `_vite_entry.html` (and `public/manifest.json`) reference it via an absolute `/assets/...` path, which Vite's HTML plugin does resolve and hash against an actual file (confirmed: nothing in `src/**/*.tsx` imports it directly — it's picked up purely through that absolute-path HTML/manifest reference). The bridge's last real run (producing `main`'s current tip, `eb698b4`) deleted it for real. That deletion is now permanently committed.

**Consequence: every build from here forward — the next GitHub Actions run, and eventually Cloudflare's — will fail this same check.** Production itself is unaffected *right now* only because it's still serving what the last successful (pre-deletion) build mirrored; the moment anything triggers a rebuild, that would stop being true.

This is out of Phase 1.6A's stated scope ("do not delete anything," verification only), so it hasn't been touched here. Recommended minimal fix, for a separate, explicit go-ahead: stop treating the favicon as build output at all — move it to `public/favicon.ico` (Vite's standard convention: served verbatim at `/favicon.ico`, never hashed, never ambiguous with disposable build artifacts) and update the two references. That removes the whole class of "is this source or output" ambiguity permanently, rather than trying to make the bridge's delete pattern cleverer.

## Artifact-by-artifact parity

| Artifact | Source of truth | Currently served (production) | `dist/` (build output) | Match? | Classification |
|---|---|---|---|---|---|
| `index.html` | `_vite_entry.html` → `vite build` | Byte-identical to `dist/index.html` (SHA-256 confirmed, Phase 1.6 baseline) | ✓ present | ✅ Match | Expected — bridge working as designed |
| Hashed JS/CSS bundle | `vite build` output | Same filenames, same bytes (mirrored by bridge) | ✓ present | ✅ Match | Expected |
| Favicon | *ambiguous — see headline finding* | 200 today (stale mirror of the last good build) | ✗ **missing** — referenced but absent | ❌ Mismatch | **Defect** — active regression, will break the next build |
| 16 static HTML pages | Root (hand-authored; `assemble-site.mjs` copies root → `dist/`) | N/A — served directly from root today, not from `dist/` | ✓ present, byte-identical to root (verified: all 16) | ✅ Match | Expected — root *is* the source here, not a duplicate |
| `portal/` | Root (static; copied root → `dist/`) | Served from root today | ✓ present, byte-identical (`diff -rq` clean) | ✅ Match | Expected |
| `react-portal/` | Root (a single legacy redirect stub; copied root → `dist/`) | Served from root today | ✓ present, byte-identical | ✅ Match | Expected — pre-existing, out-of-scope legacy stub, unaffected by this migration (see `BUILD_PIPELINE_MIGRATION.md`) |
| `sitemap.xml` | `public/sitemap.xml` → `vite build` | Root's own **separate, stale** file (16 URLs) | 23 URLs, current | ❌ Mismatch | **Legacy** — pre-existing, already documented in `ARCHITECTURE-AUDIT.md` finding #2; never part of any sync mechanism, old or new |
| `robots.txt` | `public/robots.txt` → `vite build` | Root's own **separate, stale** file (different header, no "Maintained by/Contact/Updated" block) | Current, richer version | ❌ Mismatch | **Legacy** — same class of issue as sitemap |
| `manifest.json` | `public/manifest.json` → `vite build` | **Not actually served** — root has no `manifest.json`; Cloudflare's SPA-style fallback silently serves the homepage HTML instead (confirmed: identical SHA-256 to `/`) | ✓ present, correct | ❌ Mismatch | **Legacy** — root never had a path to receive this file, old sync or new |
| `404.html` | `public/404.html` → `vite build` | **Not actually served** — no `404.html` at root; any unmatched path falls back to the homepage with `200` instead of a real `404` | ✓ present, correct | ❌ Mismatch | **Legacy** — same root cause as manifest.json |

## Classification summary

- **Expected (5):** `index.html`, hashed bundle, static pages, `portal/`, `react-portal/` — either the bridge is doing its one job correctly, or root genuinely is the source and matches `dist/` by direct copy.
- **Legacy (3):** `sitemap.xml`, `robots.txt`, `manifest.json`/`404.html`'s absence — pre-existing gaps that neither the old `sed`-patch nor the new bridge was ever designed to close, because they live in `public/` and only ever had a path to GitHub Pages (via Vite's automatic public-dir copy), never to root. Structural, not a coding mistake in this migration.
- **Defect (1):** the favicon regression — a real mistake introduced by this migration's own bridge step, active on `main` right now, not yet visibly broken only because nothing has rebuilt since.
- **Out-of-scope (0 additional):** `react-portal/`'s underlying legacy-stub situation is already tracked separately and untouched here.

## Will Cloudflare, after cutover, serve 100% of `dist/`?

**Yes, structurally guaranteed — once the build succeeds.** Configuring a build command + output directory (`dist`) means Cloudflare stops reading individual files from repo root entirely for serving purposes; it only reads root to *run* the build, and deploys whatever that command's output directory contains. Every "Legacy" mismatch above disappears automatically post-cutover, by construction, not by further sync work: `sitemap.xml`/`robots.txt`/`manifest.json`/`404.html` all come from `dist/`, correctly, for the first time in this domain's history.

The one thing that would stop that from being true is the **Defect** above: as long as the favicon reference is broken, `verify-dist` fails, the build fails, and Cloudflare would get **no deployment at all** rather than a partial one — safer than shipping broken output, but it does mean this needs fixing before Step 3 (Cloudflare configuration) has anything valid to build against.

## Recommendation

Do not apply the Cloudflare settings yet. Two things first, in order:
1. Fix the favicon regression (proposed fix above) — small, isolated, needs your go-ahead since it's a code change, not pure verification.
2. Re-run this same parity check once more after that fix, to confirm `npm run build` succeeds cleanly and all "Expected" rows stay expected.

The three "Legacy" mismatches don't block cutover — they're exactly what cutover is supposed to fix, and this report is the evidence that they will be.

## Resolution (commit `5f23358`)

The true source file was recoverable: recovered its exact original bytes from `eb698b4^` (the commit immediately before the bridge deleted it), verified by SHA-256 match, and moved it to `public/favicon.ico` — Vite's standard convention, copied verbatim, never hashed, structurally no longer confusable with disposable build-output hash files. Updated all three references (`_vite_entry.html`'s two `<link>` tags and JSON-LD `url`, `public/manifest.json`'s four icon entries). Added `verify-dist.mjs`'s `checkFavicon` (plus three tests) so this exact failure mode is caught immediately if it ever recurs, matching how `sitemap.xml`/`robots.txt` are already guarded.

Re-verified clean:
- `npm run build` — succeeds end to end, all six `verify-dist` checks pass, including the new favicon check.
- `dist/favicon.ico` — SHA-256 identical to the recovered original.
- Full test suite — **435/435 passing** (432 previous + 3 new).
- Lint — 22 pre-existing errors, unchanged.

The Defect row above is now resolved; all "Expected" rows hold; the three "Legacy" rows are unchanged (still awaiting cutover to resolve, as designed). **The prerequisite this report's recommendation was gating on is satisfied — the parity picture is clean and `npm run build` is healthy again.**
