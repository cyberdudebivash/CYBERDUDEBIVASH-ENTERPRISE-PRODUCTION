import { PRODUCTS, SERVICES, SOLUTIONS, AUTHORS, BLOG_ARTICLES, PAGES } from "../config";
import type { SEOProduct, SEOService, SEOSolution, SEOAuthor, SEOArticle, SEOPage } from "../types";

// Pure data-access helpers only — no rendering, no metadata/schema
// generation (explicitly out of scope for Phase 1.0). Every function
// here does one thing: find a record by id in an existing config array.

export function getProductById(id: string): SEOProduct | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getServiceById(id: string): SEOService | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function getSolutionById(id: string): SEOSolution | undefined {
  return SOLUTIONS.find((s) => s.id === id);
}

export function getAuthorById(id: string): SEOAuthor | undefined {
  return AUTHORS.find((a) => a.id === id);
}

export function getArticleById(id: string): SEOArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.id === id);
}

export function getPageByPath(path: string): SEOPage | undefined {
  return PAGES.find((p) => p.path === path);
}

export function getPageById(id: string): SEOPage | undefined {
  return PAGES.find((p) => p.id === id);
}
