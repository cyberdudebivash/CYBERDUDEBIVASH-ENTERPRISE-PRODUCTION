# Master Production Certification

Stage 5. The consolidated engineering record for production activation, current as of `main` @ `2915d00` (2026-07-20). This document synthesizes Stage 2 through Stage 5; it does not re-derive findings that `PRODUCTION_INCIDENT_REGISTER.md` and `INFRASTRUCTURE_ACTION_PLAN.md` already hold in full detail — it references them. Full validation evidence (curl output, SHA-256 checksums, build logs) lives in `PRODUCTION_OPERATIONALIZATION_REPORT.md` and `FINAL_PRODUCTION_CERTIFICATION.md`; this document cites rather than repeats it, except where Stage 5 produced evidence those documents don't have.

## Executive Summary

Repository implementation is complete and tested. **440/440 tests passing, 0 lint errors, 0 dependency vulnerabilities, `verify-dist` 7/7** (a new 7th check added this stage). One Critical infrastructure blocker remains, unchanged in substance since Stage 2: Cloudflare Pages is not configured to build from source, and no session across this five-stage engagement has had the access required to change that.

**What Stage 5 added beyond re-confirming Stage 3/4:**

1. **Fixed a forward-looking regression before it could happen — confirmed working.** `_headers` (the file making CSP/HSTS/X-Frame-Options/etc. work on production today) was never copied into `dist/`. Applying the one remaining infrastructure fix, exactly as specified, would have silently traded six cosmetic Legacy gaps for the loss of every security header — a strictly worse outcome. Fixed in `assemble-site.mjs`; guarded going forward by a new `verify-dist` check (`checkHeaders`), matching the precedent `checkFavicon` already set for this exact failure class. Live-verified in place, unaffected by anything else this stage.
2. **Attempted, and honestly did not achieve, a mitigation for the raw-source-exposure finding from Stage 4.** A `_redirects` file was added to block direct access to `src/**`, `server.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, and `package-lock.json`. Live-verified twice, post-deploy each time — neither an unforced nor a forced (`404!`) rule took effect; a control test against a nonexistent path under `/src/*` also fell through to the ordinary SPA-fallback rather than this rule's 404, indicating Cloudflare does not currently read/apply `_redirects` at all under the no-build configuration, unlike `_headers`. **This finding remains open and unmitigated.** The file is left in place — harmless, and expected to work correctly once Cloudflare actually builds via its standard Pages pipeline — but should not be relied on before then. Reported here exactly as found, not as a success, because two consecutive live checks are what caught it.
3. Both changes are minimal, isolated, fully tested (5 new tests), and reversible — no architectural change, no unrelated refactoring. This section itself was corrected after the fact once verification disagreed with the first version written — see `PRODUCTION_INCIDENT_REGISTER.md` #8 for the full timeline.

## Incident Inventory

Full register: `PRODUCTION_INCIDENT_REGISTER.md` — 17 catalogued issues, 1 Critical, 1 resolved this stage, 1 attempted-but-not-resolved (documented as such), 7 sharing the Critical issue's root cause, 2 unverifiable from this repository, 4 pre-existing backlog.

## Root Cause Matrix

| Root cause class | Issues | Disposition |
|---|---|---|
| Cloudflare not building from source | #1 (the cause) + #2, #3, #4, #5, #6, #7, #8, #11 (the effects) | ⛔ Requires `INFRASTRUCTURE_ACTION_PLAN.md` Action 1 |
| Repository gap exposed by #1's existence | #9 (`_headers` cutover survival) | ✅ Fixed this stage, confirmed live |
| Repository-side mitigation attempted for a Cloudflare-rooted issue | #8 (source exposure) | ❌ Attempted, live-verified not working; root cause remains #1's row above |
| Cloudflare dashboard setting, separate from #1 | #10 (HSTS max-age) | ⚠️ Optional hardening, `INFRASTRUCTURE_ACTION_PLAN.md` Action 2 |
| Third-party account access, not Cloudflare | #12 (GA4), #13 (Blogger secrets) | ⚠️ Unverifiable from this repository |
| Pre-existing, unrelated to activation | #14, #15, #16, #17 | Backlog, tracked, not blocking |

## Repository Fixes (this stage)

| Fix | File(s) | Validation |
|---|---|---|
| Copy `_headers`/`_redirects` into `dist/` | `scripts/build/assemble-site.mjs` | `dist/_headers` and `dist/_redirects` confirmed byte-identical to repo root this pass; 2 new tests. `_headers` copy confirmed load-bearing and working live; `_redirects` copy is correct but its Cloudflare-side effect is unconfirmed (see below) |
| Guard against future regression | `scripts/build/verify-dist.mjs` (`checkHeaders`) | `verify-dist` now 7/7, fails the build if `dist/_headers` is ever missing/empty; 3 new tests |
| Attempted: block raw source exposure | `_redirects` (new file, 2 revisions) | **Not confirmed working.** Live-verified twice post-deploy (commits `2915d00`, `f3d3ab7`) — neither unforced nor forced rules took effect on production. Left in place for when Cloudflare actually builds via its standard pipeline; not currently providing protection |

Commits: `2915d00` (`fix(build): carry _headers/_redirects into dist/, block source exposure`), `f3d3ab7` (`fix(redirects): force source-exposure rules — real files won out silently` — this second attempt also did not resolve it, see above). Diff scope both commits: 6 files total. No unrelated changes in either.

## Infrastructure Actions

Full plan with exact values, locations, and verification steps: `INFRASTRUCTURE_ACTION_PLAN.md`. Summary: one Critical action (Cloudflare build configuration), one optional hardening action (HSTS zone setting), one gated follow-up (Phase 2 legacy cleanup, explicitly not to start until the Critical action is verified).

## Validation Matrix

| Category | Result | Basis |
|---|---|---|
| Clean install | ✅ PASS | `npm ci --ignore-scripts`, 221 packages, 0 vulnerabilities, this stage |
| Clean build | ✅ PASS | `vite build` + `assemble-site` + `esbuild`, this stage |
| `verify-dist` | ✅ PASS (7/7) | New `checkHeaders` added and passing, this stage |
| Test suite | ✅ PASS | **440/440**, this stage (435 + 5 new) |
| Typecheck | ✅ PASS | 0 errors, this stage |
| Dependency audit | ✅ PASS | 0 vulnerabilities, this stage |
| GitHub Actions deployment | ✅ PASS | Runs `29730205584` (Stage 4), `29731811086`, `29732114405` (this stage) — all `conclusion: success`, all live-verified via `mcp__github__actions_get`, not assumed |
| Cloudflare deployment | ⛔ BLOCKED | No access; behaviorally reconfirmed unchanged through this stage |
| Artifact validation (`dist/`, GitHub Pages) | ✅ PASS | `FINAL_PRODUCTION_CERTIFICATION.md` §3 |
| Artifact validation (production/Cloudflare) | ❌ FAIL (Legacy class) / ✅ PASS (favicon, index.html, bundle, portal) | Same document, unchanged this stage |
| Security headers | ✅ PASS | Effective on production, byte-identical CSP, reconfirmed live this stage post-deploy; `_headers`-survives-cutover gap now closed |
| Source exposure | ❌ **Still FAIL — mitigation attempted, live-verified not working** | Two deploys, two live checks, both negative. See §Repository Fixes and `PRODUCTION_INCIDENT_REGISTER.md` #8 |
| Functional (SPA, portal, forms) | ✅ PASS | Reconfirmed live post-deploy this stage — `/`, `/portal/`, `/react-portal/...`, `/about.html`, hashed CSS all still correct |

## Security Assessment

- HTTPS, CSP, HSTS, Permissions-Policy, Referrer-Policy, X-Frame-Options, X-Content-Type-Options: all confirmed effective on production (Stage 3, reconfirmed Stage 4 and again this stage post-deploy).
- Source-code exposure: **still live and unmitigated.** An interim `_redirects`-based fix was attempted and failed two live verification passes — see `PRODUCTION_INCIDENT_REGISTER.md` #8. Resolution remains gated on the Cloudflare cutover (Action 1).
- `_headers` cutover-survival gap: closed this stage, confirmed live — this was the one issue capable of turning the infrastructure fix into a net-negative change; it no longer can.
- No secrets found in any exposed content (checked Stage 3, re-confirmed Stage 4 against the specific exposed files).
- `npm audit`: 0 vulnerabilities, this stage.
- API rate limiting (`server.ts`): still open, backlog, not exposed via either live static deployment target.

## Performance Assessment

Not re-measured live this stage (no `src/` changes since `ARCHITECTURE-AUDIT.md`'s Playwright-based measurement; a live re-check was attempted against production in Stage 4 and blocked by a sandbox proxy/TLS-trust limitation this session did not bypass). Citing still-current findings: 191KB gzipped JS+CSS, FCP 676ms (sandboxed measurement), no code-splitting on the `motion` dependency. Recommend a real Lighthouse CI run outside this sandbox as a Phase 5-of-the-original-roadmap gate — unrelated to and not blocking this stage's activation decision.

## SEO Assessment

Tag hygiene strong (19–20/20 pages have title/viewport/canonical/OG/Twitter/JSON-LD, 1 known gap on `item.html`). The sitemap/robots/manifest content gaps are entirely the Cloudflare Legacy class (§Root Cause Matrix) — not a content-quality problem, a serving problem. Once Action 1 lands, SEO metadata parity between `dist/` and production is expected to be complete.

## Operational Readiness

- Documentation: extensive — 16 files under `docs/audit/` and `docs/architecture/` after this stage, `BUILD_PIPELINE_STATUS.md` maintained as a live index.
- Rollback: fully intact at every layer (git history, Cloudflare's independent deployment history, the bridge step unmodified except the already-validated favicon fix). Nothing in this stage removes or weakens rollback capability.
- Monitoring/logging/error-reporting: still absent (issue #17) — a genuine operational gap, not a Stage 5 blocker, since nothing currently implemented claims to provide it.

## Risk Register

| Risk | Severity | Status |
|---|---|---|
| Cloudflare not building from source | Critical | Open, external, fully specified corrective action |
| Applying Action 1 without this stage's `_headers` fix | Would have been Critical | **Eliminated** — fixed before Action 1 is even applied, confirmed live |
| Source code exposure | Medium | **Still open** — interim mitigation attempted, live-verified not working (twice); permanent fix gated on Action 1 |
| HSTS max-age below authored value | Low | Optional hardening |
| GA4 / Blogger secrets unverified | Medium | Cannot be resolved from this repository |
| Accessibility / performance backlog items | Medium | Pre-existing, not worsening, not blocking |
| No monitoring/error-reporting | Medium | Operational gap, recommend addressing post-activation |

## Deployment Evidence

| Event | Merge SHA | GitHub Actions | Live production result |
|---|---|---|---|
| Stage 4 certification | `183494d` | Run `29730205584`, `success`, ~50s | — |
| Stage 5 `_headers`/`_redirects` fix (PR #30) | `e670e7d` | Run `29731811086`, `success`, ~59s | `_headers`: confirmed working. `_redirects`: confirmed **not** working (real file content still served on all 6 target paths) |
| Stage 5 `_redirects` force-flag attempt (PR #31) | `3db4723` | Run `29732114405`, `success`, ~61s | Still **not** working — same result, plus a control test ruled out "existing file precedence" as the cause |

All three runs' status/conclusion retrieved directly via `mcp__github__actions_get` (not assumed from merge success), and production re-tested live after each one — this table's second and third rows exist specifically because the first attempt's assumption ("this should work, same mechanism as `_headers`") was checked and found wrong. See `FINAL_GO_LIVE_AUTHORIZATION.md` for the final decision.
