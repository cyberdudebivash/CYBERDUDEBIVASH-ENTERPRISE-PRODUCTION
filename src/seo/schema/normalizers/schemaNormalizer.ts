import { normalizeUrl, normalizeImage } from "../../metadata";
import type { SEOImage } from "../../types/common";
import { JSON_LD_CONTEXT, type ImageObjectNode } from "../types/common";
import type { SchemaNode, PageSchemaSet } from "../types/nodes";

// SchemaNormalizer — every builder in this platform resolves URLs,
// @id values, and image references through here rather than
// hand-rolling its own. Reuses Phase 1.1's normalizeUrl/normalizeImage
// (../../metadata) instead of a second URL-normalization
// implementation — the Metadata Engine already owns "make a URL
// absolute and clean," and this platform sits downstream of it (see
// the architecture diagram in documentation/SCHEMA_ENGINE.md).

/** A bare `scheme://host` with no path or trailing slash at all — e.g. SiteConfig.domain, but not ORGANIZATION.url (which already ends in "/") and not any page URL (which always has a path). */
const BARE_ORIGIN = /^https?:\/\/[^/]+$/;

/**
 * Builds a stable `@id` for an entity: an absolute, normalized URL plus
 * a `#fragment` — matching the real, live convention already found in
 * this codebase's own (if inconsistent) JSON-LD
 * (`https://www.cyberdudebivash.com/#organization`). Ensures exactly
 * one "/" before the fragment when `url` is a bare origin — otherwise
 * the same logical singleton (e.g. the site itself) would get a
 * different-looking `@id` depending on whether the config field it was
 * built from (SiteConfig.domain vs. ORGANIZATION.url) happens to carry
 * a trailing slash, which is exactly the kind of inconsistency this
 * platform's dedup-by-@id guarantee depends on not existing.
 */
export function buildId(url: string, fragment: string): string {
  const absolute = normalizeUrl(url);
  const base = BARE_ORIGIN.test(absolute) ? `${absolute}/` : absolute;
  return `${base}#${fragment}`;
}

/** Converts a data-model SEOImage into a schema.org ImageObject node, normalizing the URL exactly like every other image reference in this program. */
export function toImageObject(image: SEOImage): ImageObjectNode {
  const normalized = normalizeImage(image);
  return { "@type": "ImageObject", url: normalized.url, caption: normalized.alt, width: image.width, height: image.height };
}

/** Keeps the first node per `@id`, dropping later duplicates — the Registry's own "prevent duplicates" guarantee applied at the graph level, independent of whether any individual producer already avoids emitting one. */
export function dedupeGraphById(nodes: readonly SchemaNode[]): SchemaNode[] {
  const seen = new Set<string>();
  const result: SchemaNode[] = [];
  for (const node of nodes) {
    if (seen.has(node["@id"])) continue;
    seen.add(node["@id"]);
    result.push(node);
  }
  return result;
}

/** Wraps one node as its own standalone JSON-LD document (adds `@context`) — for a caller that wants a single `<script>` tag per entity rather than one page-wide `@graph`. Not used by SchemaRegistry itself, which always composes a `@graph`. */
export function toStandaloneJsonLd<T extends SchemaNode>(node: T): T & { "@context": typeof JSON_LD_CONTEXT } {
  return { "@context": JSON_LD_CONTEXT, ...node };
}

/** Builds the page-level `@context` + `@graph` envelope from an already-deduped node list. */
export function toPageSchemaSet(nodes: readonly SchemaNode[]): PageSchemaSet {
  return { "@context": JSON_LD_CONTEXT, "@graph": dedupeGraphById(nodes) };
}
