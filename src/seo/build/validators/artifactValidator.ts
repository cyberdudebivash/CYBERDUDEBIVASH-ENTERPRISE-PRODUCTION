import { issue, makeResult, findDuplicates, isMissing, type ValidationIssue, type ValidationResult } from "../../validators/shared";
import type { PageArtifactSet, SiteArtifactSet } from "../artifacts/types";
import type { BuildManifest } from "../manifests/types";

// artifactValidator — validates BUILD-level concerns only: is this
// artifact well-formed, serializable, internally consistent? It does
// NOT re-validate the underlying SEO data (schema correctness,
// relationship integrity, commercial completeness) — the Runtime
// Platform already did that before this platform ever saw the data
// ("no direct access to ... Validation engines" means this layer
// never re-runs that check, not that it skips validation entirely).
// Reuses validators/shared.ts's primitives (issue/makeResult/
// findDuplicates/isMissing) — the same precedent every prior phase's
// own validator (Metadata/Schema/Relationship/Commercial) already
// established, not a second parallel vocabulary.

function isAbsoluteUrl(value: string): boolean {
  try {
    return Boolean(new URL(value).origin);
  } catch {
    return false;
  }
}

export function validatePageArtifactSet(set: PageArtifactSet): ValidationResult {
  const issues: ValidationIssue[] = [];
  const location = set.pageId;

  if (isMissing(set.metadata.title)) issues.push(issue("error", "ARTIFACT_MISSING_TITLE", `Page "${location}" metadata artifact has no title`, location));
  if (!isAbsoluteUrl(set.metadata.canonical)) {
    issues.push(issue("error", "ARTIFACT_CANONICAL_NOT_ABSOLUTE", `Page "${location}" metadata artifact's canonical "${set.metadata.canonical}" is not an absolute URL`, location));
  }
  if (set.jsonLd.nodeCount === 0) issues.push(issue("error", "ARTIFACT_EMPTY_SCHEMA", `Page "${location}" JSON-LD artifact has zero nodes`, location));

  try {
    const parsed = JSON.parse(set.jsonLd.json) as { "@graph"?: unknown[] };
    if (!Array.isArray(parsed["@graph"]) || parsed["@graph"].length !== set.jsonLd.nodeCount) {
      issues.push(issue("error", "ARTIFACT_SCHEMA_NODE_COUNT_MISMATCH", `Page "${location}" JSON-LD artifact's nodeCount (${set.jsonLd.nodeCount}) does not match its own serialized @graph length`, location));
    }
  } catch {
    issues.push(issue("error", "ARTIFACT_INVALID_JSON", `Page "${location}" JSON-LD artifact is not valid JSON`, location));
  }

  return makeResult("validatePageArtifactSet", issues);
}

export function validateSiteArtifacts(site: SiteArtifactSet): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const [loc, group] of findDuplicates(site.sitemap.urls, (url) => url.loc)) {
    issues.push(issue("error", "ARTIFACT_SITEMAP_DUPLICATE_URL", `${group.length} sitemap entries share loc "${loc}"`, loc));
  }
  for (const url of site.sitemap.urls) {
    if (!isAbsoluteUrl(url.loc)) issues.push(issue("error", "ARTIFACT_SITEMAP_URL_NOT_ABSOLUTE", `Sitemap entry "${url.loc}" is not an absolute URL`, url.loc));
  }

  if (site.robots.sitemapUrl && !isAbsoluteUrl(site.robots.sitemapUrl)) {
    issues.push(issue("error", "ARTIFACT_ROBOTS_SITEMAP_URL_NOT_ABSOLUTE", `robots.txt artifact's sitemapUrl "${site.robots.sitemapUrl}" is not an absolute URL`, "robots"));
  }

  for (const [pageId, group] of findDuplicates(site.searchIndex.entries, (entry) => entry.pageId)) {
    issues.push(issue("error", "ARTIFACT_SEARCH_INDEX_DUPLICATE_PAGE", `${group.length} search index entries share pageId "${pageId}"`, pageId));
  }

  for (const page of site.pages) {
    issues.push(...validatePageArtifactSet(page).issues);
  }

  return makeResult("validateSiteArtifacts", issues);
}

export function validateBuildManifest(manifest: BuildManifest): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const [pageId, group] of findDuplicates(manifest.pages, (entry) => entry.pageId)) {
    issues.push(issue("error", "ARTIFACT_MANIFEST_DUPLICATE_PAGE", `${group.length} manifest entries share pageId "${pageId}"`, pageId));
  }

  const invalidCount = manifest.pages.filter((entry) => entry.validationStatus === "invalid").length;
  if (invalidCount !== manifest.summary.invalidPages) {
    issues.push(
      issue(
        "error",
        "ARTIFACT_MANIFEST_SUMMARY_MISMATCH",
        `Manifest summary reports ${manifest.summary.invalidPages} invalid page(s) but ${invalidCount} entries are marked invalid`,
        "summary",
      ),
    );
  }

  return makeResult("validateBuildManifest", issues);
}
