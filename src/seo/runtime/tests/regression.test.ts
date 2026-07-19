import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSEO } from "../runtime";
import { PAGES } from "../../config";

// Regression tests locking in real-data behavior discovered while
// building this platform, plus the specific edge cases earlier phases
// already fixed (Phase 1.3's "vciso" page/service id collision, Phase
// 1.4's documented CTA gaps) — this platform must not silently
// regress any of them by composing the underlying engines incorrectly.

test("regression: every one of the real 17 pages generates successfully with zero pipeline errors", () => {
  for (const page of PAGES) {
    const result = generateSEO(page.id);
    assert.equal(result.diagnostics.errors.length, 0, `page "${page.id}" produced errors`);
  }
});

test("regression: the 'vciso' page (Phase 1.3's documented page/service id collision) resolves without a false self-reference error", () => {
  assert.doesNotThrow(() => generateSEO("vciso"));
  const result = generateSEO("vciso");
  assert.equal(result.diagnostics.errors.length, 0);
});

test("regression: the 'home' page's LocalBusiness schema node is present (Phase 1.2's corrected, evidence-based wiring)", () => {
  const result = generateSEO("home");
  const types = result.schemas["@graph"].map((node) => node["@type"]);
  assert.ok(types.includes("LocalBusiness"));
});

test("regression: 'about' is the only page with a commercial view (Phase 1.4's real pilot scope, not fabricated for other pages)", () => {
  const withCommercial = PAGES.filter((page) => generateSEO(page.id).commercial !== undefined);
  assert.deepEqual(withCommercial.map((p) => p.id), ["about"]);
});

test("regression: total schema node count across all 17 pages matches Phase 1.2's documented total (81 nodes)", () => {
  const total = PAGES.reduce((sum, page) => sum + generateSEO(page.id).schemas["@graph"].length, 0);
  assert.equal(total, 81);
});

test("regression: the runtime never mutates PAGES or any other shared config array as a side effect", () => {
  const before = JSON.stringify(PAGES);
  for (const page of PAGES) generateSEO(page.id);
  assert.equal(JSON.stringify(PAGES), before);
});
