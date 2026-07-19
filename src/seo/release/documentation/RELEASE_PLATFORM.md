# Enterprise Release Management & Deployment Platform

Phase 2.1 deliverable. An operational layer that plans, stages,
verifies, publishes, and (if needed) rolls back releases of Build
Platform's already-written output (`dist/seo/` by default) —
consuming ONLY that output directory, never Runtime, never Build
Platform's own generation functions. Deploys exclusively to
`dist/release/`; never `public/`, never any production directory. See
`RELEASE_FLOW.md`, `ROLLBACK_GUIDE.md`, `DEPLOYMENT_VERIFICATION.md`,
and `LOCKING_STRATEGY.md` for the companion documents this file
references throughout.

## Executive Summary

The Release Platform is complete: 8 directories (`planner/`,
`publisher/`, `rollback/`, `verification/`, `staging/`, `reports/`,
`health/`, `locking/`, plus `tests/` and `documentation/`), 35 source
files, 10 test files (59 new tests). A full-scale pilot against the
real, 17-page production build published successfully with **zero
verification errors**, publishing 39 files byte-identical to what
Build Platform generated, entirely under `dist/release/` — `public/`
and every other production path untouched (confirmed directly:
`git status` shows nothing under `dist/` or `public/`, since `dist/`
is fully `.gitignore`'d). `npm run lint` and `npm run build` both
pass; the production bundle's module count is identical before and
after this phase (2121 modules both times, confirmed by stashing
`src/seo/release/` and rebuilding). 59 new unit tests pass alongside
the 354 tests already in the repository from Phases 1.0.5–2.0
(413/413 total).

Building this platform's own test suite against **real** multi-release
scenarios (not just synthetic fixtures) caught two genuine bugs before
they shipped, worth stating plainly:

1. **Idempotent-republish manifest corruption**: publishing a release
   whose content is byte-identical to an already-published one
   produces the same content-addressed `releaseId` (by design — see
   `RELEASE_FLOW.md`). The first version of `publishRelease()`
   unconditionally rewrote that release's `RELEASE_MANIFEST.json` on
   every publish call, including a redundant republish — which meant a
   republish recorded *itself* as its own `previousReleaseId`,
   corrupting the chain rollback's "latest" mode walks. Fixed by
   making `RELEASE_MANIFEST.json` write-once: `publishRelease()` now
   only writes it the first time a given `releaseId` is promoted; a
   redundant republish repoints `current.json` but leaves the existing
   manifest file untouched. A dedicated regression test
   (`tests/publisher.test.ts`'s "republishing identical content never
   overwrites...") locks this in.
2. **A millisecond-resolution staleness race**: `locking/releaseLock.ts`'s
   `isStale()` originally used a strict `Date.now() - acquiredAt >
   staleAfterMs` comparison. `recoverStaleLock()`'s own tests use
   `staleAfterMs = 0` to mean "treat as immediately stale," but when
   `acquiredAt` and the staleness check land in the *same*
   millisecond, the elapsed age is exactly `0`, and `0 > 0` is false —
   so the lock was flakily judged "still fresh" roughly one run in
   several. Caught by repeated runs of `tests/locking.test.ts`
   surfacing an intermittent failure that a single run did not. Fixed
   by switching to `>=`, which makes a `0`ms allowance reliably mean
   "stale from the instant it's held" — the behavior the caller
   actually intended — without changing behavior at any realistic
   (non-zero) `staleAfterMs` threshold.

## Runtime Architecture

```
Build Platform's own output (dist/seo/ — read-only to this platform)
    ↓
planner/      → scan + diff + deterministic ReleasePlan (NO filesystem mutation)
    ↓
locking/      → acquireLock() guards everything below against concurrency
    ↓
staging/      → copy (full) or copy-changed+hard-link-unchanged (incremental)
                 into an isolated .staging/<releaseId>/ — never published directly
    ↓
verification/ → re-scan staged files, compare against the plan: checksums,
                 artifact integrity, manifest integrity, build version,
                 missing/unexpected/duplicate artifacts
    ↓
publisher/    → (full/incremental only) promote: rename staging -> releases/<id>/,
                 write RELEASE_MANIFEST.json (once), atomically repoint current.json
    ↓
reports/      → RELEASE_REPORT.md
    ↓
dist/release/ (releases/<id>/, current.json, reports/) — NEVER public/, NEVER dist/ root
```

`rollback/` and `health/` sit alongside this main flow: rollback
re-verifies and repoints `current.json` at an already-published
release (never re-stages, never re-copies artifacts); health inspects
current state read-only.

## Architecture Decisions

1. **The only coupling to Build Platform anywhere in this codebase is
   one type-only import.** `planner/readBuildManifest.ts` imports
   `BuildManifest` (a type) from `../../build` for parsing safety;
   nothing in this platform ever calls a Build Platform function.
   "Consume ONLY Build Platform outputs" means the *files* it wrote to
   `dist/seo/`, not its code — the same file-boundary separation the
   Build Platform itself established with the Runtime one phase
   earlier.

2. **`planner/` performs true zero filesystem mutation.** Every
   function in this directory only reads: `scanDirectory()` walks and
   hashes files, `readBuildManifest()` parses JSON, `createReleasePlan()`
   composes both against an already-in-memory previous manifest the
   caller supplies. Verified directly:
   `tests/planner.test.ts`'s "performs no filesystem mutation" test
   scans `sourceDir` before and after planning and asserts byte-for-byte
   equality.

3. **`releaseId` is a pure content hash over every file `scanDirectory`
   finds — including Build Platform's own `build-manifest.json` and
   `BUILD_REPORT.md`, both of which carry real per-build timestamps.**
   This means re-running Build Platform against *unchanged SEO content*
   does **not** reproduce the same `releaseId` (their timestamps
   differ), while re-releasing the *same already-built* `dist/seo/`
   twice **is** idempotent (verified by both
   `tests/regression.test.ts` tests). This is the correct, intended
   contract: a release id identifies a specific build artifact set,
   not an abstraction of "the SEO content in general."

4. **`publisher/` is exactly as mechanical as the task requires — copy,
   move, delete, rename, nothing else.** It never calls
   `verifyRelease()` (the orchestrator's job, before ever calling
   publish) and never decides whether a release *should* be published.
   The one piece of "logic" it has — treating an already-existing
   `releases/<id>/` as a no-op republish rather than an error — is
   itself mechanical (a filesystem existence check), not business
   logic about SEO content.

5. **`verification/` reuses `validators/shared.ts`'s primitives**
   (`issue`/`makeResult`/`findDuplicates`), the same precedent every
   phase since 1.1 established, rather than inventing a parallel
   `VerificationIssue` vocabulary. It independently re-scans whatever
   directory it's checking rather than trusting `ReleasePlan.files`
   blindly — "never bypass verification" applies even against this
   platform's own prior computation.

6. **Locking is a single file (`'wx'` exclusive create), not a
   distributed lock.** Sufficient for this platform's real deployment
   target (one release process at a time against one `dist/release/`);
   see `LOCKING_STRATEGY.md` for the staleness/recovery model and
   Known Risks for what a multi-host deployment would need instead.

## Deployment Flow

See `RELEASE_FLOW.md` for the full detail on all four modes (`full`,
`incremental`, `preview`, `dry-run`).

## Verification Strategy

See `DEPLOYMENT_VERIFICATION.md` for every check `verifyRelease()`
performs and how each maps to this phase's own VERIFICATION section.

## Files Created

35 source files under `src/seo/release/` (`planner/` 6, `locking/` 4,
`staging/` 3, `verification/` 4, `publisher/` 5, `rollback/` 4,
`health/` 3, `reports/` 4, plus the top-level `runRelease.ts` and
`index.ts`), 10 test files (59 tests) under `src/seo/release/tests/`,
and 5 documentation files under `src/seo/release/documentation/`.

## Files Modified

`src/seo/index.ts` — one addition: `export * from "./release";`. No
other file from any prior phase was touched.

## Testing Summary

59 new tests across 10 files:

| File | What it covers |
|---|---|
| `planner.test.ts` | Scanning, id computation, diffing, zero-mutation guarantee |
| `locking.test.ts` | Acquire/release, concurrent-acquisition rejection, stale-lock recovery, token safety |
| `staging.test.ts` | Full-copy mode, incremental hard-linking (verified via inode equality), previous-release isolation |
| `verification.test.ts` | Every VERIFICATION-section check, positive and negative cases |
| `publisher.test.ts` | Promotion mechanics, the idempotent-republish regression, previousReleaseId correctness |
| `rollback.test.ts` | Latest/by-id/dry-run, integrity verification before rollback (tampered release refused) |
| `health.test.ts` | Healthy/Warning/Blocked, deterministic reasons |
| `runRelease.test.ts` | End-to-end full/incremental/preview/dry-run, lock release-on-failure |
| `regression.test.ts` | No writes outside releaseRoot, sourceDir never mutated, idempotency vs. rebuild-changes-id nuance |

## Verification Results

- `npm run lint`: 0 errors.
- `npm run build`: 2121 modules — identical before and after this
  phase (confirmed by stashing `src/seo/release/` + `src/seo/index.ts`
  and rebuilding).
- Full test suite: **413/413 pass** (354 pre-existing across Phases
  1.0.5–2.0, unmodified and still green; 59 new).
- Full-scale pilot: all 17 real pages built, released with **zero
  verification errors**, `dist/release/` populated, `public/` and
  `dist/` root files (the real, hand-authored `sitemap.xml`/
  `robots.txt`/`manifest.json`) completely untouched.
- `getReleaseHealth()` after the pilot release: `"healthy"`, zero
  reasons.

## Known Risks

1. **File-based locking assumes a single host.** `acquireLock()`'s
   `open(path, "wx")` is atomic on one filesystem but provides no
   guarantee across multiple machines writing to logically-the-same
   `releaseRoot` over a network filesystem with weaker consistency. A
   multi-host CI/CD deployment would need a real distributed lock
   (a database row, a cloud storage conditional-write, etc.) — out of
   scope for this phase's single-process design. See
   `LOCKING_STRATEGY.md`.
2. **`releaseId` uniqueness relies on sha256 collision resistance.**
   Cryptographically implausible to collide in practice; not
   formally guarded against beyond that.
3. **No automatic garbage collection of old `releases/<id>/`
   directories.** Every published release is kept forever (by design —
   rollback needs history), so disk usage grows unboundedly over a long
   deployment lifetime. A future phase could add a retention policy
   (keep last N releases) without changing any of this phase's own
   contracts.
4. **`.staging/<releaseId>/` from a `preview` run is never
   auto-cleaned.** Left in place deliberately for inspection (that's
   the point of "preview"), but a long-running series of previews
   without cleanup would accumulate staged copies. An operator (or a
   future phase) can safely delete anything under `.staging/` at any
   time with no impact on published releases.

## Operational Recommendations

1. Run `runRelease({ mode: "dry-run" })` in CI immediately after
   `runBuild()`, before merging — a fast, zero-write sanity check.
2. Run `runRelease({ mode: "incremental" })` for routine deploys (fast,
   minimal disk I/O via hard-linking) and reserve `"full"` for the
   first-ever release or after any doubt about `dist/release/`'s own
   integrity.
3. Call `runDeploymentHealthCheck()` on a schedule (or before every new
   release) and alert on `"blocked"` — it means the currently *live*
   release has failed integrity verification, a production-impacting
   condition.
4. Keep `runRollback("latest", true, releaseRoot)` (dry run) as the
   first response to any incident — it reports exactly what a real
   rollback would do without touching `current.json`.
