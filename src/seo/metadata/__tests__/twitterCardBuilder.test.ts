import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTwitterCard } from "../twitterCardBuilder";
import { makePage } from "./fixtures";

test("buildTwitterCard: normal generation uses the page's own site/creator/title/description/image", () => {
  const page = makePage({
    twitterCard: { card: "summary_large_image", site: "@custom", creator: "@author", title: "Tw title", description: "Tw description.", image: { url: "/tw.png", alt: "Tw alt" } },
  });
  const result = buildTwitterCard(page);
  assert.equal(result.site, "@custom");
  assert.equal(result.creator, "@author");
  assert.equal(result.title, "Tw title");
  assert.equal(result.image.url, "https://www.cyberdudebivash.com/tw.png");
});

test("buildTwitterCard: falls back to the site's own handle for site/creator when unset", () => {
  const page = makePage({ twitterCard: { card: "summary_large_image", title: "T", description: "D" } });
  const result = buildTwitterCard(page);
  assert.equal(result.site, "@CDBSENTINELAPEX");
  assert.equal(result.creator, "@CDBSENTINELAPEX");
});

test("buildTwitterCard: falls back to the page's own title/description when Twitter-specific ones are blank", () => {
  const page = makePage({ title: "Page Title", description: "Page description.", twitterCard: { card: "summary_large_image", title: "", description: "" } });
  const result = buildTwitterCard(page);
  assert.equal(result.title, "Page Title");
  assert.equal(result.description, "Page description.");
});

test("buildTwitterCard: falls back to the page's OpenGraph image when no Twitter-specific image is set", () => {
  const page = makePage({
    openGraph: { title: "T", description: "D", type: "website", image: { url: "/og.png", alt: "OG alt" } },
    twitterCard: { card: "summary_large_image", title: "T", description: "D" },
  });
  const result = buildTwitterCard(page);
  assert.equal(result.image.url, "https://www.cyberdudebivash.com/og.png");
  assert.equal(result.image.alt, "OG alt");
});
