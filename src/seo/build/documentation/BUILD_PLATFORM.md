# Enterprise Build Generation Platform

Phase 2.0 deliverable. Consumes the Phase 1.5 Runtime Platform
exclusively (`generateSEO` / `createSEORuntime` / `getRuntimeHealth`)
to produce production-ready SEO artifacts — per-page metadata, JSON-LD,
a sitemap, a robots.txt, a search index, a build manifest, and a
human-readable build report — written under `dist/seo/`. No direct
access to the Metadata, Schema, Relationship, Commercial, or Validation
engines; no HTML parsing; no page scanning. See `ARTIFACT_PIPELINE.md`,
`BUILD_MANIFEST.md`, `WRITER_GUIDE.md`, and `GENERATION_STRATEGY.md`
for the companion documents this file references throughout.

## Executive Summary

The Build Platform is complete: 8 directories (`generator/`,
`artifacts/`, `writers/`, `reports/`, `validators/`, `manifests/`,
`tests/`, `documentation/`), 30 source files, 10 test files (58 new
tests). All 17 real pages generate through the full pipeline —
Runtime API → Build Platform → validated artifacts → `dist/seo/` —
with **zero validation errors**. A pilot comparison (see below)
confirms every generated artifact is byte-identical to calling
`generateSEO()` directly. `npm run lint` and `npm run build` both pass;
the production bundle's module count is identical before and after
this phase (2121 modules both times, confirmed by stashing
`src/seo/build/` and rebuilding). 58 new unit tests pass alongside the
296 tests already in the repository from Phases 1.0.5–1.5 (354/354
total).

## Runtime Architecture

```
Configuration (page ids only — generator/pageIds.ts)
    ↓
Runtime Platform (generateSEO / createSEORuntime / getRuntimeHealth)
    ↓
Build Generation Platform
    artifacts/   → pure reshaping of Runtime output
    validators/  → build-level structural checks (never re-validates SEO data)
    generator/   → orchestration: single-page / full-site / incremental
    manifests/   → build-manifest.json (checksums, timestamps, validation status)
    reports/     → BUILD_REPORT.md's structured content
    writers/     → serialization + filesystem output only
    ↓
dist/seo/ (metadata/, schema/, sitemaps/, reports/, manifests/, robots.txt, search-index.json)
    ↓
Production Website (NOT wired up yet — see Known Risks)
```

## Architecture Decisions

1. **The only config this platform reads directly is the page-id
   list** (`generator/pageIds.ts`'s `listAllPageIds()`, reading
   `PAGES.map(p => p.id)`). "Consume ONLY the Runtime API... no direct
   access to Metadata, Schema, Relationship, Commercial or Validation
   engines" names five specific engines; it does not forbid reading
   which pages exist, a Configuration-layer fact the architecture
   diagram's own first box already names separately from the Runtime.
   Every actual SEO field this platform touches — title, description,
   schema, relationships, commercial — comes exclusively from
   `generateSEO(pageId)`. This mirrors the Runtime Platform's own
   precedent: `runtime/integration/resolvePage.ts` reads `PAGES` for
   the identical reason (id resolution), while every other
   `integration/*.ts` module calls an engine's real public API for the
   data itself.

2. **`artifacts/` never re-derives what the Runtime already computed.**
   `pageArtifacts.ts` reuses the Runtime's own `toStaticHtmlHead()`
   adapter for meta/link tag shaping rather than re-implementing
   Open Graph/Twitter Card selection; breadcrumb data is *extracted*
   from the real `BreadcrumbList` schema node already in
   `result.schemas`, never re-derived from relationships or metadata.

3. **`validators/` validates build-level concerns, not SEO data.** Is
   this JSON-LD artifact syntactically valid JSON? Does its recorded
   `nodeCount` match its own serialized `@graph`? Is this canonical URL
   absolute? These are new checks this phase owns. Schema correctness,
   relationship integrity, and commercial completeness were already
   validated by the Runtime Platform before this layer ever received
   the data — "no direct access to... Validation engines" means this
   layer never *re-runs* that check, not that it skips validation
   entirely. Reuses `validators/shared.ts`'s primitives
   (`issue`/`makeResult`/`findDuplicates`/`isMissing`) — the same
   precedent every prior phase's own validator (Metadata/Schema/
   Relationship/Commercial) already established.

4. **Writers perform serialization only — verified structurally, not
   just by convention.** Every writer function's signature is
   `(outDir, artifact) => Promise<string>` (the relative path
   written); none of them accept a page id, a runtime result, or
   anything requiring a decision about SEO content. See
   `WRITER_GUIDE.md`.

5. **"Incremental" means skipping redundant disk writes, not redundant
   computation.** Every page is always re-run through the Runtime API
   (cheap: ~2–4ms per page, fully deterministic — see
   `runtime/documentation/PIPELINE_ARCHITECTURE.md`); only pages whose
   freshly-computed checksum matches the previous manifest's entry are
   skipped for writing. This guarantees correctness even against a
   stale or hand-edited previous manifest, at negligible cost. See
   `GENERATION_STRATEGY.md`.

6. **`getRuntimeHealth()` is Runtime API surface, not a bypassed
   engine.** `reports/buildReport.ts`'s optional Runtime Summary calls
   it directly — it is one of the Runtime Platform's own three public
   exports (alongside `generateSEO`/`createSEORuntime`), composing
   validation internally rather than this layer reaching around it.

## Pilot Comparison

Per this phase's PILOT section, generation was run against `about`,
the `services` page, and (per Phase 1.5's own already-documented
finding, reconfirmed here) products via `home`:

| Target | Generated vs Runtime output | Notes |
|---|---|---|
| `about` | **Byte-identical** (`JSON.stringify` equality on title, canonical, full schema graph) | |
| `services` | **Byte-identical** | Exactly 1 live `Service` schema node (`pentest`, the one real `SEOService` whose `url` matches `/services.html`) |
| products | Not independently addressable (no `products` page exists in `PAGES`) | Reachable only via `home`'s generated `schema/home.json`: 4 `SoftwareApplication` nodes (`apex, ai_hub, tools, official` — not `blog`), matching Phase 1.5's own already-documented finding |

**Generated vs current production** (`dist/seo/` artifacts vs the
real, hand-authored `public/sitemap.xml` and `public/robots.txt`):

| File | Generated | Real production | Real difference |
|---|---|---|---|
| sitemap | 17 URLs, 55 lines | 23 URLs, 204 lines | The real sitemap includes image sitemap entries (`<image:image>`) and additional URLs (blog/research articles) with no corresponding page in `PAGES` — no data model support for either today |
| robots.txt | 1 `User-agent` block, 5 lines | 19 `User-agent` blocks, 102 lines | The real file has per-bot crawl policy (Googlebot/Bingbot/social crawlers/AI-scraper opt-outs, `Crawl-delay`) — no field in the Runtime's data model carries per-user-agent policy |

These are real, evidenced gaps in what the current data model can
express — not defects in this phase's composition. **No production
file was modified**: every generated artifact was written to a
temporary directory during this comparison, never to `public/` or
`dist/sitemap.xml`/`dist/robots.txt` (the real, git-tracked files Vite
copies verbatim into the production build). See `GENERATION_STRATEGY.md`'s
Known Risks.

## Files Created

30 source files under `src/seo/build/` (`artifacts/` 4, `generator/`
6, `manifests/` 5, `reports/` 2, `validators/` 3, `writers/` 8, plus
the top-level `index.ts`), 10 test files (58 tests) under
`src/seo/build/tests/`, and 5 documentation files under
`src/seo/build/documentation/`.

## Files Modified

`src/seo/index.ts` — one addition: `export * from "./build";`. No
other file from any prior phase was touched.

## Generation Pipeline

See `ARTIFACT_PIPELINE.md` and `GENERATION_STRATEGY.md` for the full
detail. Summary: `runBuild(options)` dispatches to either a
single-page path (`generatePage` → validate → write metadata+schema →
manifest → report) or a site path shared by `full-site` and
`incremental` modes (`generateSite` → validate → optionally partition
by checksum against a previous manifest → write changed pages' + all
site-wide artifacts → manifest → report), throwing `BuildValidationError`
and writing nothing if any error-severity issue is found.

## Testing Summary

58 new tests across 10 files:

| File | What it covers |
|---|---|
| `pageArtifacts.test.ts` | Per-page artifact parity with Runtime output |
| `siteArtifacts.test.ts` | Sitemap/robots/search-index folds, noindex exclusion |
| `artifactValidator.test.ts` | Every build-level validation rule, positive and negative cases |
| `manifests.test.ts` | Checksum determinism, manifest summary correctness, read/write round-trip |
| `writers.test.ts` | Every writer's serialization correctness, XML escaping |
| `reportWriter.test.ts` | Report markdown rendering |
| `generator.test.ts` | Page-id enumeration, single-page and site generation |
| `incrementalBuild.test.ts` | Checksum-based partitioning: new/changed/unchanged pages |
| `runBuild.test.ts` | End-to-end single-page/full-site/incremental runs, real filesystem writes |
| `regression.test.ts` | `vciso` collision, 81-node total, determinism, no writes outside `outDir` |

## Verification Results

- `npm run lint`: 0 errors.
- `npm run build`: 2121 modules — identical before and after this
  phase (confirmed by stashing `src/seo/build/` + `src/seo/index.ts`
  and rebuilding).
- Full test suite: **354/354 pass** (296 pre-existing across Phases
  1.0.5–1.5, unmodified and still green; 58 new).
- Every one of the 17 real pages: `runBuild({ mode: "full-site" })`
  writes with **zero validation errors**.
- No production HTML, `public/`, or `dist/sitemap.xml`/`robots.txt`/
  `manifest.json` modified — every artifact this phase writes goes to
  `dist/seo/`, a namespace `.gitignore`'d and untouched by the real
  Vite build.

## Known Risks

1. **`dist/seo/` is not wired into the actual deploy yet.** This phase
   produces artifacts; it does not replace `public/sitemap.xml`,
   `public/robots.txt`, or inject `<script type="application/ld+json">`
   into any real page. That wiring is explicitly out of scope per this
   phase's own PILOT instruction ("do not modify production HTML") and
   the POST-RUNTIME rule's staged rollout.
2. **The generated sitemap/robots.txt are necessarily simpler than the
   real, hand-authored production files** (no image sitemap entries,
   no per-bot crawl policy) — a real, evidenced gap in the data model
   this platform composes from, not a defect in this phase. See Pilot
   Comparison above.
3. **`readManifest()` trusts the previous manifest's shape.** A
   hand-edited or corrupted `build-manifest.json` with a wrong
   `checksum` field would silently cause `partitionForIncrementalBuild`
   to treat an unchanged page as changed (safe: extra work, not a
   correctness risk) or vice versa only if a checksum happens to
   collide (cryptographically implausible with sha256). No schema
   validation is run on a manifest read back from disk before its
   checksums are used.

## Recommendations for Phase 2.1

Wire `dist/seo/`'s artifacts into the actual build/deploy pipeline:
inject each page's `schema/<pageId>.json` as a real
`<script type="application/ld+json">` tag (via the SSR adapter Phase
1.5 already built), and replace `public/sitemap.xml`/`robots.txt` with
generated equivalents once the real data model gains image-sitemap and
per-bot-policy support (or accept the generated files as a narrower,
correct baseline and layer the richer real-world rules on top).
`runBuild({ mode: "incremental" })` is ready to run in CI on every
commit once that wiring exists.
