import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRelativePath, normalizeUrl, normalizeImage, normalizeKeywordList, dedupeAlternates, deriveLanguage } from "../metadataNormalizer";

test("normalizeRelativePath: trims whitespace", () => {
  assert.equal(normalizeRelativePath("  /about.html  "), "/about.html");
});

test("normalizeRelativePath: collapses duplicate slashes", () => {
  assert.equal(normalizeRelativePath("/about//team.html"), "/about/team.html");
});

test("normalizeRelativePath: strips a trailing slash, except for root", () => {
  assert.equal(normalizeRelativePath("/about.html/"), "/about.html");
  assert.equal(normalizeRelativePath("/"), "/");
});

test("normalizeRelativePath: leaves absolute http(s) URLs and mailto: links untouched", () => {
  assert.equal(normalizeRelativePath("https://example.com//x/"), "https://example.com//x/");
  assert.equal(normalizeRelativePath("mailto:bivash@cyberdudebivash.com"), "mailto:bivash@cyberdudebivash.com");
});

test("normalizeUrl: resolves a relative path to an absolute URL", () => {
  assert.equal(normalizeUrl("/about.html"), "https://www.cyberdudebivash.com/about.html");
});

test("normalizeUrl: normalizes whitespace and trailing slashes before resolving", () => {
  assert.equal(normalizeUrl("  /about.html/  "), "https://www.cyberdudebivash.com/about.html");
});

test("normalizeImage: resolves the url to absolute and trims alt text", () => {
  const image = normalizeImage({ url: "/img.png", alt: "  Alt text  " });
  assert.equal(image.url, "https://www.cyberdudebivash.com/img.png");
  assert.equal(image.alt, "Alt text");
});

test("normalizeKeywordList: trims, drops blank/undefined entries, and case-insensitively dedupes while preserving first-seen casing and order", () => {
  const result = normalizeKeywordList(["  SOC  ", undefined, "soc", "", "   ", "SIEM", "soc "]);
  assert.deepEqual(result, ["SOC", "SIEM"]);
});

test("dedupeAlternates: keeps the first occurrence per hreflang and resolves href to absolute", () => {
  const result = dedupeAlternates([
    { hreflang: "en-US", path: "/us/about.html" },
    { hreflang: "en-US", path: "/duplicate.html" },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].href, "https://www.cyberdudebivash.com/us/about.html");
});

test("deriveLanguage: derives the ISO 639-1 subtag from an underscore- or hyphen-separated locale", () => {
  assert.equal(deriveLanguage("en_IN"), "en");
  assert.equal(deriveLanguage("en-US"), "en");
});
