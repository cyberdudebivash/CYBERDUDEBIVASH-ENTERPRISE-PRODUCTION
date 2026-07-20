# Infrastructure Action Plan

Stage 5, Phase 5. Every action in this document requires access this session does not have (confirmed again this stage: no `CLOUDFLARE_*`/`CF_*` environment variables, no `wrangler` CLI or config, no dashboard session). Nothing here is assumed complete — each item states exactly what to do, where, and how to verify it afterward.

## Action 1 — Cloudflare Pages build configuration (the sole blocker)

**Owner:** Cloudflare Pages project owner (`cyberdudebivash-enterprise-production`)

**Where:** Cloudflare dashboard → Pages → `cyberdudebivash-enterprise-production` → Settings → Builds & deployments → Build configuration

**Exact values:**

| Field | Value |
|---|---|
| Build command | `npm ci --ignore-scripts && npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (unchanged) |
| Environment variable | `NODE_VERSION` = `22` |

**Why `--ignore-scripts`:** a plain `npm ci`/`npm install` hits a confirmed, pre-existing, unrelated `tsx`→nested-`esbuild` postinstall version-check failure. `--ignore-scripts` sidesteps it; confirmed this still produces a fully working build (`BUILD_PIPELINE_MIGRATION.md`).

**Expected outcome:** the next deployment's build log shows real build steps (`vite build`, `assemble-site.mjs`, `verify-dist.mjs`, `esbuild`) instead of "No build command specified. Skipping build step." Production then serves `dist/` directly.

**Verification procedure (to run after saving, from any session with repo access):**

1. Confirm the deployment's build log shows the build actually running (not skipped).
2. `curl -s https://www.cyberdudebivash.com/manifest.json` → should return valid JSON, not HTML.
3. `curl -s -o /dev/null -w '%{http_code}' https://www.cyberdudebivash.com/manifest.json` on `https://www.cyberdudebivash.com/nonexistent-path-check` → should return `404`, not `200`.
4. `curl -s https://www.cyberdudebivash.com/sitemap.xml | grep -c '<url>'` → should return `23`, not `16`.
5. `curl -sI https://www.cyberdudebivash.com/sw.js | grep content-type` → should be a JS content-type, not `text/html`.
6. `curl -sI https://www.cyberdudebivash.com/_headers` → confirm this itself returns something reasonable (it's not meant to be publicly fetched as content, but its *effects* — check item 8 below — are what matter).
7. `curl -sI https://www.cyberdudebivash.com/.well-known/security.txt | grep content-type` → should be `text/plain`, not `text/html`.
8. `curl -sI https://www.cyberdudebivash.com/ | grep -i content-security-policy` → confirm still present (this is the check that matters most — Stage 5 fixed `dist/_headers` specifically so this keeps passing after this action).
9. `curl -s -o /dev/null -w '%{http_code}' https://www.cyberdudebivash.com/src/App.tsx` → should already be `404` regardless of this action (the Stage 5 `_redirects` mitigation is independent of it), but confirm it's still `404` after, not something else.

If any of 2–8 does not flip as expected, that's a new finding requiring its own investigation — not a reason to assume the configuration is wrong, since the same prediction has now been made and held twice (`ARTIFACT_PARITY_REPORT.md`, `PRODUCTION_OPERATIONALIZATION_REPORT.md`).

## Action 2 — HSTS zone-level setting (optional, low priority)

**Owner:** Cloudflare Pages project owner

**Where:** Cloudflare dashboard → SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS)

**Current observed value:** `max-age=15552000; includeSubDomains` (180 days, no `preload`)

**Authored value** (in `_headers`, not currently winning): `max-age=63072000; includeSubDomains; preload` (2 years, preload)

**Action:** if the zone-level HSTS toggle is set to a shorter duration than `_headers` specifies, align it — enable HSTS at the zone level with `max-age` ≥ 2 years and `preload` enabled, or confirm intentionally otherwise.

**Not required for activation** — production is already fully HSTS-compliant at the current value. This is a hardening improvement, not a blocker.

## Action 3 — Phase 2 cleanup (do not start yet)

**Owner:** Whoever executes Action 1, after it's verified

**Gated on:** Action 1 passing its verification procedure above.

Once — and only once — Action 1 is confirmed live and correct:

1. Remove the `"[TEMPORARY] Mirror dist/ to root for Cloudflare"` step from `.github/workflows/deploy.yml`.
2. Delete root `index.html`, root `assets/`, root `sitemap.xml`, root `robots.txt` (all superseded by `dist/`-sourced equivalents once Cloudflare builds from source).
3. Re-run the full test/build/verify-dist suite to confirm GitHub Pages is unaffected (it was never sourced from root).

**Do not perform step 1–2 before Action 1 is verified** — doing so would delete the only thing currently keeping Cloudflare correct, with no fallback. This is a repository change and can be done by any session once the gate condition is met and confirmed — it is listed here, not in `PRODUCTION_INCIDENT_REGISTER.md`, because it's sequenced infrastructure follow-through, not an open defect.

## What does NOT require infrastructure action

For completeness — these are explicitly **not** blocked on Cloudflare and should not be bundled into "waiting on the dashboard":

- The raw-source-exposure mitigation (`_redirects`) — already live in the repository as of commit `2915d00`, takes effect the moment it merges to `main` and Cloudflare re-serves root (no dashboard change needed).
- The `_headers`-survives-cutover fix — already resolved, repository-only.
- GA4 property verification — requires `analytics.google.com` access, not Cloudflare.
- Blogger secrets verification — requires GitHub repository secrets or Blogger account access, not Cloudflare.
