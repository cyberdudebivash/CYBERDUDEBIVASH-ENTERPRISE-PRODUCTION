import { PAGES, PRODUCTS, SERVICES, SOLUTIONS, BLOG_ARTICLES } from "../../config";
import type { SEOCommercialFields } from "../../types/commercial";
import type { CommercialEntityKind } from "../config/types";

/** Every real entity kind extends SEOCommercialFields (Phase 1.0), so this is the one shape every kind can be normalized down to for lookup purposes — name/description differ per kind (page.title vs product.name, etc.), commercial fields don't. */
export interface ResolvedCommercialEntity {
  id: string;
  name: string;
  description: string;
  commercial: SEOCommercialFields;
}

// resolveCommercialEntity — the one place a (kind, id) pair is resolved
// back to its real Phase 1.0 record, reading directly rather than
// duplicating any field.

export function resolveCommercialEntity(kind: CommercialEntityKind, id: string): ResolvedCommercialEntity | undefined {
  switch (kind) {
    case "page": {
      const page = PAGES.find((p) => p.id === id);
      return page ? { id: page.id, name: page.title, description: page.description ?? "", commercial: page } : undefined;
    }
    case "product": {
      const product = PRODUCTS.find((p) => p.id === id);
      return product ? { id: product.id, name: product.name, description: product.description, commercial: product } : undefined;
    }
    case "service": {
      const service = SERVICES.find((s) => s.id === id);
      return service ? { id: service.id, name: service.name, description: service.description, commercial: service } : undefined;
    }
    case "solution": {
      const solution = SOLUTIONS.find((s) => s.id === id);
      return solution ? { id: solution.id, name: solution.name, description: solution.description, commercial: solution } : undefined;
    }
    case "article": {
      const article = BLOG_ARTICLES.find((a) => a.id === id);
      return article ? { id: article.id, name: article.title, description: article.description, commercial: article } : undefined;
    }
  }
}
