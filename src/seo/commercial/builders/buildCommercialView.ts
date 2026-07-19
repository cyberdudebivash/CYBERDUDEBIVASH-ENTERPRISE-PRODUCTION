import { COMMERCIAL_PROFILES } from "../config/commercialProfiles.config";
import { resolveCommercialEntity } from "./resolveCommercialEntity";
import type { CommercialProfile, CommercialEntityView } from "../config/types";

// buildCommercialView — merges one CommercialProfile with its real,
// live entity record. Prefers the profile's own value for the six
// SEOCommercialFields this phase may populate, falling back to the
// real entity's own value (in case a future profile is added for an
// entity that already had one or two of these set); never duplicates
// searchIntent/funnelStage/primaryKeyword/secondaryKeywords, which
// always come from the real entity.

export function buildCommercialView(profile: CommercialProfile): CommercialEntityView | undefined {
  const resolved = resolveCommercialEntity(profile.entityKind, profile.entityId);
  if (!resolved) return undefined;
  const { commercial } = resolved;
  return {
    id: resolved.id,
    kind: profile.entityKind,
    name: resolved.name,
    description: resolved.description,
    searchIntent: commercial.searchIntent,
    funnelStage: commercial.funnelStage,
    primaryKeyword: commercial.primaryKeyword,
    secondaryKeywords: commercial.secondaryKeywords,
    audience: profile.audience ?? commercial.audience,
    commercialPriority: profile.commercialPriority ?? commercial.commercialPriority,
    businessObjective: profile.businessObjective ?? commercial.businessObjective,
    conversionGoal: profile.conversionGoal ?? commercial.conversionGoal,
    primaryCta: profile.primaryCta ?? commercial.primaryCta,
    secondaryCta: profile.secondaryCta ?? commercial.secondaryCta,
    buyerPersona: profile.buyerPersona,
    valueProposition: profile.valueProposition,
    customerPainPoints: profile.customerPainPoints,
    customerOutcomes: profile.customerOutcomes,
    primaryIndustry: profile.primaryIndustry,
    targetCompanySize: profile.targetCompanySize,
    targetGeography: profile.targetGeography,
    buyingStage: profile.buyingStage,
    trustSignals: profile.trustSignals,
    competitivePosition: profile.competitivePosition,
    contentClassification: profile.contentClassification,
    keywords: profile.keywords,
  };
}

/** Every profile that resolves to a real entity — silently drops one that doesn't rather than throwing, since a future profile added for an id that gets removed from config is a data-hygiene concern for CommercialValidator to flag, not a reason for this pure builder to error. */
export function buildAllCommercialViews(profiles: readonly CommercialProfile[] = COMMERCIAL_PROFILES): CommercialEntityView[] {
  const views: CommercialEntityView[] = [];
  for (const profile of profiles) {
    const view = buildCommercialView(profile);
    if (view) views.push(view);
  }
  return views;
}
