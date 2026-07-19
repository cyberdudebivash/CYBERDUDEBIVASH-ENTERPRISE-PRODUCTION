// Commercial SEO fields (Phase 1.4 groundwork) — owns the vocabulary
// every page AND every content entity (product/service/solution/article)
// shares for keyword targeting, intent, and conversion goals. Composed
// into SEOPage and into the entity types in entities.ts, not duplicated
// in either.

export type SearchIntent = "informational" | "navigational" | "commercial" | "transactional";

export type FunnelStage = "awareness" | "consideration" | "decision" | "retention";

export type CommercialPriority = "critical" | "high" | "medium" | "low";

export interface SEOCallToAction {
  label: string;
  /** Internal path (e.g. "/vciso.html") or a full external URL. */
  path: string;
}

export interface SEOCommercialFields {
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  searchIntent?: SearchIntent;
  audience?: string[];
  businessObjective?: string;
  conversionGoal?: string;
  funnelStage?: FunnelStage;
  primaryCta?: SEOCallToAction;
  secondaryCta?: SEOCallToAction;
  commercialPriority?: CommercialPriority;
}
