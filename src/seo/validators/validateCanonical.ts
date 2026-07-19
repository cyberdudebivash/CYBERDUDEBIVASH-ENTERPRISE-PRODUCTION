import { PAGES } from "../config";
import type { SEOPage } from "../types";
import { findDuplicates, issue, makeResult, type ValidationIssue, type ValidationResult } from "./shared";

// Validates everything canonical-URL-specific: presence, cross-page
// uniqueness, path consistency with the page's own `path`, and alternate
// (hreflang) correctness. Split out from validatePages.ts so canonical
// logic exists in exactly one place.

export function validateCanonical(pages: readonly SEOPage[] = PAGES): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const page of pages) {
    if (!page.canonical) {
      issues.push(issue("warning", "CANONICAL_MISSING", `Page "${page.id}" has no canonical config`, page.id));
      continue;
    }
    const canonical = page.canonical;
    if (canonical.path !== page.path) {
      issues.push(
        issue("error", "CANONICAL_PATH_MISMATCH", `Page "${page.id}" canonical.path ("${canonical.path}") does not match its own path ("${page.path}")`, page.id),
      );
    }
    for (const [hreflang, group] of findDuplicates(canonical.alternates ?? [], (a) => a.hreflang)) {
      issues.push(issue("error", "CANONICAL_DUPLICATE_ALTERNATE_HREFLANG", `Page "${page.id}" has ${group.length} alternates for hreflang "${hreflang}"`, page.id));
    }
    for (const alt of canonical.alternates ?? []) {
      if (alt.path === canonical.path) {
        issues.push(
          issue("warning", "CANONICAL_SELF_REFERENTIAL_ALTERNATE", `Page "${page.id}" lists an alternate (hreflang "${alt.hreflang}") pointing at its own canonical path`, page.id),
        );
      }
    }
  }

  const canonicalEntries = pages
    .map((p) => (p.canonical ? { id: p.id, path: p.canonical.path } : undefined))
    .filter((entry): entry is { id: string; path: string } => entry !== undefined);
  for (const [path, group] of findDuplicates(canonicalEntries, (entry) => entry.path)) {
    issues.push(issue("error", "CANONICAL_DUPLICATE_PATH", `${group.length} pages share canonical path "${path}"`, group.map((entry) => entry.id).join(", ")));
  }

  return makeResult("validateCanonical", issues);
}
