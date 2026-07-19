import { test } from "node:test";
import assert from "node:assert/strict";
import { validateMetadata } from "../metadataValidator";
import { buildPageMetadata } from "../pageMetadataBuilder";
import type { ValidationIssue } from "../../validators/shared";
import { makePage } from "./fixtures";

// Exercises MetadataValidator directly against both normally-built
// metadata and deliberately tampered copies — the tampering (spreading
// over one field) simulates "what if a future builder change produced
// this" without needing the builders themselves to be capable of
// producing bad output, matching the principle that the validator must
// never simply trust the generator (see metadataValidator.ts's header).

function findIssue(issues: readonly ValidationIssue[], code: string): ValidationIssue | undefined {
  return issues.find((i) => i.code === code);
}

test("validateMetadata: a normally generated page produces no error-severity issues", () => {
  const metadata = buildPageMetadata(makePage());
  const errors = validateMetadata(metadata).issues.filter((i) => i.severity === "error");
  assert.deepEqual(errors, []);
});

test("validateMetadata: flags a missing description as a warning, not an error", () => {
  const metadata = buildPageMetadata(
    makePage({
      description: undefined,
      openGraph: { title: "T", description: "", type: "website", image: { url: "/i.png", alt: "a" } },
      twitterCard: { card: "summary_large_image", title: "T", description: "" },
    }),
  );
  const found = findIssue(validateMetadata(metadata).issues, "METADATA_MISSING_DESCRIPTION");
  assert.ok(found);
  assert.equal(found?.severity, "warning");
});

test("validateMetadata: flags a non-absolute canonical as an error", () => {
  const metadata = buildPageMetadata(makePage());
  const tampered = { ...metadata, canonical: "/relative.html" };
  const found = findIssue(validateMetadata(tampered).issues, "METADATA_CANONICAL_NOT_ABSOLUTE");
  assert.ok(found);
  assert.equal(found?.severity, "error");
});

test("validateMetadata: flags a blank OpenGraph image alt as an error", () => {
  const metadata = buildPageMetadata(makePage());
  const tampered = { ...metadata, openGraph: { ...metadata.openGraph, image: { ...metadata.openGraph.image, alt: "" } } };
  const found = findIssue(validateMetadata(tampered).issues, "METADATA_OG_IMAGE_BLANK_ALT");
  assert.ok(found);
  assert.equal(found?.severity, "error");
});

test("validateMetadata: flags a duplicate keyword (case-insensitive) as an error", () => {
  const metadata = buildPageMetadata(makePage());
  const tampered = { ...metadata, keywords: ["soc", "SOC"] };
  const found = findIssue(validateMetadata(tampered).issues, "METADATA_DUPLICATE_KEYWORD");
  assert.ok(found);
  assert.equal(found?.severity, "error");
});

test("validateMetadata: flags an empty keywords list as a warning", () => {
  const metadata = buildPageMetadata(makePage());
  const tampered = { ...metadata, keywords: [] };
  const found = findIssue(validateMetadata(tampered).issues, "METADATA_MISSING_KEYWORDS");
  assert.ok(found);
  assert.equal(found?.severity, "warning");
});
