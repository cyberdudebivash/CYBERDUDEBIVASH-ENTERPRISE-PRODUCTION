import type { SEORuntimeResult } from "../contracts/types";
import { buildHeadTags, serializeHeadTag } from "./headTags";

// StaticHtmlAdapter — transforms a SEORuntimeResult into one complete
// `<head>`-ready HTML string, for a build-time static-generation
// consumer that writes a whole page to disk in one pass. Contains no
// business logic of its own: every tag and its content came from
// headTags.ts, which came from the pipeline; this file only joins them.

export function renderStaticHead(result: SEORuntimeResult): string {
  return buildHeadTags(result)
    .map(serializeHeadTag)
    .join("\n");
}
