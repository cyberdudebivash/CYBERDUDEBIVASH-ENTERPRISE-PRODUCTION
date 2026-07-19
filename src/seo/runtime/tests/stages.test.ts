import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePage } from "../pipeline/stages/configurationStage";
import { runPlatformValidation } from "../pipeline/stages/validationStage";
import { runMetadataStage } from "../pipeline/stages/metadataStage";
import { runSchemaStage } from "../pipeline/stages/schemaStage";
import { runRelationshipsStage } from "../pipeline/stages/relationshipsStage";
import { runCommercialStage } from "../pipeline/stages/commercialStage";

test("runPlatformValidation: does not throw against the real platform config", () => {
  assert.doesNotThrow(() => runPlatformValidation());
});

test("runMetadataStage: returns real metadata plus a warnings array", () => {
  const page = resolvePage("home");
  const { metadata, warnings } = runMetadataStage(page);
  assert.equal(metadata.pageId, "home");
  assert.ok(Array.isArray(warnings));
  assert.ok(warnings.every((w) => w.severity === "warning"));
});

test("runSchemaStage: returns a validated PageSchemaSet", () => {
  const page = resolvePage("home");
  const { schemas } = runSchemaStage(page);
  assert.ok(schemas["@graph"].length > 0);
  assert.ok(schemas["@graph"].every((node) => typeof node["@id"] === "string"));
});

test("runRelationshipsStage: every recommendation's sourceId matches the requested page", () => {
  const page = resolvePage("apps");
  const { recommendations } = runRelationshipsStage(page);
  assert.ok(recommendations.every((r) => r.sourceId === "apps"));
});

test("runCommercialStage: returns undefined for a non-pilot page, a view for 'about'", () => {
  const nonPilot = runCommercialStage(resolvePage("home"));
  assert.equal(nonPilot.commercial, undefined);

  const pilot = runCommercialStage(resolvePage("about"));
  assert.equal(pilot.commercial?.id, "about");
});
