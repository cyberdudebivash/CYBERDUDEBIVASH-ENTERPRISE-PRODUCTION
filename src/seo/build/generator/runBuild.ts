import { join } from "node:path";
import { getRuntimeHealth } from "../../runtime";
import { generatePage } from "./generatePage";
import { generateSite } from "./generateSite";
import { listAllPageIds } from "./pageIds";
import { partitionForIncrementalBuild } from "./incrementalBuild";
import { validatePageArtifactSet, validateBuildManifest, BuildValidationError } from "../validators";
import { buildManifest, readManifest, type BuildManifest, type ManifestPageInput } from "../manifests";
import { buildReportData } from "../reports/buildReport";
import { writeMetadataArtifact, writeJsonLdArtifact, writeSitemapArtifact, writeRobotsArtifact, writeSearchIndexArtifact, writeBuildManifest, writeBuildReport } from "../writers";
import type { BuildMode } from "../manifests/types";
import type { PageArtifactSet } from "../artifacts/types";

// runBuild — the Build Generation Platform's single top-level entry
// point, supporting the four modes this phase's GENERATION section
// names: Single Page, Entire Site, Incremental Generation, and Full
// Regeneration (the last is "full-site" run with no previous manifest
// consulted — see below). Every SEO field comes from the Runtime API
// (generateSEO / createSEORuntime / getRuntimeHealth); the only
// config read directly is the page-id list (generator/pageIds.ts).
// Validates every artifact before writing and fails the whole build on
// any error-severity issue — "fail generation on validation errors" is
// enforced here, once, rather than left to every future caller.

export const DEFAULT_OUT_DIR = "dist/seo";
const MANIFEST_RELATIVE_PATH = "manifests/build-manifest.json";

export interface RunBuildOptions {
  mode: BuildMode;
  /** Required for mode "single-page". */
  pageId?: string;
  /** Optional subset for "full-site"/"incremental" — defaults to every real page. */
  pageIds?: readonly string[];
  outDir?: string;
  /** Whether to call getRuntimeHealth() for the report's Runtime Summary — off by default for "single-page" (a platform-wide check for a one-page build is disproportionate), on by default otherwise. */
  includeRuntimeHealth?: boolean;
}

export interface RunBuildResult {
  manifest: BuildManifest;
  writtenPaths: string[];
}

async function writePageArtifacts(outDir: string, artifacts: PageArtifactSet): Promise<string[]> {
  return [await writeMetadataArtifact(outDir, artifacts.metadata), await writeJsonLdArtifact(outDir, artifacts.jsonLd)];
}

async function runSinglePageBuild(pageId: string, outDir: string, includeRuntimeHealth: boolean, startedAt: number): Promise<RunBuildResult> {
  const generated = generatePage(pageId);
  const validation = validatePageArtifactSet(generated.artifacts);
  if (validation.issues.some((i) => i.severity === "error")) {
    throw new BuildValidationError(`runBuild("single-page", "${pageId}"): ${validation.issues.filter((i) => i.severity === "error").map((i) => `[${i.code}] ${i.message}`).join("; ")}`);
  }

  const artifactPaths = await writePageArtifacts(outDir, generated.artifacts);
  const pageInput: ManifestPageInput = { pageId, artifacts: generated.artifacts, artifactPaths, validation };
  const manifest = buildManifest({ mode: "single-page", outDir, pages: [pageInput], siteArtifacts: [], durationMs: performance.now() - startedAt });

  const manifestValidation = validateBuildManifest(manifest);
  if (manifestValidation.issues.some((i) => i.severity === "error")) {
    throw new BuildValidationError(`runBuild("single-page", "${pageId}"): manifest failed validation — ${manifestValidation.issues.map((i) => `[${i.code}] ${i.message}`).join("; ")}`);
  }

  const writtenPaths = [...artifactPaths];
  writtenPaths.push(await writeBuildManifest(outDir, manifest));
  const report = buildReportData(manifest, 0, includeRuntimeHealth ? getRuntimeHealth() : undefined);
  writtenPaths.push(await writeBuildReport(outDir, report));

  return { manifest, writtenPaths };
}

async function runSiteBuild(mode: "full-site" | "incremental", pageIds: readonly string[], outDir: string, includeRuntimeHealth: boolean, startedAt: number): Promise<RunBuildResult> {
  const generated = generateSite(pageIds);
  if (generated.validation.issues.some((i) => i.severity === "error")) {
    throw new BuildValidationError(`runBuild("${mode}"): ${generated.validation.issues.filter((i) => i.severity === "error").map((i) => `[${i.code}] ${i.message}`).join("; ")}`);
  }

  const previousManifest = mode === "incremental" ? await readManifest(join(outDir, MANIFEST_RELATIVE_PATH)) : undefined;
  const { changed, unchanged } = partitionForIncrementalBuild(generated.pages, previousManifest);
  const previousEntryFor = new Map((previousManifest?.pages ?? []).map((entry) => [entry.pageId, entry]));

  const writtenPaths: string[] = [];
  const pageInputs: ManifestPageInput[] = [];

  for (const page of changed) {
    const artifactPaths = await writePageArtifacts(outDir, page.artifacts);
    writtenPaths.push(...artifactPaths);
    pageInputs.push({ pageId: page.pageId, artifacts: page.artifacts, artifactPaths, validation: validatePageArtifactSet(page.artifacts) });
  }
  for (const page of unchanged) {
    const previous = previousEntryFor.get(page.pageId);
    pageInputs.push({
      pageId: page.pageId,
      artifacts: page.artifacts,
      artifactPaths: previous?.artifactPaths ?? [],
      validation: validatePageArtifactSet(page.artifacts),
      skipped: true,
      generatedAt: previous?.generatedAt,
    });
  }

  writtenPaths.push(await writeSitemapArtifact(outDir, generated.site.sitemap));
  writtenPaths.push(await writeRobotsArtifact(outDir, generated.site.robots));
  writtenPaths.push(await writeSearchIndexArtifact(outDir, generated.site.searchIndex));

  const manifest = buildManifest({
    mode,
    outDir,
    pages: pageInputs,
    siteArtifacts: [
      { name: "sitemap", path: "sitemaps/sitemap.xml", content: generated.site.sitemap },
      { name: "robots", path: "robots.txt", content: generated.site.robots },
      { name: "searchIndex", path: "search-index.json", content: generated.site.searchIndex },
    ],
    durationMs: performance.now() - startedAt,
  });

  const manifestValidation = validateBuildManifest(manifest);
  if (manifestValidation.issues.some((i) => i.severity === "error")) {
    throw new BuildValidationError(`runBuild("${mode}"): manifest failed validation — ${manifestValidation.issues.map((i) => `[${i.code}] ${i.message}`).join("; ")}`);
  }

  writtenPaths.push(await writeBuildManifest(outDir, manifest));
  const report = buildReportData(manifest, generated.site.sitemap.urls.length, includeRuntimeHealth ? getRuntimeHealth() : undefined);
  writtenPaths.push(await writeBuildReport(outDir, report));

  return { manifest, writtenPaths };
}

export async function runBuild(options: RunBuildOptions): Promise<RunBuildResult> {
  const startedAt = performance.now();
  const outDir = options.outDir ?? DEFAULT_OUT_DIR;
  const includeRuntimeHealth = options.includeRuntimeHealth ?? options.mode !== "single-page";

  if (options.mode === "single-page") {
    if (!options.pageId) throw new BuildValidationError('runBuild: mode "single-page" requires options.pageId');
    return runSinglePageBuild(options.pageId, outDir, includeRuntimeHealth, startedAt);
  }

  const pageIds = options.pageIds ?? listAllPageIds();
  return runSiteBuild(options.mode, pageIds, outDir, includeRuntimeHealth, startedAt);
}
