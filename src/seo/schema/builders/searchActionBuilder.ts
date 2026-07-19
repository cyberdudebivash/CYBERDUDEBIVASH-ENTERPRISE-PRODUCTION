import type { SearchActionNode } from "../types/common";

// SearchActionBuilder — a pure, composable helper for a WebSite's
// `potentialAction`. Deliberately not called by WebsiteBuilder's
// default output and not wired into any registry producer: the only
// real, live example of this schema on the actual site (item.html)
// targets `cyberbivash.blogspot.com/search` — a copy-pasted Blogspot
// template default, not a real search endpoint on this platform (this
// codebase has no search route/feature) — so there is no verified real
// target to default this to. A caller with an actual search endpoint
// can call this directly and attach the result to a
// WebSiteSchemaNode's `potentialAction` field itself.

export function buildSearchAction(searchUrlTemplate: string): SearchActionNode {
  return { "@type": "SearchAction", target: searchUrlTemplate, "query-input": "required name=search_term_string" };
}
