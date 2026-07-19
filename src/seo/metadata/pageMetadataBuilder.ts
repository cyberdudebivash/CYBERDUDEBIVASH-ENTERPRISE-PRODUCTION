import type { SEOPage } from "../types/page";
import { SITE_CONFIG } from "../config/site.config";
import { ORGANIZATION } from "../config/organization.config";
import { buildCanonical } from "./canonicalBuilder";
import { buildOpenGraph } from "./openGraphBuilder";
import { buildTwitterCard } from "./twitterCardBuilder";
import { buildRobots } from "./robotsBuilder";
import { buildKeywords } from "./keywordBuilder";
import { deriveLanguage } from "./metadataNormalizer";
import type { PageMetadata, MetadataPublisher, MetadataVerificationTag } from "./types";

// PageMetadataBuilder — composes every field builder into one
// PageMetadata record per page. Owns only composition and the
// handful of site/organization-level fields (language, theme,
// publisher, author, application, verification) that don't belong to
// any single field builder; canonical/OG/Twitter/robots/keywords are
// each delegated to their own builder, never recomputed here.
//
// `author` resolves to ORGANIZATION.legalName — the single canonical
// legal name this program already established (organization.config.ts)
// — not a per-page field, since SEOPage has no author of its own
// (only SEOArticle does, via authorId). See
// documentation/SEO_METADATA_ENGINE.md's Pilot Comparison: this differs
// from about.html's live `<meta name="author">` text, a real content
// drift flagged there rather than silently matched.

function buildPublisher(): MetadataPublisher {
  return { name: ORGANIZATION.name, url: ORGANIZATION.url, logo: ORGANIZATION.logo.url };
}

function buildVerificationTags(): MetadataVerificationTag[] {
  return [{ name: "google-site-verification", content: SITE_CONFIG.searchConsoleVerification }];
}

export function buildPageMetadata(page: SEOPage): PageMetadata {
  const { canonical, alternates } = buildCanonical(page);
  return {
    pageId: page.id,
    title: page.title,
    description: page.description ?? "",
    canonical,
    alternates,
    robots: buildRobots(page),
    language: deriveLanguage(SITE_CONFIG.defaultLocale),
    theme: SITE_CONFIG.themeColor,
    publisher: buildPublisher(),
    author: ORGANIZATION.legalName,
    application: SITE_CONFIG.siteName,
    openGraph: buildOpenGraph(page),
    twitter: buildTwitterCard(page),
    keywords: buildKeywords(page),
    verification: buildVerificationTags(),
  };
}
