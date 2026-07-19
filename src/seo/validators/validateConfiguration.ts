import { PAGES, PRODUCTS, SERVICES, SOLUTIONS, AUTHORS, BLOG_ARTICLES, RESEARCH_ARTICLES, BLOG_CATEGORIES, RESEARCH_CATEGORIES } from "../config";
import { issue, makeResult, type ValidationIssue, type ValidationResult } from "./shared";

// The meta-validator: checks the shape of the config layer itself rather
// than any one collection's own internal correctness (every other
// validator's job) — do separate collections' id namespaces collide, does
// every collection actually export something, do cross-referenced URLs
// stay consistent with the page registry.

interface NamedCollection {
  name: string;
  ids: readonly string[];
}

function defaultCollections(): NamedCollection[] {
  return [
    { name: "PAGES", ids: PAGES.map((p) => p.id) },
    { name: "PRODUCTS", ids: PRODUCTS.map((p) => p.id) },
    { name: "SERVICES", ids: SERVICES.map((s) => s.id) },
    { name: "SOLUTIONS", ids: SOLUTIONS.map((s) => s.id) },
    { name: "AUTHORS", ids: AUTHORS.map((a) => a.id) },
    { name: "BLOG_ARTICLES", ids: BLOG_ARTICLES.map((a) => a.id) },
    { name: "RESEARCH_ARTICLES", ids: RESEARCH_ARTICLES.map((a) => a.id) },
    { name: "BLOG_CATEGORIES", ids: BLOG_CATEGORIES.map((c) => c.id) },
    { name: "RESEARCH_CATEGORIES", ids: RESEARCH_CATEGORIES.map((c) => c.id) },
  ];
}

export function validateConfiguration(collections?: readonly NamedCollection[]): ValidationResult {
  const namedCollections = collections ?? defaultCollections();
  const issues: ValidationIssue[] = [];

  // Cross-collection id collisions: the same literal id used as the
  // identity of two different entity-type records is invisible to any
  // single collection's own duplicate check, but is a real ambiguity for
  // any untyped id reference (e.g. SEOPage.relatedEntityIds) that can't
  // tell which collection an id belongs to.
  const owners = new Map<string, string[]>();
  for (const collection of namedCollections) {
    for (const id of collection.ids) {
      const existing = owners.get(id);
      if (existing) existing.push(collection.name);
      else owners.set(id, [collection.name]);
    }
  }
  for (const [id, ownerNames] of owners) {
    if (ownerNames.length > 1) {
      issues.push(
        issue(
          "warning",
          "CONFIG_CROSS_COLLECTION_ID_COLLISION",
          `id "${id}" is used by ${ownerNames.length} different collections (${ownerNames.join(", ")}) — ambiguous for any untyped id reference`,
          id,
        ),
      );
    }
  }

  // Non-empty sanity: an entirely empty collection usually means a broken
  // export, not a real business state — except RESEARCH_ARTICLES, which is
  // documented as intentionally empty (see research.config.ts).
  for (const collection of namedCollections) {
    if (collection.ids.length === 0 && collection.name !== "RESEARCH_ARTICLES") {
      issues.push(issue("warning", "CONFIG_EMPTY_COLLECTION", `Collection "${collection.name}" is empty`, collection.name));
    }
  }

  // Cross-consistency: every SERVICES.url that looks like a relative page
  // path should resolve to a real PAGES.path — proves the reconciliation
  // documented in SEO_ARCHITECTURE.md's Decision Record actually holds.
  const pagePaths = new Set(PAGES.map((p) => p.path));
  for (const service of SERVICES) {
    if (service.url && service.url.startsWith("/") && !pagePaths.has(service.url)) {
      issues.push(issue("error", "CONFIG_SERVICE_URL_UNRESOLVED", `Service "${service.id}" url "${service.url}" does not match any page path`, service.id));
    }
  }

  return makeResult("validateConfiguration", issues);
}
