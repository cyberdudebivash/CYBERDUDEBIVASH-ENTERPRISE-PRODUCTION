import { COMMERCIAL_PROFILES } from "../../../commercial/config/commercialProfiles.config";
import { buildCommercialView } from "../../../commercial/builders/buildCommercialView";
import { validateCommercialView } from "../../../commercial/validators/commercialValidator";
import type { CommercialEntityView } from "../../../commercial/config/types";
import type { SEOPage } from "../../../types/page";
import type { ValidationIssue } from "../../../validators/shared";
import { PipelineError } from "../../contracts/errors";

export interface CommercialStageResult {
  commercial: CommercialEntityView | undefined;
  warnings: ValidationIssue[];
}

// CommercialStage — composes Phase 1.4's Commercial Intelligence Layer.
// Unlike every other stage, `undefined` is a normal, non-error result
// here: the layer is an additive overlay over 12 pilot entities only
// (about, 6 services, 5 products — see COMMERCIAL_MODEL.md), so most
// pages have no CommercialProfile and this stage returns `undefined`
// for them by design, not by failure. A PipelineError is only thrown
// when a profile DOES exist for this page but fails to resolve or
// fails validation — both genuine data-integrity problems, per
// buildCommercialView.ts's own header comment.

export function runCommercialStage(page: SEOPage): CommercialStageResult {
  const profile = COMMERCIAL_PROFILES.find((p) => p.entityKind === "page" && p.entityId === page.id);
  if (!profile) {
    return { commercial: undefined, warnings: [] };
  }

  const commercial = buildCommercialView(profile);
  if (!commercial) {
    throw new PipelineError(`commercial stage failed for page "${page.id}": its CommercialProfile references an entity that no longer resolves`, "commercial");
  }

  const validation = validateCommercialView(commercial);
  const errors = validation.issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new PipelineError(
      `commercial stage failed for page "${page.id}": ${errors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`,
      "commercial",
    );
  }

  const warnings = validation.issues.filter((issue) => issue.severity === "warning");
  return { commercial, warnings };
}
