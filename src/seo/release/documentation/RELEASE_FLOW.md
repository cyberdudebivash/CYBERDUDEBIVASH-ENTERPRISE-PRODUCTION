# Release Flow

`runRelease.ts`'s `runRelease(options)` is the Release Platform's
single top-level entry point, supporting the four modes this phase's
STAGING section names.

## The four modes

| Mode | Locks? | Stages? | Publishes? | Use case |
|---|---|---|---|---|
| `"dry-run"` | No | No | No | Fast, zero-write sanity check — "would this release pass verification?" |
| `"preview"` | Yes | Yes (full copy) | No | Inspect a complete, real staged release before committing to it |
| `"full"` | Yes | Yes (full copy) | Yes | First-ever release, or whenever a complete re-copy is wanted |
| `"incremental"` | Yes | Yes (copy changed, hard-link unchanged) | Yes | Routine deploys — minimal disk I/O |

## Step by step (`full`/`incremental`/`preview`)

1. **`acquireLock(releaseRoot)`** — see `LOCKING_STRATEGY.md`. Held for
   the entire remainder of this list; released in a `finally` block
   even if any step below throws.
2. **`readCurrentReleaseManifest(releaseRoot)`** — the currently
   published release's own manifest, or `undefined` if nothing has
   ever been published.
3. **`createReleasePlan(sourceDir, previousManifest)`** — scans
   `sourceDir` (Build Platform's output), diffs against the previous
   manifest, computes a deterministic `releaseId`. No filesystem
   mutation.
4. **`stageRelease(plan, releaseRoot, stagingMode)`** — `"preview"`
   and `"full"` both stage a complete copy; `"incremental"` copies only
   `filesAdded`/`filesUpdated` and hard-links `filesUnchanged` from the
   previous release's own directory when possible.
5. **`verifyRelease(plan, staged.stagingDir)`** — re-scans the staged
   copy and checks it against the plan. Any error-severity issue throws
   `ReleaseVerificationError` — nothing is published, though the failed
   staging directory is left in place for inspection.
6. **`publishRelease(plan, staged.stagingDir, releaseRoot)`** — `"full"`
   and `"incremental"` only. Promotes staging into `releases/<releaseId>/`,
   writes `RELEASE_MANIFEST.json` (once — see below), atomically
   repoints `current.json`.
7. **`writeReleaseReport(releaseRoot, reportData)`** — writes
   `reports/RELEASE_REPORT.md`.

`"preview"` stops after step 5 — the staged release sits at
`.staging/<releaseId>/`, fully built and verified, but `current.json`
is never touched. `"dry-run"` skips locking and staging entirely: it
plans, then verifies the plan directly against `sourceDir` (since
nothing was staged), and returns without writing anything under
`releaseRoot` at all.

## Release identifiers are content hashes, not timestamps

`planner/computeReleaseId.ts` hashes every `(path, checksum)` pair
`scanDirectory` found, sorted by path. This has a real, specific
consequence worth being explicit about:

- **Re-releasing the same, already-built `dist/seo/` twice** (no
  `runBuild()` call in between) **is idempotent** — the second
  `runRelease()` call computes the identical `releaseId`, and
  `publishRelease()` treats it as a no-op republish (see below).
- **Re-running Build Platform against unchanged SEO content is NOT
  idempotent at the release level** — `build-manifest.json` and
  `BUILD_REPORT.md` both carry real per-build timestamps
  (`generatedAt`, `durationMs`), which `scanDirectory` correctly
  includes in the hash. Two builds of identical pages, run at
  different times, produce different `dist/seo/` bytes and therefore
  different `releaseId`s.

Both behaviors are verified directly (`tests/regression.test.ts`) and
are the *intended* contract: a release id identifies one specific
build artifact set, including evidence of when it was built — not an
abstraction over "the SEO content" divorced from when it was produced.

## Idempotent republish (and the bug this phase found)

When `publishRelease()` is asked to promote a `releaseId` whose
`releases/<releaseId>/` directory already exists, it discards the
redundant staged copy and repoints `current.json` — but it does **not**
rewrite `RELEASE_MANIFEST.json`. This matters: every release directory
is meant to be immutable once first published, including its own
recorded `previousReleaseId` (the release that was live immediately
before *this* one was first promoted). An earlier version of this
function rewrote the manifest unconditionally on every publish call,
which meant a same-content republish recorded itself as its own
predecessor — corrupting the chain `rollback/`'s `"latest"` mode walks
backward through. See `RELEASE_PLATFORM.md`'s Executive Summary and
`tests/publisher.test.ts`'s dedicated regression test.
