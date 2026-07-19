import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProduct } from "../builders/productBuilder";
import { makeSolution } from "./fixtures";

test("buildProduct: composes name/description/url/brand", () => {
  const node = buildProduct(makeSolution({ name: "AI Toolkit", description: "A toolkit." }));
  assert.equal(node["@type"], "Product");
  assert.equal(node.name, "AI Toolkit");
  assert.equal(node.brand["@type"], "Brand");
  assert.equal(node.brand.name, "CyberDudeBivash®");
});

test("buildProduct: a clean rupee price produces a well-formed Offer", () => {
  const node = buildProduct(makeSolution({ price: "₹1,499" }));
  assert.deepEqual(node.offers, { "@type": "Offer", price: "1499", priceCurrency: "INR", url: node.url });
});

test("buildProduct: an unparseable price (never real in this data model, but defensively handled) produces no Offer rather than a guessed one", () => {
  const node = buildProduct(makeSolution({ price: "Custom" }));
  assert.equal(node.offers, undefined);
});

test("buildProduct: no price at all produces no Offer", () => {
  const node = buildProduct(makeSolution({ price: undefined }));
  assert.equal(node.offers, undefined);
});

test("buildProduct: an image is converted to ImageObject only when present", () => {
  assert.equal(buildProduct(makeSolution({ image: undefined })).image, undefined);
  const node = buildProduct(makeSolution({ image: { url: "/kit.png", alt: "Kit" } }));
  assert.equal(node.image?.["@type"], "ImageObject");
});
