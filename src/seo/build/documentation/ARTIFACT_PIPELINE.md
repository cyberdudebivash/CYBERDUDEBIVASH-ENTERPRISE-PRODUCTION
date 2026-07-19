# Artifact Pipeline

How a `SEORuntimeResult` becomes the files under `dist/seo/`.

## Per-page artifacts (`artifacts/pageArtifacts.ts`)

```
SEORuntimeResult
    ↓ toStaticHtmlHead()          (Runtime API — runtime/adapters/staticHtmlAdapter.ts)
StaticHtmlHead { title, metaTags, linkTags, jsonLd }
    ↓ buildPageMetadataArtifact()
PageMetadataArtifact { title, description, keywords, robots, language,
                        canonical, alternates, openGraph, twitter, breadcrumb }
    ↓ buildJsonLdArtifact()
JsonLdArtifact { pageId, nodeCount, json }
```

`PageMetadataArtifact` consolidates what the BUILD ARTIFACTS section
names as five separate items — Page Metadata, Canonical Definitions,
Open Graph, Twitter Cards, Breadcrumb Data — into **one file per
page**, not five. `openGraph`/`twitter` are simply `metaTags` filtered
by prefix (`og:`/`twitter:`); `canonical`/`alternates` are `linkTags`
filtered by `rel`; `breadcrumb` is extracted from the real
`BreadcrumbList` schema node already present in `result.schemas`
(never re-derived). `JsonLdArtifact` gets its own file since a schema
graph is a fundamentally different shape (a JSON-LD document, not
head tags) and downstream consumers (a future SSR injector, a
structured-data testing tool) want it in isolation.

## Site-wide artifacts (`artifacts/siteArtifacts.ts`)

Every site-wide artifact is a pure fold over an already-built
`PageArtifactSet[]` — no new SEO data is read anywhere in this module:

- **`SitemapArtifact`**: one `{ loc, alternates }` entry per page whose
  `robots` directive does not start with `"noindex"` (today, 17/17 —
  no real page carries `noindex`, verified directly against
  `robotsBuilder.ts`'s default). No `<lastmod>`: no last-modified date
  exists anywhere in the real data model, and stamping the build's own
  generation time would misrepresent content freshness as something
  it isn't.
- **`RobotsArtifact`**: a global `Allow: /`, one `Disallow:` per
  excluded page, and a `Sitemap:` line whose origin is derived from
  the first page's own canonical URL (`new URL(canonical).origin`) —
  not read from site config directly, keeping this module's only real
  input the artifact set already built.
- **`SearchIndexArtifact`**: one `{ pageId, title, description, url,
  keywords }` entry per page, **regardless** of robots directive — a
  site's own internal search should still surface a `noindex` page;
  only external crawlers (sitemap/robots) are meant to skip it.

## Validation gate (`validators/artifactValidator.ts`)

Every artifact is validated before it is written — `runBuild()` throws
`BuildValidationError` and writes nothing if any error-severity issue
exists:

- `validatePageArtifactSet`: title present, canonical absolute,
  non-empty schema graph, `nodeCount` matches the serialized `@graph`
  length, `json` actually parses.
- `validateSiteArtifacts`: no duplicate sitemap `loc`, every sitemap
  URL absolute, `robots.sitemapUrl` absolute, no duplicate search
  index `pageId`, plus every page's own `validatePageArtifactSet`.
- `validateBuildManifest`: no duplicate `pageId` entries, the
  manifest's own summary counts match its entries.

None of these re-check schema correctness, relationship integrity, or
commercial completeness — the Runtime Platform already did, before
this layer ever received the data.

## Output layout

```
dist/seo/
  metadata/<pageId>.json    — PageMetadataArtifact, pretty-printed
  schema/<pageId>.json       — the exact JSON-LD string the Runtime composed
  sitemaps/sitemap.xml       — SitemapArtifact, rendered XML
  robots.txt                 — RobotsArtifact, rendered text (site root, not nested — a
                                real robots.txt must eventually live at a domain root, not
                                a subdirectory, so this stays un-nested even though the
                                other four named subdirectories are)
  search-index.json          — SearchIndexArtifact, pretty-printed
  manifests/build-manifest.json — see BUILD_MANIFEST.md
  reports/BUILD_REPORT.md    — see BUILD_PLATFORM.md's Testing Summary
```

The five subdirectories this phase's OUTPUT STRUCTURE section names
(`metadata/`, `schema/`, `sitemaps/`, `reports/`, `manifests/`) are all
present; `robots.txt` and `search-index.json` are top-level files
alongside them rather than invented sixth/seventh subdirectory names,
since both are single, site-wide files (not one-per-page, not
scaling with page count) and `robots.txt` in particular conventionally
lives at a domain root wherever it is ultimately deployed.
