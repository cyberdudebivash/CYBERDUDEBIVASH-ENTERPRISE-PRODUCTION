// Shared primitive types used across every other SEO type file.
// Owns: image references, canonical/alternate URLs, OpenGraph, Twitter
// Cards, breadcrumb entries. Nothing here is specific to any one entity.

export interface SEOImage {
  url: string;
  width?: number;
  height?: number;
  alt: string;
  /** MIME type, e.g. "image/jpeg" — optional, most callers won't need it. */
  type?: string;
}

export interface SEOAlternateUrl {
  hreflang: string;
  path: string;
}

export interface CanonicalConfig {
  /** Relative to the site's domain (see site.config.ts) — absolute URLs are built at generation time, not stored here. */
  path: string;
  alternates?: SEOAlternateUrl[];
}

export type OpenGraphType = "website" | "article" | "product" | "profile";

export interface OpenGraphConfig {
  title: string;
  description: string;
  type: OpenGraphType;
  image: SEOImage;
  siteName?: string;
  locale?: string;
}

export type TwitterCardType = "summary" | "summary_large_image" | "app" | "player";

export interface TwitterCardConfig {
  card: TwitterCardType;
  /** Site's own @handle. */
  site?: string;
  /** Content author's @handle, when different from the site. */
  creator?: string;
  title: string;
  description: string;
  image?: SEOImage;
}

export interface SEOBreadcrumb {
  name: string;
  path: string;
}
