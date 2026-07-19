import type { CommercialPriority, SearchIntent, FunnelStage, SEOCallToAction } from "../../types/commercial";

// Owns: the Commercial Intelligence Layer's own shapes. An additive
// overlay, joined to the real Phase 1.0 entities by (entityKind,
// entityId) — never a modification of SEOPage/SEOProduct/SEOService/
// SEOSolution/SEOArticle themselves. Composes CommercialPriority and
// SEOCallToAction (Phase 1.0) rather than redeclaring them; does NOT
// import SearchIntent/FunnelStage because this phase's profiles never
// redeclare those two fields at all — see CommercialProfile's own
// header comment for why.

export type CommercialEntityKind = "page" | "product" | "service" | "solution" | "article";

export type TargetCompanySize = "startup" | "smb" | "mid-market" | "enterprise";

/** A standard B2B procurement-process stage — deliberately more granular than (and complementary to) SEOCommercialFields.funnelStage's coarser awareness/consideration/decision/retention. */
export type BuyingStage = "problem-identification" | "solution-exploration" | "vendor-evaluation" | "negotiation" | "renewal";

/** No repository evidence supports a finer-grained enum than this (no competitor analysis exists anywhere in this codebase — see documentation/COMMERCIAL_MODEL.md's Known Risks). Left as a coarse, defensible 4-value scale rather than invented further. */
export type CompetitivePosition = "leader" | "challenger" | "niche" | "emerging";

export type ContentClassification =
  | "awareness"
  | "consideration"
  | "decision"
  | "retention"
  | "support"
  | "training"
  | "research"
  | "threat-intelligence"
  | "documentation"
  | "learning";

export interface BuyerPersona {
  name: string;
  role: string;
  painPoints: string[];
  goals: string[];
}

/** A recognized framework/standard/methodology this entity's own description already cites (e.g. "ISO 27001," "MITRE ATT&CK," "OWASP LLM Top 10") — never a generic, unverifiable claim like "24/7 support." */
export interface TrustSignal {
  type: string;
  description: string;
}

/**
 * Extends primaryKeyword/secondaryKeywords (Phase 1.0, already
 * populated for every entity this phase touches) with the additional
 * keyword facets this phase asks for. Every array here must trace to
 * text already present in the entity's own description/features — see
 * documentation/KEYWORD_STRATEGY.md.
 */
export interface KeywordIntelligence {
  supportingKeywords?: string[];
  semanticKeywords?: string[];
  entityKeywords?: string[];
  commercialKeywords?: string[];
  longTailKeywords?: string[];
  competitorKeywords?: string[];
}

/**
 * One entity's commercial enrichment record. Fields split into two
 * groups:
 *
 * 1. Fields SEOCommercialFields (Phase 1.0) already declares
 *    (`businessObjective`, `commercialPriority`, `audience`,
 *    `conversionGoal`, `primaryCta`, `secondaryCta`) — populated here
 *    ONLY for the specific entities where the real config array leaves
 *    them unset today (verified per-entity before writing
 *    config/commercialProfiles.config.ts, not assumed). `searchIntent`
 *    and `funnelStage` are deliberately never redeclared here: every
 *    pilot entity (about/services/products) already has both fields
 *    populated in its real config record, so redeclaring them would be
 *    a second, driftable copy of already-correct data — exactly what
 *    "never duplicate business logic/data" rules out.
 * 2. Fields this phase introduces that have no home anywhere in Phase
 *    1.0's type system at all.
 */
export interface CommercialProfile {
  entityId: string;
  entityKind: CommercialEntityKind;

  businessObjective?: string;
  commercialPriority?: CommercialPriority;
  audience?: string[];
  conversionGoal?: string;
  primaryCta?: SEOCallToAction;
  secondaryCta?: SEOCallToAction;

  buyerPersona?: BuyerPersona[];
  valueProposition?: string;
  customerPainPoints?: string[];
  customerOutcomes?: string[];
  primaryIndustry?: string;
  targetCompanySize?: TargetCompanySize[];
  targetGeography?: string[];
  buyingStage?: BuyingStage;
  trustSignals?: TrustSignal[];
  competitivePosition?: CompetitivePosition;
  contentClassification?: ContentClassification[];
  keywords?: KeywordIntelligence;
}

/**
 * The resolved, merged view builders/buildCommercialView.ts produces:
 * the real entity's own name/description/searchIntent/funnelStage/
 * keywords (Phase 1.0, read live — never copied into
 * CommercialProfile) combined with this phase's profile fields.
 * `audience`/`commercialPriority`/`businessObjective`/`conversionGoal`/
 * `primaryCta`/`secondaryCta` prefer the profile's value and fall back
 * to the real entity's own value, since a handful of pilot entities
 * (see COMMERCIAL_MODEL.md) already had one or two of these set before
 * this phase touched anything.
 */
export interface CommercialEntityView {
  id: string;
  kind: CommercialEntityKind;
  name: string;
  description: string;
  searchIntent?: SearchIntent;
  funnelStage?: FunnelStage;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  audience?: string[];
  commercialPriority?: CommercialPriority;
  businessObjective?: string;
  conversionGoal?: string;
  primaryCta?: SEOCallToAction;
  secondaryCta?: SEOCallToAction;
  buyerPersona?: BuyerPersona[];
  valueProposition?: string;
  customerPainPoints?: string[];
  customerOutcomes?: string[];
  primaryIndustry?: string;
  targetCompanySize?: TargetCompanySize[];
  targetGeography?: string[];
  buyingStage?: BuyingStage;
  trustSignals?: TrustSignal[];
  competitivePosition?: CompetitivePosition;
  contentClassification?: ContentClassification[];
  keywords?: KeywordIntelligence;
}
