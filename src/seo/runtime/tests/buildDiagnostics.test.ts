import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSEO } from "../runtime";
import { PAGES } from "../../config";

test("diagnostics.coverage.metadata is always true (every page always has metadata)", () => {
  for (const page of PAGES) {
    assert.equal(generateSEO(page.id).diagnostics.coverage.metadata, true);
  }
});

test("diagnostics.coverage.commercial is true only for 'about'", () => {
  for (const page of PAGES) {
    const { diagnostics } = generateSEO(page.id);
    assert.equal(diagnostics.coverage.commercial, page.id === "about");
  }
});

test("diagnostics.commercialSummary.readinessScore is only present when commercial is present", () => {
  const about = generateSEO("about");
  assert.ok(about.commercial);
  assert.equal(typeof about.diagnostics.commercialSummary.readinessScore, "number");

  const contact = generateSEO("contact");
  assert.equal(contact.commercial, undefined);
  assert.equal(contact.diagnostics.commercialSummary.readinessScore, undefined);
});

test("diagnostics.schemaSummary.nodeCount matches the schema set's real node count", () => {
  const result = generateSEO("home");
  assert.equal(result.diagnostics.schemaSummary.nodeCount, result.schemas["@graph"].length);
});

test("diagnostics.relationshipSummary.recommendationCount matches the relationships array length", () => {
  const result = generateSEO("home");
  assert.equal(result.diagnostics.relationshipSummary.recommendationCount, result.relationships.length);
});

test("diagnostics.validationSummary matches the real platform-wide baseline (0 errors)", () => {
  const result = generateSEO("about");
  assert.equal(result.diagnostics.validationSummary.errorCount, 0);
});
