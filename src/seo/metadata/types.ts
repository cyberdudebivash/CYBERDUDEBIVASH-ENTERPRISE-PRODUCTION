import type { OpenGraphConfig, TwitterCardConfig, SEOImage } from "../types/common";
import type { RobotsDirective } from "../types/page";

// Owns: the shared output shape of the Metadata Engine — what
// PageMetadataBuilder produces and MetadataValidator checks. Composes
// OpenGraphConfig/TwitterCardConfig/RobotsDirective from the Phase 1.0
// data model rather than redeclaring their fields; adds only what the
// engine itself guarantees that the input config doesn't (absolute
// URLs, always-present images, a resolved `og:url`). Nothing here
// renders HTML or touches the DOM — see MetadataEngine's header comment.

/** An alternate (hreflang) URL with an absolute, generation-time-resolved `href` — the output analog of SEOAlternateUrl's relative `path`. */
export interface MetadataAlternateUrl {
  hreflang: string;
  href: string;
}

/** OpenGraphConfig plus the resolved absolute page URL (`og:url`), which the input config has no field for since it's derived from the page's own path, not authored per page. */
export interface GeneratedOpenGraph extends OpenGraphConfig {
  url: string;
}

/** TwitterCardConfig with `image` guaranteed present — the builder falls back to the page's OpenGraph image (or the site default) rather than leaving it optional in generated output. */
export interface GeneratedTwitterCard extends Omit<TwitterCardConfig, "image"> {
  image: SEOImage;
}

/** The organization as a metadata publisher — name/url/logo only, not the full SEOOrganization shape (no address/contactPoints/sameAs here; those are Phase 1.2 schema concerns, not per-page metadata). */
export interface MetadataPublisher {
  name: string;
  url: string;
  logo: string;
}

/** One third-party site-verification meta tag, e.g. `{ name: "google-site-verification", content: "..." }` — a list so a future provider (Bing, etc.) is one array entry, not a new field. */
export interface MetadataVerificationTag {
  name: string;
  content: string;
}

/**
 * The Metadata Engine's public output: one fully resolved, normalized,
 * validated record per page. Every field is deterministic given the
 * same config inputs — no field is ever silently left undefined; where
 * the input config has no value (e.g. an unset `robots` or missing
 * `description`), the builder resolves an explicit, documented default
 * rather than propagating an optional field into generated output.
 */
export interface PageMetadata {
  pageId: string;
  title: string;
  description: string;
  canonical: string;
  alternates: MetadataAlternateUrl[];
  robots: RobotsDirective;
  /** ISO 639-1 language subtag derived from SiteConfig.defaultLocale (e.g. "en_IN" → "en"), not a separate config field. */
  language: string;
  theme: string;
  publisher: MetadataPublisher;
  author: string;
  application: string;
  openGraph: GeneratedOpenGraph;
  twitter: GeneratedTwitterCard;
  /** Deduplicated, normalized primaryKeyword + secondaryKeywords — see KeywordBuilder. */
  keywords: string[];
  verification: MetadataVerificationTag[];
}
