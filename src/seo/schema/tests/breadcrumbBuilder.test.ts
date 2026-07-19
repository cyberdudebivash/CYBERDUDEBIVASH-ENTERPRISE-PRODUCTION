import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePageMetadata } from "../../metadata";
import { buildBreadcrumbList } from "../builders/breadcrumbBuilder";
import { makePage } from "./fixtures";

test("buildBreadcrumbList: the home page gets a single-item breadcrumb", () => {
  const metadata = generatePageMetadata(makePage({ id: "home", path: "/", canonical: { path: "/" }, title: "Home" }));
  const node = buildBreadcrumbList(metadata);
  assert.equal(node.itemListElement.length, 1);
  assert.equal(node.itemListElement[0].name, "Home");
});

test("buildBreadcrumbList: prefers a navigation node's own label over the page's full SEO title (the real about.html case)", () => {
  const metadata = generatePageMetadata(makePage({ id: "about", path: "/about.html", canonical: { path: "/about.html" }, title: "About CYBERDUDEBIVASH® | AI Cybersecurity Company | Global Security Vendor" }));
  const node = buildBreadcrumbList(metadata);
  assert.equal(node.itemListElement.length, 2);
  assert.equal(node.itemListElement[0].name, "Home");
  assert.equal(node.itemListElement[1].name, "About Us");
  assert.equal(node.itemListElement[1].item, "https://www.cyberdudebivash.com/about.html");
});

test("buildBreadcrumbList: falls back to the page's own title when no navigation node references its path", () => {
  const metadata = generatePageMetadata(makePage({ id: "orphan", path: "/orphan-page.html", canonical: { path: "/orphan-page.html" }, title: "Orphan Page" }));
  const node = buildBreadcrumbList(metadata);
  assert.equal(node.itemListElement[1].name, "Orphan Page");
});

test("buildBreadcrumbList: positions are sequential starting at 1", () => {
  const metadata = generatePageMetadata(makePage({ path: "/services.html", canonical: { path: "/services.html" } }));
  const node = buildBreadcrumbList(metadata);
  assert.deepEqual(node.itemListElement.map((i) => i.position), [1, 2]);
});
