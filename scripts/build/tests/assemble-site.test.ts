import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  promoteEntryHtml,
  copyStaticPages,
  copyStaticDirs,
  copyPreexistingAssets,
  copyRootConventionFiles,
  assembleSite,
} from "../assemble-site.mjs";

function makeFixtureRoot(t: { after: (fn: () => void) => void }) {
  const rootDir = mkdtempSync(join(tmpdir(), "assemble-site-test-"));
  t.after(() => rmSync(rootDir, { recursive: true, force: true }));
  const distDir = join(rootDir, "dist");
  mkdirSync(distDir, { recursive: true });
  return { rootDir, distDir };
}

test("promoteEntryHtml: renames dist/_vite_entry.html to dist/index.html", (t) => {
  const { distDir } = makeFixtureRoot(t);
  writeFileSync(join(distDir, "_vite_entry.html"), "<html>real build</html>");
  const indexPath = promoteEntryHtml(distDir);
  assert.equal(indexPath, join(distDir, "index.html"));
  assert.ok(existsSync(indexPath));
  assert.ok(!existsSync(join(distDir, "_vite_entry.html")));
  assert.equal(readFileSync(indexPath, "utf8"), "<html>real build</html>");
});

test("promoteEntryHtml: throws a clear error if vite build never ran", (t) => {
  const { distDir } = makeFixtureRoot(t);
  assert.throws(() => promoteEntryHtml(distDir), /vite build/);
});

test("copyStaticPages: copies all root *.html except _vite_entry.html and index.html", (t) => {
  const { rootDir, distDir } = makeFixtureRoot(t);
  writeFileSync(join(rootDir, "_vite_entry.html"), "entry");
  writeFileSync(join(rootDir, "index.html"), "old synced copy");
  writeFileSync(join(rootDir, "about.html"), "about page");
  writeFileSync(join(rootDir, "contact.html"), "contact page");
  const copied = copyStaticPages(rootDir, distDir);
  assert.deepEqual(copied, ["about.html", "contact.html"]);
  assert.ok(existsSync(join(distDir, "about.html")));
  assert.ok(existsSync(join(distDir, "contact.html")));
  assert.ok(!existsSync(join(distDir, "index.html")), "root index.html must never be copied in as a static page");
});

test("copyStaticDirs: copies portal/ and react-portal/ recursively when present", (t) => {
  const { rootDir, distDir } = makeFixtureRoot(t);
  mkdirSync(join(rootDir, "portal"), { recursive: true });
  writeFileSync(join(rootDir, "portal", "index.html"), "portal landing");
  const copied = copyStaticDirs(rootDir, distDir);
  assert.deepEqual(copied, ["portal"]);
  assert.equal(readFileSync(join(distDir, "portal", "index.html"), "utf8"), "portal landing");
});

test("copyStaticDirs: silently skips directories that don't exist", (t) => {
  const { rootDir, distDir } = makeFixtureRoot(t);
  const copied = copyStaticDirs(rootDir, distDir);
  assert.deepEqual(copied, []);
});

test("copyPreexistingAssets: copies assets/{images,css,js} into dist/assets/", (t) => {
  const { rootDir, distDir } = makeFixtureRoot(t);
  mkdirSync(join(rootDir, "assets", "css"), { recursive: true });
  writeFileSync(join(rootDir, "assets", "css", "style.css"), "body{}");
  const copied = copyPreexistingAssets(rootDir, distDir);
  assert.deepEqual(copied, ["css"]);
  assert.equal(readFileSync(join(distDir, "assets", "css", "style.css"), "utf8"), "body{}");
});

test("copyRootConventionFiles: copies _headers and _redirects from root into dist/", (t) => {
  const { rootDir, distDir } = makeFixtureRoot(t);
  writeFileSync(join(rootDir, "_headers"), "/*\n  X-Frame-Options: SAMEORIGIN");
  writeFileSync(join(rootDir, "_redirects"), "/src/*  /  404");
  const copied = copyRootConventionFiles(rootDir, distDir);
  assert.deepEqual(copied, ["_headers", "_redirects"]);
  assert.equal(readFileSync(join(distDir, "_headers"), "utf8"), "/*\n  X-Frame-Options: SAMEORIGIN");
  assert.equal(readFileSync(join(distDir, "_redirects"), "utf8"), "/src/*  /  404");
});

test("copyRootConventionFiles: silently skips files that don't exist", (t) => {
  const { rootDir, distDir } = makeFixtureRoot(t);
  const copied = copyRootConventionFiles(rootDir, distDir);
  assert.deepEqual(copied, []);
});

test("assembleSite: orchestrates rename + all copy steps end-to-end", (t) => {
  const { rootDir, distDir } = makeFixtureRoot(t);
  writeFileSync(join(distDir, "_vite_entry.html"), "<html>spa</html>");
  writeFileSync(join(rootDir, "index.html"), "old synced copy");
  writeFileSync(join(rootDir, "about.html"), "about");
  mkdirSync(join(rootDir, "portal"), { recursive: true });
  writeFileSync(join(rootDir, "portal", "index.html"), "portal");
  writeFileSync(join(rootDir, "_headers"), "/*\n  X-Frame-Options: SAMEORIGIN");

  const result = assembleSite(rootDir, distDir);

  assert.ok(existsSync(join(distDir, "index.html")));
  assert.equal(readFileSync(join(distDir, "index.html"), "utf8"), "<html>spa</html>");
  assert.deepEqual(result.pages, ["about.html"]);
  assert.deepEqual(result.dirs, ["portal"]);
  assert.deepEqual(result.conventionFiles, ["_headers"]);
  assert.ok(existsSync(join(distDir, "_headers")));
});
