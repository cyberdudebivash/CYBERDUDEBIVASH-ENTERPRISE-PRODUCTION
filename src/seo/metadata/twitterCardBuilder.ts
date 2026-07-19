import type { SEOPage } from "../types/page";
import { SITE_CONFIG } from "../config/site.config";
import { normalizeImage } from "./metadataNormalizer";
import type { GeneratedTwitterCard } from "./types";

// TwitterCardBuilder — resolves a page's TwitterCardConfig, falling
// back to the site's own handle for `site`/`creator` and to the page's
// OpenGraph image when no Twitter-specific image was authored, so
// generated output always has an image even though
// TwitterCardConfig.image is optional on input.

export function buildTwitterCard(page: SEOPage): GeneratedTwitterCard {
  const twitter = page.twitterCard;
  const image = twitter.image ?? page.openGraph.image;
  return {
    card: twitter.card,
    site: twitter.site ?? SITE_CONFIG.twitterHandle,
    creator: twitter.creator ?? twitter.site ?? SITE_CONFIG.twitterHandle,
    title: twitter.title || page.title,
    description: twitter.description || page.description || "",
    image: normalizeImage(image),
  };
}
