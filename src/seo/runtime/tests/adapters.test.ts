import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSEO } from "../runtime";
import { toStaticHtmlHead } from "../adapters/staticHtmlAdapter";
import { toSEOHeadProps } from "../adapters/reactAdapter";
import { renderSSRHead } from "../adapters/ssrAdapter";
import { renderCLIReport } from "../adapters/cliAdapter";

const about = generateSEO("about");

test("toStaticHtmlHead: title matches the runtime metadata title exactly", () => {
  assert.equal(toStaticHtmlHead(about).title, about.metadata.title);
});

test("toStaticHtmlHead: canonical link is present and matches metadata.canonical", () => {
  const head = toStaticHtmlHead(about);
  const canonical = head.linkTags.find((t) => t.rel === "canonical");
  assert.equal(canonical?.href, about.metadata.canonical);
});

test("toStaticHtmlHead: one alternate <link> per metadata.alternates entry", () => {
  const head = toStaticHtmlHead(about);
  const alternates = head.linkTags.filter((t) => t.rel === "alternate");
  assert.equal(alternates.length, about.metadata.alternates.length);
});

test("toStaticHtmlHead: jsonLd is exactly JSON.stringify(schemas) — no transformation of the schema graph itself", () => {
  const head = toStaticHtmlHead(about);
  // String equality, not parse-then-deepEqual: some real schema nodes
  // (e.g. Organization.logo) carry explicit `width: undefined` /
  // `height: undefined` keys, which JSON.stringify legitimately drops
  // — so round-tripping through JSON.parse would never equal the
  // original object even when serialization is 100% correct.
  assert.equal(head.jsonLd, JSON.stringify(about.schemas));
});

test("toSEOHeadProps: reuses the same meta/link data as toStaticHtmlHead (composition, not re-derivation)", () => {
  const head = toStaticHtmlHead(about);
  const props = toSEOHeadProps(about);
  assert.deepEqual(props.meta, head.metaTags);
  assert.deepEqual(props.link, head.linkTags);
  assert.deepEqual(props.title, head.title);
});

test("toSEOHeadProps: schema is the parsed graph object, not a pre-serialized string", () => {
  const props = toSEOHeadProps(about);
  assert.deepEqual(props.schema, about.schemas);
});

test("renderSSRHead: produces a <title> tag matching the page title", () => {
  const html = renderSSRHead(about);
  assert.ok(html.includes(`<title>${about.metadata.title}</title>`));
});

test("renderSSRHead: escapes '</' inside the JSON-LD payload so it cannot prematurely close the <script> tag", () => {
  const html = renderSSRHead(about);
  const scriptBody = html.slice(html.indexOf('<script type="application/ld+json">') + '<script type="application/ld+json">'.length, html.lastIndexOf("</script>"));
  assert.ok(!scriptBody.includes("</"));
});

test("renderSSRHead: the JSON-LD payload round-trips to the real schema graph once unescaped", () => {
  const html = renderSSRHead(about);
  const start = html.indexOf('<script type="application/ld+json">') + '<script type="application/ld+json">'.length;
  const end = html.lastIndexOf("</script>");
  const raw = html.slice(start, end).replace(/<\\\//g, "</");
  // String equality against JSON.stringify(schemas) directly — see
  // the jsonLd test above for why parse-then-deepEqual against the
  // original object is the wrong comparison here.
  assert.equal(raw, JSON.stringify(about.schemas));
});

test("renderCLIReport: reports zero errors for a clean page", () => {
  const report = renderCLIReport(about);
  assert.ok(report.includes('SEO Runtime — "about"'));
  assert.ok(!report.includes("FAILED"));
});

test("renderCLIReport: includes every real diagnostics warning message", () => {
  const report = renderCLIReport(about);
  for (const warning of about.diagnostics.warnings) {
    assert.ok(report.includes(warning.message));
  }
});
