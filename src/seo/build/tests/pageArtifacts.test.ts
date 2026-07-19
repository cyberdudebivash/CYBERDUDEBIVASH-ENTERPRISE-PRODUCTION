import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSEO } from "../../runtime";
import { buildPageArtifactSet, buildPageMetadataArtifact, buildJsonLdArtifact } from "../artifacts/pageArtifacts";
import { PAGES } from "../../config";

test("buildPageMetadataArtifact: title/description/canonical match the Runtime's own metadata exactly, for every page", () => {
  for (const page of PAGES) {
    const runtime = generateSEO(page.id);
    const artifact = buildPageMetadataArtifact(page.id, runtime);
    assert.equal(artifact.title, runtime.metadata.title);
    assert.equal(artifact.description, runtime.metadata.description);
    assert.equal(artifact.canonical, runtime.metadata.canonical);
    assert.equal(artifact.robots, runtime.metadata.robots);
  }
});

test("buildPageMetadataArtifact: openGraph tags are only 'og:'-prefixed, twitter tags are only 'twitter:'-prefixed", () => {
  const runtime = generateSEO("about");
  const artifact = buildPageMetadataArtifact("about", runtime);
  assert.ok(artifact.openGraph.every((tag) => tag.property?.startsWith("og:")));
  assert.ok(artifact.twitter.every((tag) => tag.name?.startsWith("twitter:")));
});

test("buildPageMetadataArtifact: breadcrumb is extracted from the real BreadcrumbList schema node, not re-derived", () => {
  const runtime = generateSEO("about");
  const artifact = buildPageMetadataArtifact("about", runtime);
  const node = runtime.schemas["@graph"].find((n) => n["@type"] === "BreadcrumbList");
  assert.ok(node);
  assert.equal(artifact.breadcrumb.length, node.itemListElement.length);
  assert.deepEqual(
    artifact.breadcrumb.map((b) => b.name),
    node.itemListElement.map((i) => i.name),
  );
});

test("buildJsonLdArtifact: json is exactly JSON.stringify(schemas) and nodeCount matches the real graph length", () => {
  const runtime = generateSEO("home");
  const artifact = buildJsonLdArtifact("home", runtime);
  assert.equal(artifact.json, JSON.stringify(runtime.schemas));
  assert.equal(artifact.nodeCount, runtime.schemas["@graph"].length);
});

test("buildPageArtifactSet: composes both sub-artifacts for every real page without throwing", () => {
  for (const page of PAGES) {
    const runtime = generateSEO(page.id);
    const set = buildPageArtifactSet(page.id, runtime);
    assert.equal(set.pageId, page.id);
    assert.ok(set.metadata);
    assert.ok(set.jsonLd);
  }
});
