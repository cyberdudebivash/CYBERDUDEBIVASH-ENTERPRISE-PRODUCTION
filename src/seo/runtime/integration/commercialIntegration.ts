import { COMMERCIAL_PROFILES, buildCommercialView, validateCommercialView } from "../../commercial";
import type { CommercialEntityView } from "../../commercial";
import { errorSeverity } from "./classifyIssues";
import { ValidationError } from "../contracts/errors";

// commercialIntegration — resolves a page's commercial view IF a
// Phase 1.4 CommercialProfile exists for (entityKind: "page",
// entityId: pageId). Today that's only "about" among all 17 pages
// (COMMERCIAL_MODEL.md's pilot scope was about + 6 services + 5
// products, and services/products are separate CommercialEntityKinds
// with no pageId of their own — they are never reachable through
// generateSEO(pageId) at all). Every other page legitimately having no
// commercial view is real, evidenced platform state, not a runtime
// defect — so this returns `undefined`, never throws, for those pages.

export function integrateCommercial(pageId: string): CommercialEntityView | undefined {
  const profile = COMMERCIAL_PROFILES.find((p) => p.entityKind === "page" && p.entityId === pageId);
  if (!profile) return undefined;

  const view = buildCommercialView(profile);
  if (!view) return undefined;

  const errors = errorSeverity(validateCommercialView(view).issues);
  if (errors.length > 0) {
    throw new ValidationError(`integrateCommercial("${pageId}"): ${errors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`);
  }
  return view;
}
