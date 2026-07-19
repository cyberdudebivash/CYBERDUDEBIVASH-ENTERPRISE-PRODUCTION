import { toAbsoluteUrl } from "../utils/url";
import type { SEOImage, SEOAlternateUrl } from "../types/common";
import type { MetadataAlternateUrl } from "./types";

// MetadataNormalizer — the one place every builder's "make this
// deterministic" logic lives, mirroring how validators/shared.ts is the
// one place every validator's shared logic lives. Pure functions only:
// no I/O, no network access, no randomness, no current-time reads.
// Every builder in this directory normalizes through here rather than
// hand-rolling its own trimming/deduping/URL-joining.

function collapseSlashes(path: string): string {
  return path.replace(/\/{2,}/g, "/");
}

function stripTrailingSlash(path: string): string {
  if (path === "/") return path;
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

/** Trims whitespace and collapses duplicate/trailing slashes in a relative path, leaving absolute URLs and mailto: links untouched. */
export function normalizeRelativePath(path: string): string {
  const trimmed = path.trim();
  if (/^https?:\/\//.test(trimmed) || trimmed.startsWith("mailto:")) return trimmed;
  return stripTrailingSlash(collapseSlashes(trimmed));
}

/** Normalizes a relative or absolute path and resolves it to a full, absolute URL. Every canonical/OG/Twitter URL in generated metadata goes through this. */
export function normalizeUrl(path: string): string {
  return toAbsoluteUrl(normalizeRelativePath(path));
}

/** Resolves an image's URL to absolute and trims its alt text — never silently drops alt text, since a blank alt is a MetadataValidator error, not something to normalize away. */
export function normalizeImage(image: SEOImage): SEOImage {
  return { ...image, url: normalizeUrl(image.url), alt: image.alt.trim() };
}

/**
 * Trims, drops blank/undefined entries, and case-insensitively dedupes,
 * keeping the first occurrence's original casing and order. Shared by
 * KeywordBuilder (primaryKeyword + secondaryKeywords) — the single
 * definition of "what counts as a duplicate keyword" in this engine.
 */
export function normalizeKeywordList(keywords: readonly (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of keywords) {
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/** Dedupes alternates by hreflang (keeping the first occurrence) and resolves each `path` to an absolute `href`. */
export function dedupeAlternates(alternates: readonly SEOAlternateUrl[]): MetadataAlternateUrl[] {
  const seen = new Set<string>();
  const result: MetadataAlternateUrl[] = [];
  for (const alt of alternates) {
    if (seen.has(alt.hreflang)) continue;
    seen.add(alt.hreflang);
    result.push({ hreflang: alt.hreflang, href: normalizeUrl(alt.path) });
  }
  return result;
}

/** Derives an ISO 639-1 language subtag from a locale string (e.g. "en_IN" → "en") — SiteConfig has no separate `language` field, so this is computed rather than configured. */
export function deriveLanguage(locale: string): string {
  return locale.split(/[_-]/)[0].toLowerCase();
}
