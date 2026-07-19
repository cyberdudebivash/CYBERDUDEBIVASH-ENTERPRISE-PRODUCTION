import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPageMetadata } from "../pageMetadataBuilder";
import { makePage } from "./fixtures";

test("buildPageMetadata: composes every field for a normal page", () => {
  const page = makePage({
    id: "svc",
    path: "/services.html",
    title: "Services",
    description: "Our services.",
    canonical: { path: "/services.html" },
    primaryKeyword: "services",
    secondaryKeywords: ["security"],
  });
  const metadata = buildPageMetadata(page);
  assert.equal(metadata.pageId, "svc");
  assert.equal(metadata.title, "Services");
  assert.equal(metadata.canonical, "https://www.cyberdudebivash.com/services.html");
  assert.equal(metadata.robots, "index,follow");
  assert.equal(metadata.language, "en");
  assert.equal(metadata.theme, "#020810");
  assert.equal(metadata.publisher.name, "CYBERDUDEBIVASH PRIVATE LIMITED");
  assert.equal(metadata.author, "CYBERDUDEBIVASH PRIVATE LIMITED");
  assert.equal(metadata.application, "CyberDudeBivash®");
  assert.deepEqual(metadata.keywords, ["services", "security"]);
  assert.equal(metadata.verification.length, 1);
  assert.equal(metadata.verification[0].name, "google-site-verification");
});

test("buildPageMetadata: handles a page with no description, no canonical, no robots, no keywords (the item.html case)", () => {
  const page = makePage({
    id: "item",
    path: "/item.html",
    title: "SENTINEL APEX",
    description: undefined,
    canonical: undefined,
    robots: undefined,
    primaryKeyword: undefined,
    secondaryKeywords: undefined,
    openGraph: { title: "SENTINEL APEX", description: "", type: "website", image: { url: "/og.png", alt: "a" } },
    twitterCard: { card: "summary_large_image", title: "SENTINEL APEX", description: "" },
  });
  const metadata = buildPageMetadata(page);
  assert.equal(metadata.description, "");
  assert.equal(metadata.canonical, "https://www.cyberdudebivash.com/item.html");
  assert.equal(metadata.robots, "index,follow");
  assert.deepEqual(metadata.keywords, []);
});
