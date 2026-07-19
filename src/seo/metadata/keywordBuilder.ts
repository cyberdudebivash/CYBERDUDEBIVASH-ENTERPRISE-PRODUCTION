import type { SEOCommercialFields } from "../types/commercial";
import { normalizeKeywordList } from "./metadataNormalizer";

// KeywordBuilder — combines primaryKeyword + secondaryKeywords into one
// deduplicated, normalized list. Takes SEOCommercialFields directly
// (not just SEOPage) so the same builder applies to any entity that
// carries those fields — products/services/solutions/articles — without
// redeclaring the shape, should a future phase need it beyond pages.

export function buildKeywords(entity: SEOCommercialFields): string[] {
  return normalizeKeywordList([entity.primaryKeyword, ...(entity.secondaryKeywords ?? [])]);
}
