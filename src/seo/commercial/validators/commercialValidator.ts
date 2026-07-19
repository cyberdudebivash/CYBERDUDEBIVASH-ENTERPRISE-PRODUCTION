import { issue, makeResult, isMissing, type ValidationIssue, type ValidationResult } from "../../validators/shared";
import type { CommercialEntityView } from "../config/types";
import type { RelationshipEnrichment } from "../recommendations/relationshipEnrichment";

// commercialValidator — checks the fields this phase's Commercial
// Model introduces (and, on the merged CommercialEntityView, the six
// SEOCommercialFields this phase may have filled in) that Phase 1.0.5's
// existing validateCommercial()/validateCTA() have no way to check,
// since they only ever see the real, unenriched entity, never this
// phase's overlay. Complementary, not duplicative: reports/ calls
// validateCommercial()/validateCTA() directly (Phase 1.0.5's own
// functions, unmodified) for the "before enrichment" baseline, and
// this file for the "after enrichment" picture — see
// documentation/COMMERCIAL_READINESS.md.
//
// `buyerPersona` is checked and reported like every other field, but is
// 0% covered by design across all 12 pilot entities — see
// documentation/COMMERCIAL_MODEL.md's Known Risks for why a named,
// structured persona was judged to require more invention than
// "repository-backed evidence" could support, and audience/
// customerPainPoints/customerOutcomes were populated as the
// evidence-grounded equivalent instead.

const COMMERCIAL_FIELDS: ReadonlyArray<{ key: keyof CommercialEntityView; label: string }> = [
  { key: "audience", label: "Audience" },
  { key: "businessObjective", label: "Business Objective" },
  { key: "commercialPriority", label: "Commercial Priority" },
  { key: "conversionGoal", label: "Conversion Goal" },
  { key: "primaryCta", label: "Primary CTA" },
  { key: "buyerPersona", label: "Buyer Persona" },
  { key: "valueProposition", label: "Value Proposition" },
  { key: "customerPainPoints", label: "Customer Pain Points" },
  { key: "customerOutcomes", label: "Customer Outcomes" },
  { key: "primaryIndustry", label: "Primary Industry" },
  { key: "targetCompanySize", label: "Target Company Size" },
  { key: "targetGeography", label: "Target Geography" },
  { key: "buyingStage", label: "Buying Stage" },
  { key: "trustSignals", label: "Trust Signals" },
  { key: "competitivePosition", label: "Competitive Position" },
  { key: "contentClassification", label: "Content Classification" },
];

function hasAnyKeywordFacet(view: CommercialEntityView): boolean {
  const k = view.keywords;
  if (!k) return false;
  return !isMissing(k.supportingKeywords) || !isMissing(k.semanticKeywords) || !isMissing(k.entityKeywords) || !isMissing(k.commercialKeywords) || !isMissing(k.longTailKeywords) || !isMissing(k.competitorKeywords);
}

export function validateCommercialView(view: CommercialEntityView): ValidationResult {
  const issues: ValidationIssue[] = [];
  for (const field of COMMERCIAL_FIELDS) {
    if (isMissing(view[field.key])) {
      issues.push(
        issue("warning", "COMMERCIAL_INTELLIGENCE_FIELD_MISSING", `Entity "${view.id}" (${view.kind}) is missing "${field.label}" (${String(field.key)})`, view.id),
      );
    }
  }
  if (!hasAnyKeywordFacet(view)) {
    issues.push(issue("warning", "COMMERCIAL_KEYWORD_INTELLIGENCE_MISSING", `Entity "${view.id}" (${view.kind}) has no keyword intelligence facets populated`, view.id));
  }
  return makeResult("validateCommercialView", issues);
}

export function validateAllCommercialViews(views: readonly CommercialEntityView[]): ValidationResult {
  const issues: ValidationIssue[] = [];
  for (const view of views) issues.push(...validateCommercialView(view).issues);
  return makeResult("validateCommercialView", issues);
}

/**
 * The 6 real (config-backed) Phase 1.3 relationship kinds — an entity
 * missing all 6 has zero enrichment. The 7 reserved kinds are
 * deliberately excluded from this check: they are structurally always
 * empty today (no config exists for any of them — see
 * RELATIONSHIP_MAPPING_MATRIX.md), so treating their absence as a
 * "missing relationship" would flag every single entity in the model
 * for a gap this phase has no way to close, which isn't an actionable
 * finding the way a genuinely populatable gap is.
 */
export function validateRelationshipEnrichment(enrichment: RelationshipEnrichment): ValidationResult {
  const issues: ValidationIssue[] = [];
  const realKindsPopulated =
    enrichment.relatedProducts.length > 0 ||
    enrichment.relatedServices.length > 0 ||
    enrichment.relatedSolutions.length > 0 ||
    enrichment.relatedArticles.length > 0 ||
    enrichment.relatedCategories.length > 0 ||
    enrichment.relatedPages.length > 0;
  if (!realKindsPopulated) {
    issues.push(
      issue("warning", "COMMERCIAL_RELATIONSHIP_ENRICHMENT_EMPTY", `Entity "${enrichment.entityId}" (${enrichment.entityKind}) has no relationship recommendations from any config-backed kind`, enrichment.entityId),
    );
  }
  return makeResult("validateRelationshipEnrichment", issues);
}
