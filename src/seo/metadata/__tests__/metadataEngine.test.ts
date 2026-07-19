import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePageMetadata, generateAllPageMetadata } from "../metadataEngine";
import { PAGES } from "../../config";
import { makePage } from "./fixtures";

test("generatePageMetadata: normal generation returns validated metadata", () => {
  const metadata = generatePageMetadata(makePage());
  assert.equal(metadata.pageId, "test-page");
  assert.equal(metadata.canonical, "https://www.cyberdudebivash.com/test-page.html");
});

test("generatePageMetadata: throws an explicit error naming the failing check rather than returning invalid metadata", () => {
  const page = makePage({ openGraph: { title: "T", description: "D", type: "website", image: { url: "/i.png", alt: "" } } });
  assert.throws(() => generatePageMetadata(page), /METADATA_OG_IMAGE_BLANK_ALT/);
});

test("generateAllPageMetadata: regression — the real PAGES registry generates cleanly end to end", () => {
  const results = generateAllPageMetadata(PAGES);
  assert.equal(results.length, PAGES.length);
  for (const metadata of results) {
    assert.ok(metadata.canonical.startsWith("https://"));
    assert.ok(metadata.openGraph.image.url.startsWith("https://"));
    assert.ok(metadata.twitter.image.url.startsWith("https://"));
  }
});

test("generateAllPageMetadata: throws one aggregate error naming every failing page, not just the first", () => {
  const bad1 = makePage({ id: "bad-1", openGraph: { title: "T", description: "D", type: "website", image: { url: "/i.png", alt: "" } } });
  const bad2 = makePage({ id: "bad-2", openGraph: { title: "T", description: "D", type: "website", image: { url: "/i.png", alt: "" } } });
  assert.throws(() => generateAllPageMetadata([bad1, bad2]), /"bad-1"[\s\S]*"bad-2"/);
});
