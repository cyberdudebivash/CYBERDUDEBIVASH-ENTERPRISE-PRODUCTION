# Generation Strategy

`generator/runBuild.ts`'s `runBuild(options)` is the Build Platform's
single top-level entry point, supporting the four generation modes
this phase's GENERATION section names.

## The four modes

| Mode | `options.mode` | What runs |
|---|---|---|
| Single Page | `"single-page"` | One page: `generatePage(pageId)` → validate → write metadata+schema → manifest → report. No site-wide artifacts. |
| Entire Site | `"full-site"` | Every requested page (default: all 17) plus sitemap/robots/search-index, all written unconditionally. |
| Incremental Generation | `"incremental"` | Same as Entire Site, but a previous manifest (if any) is consulted to skip writing pages whose content is unchanged — see below. |
| Full Regeneration | `"full-site"` with a fresh/absent `outDir` | Not a fourth distinct code path — "full regeneration" *is* `full-site` mode; it never reads a previous manifest, so it always writes every page unconditionally. |

## Why "incremental" recomputes everything but writes only what changed

Every requested page is always re-run through the Runtime API, even in
`incremental` mode. This is deliberate:

1. **The Runtime pipeline is cheap.** Real measurement: ~2–4ms per
   page for the full Configuration → Validation → Metadata → Schema →
   Relationships → Commercial → Diagnostics pipeline (see
   `runtime/documentation/PIPELINE_ARCHITECTURE.md`). At 17 pages,
   recomputing all of them costs single-digit milliseconds — far less
   than the I/O of a single unnecessary file write would save.
2. **It's fully deterministic.** The same `pageId` against the same
   committed configuration always produces the same artifacts (see
   `runtime/documentation/SEO_RUNTIME.md`'s Determinism section) — so
   "recompute, then compare" can never produce a false positive the
   way trusting a stale timestamp or an external file-watcher signal
   could.
3. **It's the only way to detect a change correctly without HTML
   parsing or page scanning** — both explicitly forbidden by this
   phase's own GENERATION section. There is no "did the source file
   change" signal available (this platform's "source" is TypeScript
   config, not a file `mtime` a build tool would normally watch); a
   content checksum comparison is the correct signal on `generateSEO`'s
   output itself.

So "incremental" here means **skip redundant disk writes**, not skip
redundant computation: `generator/incrementalBuild.ts`'s
`partitionForIncrementalBuild()` always computes every requested page's
fresh checksum, and only *then* decides whether writing it is
necessary by comparing against the previous manifest.

## The partition algorithm

```
for each requested page:
  fresh = generatePage(pageId)              // always runs
  checksum = checksumOf(fresh.artifacts)     // always runs
  previous = previousManifest?.pages.find(p => p.pageId === pageId)
  if previous exists and previous.checksum === checksum:
    → unchanged: skip the write, carry previous.generatedAt/artifactPaths forward
  else:
    → changed: write it, stamp this run's generatedAt
```

A page absent from the previous manifest (new page, or first build
ever) is always `changed`. Site-wide artifacts (sitemap/robots/search
index) are always rewritten regardless of mode — they are cheap
aggregates that must reflect the current full page set even when the
individual pages requested this run didn't change.

## Deployment scope (explicitly out of this phase)

`runBuild()` writes only under `dist/seo/` — a directory this repo's
own `.gitignore` already excludes (`dist/` is untracked, matching
every other build output). It **never** touches `public/sitemap.xml`,
`public/robots.txt`, `public/manifest.json` (all real, hand-authored,
git-tracked files), or any `.html` file. This is not an oversight: the
PILOT section is explicit ("Do not modify production HTML"), and this
phase's own EXIT CRITERIA requires "No production HTML modified" — the
Build Platform proves it *can* generate correct, validated artifacts
from the Runtime API; wiring those artifacts into the actual deploy
(replacing or augmenting the real `public/` files) is Phase 2.1's
decision to make, not this phase's to take unilaterally.

## Known data-model gaps this strategy is honest about

- No last-modified date exists anywhere in the real configuration, so
  the generated sitemap has no `<lastmod>` (see
  `artifacts/types.ts`'s `SitemapArtifact`).
- No per-user-agent crawl policy exists in the data model, so the
  generated `robots.txt` cannot reproduce the real, hand-authored
  file's per-bot rules (Googlebot/Bingbot/social-crawler/AI-scraper
  distinctions) — see `BUILD_PLATFORM.md`'s Pilot Comparison for the
  measured gap (1 `User-agent` block generated vs 19 real).
- No image-sitemap data (`<image:image>`) exists in the Runtime's
  metadata output today, so the generated sitemap is narrower than the
  real one (17 URLs vs 23, no image entries).

None of these are fabricated to close the gap; each is a documented,
evidence-based limitation of the current data model, consistent with
every prior phase's own practice of reporting real gaps rather than
inventing values to paper over them.
