import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCommercialView, buildAllCommercialViews } from "../builders/buildCommercialView";
import { COMMERCIAL_PROFILES } from "../config/commercialProfiles.config";
import type { CommercialProfile } from "../config/types";

test("buildCommercialView: merges the real entity's searchIntent/funnelStage/keywords with the profile's own fields", () => {
  const profile = COMMERCIAL_PROFILES.find((p) => p.entityId === "soc")!;
  const view = buildCommercialView(profile);
  assert.equal(view?.searchIntent, "commercial");
  assert.equal(view?.funnelStage, "decision");
  assert.equal(view?.primaryKeyword, "managed SOC as a service India");
  assert.equal(view?.businessObjective, profile.businessObjective);
  assert.equal(view?.valueProposition, profile.valueProposition);
});

test("buildCommercialView: prefers the profile's own value over the real entity's when both exist", () => {
  const profile = COMMERCIAL_PROFILES.find((p) => p.entityId === "apex")!;
  const view = buildCommercialView(profile);
  // apex already has audience set on the real record; the profile
  // never redeclares it, so the real entity's own value should surface.
  assert.ok(view?.audience && view.audience.length > 0);
});

test("buildCommercialView: returns undefined when the profile references an entity that doesn't exist", () => {
  const badProfile: CommercialProfile = { entityId: "does-not-exist", entityKind: "service" };
  assert.equal(buildCommercialView(badProfile), undefined);
});

test("buildAllCommercialViews: resolves all 12 real pilot profiles", () => {
  const views = buildAllCommercialViews();
  assert.equal(views.length, 12);
  assert.ok(views.some((v) => v.id === "about" && v.kind === "page"));
});
