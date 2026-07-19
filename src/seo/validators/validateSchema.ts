import { PAGES, ORGANIZATION, AUTHORS } from "../config";
import type { SEOPage, SEOOrganization, SEOAuthor } from "../types";
import { findDuplicates, issue, makeResult, type ValidationIssue, type ValidationResult } from "./shared";

// Validates PAGES[].schemas — the structured-data (JSON-LD shape) side of
// the model. Phase 1.0 modeled the *types* (types/schema.ts) but no page
// populates `schemas` yet (that's Phase 1.2's job); this validator reports
// that coverage honestly and applies the checks that already matter for
// whichever schemas do exist: no duplicate @type on one page, and every
// cross-reference (ServiceSchema.provider, ArticleSchema.author) resolves.

export function validateSchema(
  pages: readonly SEOPage[] = PAGES,
  organization: SEOOrganization = ORGANIZATION,
  authors: readonly SEOAuthor[] = AUTHORS,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const authorIds = new Set(authors.map((a) => a.id));

  const withSchemas = pages.filter((p) => p.schemas && p.schemas.length > 0);
  issues.push(issue("info", "SCHEMA_COVERAGE", `${withSchemas.length}/${pages.length} pages have structured data (schemas) populated`, "PAGES"));

  for (const page of pages) {
    if (!page.schemas) continue;
    for (const [type, group] of findDuplicates(page.schemas, (s) => s["@type"])) {
      issues.push(issue("error", "SCHEMA_DUPLICATE_TYPE_ON_PAGE", `Page "${page.id}" lists "${type}" schema ${group.length} times`, page.id));
    }
    for (const schema of page.schemas) {
      if (schema["@type"] === "Service" && schema.provider !== organization.id) {
        issues.push(
          issue("warning", "SCHEMA_SERVICE_PROVIDER_UNRESOLVED", `Page "${page.id}" ServiceSchema.provider "${schema.provider}" does not match organization id "${organization.id}"`, page.id),
        );
      }
      if (schema["@type"] === "Article" && !authorIds.has(schema.author)) {
        issues.push(issue("error", "SCHEMA_ARTICLE_AUTHOR_UNRESOLVED", `Page "${page.id}" ArticleSchema.author "${schema.author}" does not resolve to a known author`, page.id));
      }
    }
  }

  return makeResult("validateSchema", issues);
}
