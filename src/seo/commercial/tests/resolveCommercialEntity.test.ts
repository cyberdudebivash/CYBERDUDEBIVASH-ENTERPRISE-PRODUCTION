import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCommercialEntity } from "../builders/resolveCommercialEntity";

test("resolveCommercialEntity: resolves a real page by id", () => {
  const resolved = resolveCommercialEntity("page", "about");
  assert.equal(resolved?.id, "about");
  assert.match(resolved?.name ?? "", /About CYBERDUDEBIVASH/);
});

test("resolveCommercialEntity: resolves a real service by id", () => {
  const resolved = resolveCommercialEntity("service", "soc");
  assert.equal(resolved?.name, "Managed SOC-as-a-Service");
  assert.equal(resolved?.commercial.searchIntent, "commercial");
});

test("resolveCommercialEntity: resolves a real product by id", () => {
  const resolved = resolveCommercialEntity("product", "apex");
  assert.equal(resolved?.name, "Sentinel APEX™");
});

test("resolveCommercialEntity: returns undefined for an unknown id", () => {
  assert.equal(resolveCommercialEntity("service", "does-not-exist"), undefined);
});

test("resolveCommercialEntity: returns undefined for a solution/article id that doesn't exist", () => {
  assert.equal(resolveCommercialEntity("solution", "does-not-exist"), undefined);
  assert.equal(resolveCommercialEntity("article", "does-not-exist"), undefined);
});
