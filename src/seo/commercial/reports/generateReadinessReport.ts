import { validateCommercial, validateCTA } from "../../validators";
import type { ValidationResult } from "../../validators/shared";
import { buildAllCommercialViews } from "../builders/buildCommercialView";
import { buildRelationshipEnrichment } from "../recommendations/relationshipEnrichment";
import { validateCommercialView, validateAllCommercialViews, validateRelationshipEnrichment } from "../validators/commercialValidator";
import { computeReadinessScore, type EntityReadinessScore } from "./readinessScore";

// generateCommercialReadinessReport — the pure orchestrator. Composes
// Phase 1.0.5's own validateCommercial()/validateCTA() (called
// directly, not reimplemented) for the "before enrichment" baseline
// against the whole real data model, alongside this phase's own
// validation and scoring for the 12 pilot entities' enriched view.
// Reads only; writes nothing to disk — COMMERCIAL_READINESS_REPORT.md
// is produced by running this once (via a throwaway script, not
// committed) and transcribing its real output, the same way every
// prior phase's own report was produced.

export interface CommercialReadinessReport {
  generatedAt: string;
  pilotEntityCount: number;
  scores: EntityReadinessScore[];
  averageScore: number;
  /** Phase 1.0.5's own validators, run fresh against the whole (unfiltered) real data model — the "before this phase" picture. */
  baseline: {
    commercial: ValidationResult;
    cta: ValidationResult;
  };
  /** This phase's own checks against the 12 enriched pilot entities — the "after this phase" picture. */
  enrichment: ValidationResult;
  relationshipEnrichment: ValidationResult[];
}

export function generateCommercialReadinessReport(): CommercialReadinessReport {
  const views = buildAllCommercialViews();
  const scores: EntityReadinessScore[] = [];
  const relationshipEnrichment: ValidationResult[] = [];

  for (const view of views) {
    const enrichment = buildRelationshipEnrichment(view.kind, view.id);
    const viewValidation = validateCommercialView(view);
    const relValidation = validateRelationshipEnrichment(enrichment);
    relationshipEnrichment.push(relValidation);
    const errorCount = [...viewValidation.issues, ...relValidation.issues].filter((i) => i.severity === "error").length;
    scores.push(computeReadinessScore(view, enrichment, errorCount));
  }

  const averageScore = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length) : 0;

  return {
    generatedAt: new Date().toISOString(),
    pilotEntityCount: views.length,
    scores,
    averageScore,
    baseline: { commercial: validateCommercial(), cta: validateCTA() },
    enrichment: validateAllCommercialViews(views),
    relationshipEnrichment,
  };
}
