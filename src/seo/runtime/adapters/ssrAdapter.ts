import { toStaticHtmlHead } from "./staticHtmlAdapter";
import type { SEORuntimeResult } from "../contracts/types";

// ssrAdapter — transformation only, reusing staticHtmlAdapter's
// structured head data and rendering it to the one string an SSR
// response actually needs: a `<head>`-ready HTML fragment. Escapes
// attribute values (a real SSR concern the static/React adapters,
// which hand back structured data rather than markup, don't have to);
// does not decide what any tag's content is.

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Renders the exact same data toSEOHeadProps() exposes to React, but as one HTML string fragment ready to inject into an SSR-rendered `<head>...</head>`. */
export function renderSSRHead(result: SEORuntimeResult): string {
  const head = toStaticHtmlHead(result);
  const lines: string[] = [`<title>${escapeText(head.title)}</title>`];

  for (const tag of head.metaTags) {
    const attr = tag.name ? `name="${escapeAttribute(tag.name)}"` : `property="${escapeAttribute(tag.property ?? "")}"`;
    lines.push(`<meta ${attr} content="${escapeAttribute(tag.content)}" />`);
  }

  for (const tag of head.linkTags) {
    const hreflang = tag.hreflang ? ` hreflang="${escapeAttribute(tag.hreflang)}"` : "";
    lines.push(`<link rel="${escapeAttribute(tag.rel)}" href="${escapeAttribute(tag.href)}"${hreflang} />`);
  }

  // Escapes "</" inside the JSON-LD payload so no field value can
  // prematurely close this <script> tag (the standard JSON-in-HTML
  // mitigation) — defense in depth even though every source field
  // traces back to this repo's own committed config, not user input.
  lines.push(`<script type="application/ld+json">${head.jsonLd.replace(/<\//g, "<\\/")}</script>`);

  return lines.join("\n");
}
