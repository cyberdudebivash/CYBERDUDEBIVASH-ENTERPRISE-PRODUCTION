import { test } from "node:test";
import assert from "node:assert/strict";
import { buildId, toImageObject, dedupeGraphById, toStandaloneJsonLd, toPageSchemaSet } from "../normalizers";
import type { SchemaNode } from "../types/nodes";

test("buildId: joins a normalized absolute URL with a #fragment", () => {
  assert.equal(buildId("/about.html", "organization"), "https://www.cyberdudebivash.com/about.html#organization");
});

test("buildId: normalizes whitespace and trailing slashes before appending the fragment", () => {
  assert.equal(buildId("  /about.html/  ", "webpage"), "https://www.cyberdudebivash.com/about.html#webpage");
});

test("toImageObject: resolves url to absolute and maps alt to caption", () => {
  const node = toImageObject({ url: "/logo.png", alt: "Logo", width: 100, height: 100 });
  assert.equal(node.url, "https://www.cyberdudebivash.com/logo.png");
  assert.equal(node.caption, "Logo");
  assert.equal(node.width, 100);
});

function makeNode(id: string): SchemaNode {
  return { "@type": "WebPage", "@id": id, url: id, name: "n", description: "d", isPartOf: { "@id": "x" }, inLanguage: "en" };
}

test("dedupeGraphById: keeps only the first node per @id", () => {
  const result = dedupeGraphById([makeNode("a"), makeNode("b"), makeNode("a")]);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((n) => n["@id"]), ["a", "b"]);
});

test("toStandaloneJsonLd: adds @context to a single node", () => {
  const node = makeNode("https://example.com/#webpage");
  const standalone = toStandaloneJsonLd(node);
  assert.equal(standalone["@context"], "https://schema.org");
  assert.equal(standalone["@type"], "WebPage");
});

test("toPageSchemaSet: wraps a deduplicated node list in @context + @graph", () => {
  const set = toPageSchemaSet([makeNode("a"), makeNode("a")]);
  assert.equal(set["@context"], "https://schema.org");
  assert.equal(set["@graph"].length, 1);
});
