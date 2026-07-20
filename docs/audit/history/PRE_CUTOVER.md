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

## Correction — bundle hash is not perfectly time-invariant

Phase 1.6 Step 2 re-verification (after PR #21/#22 merged) found the bundle hash had changed again — `index-BV7paXZk.js`/`index-BWak8xtL.css` (confirmed live immediately after PR #21) to `index-CP5ZVCTF.js`/`index-CVf7Rv3z.css` (current). Investigated directly: `_vite_entry.html`, `src/`, `vite.config.ts`, `package.json`, and `package-lock.json` are **byte-identical** between the two commits — confirmed via `git diff`, zero output. `package-lock.json` has zero non-exact-pinned entries (every package resolves to a specific `registry.npmjs.org` tarball). Four independent fresh `rm -rf node_modules && npm ci --ignore-scripts && vite build` cycles just now all reproduce the current hash exactly — so it is *not* actively flaky, but it did genuinely drift once, from identical source, between two points separated by roughly an hour.

One historical build of identical source produced a different hashed bundle filename. Subsequent clean rebuilds are stable. **The underlying cause has not been conclusively identified.** Plausible explanations include Vite/Rollup chunk-ordering variance, filesystem enumeration order, build-cache behavior, environment differences, dependency resolution, or something else entirely — none confirmed, and none ruled out. Naming one as "most likely" without evidence for it over the others would overstate what's actually known here.

The practical implication stands regardless of cause: **deployment verification validates artifact integrity and internal consistency, not identical filenames across independently executed builds.** Concretely, split by artifact type:

- **Static, content-addressable files** (`index.html`, `favicon.ico`, `sitemap.xml`, `robots.txt`, `manifest.json`) — compare by **checksum**. These aren't hashed-by-build-tool, so identical source should mean identical bytes regardless of when/where built; a checksum mismatch here is a real signal, not a false positive from the drift above.
- **Hashed JS/CSS bundles** — do **not** require identical filenames across platforms. Verify instead: the filename `index.html` references actually exists in that deployment, it returns `HTTP 200`, the reference itself resolves (no dangling links), and no orphaned hashed files are left over. `verify-dist.mjs` already enforces exactly this, per-deployment.

## Post-cutover production parity checklist (for Step 5)

Once Cloudflare is building from source, compare GitHub Pages against Cloudflare Pages directly:

| Endpoint | Expected |
|---|---|
| `/` | 200 |
| `/about.html` | Same redirect/200 behavior on both (a difference here would need explaining, not assuming) |
| `/404.html` | Exists on both |
| `/robots.txt` | Identical content (checksum) |
| `/sitemap.xml` | Identical content (checksum) |
| `/manifest.json` | Identical content (checksum) |
| `/favicon.ico` | Identical content (checksum) |
| `/portal/` | 200 |
| `/react-portal/` | Same behavior on both (the legacy redirect stub — see `BUILD_PIPELINE_MIGRATION.md`) |
| Hashed JS (whatever `index.html` references) | 200 |
| Hashed CSS (whatever `index.html` references) | 200 |

This is the true production-parity test: it doesn't assume the two platforms hash identically, only that each is internally consistent and that content each platform *should* serve identically (everything that isn't build-tool-hashed) actually does.

## Recommendation carried into Step 3

Both findings above are **pre-existing conditions this baseline correctly captures**, not defects introduced by Phase 1 or this verification. They are called out explicitly so the post-cutover comparison doesn't mistake "sitemap.xml changed" or "manifest.json now returns real JSON" or "unmatched paths now 404" for regressions — they're the cutover working correctly. Separately: root's stale `sitemap.xml`/`robots.txt` are dead weight once Cloudflare no longer reads repo root at all; recommend folding their removal into Phase 2 alongside root `index.html`/`assets/`, since they're the same class of "legacy root artifact" — flagging for that decision rather than acting on it now, as it's outside this phase's scope.
