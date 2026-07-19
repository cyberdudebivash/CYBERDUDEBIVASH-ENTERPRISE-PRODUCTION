import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOpenGraph } from "../openGraphBuilder";
import { makePage } from "./fixtures";

test("buildOpenGraph: normal generation uses the page's own OG title/description/siteName/locale/image", () => {
  const page = makePage({
    openGraph: { title: "OG Title", description: "OG description.", type: "website", image: { url: "/og.png", alt: "OG alt" }, siteName: "Custom Site", locale: "fr_FR" },
  });
  const result = buildOpenGraph(page);
  assert.equal(result.title, "OG Title");
  assert.equal(result.description, "OG description.");
  assert.equal(result.siteName, "Custom Site");
  assert.equal(result.locale, "fr_FR");
  assert.equal(result.image.url, "https://www.cyberdudebivash.com/og.png");
});

test("buildOpenGraph: falls back to the page's own title/description when OG-specific ones are blank", () => {
  const page = makePage({
    title: "Page Title",
    description: "Page description.",
    openGraph: { title: "", description: "", type: "website", image: { url: "/og.png", alt: "OG alt" } },
  });
  const result = buildOpenGraph(page);
  assert.equal(result.title, "Page Title");
  assert.equal(result.description, "Page description.");
});

test("buildOpenGraph: falls back to an empty description when neither OG nor page description exists (the item.html case)", () => {
  const page = makePage({ description: undefined, openGraph: { title: "T", description: "", type: "website", image: { url: "/og.png", alt: "a" } } });
  const result = buildOpenGraph(page);
  assert.equal(result.description, "");
});

test("buildOpenGraph: defaults siteName/locale to SiteConfig when the page doesn't set them", () => {
  const page = makePage({ openGraph: { title: "T", description: "D", type: "website", image: { url: "/og.png", alt: "a" } } });
  const result = buildOpenGraph(page);
  assert.equal(result.siteName, "CyberDudeBivash®");
  assert.equal(result.locale, "en_IN");
});

test("buildOpenGraph: resolves url to the page's own canonical", () => {
  const page = makePage({
    path: "/services.html",
    canonical: { path: "/services.html" },
    openGraph: { title: "T", description: "D", type: "website", image: { url: "/og.png", alt: "a" } },
  });
  const result = buildOpenGraph(page);
  assert.equal(result.url, "https://www.cyberdudebivash.com/services.html");
});
