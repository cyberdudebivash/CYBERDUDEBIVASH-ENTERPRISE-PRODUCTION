import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkAssetReferencesResolve,
  checkNoOrphanedHashedAssets,
  checkHtmlWellFormed,
  checkMetadataAndSchema,
  checkFavicon,
  checkSitemapAndRobots,
  checkHeaders,
  verifyDist,
} from "../verify-dist.mjs";

const GOOD_HTML = `<!doctype html>
<html>
<head>
<title>Test Page</title>
<meta name="description" content="A test page." />
<link rel="canonical" href="https://example.com/" />
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization"}</script>
<script type="module" crossorigin src="/assets/index-abc123.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-abc123.css">
</head>
<body></body>
</html>`;

function makeDist(t: { after: (fn: () => void) => void }) {
  const distDir = mkdtempSync(join(tmpdir(), "verify-dist-test-"));
  t.after(() => rmSync(distDir, { recursive: true, force: true }));
  mkdirSync(join(distDir, "assets"), { recursive: true });
  return distDir;
}

function writeGoodDist(distDir: string) {
  writeFileSync(join(distDir, "assets", "index-abc123.js"), "console.log(1)");
  writeFileSync(join(distDir, "assets", "index-abc123.css"), "body{}");
  writeFileSync(join(distDir, "index.html"), GOOD_HTML);
  writeFileSync(join(distDir, "sitemap.xml"), '<?xml version="1.0"?><urlset></urlset>');
  writeFileSync(join(distDir, "robots.txt"), "User-agent: *\nAllow: /");
  writeFileSync(join(distDir, "favicon.ico"), "fake-icon-bytes");
  writeFileSync(join(distDir, "_headers"), "/*\n  X-Frame-Options: SAMEORIGIN");
}

test("checkAssetReferencesResolve: passes when every referenced file exists", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  assert.equal(checkAssetReferencesResolve(distDir).ok, true);
});

test("checkAssetReferencesResolve: fails when a referenced asset is missing", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  rmSync(join(distDir, "assets", "index-abc123.css"));
  const result = checkAssetReferencesResolve(distDir);
  assert.equal(result.ok, false);
  assert.match(result.message, /index-abc123\.css/);
});

test("checkNoOrphanedHashedAssets: flags a hashed file nothing references", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  writeFileSync(join(distDir, "assets", "index-stale999.js"), "old");
  const { refs } = checkAssetReferencesResolve(distDir);
  const result = checkNoOrphanedHashedAssets(distDir, refs!);
  assert.equal(result.ok, false);
  assert.match(result.message, /index-stale999\.js/);
});

test("checkNoOrphanedHashedAssets: passes when every hashed file is referenced", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  const { refs } = checkAssetReferencesResolve(distDir);
  assert.equal(checkNoOrphanedHashedAssets(distDir, refs!).ok, true);
});

test("checkHtmlWellFormed: passes on well-formed HTML", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  assert.equal(checkHtmlWellFormed(distDir).ok, true);
});

test("checkHtmlWellFormed: fails when doctype/title are missing", (t) => {
  const distDir = makeDist(t);
  writeFileSync(join(distDir, "index.html"), "<html><body>no doctype, no title</body></html>");
  const result = checkHtmlWellFormed(distDir);
  assert.equal(result.ok, false);
  assert.match(result.message, /doctype/);
});

test("checkMetadataAndSchema: fails when JSON-LD is malformed", (t) => {
  const distDir = makeDist(t);
  const broken = GOOD_HTML.replace(
    '{"@context":"https://schema.org","@type":"Organization"}',
    "{not valid json"
  );
  writeFileSync(join(distDir, "index.html"), broken);
  const result = checkMetadataAndSchema(distDir);
  assert.equal(result.ok, false);
  assert.match(result.message, /JSON-LD/);
});

test("checkMetadataAndSchema: passes when description/canonical/JSON-LD all present and valid", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  assert.equal(checkMetadataAndSchema(distDir).ok, true);
});

test("checkFavicon: fails when favicon.ico is missing", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  rmSync(join(distDir, "favicon.ico"));
  const result = checkFavicon(distDir);
  assert.equal(result.ok, false);
  assert.match(result.message, /missing/);
});

test("checkFavicon: fails when favicon.ico is empty", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  writeFileSync(join(distDir, "favicon.ico"), "");
  const result = checkFavicon(distDir);
  assert.equal(result.ok, false);
  assert.match(result.message, /empty/);
});

test("checkFavicon: passes when favicon.ico is present and non-empty", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  assert.equal(checkFavicon(distDir).ok, true);
});

test("checkSitemapAndRobots: fails when sitemap.xml is missing", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  rmSync(join(distDir, "sitemap.xml"));
  const result = checkSitemapAndRobots(distDir);
  assert.equal(result.ok, false);
  assert.match(result.message, /sitemap\.xml missing/);
});

test("checkSitemapAndRobots: passes when both present and well-formed", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  assert.equal(checkSitemapAndRobots(distDir).ok, true);
});

test("checkHeaders: fails when _headers is missing", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  rmSync(join(distDir, "_headers"));
  const result = checkHeaders(distDir);
  assert.equal(result.ok, false);
  assert.match(result.message, /missing/);
});

test("checkHeaders: fails when _headers is empty", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  writeFileSync(join(distDir, "_headers"), "");
  const result = checkHeaders(distDir);
  assert.equal(result.ok, false);
  assert.match(result.message, /empty/);
});

test("checkHeaders: passes when _headers is present and non-empty", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  assert.equal(checkHeaders(distDir).ok, true);
});

test("verifyDist: every check passes on a fully correct dist/", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  const results = verifyDist(distDir);
  for (const [check, result] of Object.entries(results)) {
    assert.equal(result.ok, true, `${check} should pass: ${result.message}`);
  }
});

test("verifyDist: surfaces failure when something is broken", (t) => {
  const distDir = makeDist(t);
  writeGoodDist(distDir);
  rmSync(join(distDir, "robots.txt"));
  const results = verifyDist(distDir);
  assert.equal(results.sitemapAndRobots.ok, false);
});
