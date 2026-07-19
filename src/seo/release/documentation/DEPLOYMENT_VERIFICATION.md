# Deployment Verification

`verification/verifyRelease.ts`'s `verifyRelease(release, checkDir)` is
called at two points: once against a freshly staged release (before
publish) and once against an already-published release's own directory
(before rollback, and by `getReleaseHealth()`). Every check this
phase's VERIFICATION section names is implemented here; none of them
re-check the underlying SEO data itself — the Runtime Platform already
did that, before Build Platform ever wrote a byte to `dist/seo/`.

## The checks

| VERIFICATION section item | Implementation | Issue code |
|---|---|---|
| Checksums | Every `release.files` entry's recorded checksum is compared against a fresh hash of the actual file at `checkDir` | `RELEASE_CHECKSUM_MISMATCH` |
| Artifact integrity | Every `.json`-suffixed artifact is re-parsed; a parse failure is flagged (checksum mismatch alone already catches most corruption, since any byte change breaks the hash first) | `RELEASE_INVALID_JSON_ARTIFACT` |
| Manifest integrity | (see Manifest Integrity below) | — |
| Runtime version | No field exists anywhere recording "which Runtime Platform version produced this" — see Known Gap below | — |
| Build version | `release.build.schemaVersion` checked against `SUPPORTED_BUILD_SCHEMA_VERSIONS` | `RELEASE_UNSUPPORTED_BUILD_VERSION` |
| Missing artifacts | Every path `release.files` expects is confirmed present in `checkDir` | `RELEASE_MISSING_ARTIFACT` |
| Unexpected artifacts | Every file actually found in `checkDir` is confirmed to be one `release.files` expects (warning-severity — an extra file is suspicious, not necessarily broken) | `RELEASE_UNEXPECTED_ARTIFACT` |
| Duplicate artifacts | `release.files` itself is checked for a repeated `path` (defensive — never trusts the planner's own uniqueness blindly) | `RELEASE_DUPLICATE_ARTIFACT` |

## Manifest integrity

Two checks fold into "is this release's own build record trustworthy":

1. **Supported build version** (above) — refuses to publish/rollback-to
   a `dist/seo/` produced by a `BuildManifest.schemaVersion` this
   platform doesn't recognize.
2. **The source build itself reported problems**:
   `release.build.totalErrors > 0` (`RELEASE_SOURCE_BUILD_HAD_ERRORS`)
   or `release.build.invalidPages > 0`
   (`RELEASE_SOURCE_BUILD_HAD_INVALID_PAGES`) — Build Platform's own
   "fail generation on validation errors" gate means these should be
   structurally impossible in practice (a build with errors never
   finishes writing), but this platform checks anyway rather than
   assuming it. See `tests/verification.test.ts`'s corresponding tests.

## Known gap: "Runtime version"

No field anywhere in this codebase — not `BuildManifest`, not any
Runtime Platform export — records which version of the Runtime
Platform produced a given `dist/seo/` output. Neither the Runtime nor
the Build Platform version themselves independently of the repository's
own git history. This is a real, evidenced limitation rather than
something to fabricate a field for: `verifyRelease()` checks the
closest real analog available (`build.schemaVersion`, the one version
field that genuinely exists and is meaningful), and this gap is
recorded honestly here rather than papered over with an invented
"runtimeVersion" value with no real backing data. A future phase
introducing actual semantic versioning for the Runtime Platform could
extend `SourceBuildInfo` and this check accordingly without changing
`verifyRelease()`'s overall shape.

## Where verification runs against what

| Caller | `checkDir` | Why |
|---|---|---|
| `runRelease()` (full/incremental/preview) | The staged copy (`.staging/<releaseId>/`) | Confirms what was actually copied, not just what the plan intended |
| `runRelease({ mode: "dry-run" })` | `sourceDir` directly | Nothing was staged, so the closest read-only equivalent |
| `rollbackRelease()` | The target release's own directory (`releases/<releaseId>/`) | "Integrity verification before rollback" — confirms the release being rolled back *to* hasn't been tampered with since it was published |
| `getReleaseHealth()` | The current release's own directory | Confirms what's *live* still matches its own recorded manifest |

Every one of these re-derives its own view of `checkDir` via
`scanDirectory()` (Release Platform's own utility) rather than trusting
any previously-computed file list — "never bypass verification" holds
even against this platform's own prior work.
