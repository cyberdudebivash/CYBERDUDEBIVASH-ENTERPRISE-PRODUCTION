import type { SEOPage } from "../types/page";
import { PAGES } from "../config";
import type { ValidationIssue } from "../validators/shared";
import { buildPageMetadata } from "./pageMetadataBuilder";
import { validateMetadata } from "./metadataValidator";
import type { PageMetadata } from "./types";

// MetadataEngine — the public entry point. Builds a page's metadata and
// validates it before returning; on any error-severity validation issue
// it throws rather than returning malformed or partial metadata. "No
// metadata object may bypass validation, validation failures must be
// explicit, never silently recover" is enforced here, once, rather than
// left to every future caller to remember.

function validationErrors(metadata: PageMetadata): ValidationIssue[] {
  return validateMetadata(metadata).issues.filter((i) => i.severity === "error");
}

function describeErrors(pageId: string, errors: readonly ValidationIssue[]): string {
  return `"${pageId}": ${errors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`;
}

/** Generates and validates one page's metadata. Throws if it fails validation — never returns a partially-valid object. */
export function generatePageMetadata(page: SEOPage): PageMetadata {
  const metadata = buildPageMetadata(page);
  const errors = validationErrors(metadata);
  if (errors.length > 0) {
    throw new Error(`generatePageMetadata: ${describeErrors(page.id, errors)}`);
  }
  return metadata;
}

/** Generates and validates metadata for every page (defaulting to the real PAGES registry). Throws one aggregate error naming every failing page rather than silently dropping any of them. */
export function generateAllPageMetadata(pages: readonly SEOPage[] = PAGES): PageMetadata[] {
  const results: PageMetadata[] = [];
  const failures: string[] = [];
  for (const page of pages) {
    const metadata = buildPageMetadata(page);
    const errors = validationErrors(metadata);
    if (errors.length > 0) failures.push(describeErrors(page.id, errors));
    else results.push(metadata);
  }
  if (failures.length > 0) {
    throw new Error(`generateAllPageMetadata: ${failures.length} page(s) failed validation — ${failures.join(" | ")}`);
  }
  return results;
}
