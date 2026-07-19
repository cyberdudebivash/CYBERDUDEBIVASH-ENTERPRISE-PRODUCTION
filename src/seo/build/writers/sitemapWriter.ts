import { writeTextFile } from "./fsWriter";
import type { SitemapArtifact } from "../artifacts/types";

// SitemapWriter — serialization only: renders a SitemapArtifact into
// standard sitemap.xml XML (schemas.org/sitemap + xhtml:link for
// hreflang alternates, per sitemaps.org's own documented extension).
// No `<lastmod>` — see artifacts/types.ts's SitemapArtifact for why.

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function renderUrl(entry: SitemapArtifact["urls"][number]): string {
  const alternates = entry.alternates
    .map((alt) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang ?? "")}" href="${escapeXml(alt.href)}" />`)
    .join("\n");
  const alternatesBlock = alternates ? `\n${alternates}` : "";
  return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${alternatesBlock}\n  </url>`;
}

export function renderSitemapXml(artifact: SitemapArtifact): string {
  const urls = artifact.urls.map(renderUrl).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

export async function writeSitemapArtifact(outDir: string, artifact: SitemapArtifact): Promise<string> {
  return writeTextFile(outDir, "sitemaps/sitemap.xml", renderSitemapXml(artifact));
}
