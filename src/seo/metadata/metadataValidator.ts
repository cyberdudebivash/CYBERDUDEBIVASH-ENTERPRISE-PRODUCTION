import { issue, makeResult, isMissing, findDuplicates, type ValidationIssue, type ValidationResult } from "../validators/shared";
import type { PageMetadata } from "./types";

// MetadataValidator — every PageMetadata object MetadataEngine produces
// is checked here before it's considered valid: "no metadata object may
// bypass validation." Reuses Phase 1.0.5's validation primitives
// (issue/makeResult/isMissing/findDuplicates from validators/shared.ts)
// rather than a second, parallel validation vocabulary — this is the
// same engine, extended with a metadata-shaped check, not a new one.
// Deliberately lives here rather than as a 17th file under validators/
// so Phase 1.1 makes zero changes to that directory or to
// reports/generateReport.ts — see documentation/SEO_METADATA_ENGINE.md's
// Architecture Decisions for the full rationale.

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}

export function validateMetadata(metadata: PageMetadata): ValidationResult {
  const issues: ValidationIssue[] = [];
  const location = metadata.pageId;

  if (isMissing(metadata.title)) {
    issues.push(issue("error", "METADATA_MISSING_TITLE", `Page "${location}" generated metadata with no title`, location));
  }
  if (isMissing(metadata.description)) {
    issues.push(issue("warning", "METADATA_MISSING_DESCRIPTION", `Page "${location}" generated metadata with no description`, location));
  }
  if (!isAbsoluteUrl(metadata.canonical)) {
    issues.push(issue("error", "METADATA_CANONICAL_NOT_ABSOLUTE", `Page "${location}" canonical "${metadata.canonical}" is not an absolute URL`, location));
  }
  for (const alt of metadata.alternates) {
    if (!isAbsoluteUrl(alt.href)) {
      issues.push(
        issue("error", "METADATA_ALTERNATE_NOT_ABSOLUTE", `Page "${location}" alternate (hreflang "${alt.hreflang}") "${alt.href}" is not an absolute URL`, location),
      );
    }
  }
  if (!isAbsoluteUrl(metadata.openGraph.url)) {
    issues.push(issue("error", "METADATA_OG_URL_NOT_ABSOLUTE", `Page "${location}" OpenGraph url "${metadata.openGraph.url}" is not an absolute URL`, location));
  }
  if (!isAbsoluteUrl(metadata.openGraph.image.url)) {
    issues.push(
      issue("error", "METADATA_OG_IMAGE_NOT_ABSOLUTE", `Page "${location}" OpenGraph image "${metadata.openGraph.image.url}" is not an absolute URL`, location),
    );
  }
  if (isMissing(metadata.openGraph.image.alt)) {
    issues.push(issue("error", "METADATA_OG_IMAGE_BLANK_ALT", `Page "${location}" OpenGraph image has blank alt text`, location));
  }
  if (!isAbsoluteUrl(metadata.twitter.image.url)) {
    issues.push(issue("error", "METADATA_TWITTER_IMAGE_NOT_ABSOLUTE", `Page "${location}" Twitter image "${metadata.twitter.image.url}" is not an absolute URL`, location));
  }
  if (isMissing(metadata.twitter.image.alt)) {
    issues.push(issue("error", "METADATA_TWITTER_IMAGE_BLANK_ALT", `Page "${location}" Twitter image has blank alt text`, location));
  }
  if (isMissing(metadata.keywords)) {
    issues.push(issue("warning", "METADATA_MISSING_KEYWORDS", `Page "${location}" generated metadata with no keywords`, location));
  } else {
    for (const [keyword, group] of findDuplicates(metadata.keywords.map((k) => ({ k: k.toLowerCase() })), (item) => item.k)) {
      issues.push(issue("error", "METADATA_DUPLICATE_KEYWORD", `Page "${location}" generated metadata with keyword "${keyword}" duplicated ${group.length} times`, location));
    }
  }
  if (isMissing(metadata.language)) {
    issues.push(issue("error", "METADATA_MISSING_LANGUAGE", `Page "${location}" generated metadata with no language`, location));
  }
  for (const tag of metadata.verification) {
    if (isMissing(tag.content)) {
      issues.push(issue("warning", "METADATA_BLANK_VERIFICATION_TAG", `Page "${location}" verification tag "${tag.name}" has blank content`, location));
    }
  }

  return makeResult("validateMetadata", issues);
}
