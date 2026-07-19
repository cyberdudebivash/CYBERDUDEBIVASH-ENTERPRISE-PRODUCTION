# Build Manifest

`manifests/build-manifest.json` is the record of exactly one build
run: which pages were generated, what their content checksums were,
when, and whether each passed artifact validation. It is also the
input `incremental` mode reads back to decide what can be skipped.

## Shape

```ts
interface BuildManifest {
  schemaVersion: string;       // "1.0.0" — bumped only if THIS SHAPE changes
  mode: "single-page" | "full-site" | "incremental";
  generatedAt: string;         // ISO 8601, this run's own timestamp
  outDir: string;
  pages: BuildManifestPageEntry[];
  siteArtifacts: BuildManifestSiteArtifactEntry[];
  summary: BuildManifestSummary;
}

interface BuildManifestPageEntry {
  pageId: string;
  checksum: string;            // sha256 of the page's PageArtifactSet
  generatedAt: string;         // carried forward, not "now", when skipped is true
  artifactPaths: string[];     // relative to `outDir`
  validationStatus: "valid" | "invalid";
  errorCount: number;
  warningCount: number;
  skipped: boolean;            // true only for an incremental build's unchanged page
}

interface BuildManifestSiteArtifactEntry {
  name: "sitemap" | "robots" | "searchIndex";
  path: string;
  checksum: string;
}

interface BuildManifestSummary {
  totalPages: number;
  validPages: number;
  invalidPages: number;
  skippedPages: number;
  totalErrors: number;
  totalWarnings: number;
  durationMs: number;
}
```

## Checksums (`manifests/checksum.ts`)

`checksumOf(value)` is `sha256(JSON.stringify(value))`. Every artifact
builder in `artifacts/` constructs its output as a plain object
literal with a fixed field order on every call — no `Map`/`Set`
iteration, no randomized key order — so `JSON.stringify` is stable
across runs given the same input. Verified directly:
`tests/manifests.test.ts`'s "same input twice -> same checksum" case,
and `tests/regression.test.ts`'s "two full-site builds against
unchanged content produce byte-identical artifact checksums" case.

## Reading a manifest back (`manifests/readManifest.ts`)

`readManifest(path)` is the read-side complement to `ManifestWriter`.
Returns `undefined` (never throws) when no file exists at `path` — the
expected, ordinary state for a project's first build, not an error.
Any other I/O failure propagates.

## How `incremental` mode uses it

1. `runBuild({ mode: "incremental" })` reads the previous manifest at
   `<outDir>/manifests/build-manifest.json` via `readManifest()`.
2. Every requested page is regenerated through the Runtime API
   regardless (cheap, deterministic — see `GENERATION_STRATEGY.md`).
3. `generator/incrementalBuild.ts`'s `partitionForIncrementalBuild()`
   computes each page's fresh checksum and compares it against the
   previous manifest's entry for that `pageId`:
   - No previous manifest, or no entry for this `pageId` → **changed**
     (write it).
   - Checksum matches → **unchanged** (skip the write; carry the
     previous entry's `generatedAt` and `artifactPaths` forward into
     the new manifest, but re-run validation fresh in case the
     validator itself changed).
   - Checksum differs → **changed** (write it).
4. Site-wide artifacts (sitemap/robots/search-index) are always
   rewritten in every site-level run, `incremental` included — they
   are cheap aggregates over every page and must stay current even
   when zero individual pages changed content but page membership
   (`pageIds` passed to `runBuild`) did.

## Manifest validation (`validators/artifactValidator.ts`)

`validateBuildManifest()` checks the manifest itself is internally
consistent: no two entries share a `pageId`, and
`summary.invalidPages` actually matches the count of entries marked
`"invalid"`. This check runs *before* `writeBuildManifest()` is
called in every mode — `single-page` included — so `runBuild()` throws
`BuildValidationError` and writes **nothing** — not even the manifest
itself — if it fails, consistent with "fail generation on validation
errors" applying to every artifact including the manifest. In practice
this has never fired, since `buildManifest()` computes `summary`
directly from the same `pages` array it returns.
