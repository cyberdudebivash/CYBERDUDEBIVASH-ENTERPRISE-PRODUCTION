import type { SEOImage } from "./common";
import type { SEOCommercialFields } from "./commercial";

// Owns: products, services, solutions, authors, categories, and
// articles — every content/commerce entity the Knowledge Graph and
// internal-linking engine will eventually connect. Product/Service/
// Solution share a base shape (extended, not copy-pasted) because
// they're genuinely different domain concepts with overlapping fields,
// not candidates for a single discriminated type.

interface SEOEntityBase {
  id: string;
  name: string;
  description: string;
  /** Optional because not every real entity has a stable indexable URL yet — e.g. services.config.ts's "mssp" entry has no matching static page (see SEO_ARCHITECTURE.md Finding 1's redirect-map evidence). Omit rather than invent a URL that doesn't exist. */
  url?: string;
  image?: SEOImage;
  category?: string;
  keywords?: string[];
}

/** A live platform/subdomain in the ecosystem (Sentinel APEX, AI Security Hub, etc.) — see products.config.ts. */
export interface SEOProduct extends SEOEntityBase, SEOCommercialFields {
  /** Illustrative UI latency figure shown on the homepage portal cards — not an authoritative SLA metric. */
  responseTimeMs?: number;
  relatedServices?: string[];
  relatedSolutions?: string[];
}

export interface SEOServiceTier {
  name: string;
  price: string;
  subtitle?: string;
  features: string[];
}

/** A managed/professional service (Managed SOC, vCISO Advisory, etc.) — see services.config.ts. */
export interface SEOService extends SEOEntityBase, SEOCommercialFields {
  pricingTiers?: SEOServiceTier[];
  relatedProducts?: string[];
  relatedSolutions?: string[];
}

/** A packaged, self-serve downloadable (the Gumroad kits) — see solutions.config.ts. */
export interface SEOSolution extends SEOEntityBase, SEOCommercialFields {
  price?: string;
  format?: "digital-download" | "toolkit" | "template" | "guide";
  relatedProducts?: string[];
  relatedServices?: string[];
}

export interface SEOAuthor {
  id: string;
  name: string;
  role?: string;
  bio?: string;
  image?: SEOImage;
  sameAs?: string[];
  url?: string;
}

export interface SEOCategory {
  id: string;
  name: string;
  description?: string;
  /** References another SEOCategory.id, for a category hierarchy. */
  parentCategory?: string;
}

export interface SEOArticle extends SEOCommercialFields {
  id: string;
  title: string;
  description: string;
  url: string;
  /** References an SEOAuthor.id in authors.config.ts. */
  authorId: string;
  categoryIds?: string[];
  publishedDate?: string;
  modifiedDate?: string;
  image?: SEOImage;
  keywords?: string[];
}
