import type { SEOPage } from "../types/page";
import { SITE_CONFIG } from "../config/site.config";
import { buildCanonical } from "./canonicalBuilder";
import { normalizeImage } from "./metadataNormalizer";
import type { GeneratedOpenGraph } from "./types";

// OpenGraphBuilder — resolves a page's OpenGraphConfig into absolute,
// normalized output plus the resolved `og:url`. `og:url` has no
// authored field of its own in OpenGraphConfig (see types.ts) — it's
// always the page's own canonical, sourced from CanonicalBuilder
// rather than re-deriving the same fallback logic here.

export function buildOpenGraph(page: SEOPage): GeneratedOpenGraph {
  const og = page.openGraph;
  return {
    title: og.title || page.title,
    description: og.description || page.description || "",
    type: og.type,
    image: normalizeImage(og.image),
    siteName: og.siteName ?? SITE_CONFIG.siteName,
    locale: og.locale ?? SITE_CONFIG.defaultLocale,
    url: buildCanonical(page).canonical,
  };
}
