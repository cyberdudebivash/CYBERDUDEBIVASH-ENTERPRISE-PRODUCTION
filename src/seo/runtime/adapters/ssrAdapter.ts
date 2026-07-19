import type { SEORuntimeResult } from "../contracts/types";
import { buildHeadTags, serializeHeadTag } from "./headTags";

// SSRAdapter — transforms a SEORuntimeResult into individually
// serialized tag strings, one per array entry, rather than
// StaticHtmlAdapter's single joined blob. A streaming SSR renderer
// injects `<title>` and the early `<meta>` tags into the response the
// moment they're available and can defer the JSON-LD `<script>` tag to
// the end of the flush — that per-tag boundary is the one real
// difference from static generation; the tags themselves and their
// serialization (headTags.ts) are identical, reused rather than
// redeclared.

export function renderSSRHeadTags(result: SEORuntimeResult): string[] {
  return buildHeadTags(result).map(serializeHeadTag);
}
