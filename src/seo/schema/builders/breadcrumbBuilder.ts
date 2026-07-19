import { PRIMARY_NAVIGATION, FOOTER_NAVIGATION } from "../../config/navigation.config";
import type { SEONavigationNode } from "../../types/navigation";
import { normalizeUrl, type PageMetadata } from "../../metadata";
import { buildId } from "../normalizers";
import type { BreadcrumbListSchemaNode } from "../types/nodes";
import type { ListItemNode } from "../types/common";

// BreadcrumbBuilder — derives a Home -> Page breadcrumb for every page
// from navigation.config.ts and PageMetadata, rather than per-page
// hardcoded labels. Prefers a navigation node's own `label` over the
// page's full SEO title when one exists — matches real, live evidence:
// about.html's actual breadcrumb reads "Home -> About Us" (from
// FOOTER_NAVIGATION's "footer-legal-about" entry), not "Home -> About
// CYBERDUDEBIVASH(R) | AI Cybersecurity Company | Global Security
// Vendor" (the full <title>) — see documentation/SCHEMA_ENGINE.md's
// Pilot Comparison. No parent-level (e.g. "Services") breadcrumb
// segment is added: every PRIMARY_NAVIGATION parent in the real data
// has no `path` of its own (see navigation.config.ts's header comment),
// and inventing a URL for an unlinkable segment isn't done here.

function flattenNavigation(nodes: readonly SEONavigationNode[]): SEONavigationNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenNavigation(node.children) : [])]);
}

function findNavLabel(canonical: string): string | undefined {
  const all = [...flattenNavigation(PRIMARY_NAVIGATION), ...flattenNavigation(FOOTER_NAVIGATION)];
  return all.find((node) => node.path !== undefined && normalizeUrl(node.path) === canonical)?.label;
}

export function breadcrumbId(metadata: PageMetadata): string {
  return buildId(metadata.canonical, "breadcrumb");
}

export function buildBreadcrumbList(metadata: PageMetadata, homePath = "/"): BreadcrumbListSchemaNode {
  const homeUrl = normalizeUrl(homePath);
  const itemListElement: ListItemNode[] = [{ "@type": "ListItem", position: 1, name: "Home", item: homeUrl }];

  if (metadata.canonical !== homeUrl) {
    const label = findNavLabel(metadata.canonical) ?? metadata.title;
    itemListElement.push({ "@type": "ListItem", position: 2, name: label, item: metadata.canonical });
  }

  return { "@type": "BreadcrumbList", "@id": breadcrumbId(metadata), itemListElement };
}
