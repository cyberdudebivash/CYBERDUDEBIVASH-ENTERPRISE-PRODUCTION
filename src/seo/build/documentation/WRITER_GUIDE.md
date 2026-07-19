# Writer Guide

Every writer in `writers/` performs serialization and a filesystem
write — nothing else. None of them decide what content is; they only
decide how it's represented as bytes on disk.

## The shared primitive (`writers/fsWriter.ts`)

```ts
writeTextFile(outDir: string, relativePath: string, content: string): Promise<string>
```

The **only** function in this directory that imports `node:fs`. Joins
`outDir` and `relativePath`, creates every parent directory
(`mkdir(..., { recursive: true })`), writes the file, and returns
`relativePath` — the value every other writer returns, and the value
`runBuild()` collects into `writtenPaths` and records in the manifest's
`artifactPaths`.

## Every writer's signature

| Writer | Function | Input | Output path |
|---|---|---|---|
| MetadataWriter | `writeMetadataArtifact(outDir, artifact)` | `PageMetadataArtifact` | `metadata/<pageId>.json` |
| SchemaWriter | `writeJsonLdArtifact(outDir, artifact)` | `JsonLdArtifact` | `schema/<pageId>.json` |
| SitemapWriter | `writeSitemapArtifact(outDir, artifact)` | `SitemapArtifact` | `sitemaps/sitemap.xml` |
| RobotsWriter | `writeRobotsArtifact(outDir, artifact)` | `RobotsArtifact` | `robots.txt` |
| SearchIndexWriter | `writeSearchIndexArtifact(outDir, artifact)` | `SearchIndexArtifact` | `search-index.json` |
| ManifestWriter | `writeBuildManifest(outDir, manifest)` | `BuildManifest` | `manifests/build-manifest.json` |
| ReportWriter | `writeBuildReport(outDir, data)` | `BuildReportData` | `reports/BUILD_REPORT.md` |

Every one of the seven has the shape `(outDir: string, x: SomeArtifact)
=> Promise<string>` — no writer takes a `pageId` string, a Runtime
result, or a config object; each takes exactly the artifact type it
serializes, already fully built by `artifacts/`, `manifests/`, or
`reports/`.

## Rendering vs writing

`SitemapWriter`, `RobotsWriter`, and `ReportWriter` each separate a
pure `render*()` function from the `write*()` function that calls it:

- `renderSitemapXml(artifact): string` — XML with attribute/text
  escaping, `xhtml:link` entries for hreflang alternates.
- `renderRobotsTxt(artifact): string` — `Allow`/`Disallow`/`Sitemap`
  lines.
- `renderBuildReportMarkdown(data): string` — the full markdown body.

This split exists so `tests/writers.test.ts` and
`tests/reportWriter.test.ts` can assert on rendering correctness
(escaping, structure) without touching the filesystem at all — the
`write*()` wrapper is then a one-line `writeTextFile(outDir, path,
render(...))`.

`MetadataWriter` and `SearchIndexWriter` skip a separate render step:
their content is `JSON.stringify(artifact, null, 2)`, simple enough
not to need one. `SchemaWriter` writes `artifact.json` — the exact
string `JSON.stringify(result.schemas)` already produced in
`artifacts/pageArtifacts.ts` — verbatim, not re-serialized.

## Adding a new writer

A future artifact type needs: (1) a shape in `artifacts/types.ts`, (2)
a builder in `artifacts/`, (3) a `write<Name>(outDir, artifact):
Promise<string>` function here calling `writeTextFile()`, and (4) a
line added to `runBuild.ts`'s write sequence and `writtenPaths`
collection. No existing writer needs to change.
