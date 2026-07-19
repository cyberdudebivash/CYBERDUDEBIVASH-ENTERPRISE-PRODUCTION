import { normalizeKeywordList } from "../../metadata";
import type { KeywordIntelligence } from "../config/types";

// keywordIntelligence — merges Phase 1.0's primaryKeyword/
// secondaryKeywords with this phase's KeywordIntelligence facets into
// one deduplicated, normalized master list. Reuses Phase 1.1's
// normalizeKeywordList (trim, drop blanks, case-insensitive dedupe,
// keep first-seen casing) rather than a second dedup implementation —
// "never duplicate business logic."

export function mergeAllKeywords(primaryKeyword: string | undefined, secondaryKeywords: readonly string[] | undefined, intelligence: KeywordIntelligence | undefined): string[] {
  return normalizeKeywordList([
    primaryKeyword,
    ...(secondaryKeywords ?? []),
    ...(intelligence?.supportingKeywords ?? []),
    ...(intelligence?.semanticKeywords ?? []),
    ...(intelligence?.entityKeywords ?? []),
    ...(intelligence?.commercialKeywords ?? []),
    ...(intelligence?.longTailKeywords ?? []),
    ...(intelligence?.competitorKeywords ?? []),
  ]);
}
