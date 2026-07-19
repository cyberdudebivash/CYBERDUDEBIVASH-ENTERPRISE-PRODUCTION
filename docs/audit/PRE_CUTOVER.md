# Pre-Cutover Baseline

Phase 1.6, Step 2. Captured before any Cloudflare Pages configuration change. This is the reference point Phase 1.6's post-cutover validation compares against.

Captured: 2026-07-19, ~16:26–16:30 UTC. `main` at `eb698b4` (Phase 1 merged as PR #20; the bridge step has already run once successfully post-merge).

## Bundle hashes / index.html checksum

| Target | JS | CSS | Body SHA-256 |
|---|---|---|---|
| `www.cyberdudebivash.com` (production) | `index-Cu9Oqa8k.js` | `index-1a65p6lM.css` | `888d5fe1c265b7545a3b5efca6cb89af695e771a552cffc1d640f071212f5653` |
| `cyberdudebivash.com` (apex) | `index-Cu9Oqa8k.js` | `index-1a65p6lM.css` | `888d5fe1c265b7545a3b5efca6cb89af695e771a552cffc1d640f071212f5653` |
| `cyberdudebivash.github.io/…` (GitHub Pages) | `index-Cu9Oqa8k.js` | `index-1a65p6lM.css` | `888d5fe1c265b7545a3b5efca6cb89af695e771a552cffc1d640f071212f5653` |
| Local `dist/index.html` (fresh `npm run build`) | `index-Cu9Oqa8k.js` | `index-1a65p6lM.css` | same content, confirmed via `diff` in Phase 1.5 |

**All three live targets are already byte-identical**, ahead of any Cloudflare dashboard change — a direct effect of the bridge doing a full-file mirror rather than the old `sed` patch. This itself is a meaningful, positive signal: the last drift incident is fully closed, independent of whether/when the Cloudflare build-from-source cutover happens.

## Response codes and headers

| Check | Production (`www`) | GitHub Pages | Notes |
|---|---|---|---|
| `GET /` | 200, `server: cloudflare`, `cf-cache-status: DYNAMIC` | 200, `server: GitHub.com` | as expected |
| `GET /about.html` | **308** → `/about` | 200 (no redirect) | Cloudflare's own clean-URL normalization (platform default, not a repo rule — no `_redirects` file exists). Pre-existing Cloudflare behavior, unrelated to this migration. |
| `GET /robots.txt` | 200 | 200 | see content mismatch below |
| `GET /sitemap.xml` | 200 | 200 | see content mismatch below |
| `GET /manifest.json` | 200 | 200 | **not what it appears — see below** |
| `GET /portal/` | 200 | (not re-checked; unaffected) | |
| `GET /assets/totally-fake-file-xyz.js` (should 404) | **200** | — | falls through to the homepage body, not a 404 |
| `GET /nonexistent-xyz-check` (should 404) | **200**, body SHA-256 identical to `/` | **404** | Cloudflare-specific — see below |

## Two pre-existing findings this baseline surfaces (not caused by this migration)

**1. Root has its own stale `sitemap.xml`/`robots.txt`, separate from `public/`'s — production is currently serving the stale ones.**
This is the exact "two conflicting sitemaps" issue already on record in `ARCHITECTURE-AUDIT.md` (finding #2): root `sitemap.xml` has **16 URLs**; `public/sitemap.xml` (what `vite build` copies into `dist/`, and what GitHub Pages already serves) has **23 URLs**. Confirmed directly: production's live `/sitemap.xml` byte-matches root's file, not `dist/`'s. Root has no `manifest.json` at all — production's `200` for `/manifest.json` is actually the **homepage HTML**, served by Cloudflare's SPA-style fallback (see next finding), not a real manifest. This has been true independent of anything in this session; the cutover will *fix* it (Cloudflare will start serving `dist/`'s correct, `public/`-sourced versions), which is a real, positive content change to expect and not mistake for a regression.

**2. Cloudflare currently has no `404.html` and falls back to serving the homepage (200) for any unmatched path; GitHub Pages correctly 404s.**
The bridge only ever mirrors `index.html` and the top-level hashed asset files to root — by design, it was never meant to carry `404.html`/`sitemap.xml`/`robots.txt`/`manifest.json` (those were never part of the old `sed`-patch sync either). Once Cloudflare builds from source and serves `dist/` (which does contain `dist/404.html`, sourced from `public/404.html` via Vite's standard public-dir copy), unmatched paths should start returning a real `404` instead of a `200` homepage fallback — another expected, positive behavior change from cutover, not a regression.

## Recommendation carried into Step 3

Both findings above are **pre-existing conditions this baseline correctly captures**, not defects introduced by Phase 1 or this verification. They are called out explicitly so the post-cutover comparison doesn't mistake "sitemap.xml changed" or "manifest.json now returns real JSON" or "unmatched paths now 404" for regressions — they're the cutover working correctly. Separately: root's stale `sitemap.xml`/`robots.txt` are dead weight once Cloudflare no longer reads repo root at all; recommend folding their removal into Phase 2 alongside root `index.html`/`assets/`, since they're the same class of "legacy root artifact" — flagging for that decision rather than acting on it now, as it's outside this phase's scope.
