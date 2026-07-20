# Decision Log

Architectural and operational decisions made across this program, with rationale, so they don't need re-litigating. Chronological. Full supporting evidence for each lives in `docs/audit/history/` where noted.

## D1 — `src/` and `server.ts` declared canonical; four parallel implementations archived, not deleted

The repository contained five parallel frontend implementations and three parallel backend implementations. Decision: `src/` (Vite/React SPA) is the canonical frontend, `server.ts` the canonical backend. Everything else (`backend/`, `threat-intel/`, a CRA portal skeleton, several standalone pages) moved to `_archive/` via `git mv` — history preserved, nothing lost, all independently confirmed unreferenced by any build/deploy/link path before moving. *Rationale: one mental model of "the codebase" was the single biggest lever against repeat rework; every prior trust-claim inconsistency traced back to having no shared source.* Detail: `docs/audit/history/PLATFORM_FEATURE_INVENTORY.md`.

## D2 — One unified `npm run build`, replacing a dual sed-patch/vite-build system

Before: Vite built the SPA, and a separate `sed`-patch step hand-maintained a second copy of `index.html` for Cloudflare. Two independently-produced files, one fully generated, one patched by hand — drift was inevitable and had already caused a production incident (missing font-preconnect tags). After: `vite build` → `assemble-site.mjs` (extracted, tested) → `verify-dist.mjs` (hard gate, non-zero exit fails the build). *Rationale: eliminates the entire class of bug by construction — there's one artifact, not two to keep in sync.*

## D3 — The Cloudflare bridge step is explicitly, permanently temporary

Since Cloudflare Pages has no build command configured, `deploy.yml` includes a step that mirrors `dist/`'s key outputs (`index.html`, hashed JS/CSS, `favicon.ico`) back to repo root on every push to `main`, so Cloudflare's "serve repo root as-is" behavior stays current. This is explicitly labeled `[TEMPORARY]` in the workflow and documented for removal once Cloudflare builds from source (`PROGRAM_BACKLOG.md` items 11–12). *Rationale: it's a stopgap for a known, already-diagnosed configuration gap — treating it as permanent architecture would be building around a defect instead of fixing it.*

## D4 — Favicon moved to `public/favicon.ico` (unhashed), out of the "build output" category entirely

The favicon was originally a hashed build artifact (`assets/favicon-D6GVHMFz.ico`), which made it ambiguous whether the bridge's stale-file cleanup pattern should treat it as disposable output or protected source — it wasn't, and got deleted by that exact ambiguity once. Fix: moved to `public/favicon.ico`, Vite's standard convention for verbatim, never-hashed, never-disposable files. *Rationale: removes the "is this source or output" ambiguity structurally, rather than making the bridge's cleanup logic cleverer.*

## D5 — Legacy artifact gaps (`manifest.json`, `404` handling, `sitemap.xml`, `robots.txt`, `sw.js`, `security.txt`) are deliberately not patched individually at root

All six share one root cause: they're sourced from `public/`, land correctly in `dist/`, but the bridge was deliberately scoped to mirror only `index.html`/hashed-assets/`favicon.ico` — never these. Considered and rejected: extending the bridge to mirror all six. *Rationale, stated repeatedly and still holding: patching these individually at root is throwaway work, since the actual fix (Cloudflare building from source) closes all of them at once, structurally, by construction — see `PROGRAM_BACKLOG.md` item 1. Every additional file added to the bridge also grows its blast radius and the amount that needs re-verifying on every future change.*

## D6 — Build-artifact verification checks content/behavior, not filenames

A fresh build of identical source once produced a differently-hashed JS bundle filename than a prior build, root cause never conclusively identified (plausible causes: Rollup chunk-ordering, filesystem enumeration order, build-cache state — none confirmed, none ruled out). Decision: stop treating filename stability as a requirement. Static, content-addressable files (`index.html`, `favicon.ico`, `sitemap.xml`, etc.) are compared by checksum. Hashed JS/CSS bundles are verified by reference-resolution (the filename `index.html` actually points to exists, returns 200, no orphans) — never by expecting the same hash across independent builds. *Rationale: this is what's actually true about the build tooling; asserting stronger determinism than exists would produce false-positive failures.*

## D7 — `verify-dist.mjs` gained regression guards after each incident it didn't originally catch

`checkFavicon` was added after the favicon regression (D4) shipped undetected. `checkHeaders` was added Stage 5 after finding `_headers` was never copied into `dist/` — a defect that hadn't shipped yet, but would have the moment Cloudflare starts building from source, silently deleting every security header. *Rationale: every found defect this program didn't catch automatically gets a check added so the same defect class can't recur silently — this is now itself a standing practice, not a one-off.*

## D8 — Two attempts at a `_redirects` source-exposure mitigation, both live-verified to fail; a third attempt was not made

Production serves raw `src/**`/`server.ts`/config files because Cloudflare deploys the repo root. Attempt 1: a `_redirects` file with plain `404` rules — live-verified, did not work (real file content still served). Hypothesis: Cloudflare gives existing static files precedence over redirects unless forced. Attempt 2: added the force flag (`404!`) — live-verified, still did not work. A control test against a path with *no* competing real file also fell through to the ordinary fallback instead of the rule's `404`, ruling out "file precedence" and pointing at Cloudflare simply not reading `_redirects` at all under the current no-build configuration (unlike `_headers`, confirmed effective). *Decision: stop after two failed, live-tested hypotheses rather than guess a third time in production.* The file is left in place (harmless, and standard Cloudflare Pages behavior once a real build runs) but is documented everywhere as **not currently providing protection** — see `RISK_REGISTER.md` #3. *Rationale: this program's own stop condition is "never guess" — the second failure is the signal to stop and report precisely what's known, not to keep iterating blind in a live environment.*

## D9 — Documents that claimed the `_redirects` mitigation worked were corrected, not left standing

Three certification documents were written optimistically before the second live check came back negative, and briefly stated the mitigation succeeded. Once verification disagreed, all three were corrected in the same session, with the failure and its diagnostic trail documented in more detail than a success would have been. *Rationale: an uncorrected false claim in a certification document is a worse outcome than an honest "this didn't work" — the entire premise of this program is that objective evidence, not assertion, is what a PASS means.*

## D10 — Stage-by-stage certification reports discontinued; consolidated into six living documents

Five stages produced twelve separate certification/audit documents, several of them substantially re-deriving or restating what prior ones already established. Decision (prompted directly by the platform owner): stop producing a new report per iteration. All twelve are preserved, unmodified, in `docs/audit/history/` — real evidence isn't discarded. Going forward, this program is tracked in exactly six documents (`PROGRAM_STATUS.md`, `PROGRAM_BACKLOG.md`, `RISK_REGISTER.md`, `DECISION_LOG.md`, `PRODUCTION_SCORECARD.md`, `LIVE_OPERATIONAL_DASHBOARD.md`), updated in place when evidence changes. *Rationale: once the engineering work is largely complete, an audit-per-iteration workflow produces diminishing signal and increasing noise; an execution-focused set of living documents matches what's actually left to do (wait on one external action, keep the record accurate).*
