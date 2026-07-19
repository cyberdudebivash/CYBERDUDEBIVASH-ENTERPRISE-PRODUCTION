import type { SEOPage } from "../types/page";
import { normalizeUrl, dedupeAlternates } from "./metadataNormalizer";
import type { MetadataAlternateUrl } from "./types";

// CanonicalBuilder — resolves every page's canonical URL and alternate
// (hreflang) URLs to absolute, normalized form. Falls back to the
// page's own `path` when `canonical` is unset (item.html today) so
// every page gets a canonical as a byproduct of going through one
// builder — see SEO_DATA_MODEL.md's documented intent for this phase —
// rather than a one-off patch to item.html itself.

export interface BuiltCanonical {
  canonical: string;
  alternates: MetadataAlternateUrl[];
}

export function buildCanonical(page: SEOPage): BuiltCanonical {
  const path = page.canonical?.path ?? page.path;
  const alternates = page.canonical?.alternates ?? [];
  return {
    canonical: normalizeUrl(path),
    alternates: dedupeAlternates(alternates),
  };
}
