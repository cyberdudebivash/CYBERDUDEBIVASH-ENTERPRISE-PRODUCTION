import type { PageArtifactSet, SitemapArtifact, RobotsArtifact, SearchIndexArtifact } from "./types";

// siteArtifacts — the Build Platform's site-wide artifact builders.
// Every one of these is a pure fold over an already-built
// PageArtifactSet[] (per-page artifacts, themselves built from Runtime
// API output only) — no new SEO data is read from anywhere here.

function isIndexable(robots: string): boolean {
  return !robots.startsWith("noindex");
}

/** Every real page's canonical URL is already absolute (Phase 1.1 guarantees this); the sitemap's own origin is derived from the first page's canonical URL rather than read from site config directly, keeping this module's only input the already-built PageArtifactSet[]. */
function originFrom(pages: readonly PageArtifactSet[]): string {
  const first = pages[0];
  if (!first) return "";
  return new URL(first.metadata.canonical).origin;
}

export function buildSitemapArtifact(pages: readonly PageArtifactSet[]): SitemapArtifact {
  const indexable = pages.filter((page) => isIndexable(page.metadata.robots));
  const excluded = pages.filter((page) => !isIndexable(page.metadata.robots));
  return {
    urls: indexable.map((page) => ({ loc: page.metadata.canonical, alternates: page.metadata.alternates })),
    excludedPageIds: excluded.map((page) => page.pageId),
  };
}

export function buildRobotsArtifact(pages: readonly PageArtifactSet[]): RobotsArtifact {
  const origin = originFrom(pages);
  const disallowed = pages
    .filter((page) => !isIndexable(page.metadata.robots))
    .map((page) => new URL(page.metadata.canonical).pathname);
  return {
    sitemapUrl: origin ? `${origin}/sitemap.xml` : "",
    disallowedPaths: disallowed,
  };
}

export function buildSearchIndexArtifact(pages: readonly PageArtifactSet[]): SearchIndexArtifact {
  return {
    entries: pages.map((page) => ({
      pageId: page.pageId,
      title: page.metadata.title,
      description: page.metadata.description,
      url: page.metadata.canonical,
      keywords: page.metadata.keywords,
    })),
  };
}
