import type { CanonicalConfig, OpenGraphConfig, TwitterCardConfig, SEOBreadcrumb } from "./common";
import type { SEOCommercialFields } from "./commercial";
import type { SchemaDefinition } from "./schema";

// Owns: the per-page record — the thing seo.config.ts is a registry
// of. Composes every other type file rather than redeclaring any of
// their fields.

export type RobotsDirective = "index,follow" | "noindex,follow" | "index,nofollow" | "noindex,nofollow";

export interface SEOPage extends SEOCommercialFields {
  id: string;
  /** Relative path this record describes, e.g. "/about.html" — matches `canonical.path` for the common case of a page being its own canonical target. */
  path: string;
  title: string;
  /** Optional because at least one real page (item.html) genuinely has none today — a confirmed gap (see SEO_FOUNDATION.md), not a value to invent here. */
  description?: string;
  /** Optional for the same reason: item.html has no canonical tag live today (SEO_FOUNDATION.md / SEO_ARCHITECTURE.md, still unresolved). Phase 1.1's generator fixes this as a byproduct of every page sharing one generator, not a value guessed in this data model. */
  canonical?: CanonicalConfig;
  openGraph: OpenGraphConfig;
  twitterCard: TwitterCardConfig;
  breadcrumbs?: SEOBreadcrumb[];
  schemas?: SchemaDefinition[];
  robots?: RobotsDirective;
  /** Ids of related products/services/solutions/articles elsewhere in the data model — feeds Phase 1.3's internal-linking engine. */
  relatedEntityIds?: string[];
}
