import { createSEORuntime } from "../../runtime";
import { generatePage } from "./generatePage";
import type { PageGenerationResult } from "./generatePage";
import { listAllPageIds } from "./pageIds";
import { buildSitemapArtifact, buildRobotsArtifact, buildSearchIndexArtifact } from "../artifacts/siteArtifacts";
import { validateSiteArtifacts } from "../validators/artifactValidator";
import type { SiteArtifactSet } from "../artifacts/types";
import type { ValidationResult } from "../../validators/shared";

// generateSite — generates every real page's artifacts plus the
// site-wide artifacts (sitemap, robots, search index) that fold over
// all of them. Uses createSEORuntime() (Runtime API) so the
// relationship graph and configuration report are built exactly once
// and reused across every page, rather than once per page — see
// runtime/documentation/CACHE_STRATEGY.md.

export interface SiteGenerationResult {
  pages: PageGenerationResult[];
  site: SiteArtifactSet;
  validation: ValidationResult;
}

export function generateSite(pageIds: readonly string[] = listAllPageIds()): SiteGenerationResult {
  const runtime = createSEORuntime();
  const pages = pageIds.map((pageId) => generatePage(pageId, runtime.generateSEO));

  const pageArtifacts = pages.map((page) => page.artifacts);
  const site: SiteArtifactSet = {
    pages: pageArtifacts,
    sitemap: buildSitemapArtifact(pageArtifacts),
    robots: buildRobotsArtifact(pageArtifacts),
    searchIndex: buildSearchIndexArtifact(pageArtifacts),
  };

  return { pages, site, validation: validateSiteArtifacts(site) };
}
