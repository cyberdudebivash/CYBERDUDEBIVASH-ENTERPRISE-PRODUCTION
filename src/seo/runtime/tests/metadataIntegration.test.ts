import { test } from "node:test";
import assert from "node:assert/strict";
import { integrateMetadata } from "../integration/metadataIntegration";
import { resolvePage } from "../integration/resolvePage";
import { generatePageMetadata } from "../../metadata";
import { PAGES } from "../../config";

test("integrateMetadata: matches Phase 1.1's own generatePageMetadata output exactly, for every page", () => {
  for (const page of PAGES) {
    assert.deepEqual(integrateMetadata(page), generatePageMetadata(page));
  }
});

test("integrateMetadata: the real 'about' page's title is unchanged by passing through the runtime", () => {
  const page = resolvePage("about");
  assert.equal(integrateMetadata(page).title, generatePageMetadata(page).title);
});
