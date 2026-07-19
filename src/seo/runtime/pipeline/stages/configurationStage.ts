import { PAGES } from "../../../config";
import { getPageById } from "../../../utils/lookup";
import type { SEOPage } from "../../../types/page";
import { ConfigurationError, DuplicateEntityError } from "../../contracts/errors";

// ConfigurationStage — the pipeline's first step: resolve `pageId` to a
// real, single SEOPage before any engine runs. Reuses
// utils/lookup.ts's getPageById (Phase 1.0) rather than re-implementing
// `PAGES.find`; the id-collision check below is stricter than (and
// distinct from) validateConfiguration's own cross-collection id check
// (SEO_VALIDATION_REPORT.md's Configuration Health section) — this one
// guards PAGES against duplicating an id against itself, a genuine data
// corruption this phase never assumes cannot happen.

export function resolvePage(pageId: string): SEOPage {
  if (typeof pageId !== "string" || pageId.trim().length === 0) {
    throw new ConfigurationError(`generateSEO: pageId must be a non-empty string, got ${JSON.stringify(pageId)}`);
  }

  const matches = PAGES.filter((page) => page.id === pageId);
  if (matches.length > 1) {
    throw new DuplicateEntityError(`generateSEO: ${matches.length} pages share id "${pageId}" — PAGES must contain exactly one entry per id`, pageId);
  }

  const page = getPageById(pageId);
  if (!page) {
    throw new ConfigurationError(`generateSEO: no page with id "${pageId}" exists in PAGES`);
  }

  return page;
}
