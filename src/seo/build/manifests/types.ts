// Owns: the build-manifest.json shape. One manifest describes exactly
// one build run: which pages were generated, what their content
// checksums were, when, and whether each passed artifact validation —
// the record an incremental build reads back to decide which pages
// can be skipped (see generator/incrementalBuild.ts).

export type BuildMode = "single-page" | "full-site" | "incremental";

export interface BuildManifestPageEntry {
  pageId: string;
  /** sha256 of the page's serialized PageArtifactSet — deterministic given the same Runtime output (see manifests/checksum.ts). */
  checksum: string;
  /** When this page's artifacts were actually written to disk — carried forward from the previous manifest entry (not "now") when `skipped` is true, since nothing was rewritten. */
  generatedAt: string;
  /** Paths written for this page, relative to the manifest's own outDir — carried forward from the previous manifest when `skipped` is true. */
  artifactPaths: string[];
  validationStatus: "valid" | "invalid";
  errorCount: number;
  warningCount: number;
  /** True for an incremental build's unchanged page: content was recomputed (see generator/incrementalBuild.ts) and re-validated, but not rewritten to disk. */
  skipped: boolean;
}

export interface BuildManifestSiteArtifactEntry {
  name: "sitemap" | "robots" | "searchIndex";
  path: string;
  checksum: string;
}

export interface BuildManifestSummary {
  totalPages: number;
  validPages: number;
  invalidPages: number;
  skippedPages: number;
  totalErrors: number;
  totalWarnings: number;
  durationMs: number;
}

/** The Build Manifest's own schema version — bumped only if this shape itself changes, independent of any page content changing. */
export const BUILD_MANIFEST_SCHEMA_VERSION = "1.0.0";

export interface BuildManifest {
  schemaVersion: string;
  mode: BuildMode;
  generatedAt: string;
  outDir: string;
  pages: BuildManifestPageEntry[];
  siteArtifacts: BuildManifestSiteArtifactEntry[];
  summary: BuildManifestSummary;
}
