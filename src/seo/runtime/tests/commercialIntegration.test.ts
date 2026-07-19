import { test } from "node:test";
import assert from "node:assert/strict";
import { integrateCommercial } from "../integration/commercialIntegration";
import { PAGES } from "../../config";
import { COMMERCIAL_PROFILES } from "../../commercial";

test("integrateCommercial: returns a view for 'about', the one page with a real Phase 1.4 profile", () => {
  const view = integrateCommercial("about");
  assert.ok(view);
  assert.equal(view?.id, "about");
  assert.equal(view?.kind, "page");
});

test("integrateCommercial: returns undefined for every other page (no fabricated data for pages with no profile)", () => {
  for (const page of PAGES) {
    if (page.id === "about") continue;
    assert.equal(integrateCommercial(page.id), undefined);
  }
});

test("integrateCommercial: exactly one page-kind profile exists in the real Phase 1.4 config", () => {
  const pageProfiles = COMMERCIAL_PROFILES.filter((p) => p.entityKind === "page");
  assert.equal(pageProfiles.length, 1);
  assert.equal(pageProfiles[0].entityId, "about");
});
