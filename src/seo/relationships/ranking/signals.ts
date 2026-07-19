import type { RelationshipSignal } from "../graph/types";

// Fixed, documented weights per signal — deterministic only, per this
// phase's explicit instruction ("No AI scoring. No probabilistic
// ranking."). Every weight is a static constant; nothing here reads a
// clock, a random source, or any external service.
//
// Ordering rationale: `explicit` outranks everything because it's an
// authored, deliberate cross-reference (relatedProducts/relatedServices/
// relatedEntityIds), not an inference. `sharedProduct`/`sharedService`
// (two entities both pointing at the same third entity) outrank
// `sharedKeyword`/`sharedCategory` because they're structural
// relationships already present in the data model's own foreign-key
// fields, not a text-equality coincidence. `sharedKeyword` is
// deliberately not the top signal: two entities sharing a
// primaryKeyword is exactly what Phase 1.0.5's validateKeywords.ts
// flags as *keyword cannibalization* — a real signal worth surfacing,
// but not one to rank above deliberate, authored relationships.
// `commercialPriority` is lowest among populated signals because it's
// a coarse equality match (e.g. both "high" priority), not a topical
// relationship at all.

export const SIGNAL_WEIGHTS: Record<RelationshipSignal, number> = {
  explicit: 100,
  sharedProduct: 50,
  sharedService: 50,
  sharedKeyword: 40,
  sharedCategory: 35,
  sharedIndustry: 30,
  sharedTechnology: 30,
  commercialPriority: 20,
};

export function weightForSignal(signal: RelationshipSignal): number {
  return SIGNAL_WEIGHTS[signal];
}
