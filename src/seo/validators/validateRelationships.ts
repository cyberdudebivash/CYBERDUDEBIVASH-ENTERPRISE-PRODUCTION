import {
  PAGES,
  PRODUCTS,
  SERVICES,
  SOLUTIONS,
  BLOG_ARTICLES,
  RESEARCH_ARTICLES,
  BLOG_CATEGORIES,
  RESEARCH_CATEGORIES,
  AUTHORS,
  ORGANIZATION,
  BRANDS,
  PRIMARY_NAVIGATION,
  FOOTER_NAVIGATION,
} from "../config";
import type {
  SEOPage,
  SEOProduct,
  SEOService,
  SEOSolution,
  SEOArticle,
  SEOCategory,
  SEOAuthor,
  SEOOrganization,
  SEOBrand,
  SEONavigationNode,
} from "../types";
import { collectIds, checkReference, issue, makeResult, type ValidationIssue, type ValidationResult } from "./shared";

// The cross-cutting reference-resolution validator: every relatedX /
// authorId / categoryIds / parentCategory / brand field anywhere in the
// data model must resolve to a real record, and every real record should
// ideally be reachable from somewhere (a page or another entity). Each
// entity type's own intrinsic structure (duplicates, missing images) is
// validated by its own dedicated file — this one checks only whether
// references resolve and whether anything ended up unreachable, so that
// logic exists exactly once rather than once per validator holding a
// foreign key.

export interface RelationshipsInput {
  pages?: readonly SEOPage[];
  products?: readonly SEOProduct[];
  services?: readonly SEOService[];
  solutions?: readonly SEOSolution[];
  blogArticles?: readonly SEOArticle[];
  researchArticles?: readonly SEOArticle[];
  blogCategories?: readonly SEOCategory[];
  researchCategories?: readonly SEOCategory[];
  authors?: readonly SEOAuthor[];
  organization?: SEOOrganization;
  brands?: readonly SEOBrand[];
  primaryNavigation?: readonly SEONavigationNode[];
  footerNavigation?: readonly SEONavigationNode[];
}

function detectCategoryCycles(categories: readonly SEOCategory[]): string[][] {
  const cycles: string[][] = [];
  const state = new Map<string, "visiting" | "done">();
  const byId = new Map(categories.map((c) => [c.id, c] as const));

  function visit(id: string, path: readonly string[]): void {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") {
      const cycleStart = path.indexOf(id);
      cycles.push([...path.slice(cycleStart), id]);
      return;
    }
    state.set(id, "visiting");
    const parent = byId.get(id)?.parentCategory;
    if (parent !== undefined) visit(parent, [...path, id]);
    state.set(id, "done");
  }

  for (const category of categories) visit(category.id, []);
  return cycles;
}

function flattenNav(nodes: readonly SEONavigationNode[]): SEONavigationNode[] {
  const result: SEONavigationNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children) result.push(...flattenNav(node.children));
  }
  return result;
}

/**
 * "/index.html" (the nav config's real, literal root link) and "/" (the
 * page registry's real, literal root path) refer to the same resource —
 * the same equivalence a static file server applies — but are not
 * string-equal. Without this normalization the home page would be
 * misreported as unreachable from navigation, which isn't true.
 */
function normalizePath(path: string): string {
  return path === "/index.html" ? "/" : path;
}

export function validateRelationships(input: RelationshipsInput = {}): ValidationResult {
  const pages = input.pages ?? PAGES;
  const products = input.products ?? PRODUCTS;
  const services = input.services ?? SERVICES;
  const solutions = input.solutions ?? SOLUTIONS;
  const blogArticles = input.blogArticles ?? BLOG_ARTICLES;
  const researchArticles = input.researchArticles ?? RESEARCH_ARTICLES;
  const blogCategories = input.blogCategories ?? BLOG_CATEGORIES;
  const researchCategories = input.researchCategories ?? RESEARCH_CATEGORIES;
  const authors = input.authors ?? AUTHORS;
  const organization = input.organization ?? ORGANIZATION;
  const brands = input.brands ?? BRANDS;
  const primaryNavigation = input.primaryNavigation ?? PRIMARY_NAVIGATION;
  const footerNavigation = input.footerNavigation ?? FOOTER_NAVIGATION;

  const issues: ValidationIssue[] = [];

  const productIds = collectIds(products, (p) => p.id);
  const serviceIds = collectIds(services, (s) => s.id);
  const solutionIds = collectIds(solutions, (s) => s.id);
  const authorIds = collectIds(authors, (a) => a.id);
  const brandIds = collectIds(brands, (b) => b.id);
  const blogCategoryIds = collectIds(blogCategories, (c) => c.id);
  const researchCategoryIds = collectIds(researchCategories, (c) => c.id);
  const blogArticleIds = collectIds(blogArticles, (a) => a.id);
  const researchArticleIds = collectIds(researchArticles, (a) => a.id);
  const anyEntityIds = new Set([...productIds, ...serviceIds, ...solutionIds, ...blogArticleIds, ...researchArticleIds]);

  // Forward resolution: every reference must point at something real.
  for (const page of pages) {
    for (const refId of page.relatedEntityIds ?? []) {
      const found = checkReference(refId, anyEntityIds, "PAGE_RELATED_ENTITY_UNRESOLVED", (id) => `Page "${page.id}" references unknown related entity "${id}"`, page.id);
      if (found) issues.push(found);
    }
  }
  for (const product of products) {
    for (const refId of product.relatedServices ?? []) {
      const found = checkReference(refId, serviceIds, "PRODUCT_RELATED_SERVICE_UNRESOLVED", (id) => `Product "${product.id}" references unknown service "${id}"`, product.id);
      if (found) issues.push(found);
    }
    for (const refId of product.relatedSolutions ?? []) {
      const found = checkReference(refId, solutionIds, "PRODUCT_RELATED_SOLUTION_UNRESOLVED", (id) => `Product "${product.id}" references unknown solution "${id}"`, product.id);
      if (found) issues.push(found);
    }
  }
  for (const service of services) {
    for (const refId of service.relatedProducts ?? []) {
      const found = checkReference(refId, productIds, "SERVICE_RELATED_PRODUCT_UNRESOLVED", (id) => `Service "${service.id}" references unknown product "${id}"`, service.id);
      if (found) issues.push(found);
    }
    for (const refId of service.relatedSolutions ?? []) {
      const found = checkReference(refId, solutionIds, "SERVICE_RELATED_SOLUTION_UNRESOLVED", (id) => `Service "${service.id}" references unknown solution "${id}"`, service.id);
      if (found) issues.push(found);
    }
  }
  for (const solution of solutions) {
    for (const refId of solution.relatedProducts ?? []) {
      const found = checkReference(refId, productIds, "SOLUTION_RELATED_PRODUCT_UNRESOLVED", (id) => `Solution "${solution.id}" references unknown product "${id}"`, solution.id);
      if (found) issues.push(found);
    }
    for (const refId of solution.relatedServices ?? []) {
      const found = checkReference(refId, serviceIds, "SOLUTION_RELATED_SERVICE_UNRESOLVED", (id) => `Solution "${solution.id}" references unknown service "${id}"`, solution.id);
      if (found) issues.push(found);
    }
  }
  for (const article of blogArticles) {
    const authorFound = checkReference(article.authorId, authorIds, "ARTICLE_AUTHOR_UNRESOLVED", (id) => `Article "${article.id}" references unknown author "${id}"`, article.id);
    if (authorFound) issues.push(authorFound);
    for (const refId of article.categoryIds ?? []) {
      const found = checkReference(refId, blogCategoryIds, "ARTICLE_CATEGORY_UNRESOLVED", (id) => `Article "${article.id}" references unknown blog category "${id}"`, article.id);
      if (found) issues.push(found);
    }
  }
  for (const article of researchArticles) {
    const authorFound = checkReference(article.authorId, authorIds, "ARTICLE_AUTHOR_UNRESOLVED", (id) => `Article "${article.id}" references unknown author "${id}"`, article.id);
    if (authorFound) issues.push(authorFound);
    for (const refId of article.categoryIds ?? []) {
      const found = checkReference(refId, researchCategoryIds, "ARTICLE_CATEGORY_UNRESOLVED", (id) => `Article "${article.id}" references unknown research category "${id}"`, article.id);
      if (found) issues.push(found);
    }
  }
  for (const [namespace, categories] of [
    ["blog", blogCategories],
    ["research", researchCategories],
  ] as const) {
    const ids = collectIds(categories, (c) => c.id);
    for (const category of categories) {
      const found = checkReference(category.parentCategory, ids, "CATEGORY_PARENT_UNRESOLVED", (id) => `${namespace} category "${category.id}" references unknown parent category "${id}"`, category.id);
      if (found) issues.push(found);
    }
    for (const cycle of detectCategoryCycles(categories)) {
      issues.push(issue("error", "CATEGORY_CYCLE", `Circular parentCategory chain in ${namespace} categories: ${cycle.join(" -> ")}`, cycle.join(" -> ")));
    }
  }
  const brandFound = checkReference(organization.brand, brandIds, "ORGANIZATION_BRAND_UNRESOLVED", (id) => `Organization "${organization.id}" references unknown brand "${id}"`, organization.id);
  if (brandFound) issues.push(brandFound);

  // Reverse reachability: orphan pages (no nav path leads to them) and
  // unused entities (nothing's relatedEntityIds/relatedX ever names them).
  const navPaths = new Set([...flattenNav(primaryNavigation), ...flattenNav(footerNavigation)].map((n) => n.path).filter((p): p is string => p !== undefined).map(normalizePath));
  for (const page of pages) {
    if (!navPaths.has(normalizePath(page.path))) {
      issues.push(issue("warning", "PAGE_ORPHANED_FROM_NAVIGATION", `Page "${page.id}" (${page.path}) has no primary or footer navigation entry pointing to it`, page.id));
    }
  }

  const referencedTargets = new Set<string>();
  for (const page of pages) for (const id of page.relatedEntityIds ?? []) referencedTargets.add(id);
  for (const product of products) for (const id of product.relatedServices ?? []) referencedTargets.add(id);
  for (const product of products) for (const id of product.relatedSolutions ?? []) referencedTargets.add(id);
  for (const service of services) for (const id of service.relatedProducts ?? []) referencedTargets.add(id);
  for (const service of services) for (const id of service.relatedSolutions ?? []) referencedTargets.add(id);
  for (const solution of solutions) for (const id of solution.relatedProducts ?? []) referencedTargets.add(id);
  for (const solution of solutions) for (const id of solution.relatedServices ?? []) referencedTargets.add(id);

  for (const product of products) {
    if (!referencedTargets.has(product.id)) issues.push(issue("info", "ENTITY_UNUSED", `Product "${product.id}" is never referenced by any page's relatedEntityIds or another entity's relatedX field`, product.id));
  }
  for (const service of services) {
    if (!referencedTargets.has(service.id)) issues.push(issue("info", "ENTITY_UNUSED", `Service "${service.id}" is never referenced by any page's relatedEntityIds or another entity's relatedX field`, service.id));
  }
  for (const solution of solutions) {
    if (!referencedTargets.has(solution.id)) issues.push(issue("info", "ENTITY_UNUSED", `Solution "${solution.id}" is never referenced by any page's relatedEntityIds or another entity's relatedX field`, solution.id));
  }
  for (const article of blogArticles) {
    if (!referencedTargets.has(article.id)) issues.push(issue("info", "ENTITY_UNUSED", `Article "${article.id}" is never referenced by any page's relatedEntityIds`, article.id));
  }

  return makeResult("validateRelationships", issues);
}
