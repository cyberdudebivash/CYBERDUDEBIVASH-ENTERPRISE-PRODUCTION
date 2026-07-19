import { isMissing } from "../../validators/shared";
import type { CommercialEntityView } from "../config/types";
import type { RelationshipEnrichment } from "../recommendations/relationshipEnrichment";

// readinessScore — deterministic only, per this phase's explicit
// instruction ("Do NOT use AI. Do NOT use probabilistic ranking.").
// Every number below is a plain field-presence ratio or a fixed
// per-error penalty; nothing here reads a clock, a random source, or
// any external service. The same inputs always produce the same score.

export interface EntityReadinessScore {
  entityId: string;
  entityKind: string;
  /** % of the 6 pre-existing SEOCommercialFields this phase may fill in (audience, businessObjective, commercialPriority, conversionGoal, primaryCta, secondaryCta). */
  fieldCompleteness: number;
  /** % of the 6 real, config-backed Phase 1.3 relationship kinds with at least one recommendation. */
  relationshipCompleteness: number;
  /** % of the 12 net-new commercial-intelligence facets this phase introduces (11 profile fields + keyword intelligence). */
  commercialCompleteness: number;
  /** 100 minus a fixed penalty per error-severity validation issue found for this entity, floored at 0. */
  validationHealth: number;
  /** Equal-weighted (25% each) average of the four dimensions above. */
  overallScore: number;
}

const FIELD_COMPLETENESS_KEYS: ReadonlyArray<keyof CommercialEntityView> = ["audience", "businessObjective", "commercialPriority", "conversionGoal", "primaryCta", "secondaryCta"];

const COMMERCIAL_COMPLETENESS_KEYS: ReadonlyArray<keyof CommercialEntityView> = [
  "buyerPersona",
  "valueProposition",
  "customerPainPoints",
  "customerOutcomes",
  "primaryIndustry",
  "targetCompanySize",
  "targetGeography",
  "buyingStage",
  "trustSignals",
  "competitivePosition",
  "contentClassification",
];

const ERROR_PENALTY = 20;

function percentPresent(view: CommercialEntityView, keys: readonly (keyof CommercialEntityView)[]): number {
  const present = keys.filter((key) => !isMissing(view[key])).length;
  return Math.round((present / keys.length) * 100);
}

function hasAnyKeywordFacet(view: CommercialEntityView): boolean {
  const k = view.keywords;
  if (!k) return false;
  return !isMissing(k.supportingKeywords) || !isMissing(k.semanticKeywords) || !isMissing(k.entityKeywords) || !isMissing(k.commercialKeywords) || !isMissing(k.longTailKeywords) || !isMissing(k.competitorKeywords);
}

function computeCommercialCompleteness(view: CommercialEntityView): number {
  const presentCount = COMMERCIAL_COMPLETENESS_KEYS.filter((key) => !isMissing(view[key])).length + (hasAnyKeywordFacet(view) ? 1 : 0);
  return Math.round((presentCount / (COMMERCIAL_COMPLETENESS_KEYS.length + 1)) * 100);
}

function computeRelationshipCompleteness(enrichment: RelationshipEnrichment): number {
  const kinds = [
    enrichment.relatedProducts,
    enrichment.relatedServices,
    enrichment.relatedSolutions,
    enrichment.relatedArticles,
    enrichment.relatedCategories,
    enrichment.relatedPages,
  ];
  const populated = kinds.filter((k) => k.length > 0).length;
  return Math.round((populated / kinds.length) * 100);
}

export function computeReadinessScore(view: CommercialEntityView, enrichment: RelationshipEnrichment, errorCount: number): EntityReadinessScore {
  const fieldCompleteness = percentPresent(view, FIELD_COMPLETENESS_KEYS);
  const commercialCompleteness = computeCommercialCompleteness(view);
  const relationshipCompleteness = computeRelationshipCompleteness(enrichment);
  const validationHealth = Math.max(0, 100 - errorCount * ERROR_PENALTY);
  const overallScore = Math.round((fieldCompleteness + relationshipCompleteness + commercialCompleteness + validationHealth) / 4);
  return { entityId: view.id, entityKind: view.kind, fieldCompleteness, relationshipCompleteness, commercialCompleteness, validationHealth, overallScore };
}
