import type { ValidationResult } from "../../validators/shared";
import type { PageArtifactSet } from "../artifacts/types";
import { checksumOf } from "./checksum";
import { BUILD_MANIFEST_SCHEMA_VERSION } from "./types";
import type { BuildManifest, BuildManifestPageEntry, BuildManifestSiteArtifactEntry, BuildMode } from "./types";

// buildManifest — assembles the build-manifest.json content for one
// build run. Pure aggregation over data the generator already
// produced; performs no I/O and no validation of its own (the page
// entries' `validationStatus` is a fact this function records, not one
// it decides — see validators/artifactValidator.ts for the actual
// checks).

export interface ManifestPageInput {
  pageId: string;
  artifacts: PageArtifactSet;
  artifactPaths: string[];
  validation: ValidationResult;
  /** True for an incremental build's unchanged page — see BuildManifestPageEntry.skipped. */
  skipped?: boolean;
  /** Overrides the manifest's own `generatedAt` for this entry — used to carry a skipped page's previous timestamp forward. Ignored (this run's timestamp is used) when omitted. */
  generatedAt?: string;
}

export interface ManifestSiteArtifactInput {
  name: BuildManifestSiteArtifactEntry["name"];
  path: string;
  content: unknown;
}

export interface BuildManifestInput {
  mode: BuildMode;
  outDir: string;
  pages: ManifestPageInput[];
  siteArtifacts: ManifestSiteArtifactInput[];
  durationMs: number;
}

function toPageEntry(input: ManifestPageInput, runGeneratedAt: string): BuildManifestPageEntry {
  const errorCount = input.validation.issues.filter((i) => i.severity === "error").length;
  const warningCount = input.validation.issues.filter((i) => i.severity === "warning").length;
  return {
    pageId: input.pageId,
    checksum: checksumOf(input.artifacts),
    generatedAt: input.generatedAt ?? runGeneratedAt,
    artifactPaths: input.artifactPaths,
    validationStatus: errorCount === 0 ? "valid" : "invalid",
    errorCount,
    warningCount,
    skipped: input.skipped ?? false,
  };
}

export function buildManifest(input: BuildManifestInput): BuildManifest {
  const generatedAt = new Date().toISOString();
  const pages = input.pages.map((page) => toPageEntry(page, generatedAt));
  const siteArtifacts = input.siteArtifacts.map((artifact) => ({
    name: artifact.name,
    path: artifact.path,
    checksum: checksumOf(artifact.content),
  }));

  const validPages = pages.filter((p) => p.validationStatus === "valid").length;
  const invalidPages = pages.length - validPages;
  const skippedPages = pages.filter((p) => p.skipped).length;

  return {
    schemaVersion: BUILD_MANIFEST_SCHEMA_VERSION,
    mode: input.mode,
    generatedAt,
    outDir: input.outDir,
    pages,
    siteArtifacts,
    summary: {
      totalPages: pages.length,
      validPages,
      invalidPages,
      skippedPages,
      totalErrors: pages.reduce((sum, p) => sum + p.errorCount, 0),
      totalWarnings: pages.reduce((sum, p) => sum + p.warningCount, 0),
      durationMs: input.durationMs,
    },
  };
}
