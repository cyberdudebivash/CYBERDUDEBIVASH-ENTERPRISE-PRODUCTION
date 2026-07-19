import { PAGES } from "../../config";
import type { SEOPage } from "../../types/page";
import { ConfigurationError } from "../contracts/errors";

// resolvePage — the one place a bare pageId string is resolved back to
// its real Phase 1.0 SEOPage record. Every other integration module
// receives an already-resolved SEOPage, never a string, so "unknown
// pageId" has exactly one failure point.

export function resolvePage(pageId: string, pages: readonly SEOPage[] = PAGES): SEOPage {
  const page = pages.find((p) => p.id === pageId);
  if (!page) {
    throw new ConfigurationError(`resolvePage: no page found with id "${pageId}"`);
  }
  return page;
}
