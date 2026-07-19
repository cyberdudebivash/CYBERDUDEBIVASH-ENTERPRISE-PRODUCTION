import { PAGES } from "../config";
import type { SEOPage } from "../types";
import { findDuplicates, issue, makeResult, isMissing, type ValidationIssue, type ValidationResult } from "./shared";

// Validates SEOPage-intrinsic structure only: identity uniqueness (id/path/
// title/description). Canonical-specific rules live in validateCanonical.ts,
// image rules (including OpenGraph/Twitter alt text) in validateImages.ts,
// commercial-field completeness in validateCommercial.ts, and keyword rules
// in validateKeywords.ts — kept separate so no two validators check the
// same field twice.

export function validatePages(pages: readonly SEOPage[] = PAGES): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const [id, group] of findDuplicates(pages, (p) => p.id)) {
    issues.push(issue("error", "PAGE_DUPLICATE_ID", `${group.length} pages share id "${id}"`, id));
  }
  for (const [path, group] of findDuplicates(pages, (p) => p.path)) {
    issues.push(issue("error", "PAGE_DUPLICATE_PATH", `${group.length} pages share path "${path}"`, path));
  }
  for (const [title, group] of findDuplicates(pages, (p) => p.title)) {
    issues.push(
      issue("warning", "PAGE_DUPLICATE_TITLE", `${group.length} pages share the title "${title}"`, group.map((p) => p.id).join(", ")),
    );
  }
  for (const [description, group] of findDuplicates(pages, (p) => p.description)) {
    issues.push(
      issue("warning", "PAGE_DUPLICATE_DESCRIPTION", `${group.length} pages share one description: "${description}"`, group.map((p) => p.id).join(", ")),
    );
  }

  for (const page of pages) {
    if (isMissing(page.description)) {
      issues.push(issue("warning", "PAGE_MISSING_DESCRIPTION", `Page "${page.id}" has no description`, page.id));
    }
  }

  return makeResult("validatePages", issues);
}
