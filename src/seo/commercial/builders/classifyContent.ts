import type { FunnelStage } from "../../types/commercial";
import type { ContentClassification } from "../config/types";

// classifyContent — respects a profile's own explicit
// contentClassification when set; otherwise falls back to a direct,
// deterministic mapping from the entity's existing (real) funnelStage.
// Never guesses independently of real data — an entity with no
// explicit classification and no funnelStage gets [], not an invented
// default.

const FUNNEL_TO_CLASSIFICATION: Record<FunnelStage, ContentClassification> = {
  awareness: "awareness",
  consideration: "consideration",
  decision: "decision",
  retention: "retention",
};

export function deriveContentClassification(explicit: readonly ContentClassification[] | undefined, funnelStage: FunnelStage | undefined): ContentClassification[] {
  if (explicit && explicit.length > 0) return [...explicit];
  if (funnelStage) return [FUNNEL_TO_CLASSIFICATION[funnelStage]];
  return [];
}
