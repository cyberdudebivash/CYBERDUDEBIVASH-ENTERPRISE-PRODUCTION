import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCanonical } from "../canonicalBuilder";
import { makePage } from "./fixtures";

test("buildCanonical: normal generation resolves canonical.path to an absolute URL", () => {
  const result = buildCanonical(makePage({ path: "/services.html", canonical: { path: "/services.html" } }));
  assert.equal(result.canonical, "https://www.cyberdudebivash.com/services.html");
  assert.deepEqual(result.alternates, []);
});

test("buildCanonical: fallback generation uses the page's own path when canonical is unset (the item.html case)", () => {
  const result = buildCanonical(makePage({ path: "/item.html", canonical: undefined }));
  assert.equal(result.canonical, "https://www.cyberdudebivash.com/item.html");
});

test("buildCanonical: normalizes the root path's trailing slash correctly", () => {
  const result = buildCanonical(makePage({ path: "/", canonical: { path: "/" } }));
  assert.equal(result.canonical, "https://www.cyberdudebivash.com/");
});

test("buildCanonical: dedupes duplicate alternate hreflangs and resolves each href", () => {
  const result = buildCanonical(
    makePage({
      canonical: {
        path: "/services.html",
        alternates: [
          { hreflang: "en-US", path: "/us/services.html" },
          { hreflang: "en-US", path: "/duplicate.html" },
        ],
      },
    }),
  );
  assert.equal(result.alternates.length, 1);
  assert.equal(result.alternates[0].href, "https://www.cyberdudebivash.com/us/services.html");
});
