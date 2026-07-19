import { AUTHORS } from "../config";
import type { SEOAuthor } from "../types";
import { findDuplicates, issue, makeResult, isMissing, type ValidationIssue, type ValidationResult } from "./shared";

// Validates SEOAuthor-intrinsic structure: identity uniqueness (id/url/
// name) and image completeness. Whether an SEOArticle.authorId actually
// points at one of these records is validateRelationships.ts's job.

export function validateAuthors(authors: readonly SEOAuthor[] = AUTHORS): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const [id, group] of findDuplicates(authors, (a) => a.id)) {
    issues.push(issue("error", "AUTHOR_DUPLICATE_ID", `${group.length} authors share id "${id}"`, id));
  }
  for (const [url, group] of findDuplicates(authors, (a) => a.url)) {
    issues.push(issue("error", "AUTHOR_DUPLICATE_URL", `${group.length} authors share url "${url}"`, group.map((a) => a.id).join(", ")));
  }
  for (const [name, group] of findDuplicates(authors, (a) => a.name)) {
    issues.push(issue("warning", "AUTHOR_DUPLICATE_NAME", `${group.length} authors share the name "${name}"`, group.map((a) => a.id).join(", ")));
  }

  for (const author of authors) {
    if (isMissing(author.image)) {
      issues.push(issue("warning", "AUTHOR_MISSING_IMAGE", `Author "${author.id}" has no image`, author.id));
    }
  }

  return makeResult("validateAuthors", issues);
}
