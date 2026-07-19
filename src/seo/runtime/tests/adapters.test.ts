import { test } from "node:test";
import assert from "node:assert/strict";
import { runPipeline } from "../pipeline/runPipeline";
import { buildHeadTags, serializeHeadTag } from "../adapters/headTags";
import { renderStaticHead } from "../adapters/staticHtmlAdapter";
import { renderSSRHeadTags } from "../adapters/ssrAdapter";
import { toReactHeadProps } from "../adapters/reactAdapter";
import { renderCLISummary } from "../adapters/cliAdapter";

const result = runPipeline("home");

test("buildHeadTags: includes exactly one title tag matching the metadata title", () => {
  const tags = buildHeadTags(result);
  const titleTags = tags.filter((t): t is { kind: "title"; content: string } => t.kind === "title");
  assert.equal(titleTags.length, 1);
  assert.equal(titleTags[0].content, result.metadata.title);
});

test("buildHeadTags: includes exactly one jsonLd tag carrying the real schema set", () => {
  const tags = buildHeadTags(result);
  const jsonLdTags = tags.filter((t): t is { kind: "jsonLd"; data: unknown } => t.kind === "jsonLd");
  assert.equal(jsonLdTags.length, 1);
  assert.deepEqual(jsonLdTags[0].data, result.schemas);
});

test("serializeHeadTag: escapes HTML-significant characters in meta content", () => {
  const html = serializeHeadTag({ kind: "meta", name: "description", content: '<script>"& evil</script>' });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("renderStaticHead: produces one joined string containing the title and canonical link", () => {
  const html = renderStaticHead(result);
  assert.ok(html.includes(`<title>${result.metadata.title}</title>`));
  assert.ok(html.includes(`href="${result.metadata.canonical}"`));
});

test("renderStaticHead: JSON-LD script content has no unescaped closing script tag", () => {
  const html = renderStaticHead(result);
  const scriptOpen = html.indexOf('<script type="application/ld+json">');
  const scriptBody = html.slice(scriptOpen, html.indexOf("</script>", scriptOpen));
  assert.ok(!scriptBody.slice('<script type="application/ld+json">'.length).includes("</"));
});

test("renderSSRHeadTags: returns one string per tag, matching buildHeadTags' count", () => {
  const tags = renderSSRHeadTags(result);
  assert.equal(tags.length, buildHeadTags(result).length);
  assert.ok(tags.every((t) => typeof t === "string"));
});

test("toReactHeadProps: shapes the same data as buildHeadTags without any HTML string", () => {
  const props = toReactHeadProps(result);
  assert.equal(props.title, result.metadata.title);
  assert.ok(props.meta.some((m) => m.property === "og:title"));
  assert.ok(props.links.some((l) => l.rel === "canonical"));
  assert.deepEqual(props.jsonLd, result.schemas);
});

test("renderCLISummary: includes the pageId and warning count", () => {
  const summary = renderCLISummary(result);
  assert.ok(summary.includes(`"${result.pageId}"`));
  assert.ok(summary.includes(`warnings:       ${result.diagnostics.warnings.length}`));
});
