import { PAGES } from "../../config";

// pageIds — the ONE place this platform reads src/seo/config directly,
// and ONLY for the list of page ids. "Consume ONLY the Runtime API...
// no direct access to Metadata, Schema, Relationship, Commercial or
// Validation engines" names five specific engines this platform must
// never call directly; it does not forbid reading which pages exist —
// that is a Configuration-layer fact (the architecture diagram's own
// first box), not an engine. Every actual SEO field this platform
// touches (title, description, schema, relationships, commercial)
// comes exclusively from generateSEO(pageId) — see generator/generatePage.ts.
// This mirrors the Runtime Platform's own precedent: its
// integration/resolvePage.ts reads PAGES for the same reason
// (resolving/enumerating ids), while every other integration/*.ts
// module calls an engine's real public API for the data itself.

export function listAllPageIds(): string[] {
  return PAGES.map((page) => page.id);
}
