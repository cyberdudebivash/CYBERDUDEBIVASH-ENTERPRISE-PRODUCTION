import type { StaticMetaTag, StaticLinkTag } from "../../runtime";

// Owns: the Build Platform's own artifact shapes — what gets
// serialized to disk under dist/seo/. Every artifact is a pure
// reshaping of Runtime API output (SEORuntimeResult / StaticHtmlHead);
// none of these types duplicate a Metadata/Schema/Relationship/
// Commercial/Validation engine's own shapes, they consume them.

/** One page's consolidated metadata artifact — title, description, canonical, alternates, Open Graph, Twitter Card, and breadcrumb data folded into a single file per page (see ARTIFACT_PIPELINE.md for why these aren't split across 5 separate tiny files). */
export interface PageMetadataArtifact {
  pageId: string;
  title: string;
  description: string;
  keywords: string[];
  robots: string;
  language: string;
  canonical: string;
  alternates: StaticLinkTag[];
  openGraph: StaticMetaTag[];
  twitter: StaticMetaTag[];
  breadcrumb: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  position: number;
  name: string;
  item: string;
}

/** One page's JSON-LD artifact — the exact schema graph the Runtime already composed and validated, serialized as-is. */
export interface JsonLdArtifact {
  pageId: string;
  nodeCount: number;
  json: string;
}

/** The full set of artifacts generated for one page. */
export interface PageArtifactSet {
  pageId: string;
  metadata: PageMetadataArtifact;
  jsonLd: JsonLdArtifact;
}

export interface SitemapUrlEntry {
  loc: string;
  alternates: StaticLinkTag[];
}

/** Site-wide sitemap artifact — one entry per indexable page (robots directive does not start with "noindex"). No `<lastmod>`: no last-modified date exists anywhere in the real data model (verified directly — see GENERATION_STRATEGY.md), and fabricating one from the build's own generation timestamp would misrepresent content freshness. */
export interface SitemapArtifact {
  urls: SitemapUrlEntry[];
  excludedPageIds: string[];
}

/** Site-wide robots.txt artifact — a global allow-all rule plus one `Disallow` per non-indexable page (robots directive starts with "noindex"), and a `Sitemap:` reference. Deliberately does NOT attempt to reproduce the real, hand-authored `public/robots.txt`'s per-bot rules (Googlebot/Bingbot/AI-scraper opt-outs, crawl-delay) — no field in the Runtime's data model carries per-user-agent policy; see GENERATION_STRATEGY.md's Known Risks. */
export interface RobotsArtifact {
  sitemapUrl: string;
  disallowedPaths: string[];
}

export interface SearchIndexEntry {
  pageId: string;
  title: string;
  description: string;
  url: string;
  keywords: string[];
}

/** Site-wide search index artifact — one entry per page, regardless of robots directive (a site's own internal search should still surface a noindex page; only external crawlers are excluded from the sitemap). */
export interface SearchIndexArtifact {
  entries: SearchIndexEntry[];
}

/** Every artifact generated for the entire site in one build run. */
export interface SiteArtifactSet {
  pages: PageArtifactSet[];
  sitemap: SitemapArtifact;
  robots: RobotsArtifact;
  searchIndex: SearchIndexArtifact;
}
