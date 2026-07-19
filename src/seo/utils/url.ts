import { SITE_CONFIG } from "../config/site.config";

// A single string-join helper — not a generator. Building an absolute
// URL from a relative path is a pure utility every future consumer of
// this data model needs (a metadata generator, a sitemap generator, an
// internal-linking engine); it isn't itself any of those things.

export function toAbsoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path) || path.startsWith("mailto:")) return path;
  const domain = SITE_CONFIG.domain.replace(/\/$/, "");
  const relative = path.startsWith("/") ? path : `/${path}`;
  return `${domain}${relative}`;
}
