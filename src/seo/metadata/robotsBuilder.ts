import type { SEOPage, RobotsDirective } from "../types/page";

// RobotsBuilder — resolves a page's robots directive, defaulting to
// the safe, most common value ("index,follow") when unset rather than
// leaving it optional in generated output. Matches the two pages that
// already set this explicitly today (item, privacy) — both use
// "index,follow".

const DEFAULT_ROBOTS: RobotsDirective = "index,follow";

export function buildRobots(page: SEOPage): RobotsDirective {
  return page.robots ?? DEFAULT_ROBOTS;
}
