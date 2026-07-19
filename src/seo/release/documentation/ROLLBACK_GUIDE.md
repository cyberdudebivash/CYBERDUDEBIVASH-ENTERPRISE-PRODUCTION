# Rollback Guide

`rollback/rollbackRelease.ts` re-points `current.json` at an
already-published, already-on-disk release directory. It never
regenerates or re-copies artifacts — every release directory is
immutable once published, so "rolling back" is purely a pointer
change, after an integrity check.

## `runRollback(target, dryRun, releaseRoot?)`

```ts
type RollbackTarget = "latest" | { releaseId: string };

runRollback("latest", false);                          // undo the most recent publish
runRollback({ releaseId: "rel-abc123" }, false);        // jump to a specific, older release
runRollback("latest", true);                            // dry run — report only, no repoint
```

## Resolving `"latest"`

`"latest"` means "the release that was live immediately before the
current one." This is resolved by reading the **current** release's
own `RELEASE_MANIFEST.json` and following its `previousReleaseId`
field — a value recorded once, at that release's original publish
time, and never rewritten afterward (see `RELEASE_FLOW.md`'s Idempotent
republish section for why that immutability matters). Two cases throw
`ReleaseRollbackError` before anything is touched:

- No release has ever been published (nothing to roll back from).
- The current release's `previousReleaseId` is `undefined` (it was the
  very first release ever published — there is no earlier history).

## Integrity verification before rollback

Before `current.json` is touched, the target release is re-verified
with the exact same `verifyRelease()` check a fresh publish runs —
re-scanning `releases/<toReleaseId>/` and comparing every file's
checksum against what `RELEASE_MANIFEST.json` recorded for it. If
verification finds any error-severity issue (a file was deleted,
corrupted, or manually edited since it was published), rollback throws
`ReleaseRollbackError` and `current.json` is left exactly as it was —
verified directly by `tests/rollback.test.ts`'s "refuses to roll back
to a release whose files were tampered with" test, which corrupts a
past release's file on disk and confirms both the rejection and that
`current.json` is unaffected.

## Dry run

`runRollback(target, true)` resolves the target and runs the same
integrity check, but skips the `current.json` repoint. A
`RollbackManifest` (and `ROLLBACK_REPORT.md`) is still produced and
written — a dry run is a real, auditable operation, just a
non-mutating one. `manifest.dryRun === true` and `manifest.toReleaseId`
tell you exactly what a real rollback would have done.

## Recovery from a bad release

The operational sequence for "the current release is broken":

1. `runDeploymentHealthCheck()` — confirm `status: "blocked"` and read
   `reasons` for which check failed.
2. `runRollback("latest", true)` — dry run, confirm the target release
   id looks right and passes its own integrity check.
3. `runRollback("latest", false)` — repoint `current.json` for real.
4. `runDeploymentHealthCheck()` again — confirm `status: "healthy"`.

If `"latest"` throws (no history to roll back to — e.g. the very first
release is the broken one), the only recovery path is a fresh `runRelease()`
from corrected Build Platform output; there is no release to roll back
*to*.

## What rollback does NOT do

- It does not touch `sourceDir` (Build Platform's output) at all.
- It does not run `runBuild()` or call any Runtime/Build Platform
  function.
- It does not delete the release being rolled back *away from* — every
  release directory persists (see `RELEASE_PLATFORM.md`'s Known Risks
  on retention), so rolling forward again later (to the same or a newer
  release) is always possible.
