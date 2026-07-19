#!/usr/bin/env node
// Verifies dist/ is a correct, complete production artifact before anything
// deploys it. This is what makes both GitHub Actions and Cloudflare Pages fail
// their build step closed instead of silently shipping something broken —
// Cloudflare in particular has no other gate, since it no longer has a human
// re-syncing a second file to double-check against.
//
// Scope is deliberately grounded in what's actually true today: there is one
// generated artifact, not two to reconcile, and the SEO/schema/metadata tags
// checked here are the existing hand-authored ones in _vite_entry.html — the
// src/seo/ generation platform isn't wired into the build, so there's nothing
// from it to verify yet.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ASSET_REF_RE = /(?:src|href)="(\/assets\/[^"]+)"/g;

function readText(path) {
  return readFileSync(path, 'utf8');
}

function extractAssetRefs(html) {
  const refs = new Set();
  for (const match of html.matchAll(ASSET_REF_RE)) {
    refs.add(match[1].replace(/^\//, '')); // "assets/index-abc.js"
  }
  return refs;
}

/** dist/index.html's script/link/modulepreload refs must resolve to real files. */
export function checkAssetReferencesResolve(distDir) {
  const indexPath = join(distDir, 'index.html');
  const html = readText(indexPath);
  const refs = extractAssetRefs(html);
  if (refs.size === 0) {
    return { ok: false, message: 'dist/index.html has zero /assets/ references — build likely broken' };
  }
  const missing = [...refs].filter((rel) => !existsSync(join(distDir, rel)));
  if (missing.length > 0) {
    return { ok: false, message: `dist/index.html references missing assets: ${missing.join(', ')}` };
  }
  return { ok: true, message: `${refs.size} asset reference(s) all resolve`, refs };
}

/** Vite-hashed top-level files in dist/assets/ that nothing in index.html references. */
export function checkNoOrphanedHashedAssets(distDir, referencedRefs) {
  const assetsDir = join(distDir, 'assets');
  if (!existsSync(assetsDir)) {
    return { ok: false, message: 'dist/assets/ does not exist' };
  }
  const topLevelHashed = readdirSync(assetsDir).filter((name) => {
    const full = join(assetsDir, name);
    return statSync(full).isFile() && /-[A-Za-z0-9_-]{6,}\.(js|css|ico)$/.test(name);
  });
  const referencedBasenames = new Set([...referencedRefs].map((r) => r.split('/').pop()));
  const orphaned = topLevelHashed.filter((name) => !referencedBasenames.has(name));
  if (orphaned.length > 0) {
    return { ok: false, message: `orphaned hashed assets not referenced by index.html: ${orphaned.join(', ')}` };
  }
  return { ok: true, message: `${topLevelHashed.length} hashed asset(s), none orphaned` };
}

/** Basic structural sanity — not a full HTML parse, just guards against a broken/truncated build. */
export function checkHtmlWellFormed(distDir) {
  const html = readText(join(distDir, 'index.html'));
  const problems = [];
  if (!/^\s*<!doctype html/i.test(html)) problems.push('missing <!doctype html>');
  if (!/<title>[^<]+<\/title>/i.test(html)) problems.push('missing non-empty <title>');
  if (!/<\/html>\s*$/i.test(html.trimEnd())) problems.push('does not end with </html> — looks truncated');
  const placeholderLeftover = html.match(/%[A-Z_]+%|\{\{[^}]*\}\}/);
  if (placeholderLeftover) problems.push(`unprocessed template placeholder: ${placeholderLeftover[0]}`);
  if (problems.length > 0) {
    return { ok: false, message: `HTML structural issues: ${problems.join('; ')}` };
  }
  return { ok: true, message: 'HTML structurally sound' };
}

/** Hand-authored meta/canonical/JSON-LD tags must survive the build intact and parse cleanly. */
export function checkMetadataAndSchema(distDir) {
  const html = readText(join(distDir, 'index.html'));
  const problems = [];
  if (!/<meta\s+name="description"\s+content="[^"]+"/i.test(html)) problems.push('missing meta description');
  if (!/<link\s+rel="canonical"\s+href="[^"]+"/i.test(html)) problems.push('missing canonical link');

  const ldJsonBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (ldJsonBlocks.length === 0) problems.push('no JSON-LD blocks found');
  ldJsonBlocks.forEach((m, i) => {
    try {
      JSON.parse(m[1]);
    } catch (err) {
      problems.push(`JSON-LD block #${i + 1} does not parse: ${err.message}`);
    }
  });

  // Not expected to exist today (CSP is enforced at Cloudflare's edge via _headers,
  // not via meta tag) — only flag one if it's present AND malformed.
  const cspMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i);
  if (cspMatch && cspMatch[1].trim().length === 0) problems.push('empty CSP meta tag content');

  if (problems.length > 0) {
    return { ok: false, message: `metadata/schema issues: ${problems.join('; ')}` };
  }
  return { ok: true, message: `metadata present, ${ldJsonBlocks.length} JSON-LD block(s) valid` };
}

/** public/favicon.ico must have made it into dist/ (Vite copies public/ automatically). */
export function checkFavicon(distDir) {
  const faviconPath = join(distDir, 'favicon.ico');
  if (!existsSync(faviconPath)) {
    return { ok: false, message: 'dist/favicon.ico missing' };
  }
  if (statSync(faviconPath).size === 0) {
    return { ok: false, message: 'dist/favicon.ico is empty' };
  }
  return { ok: true, message: 'dist/favicon.ico present' };
}

/** public/sitemap.xml and public/robots.txt must have made it into dist/ (Vite copies public/ automatically). */
export function checkSitemapAndRobots(distDir) {
  const problems = [];
  const sitemapPath = join(distDir, 'sitemap.xml');
  const robotsPath = join(distDir, 'robots.txt');
  if (!existsSync(sitemapPath)) {
    problems.push('dist/sitemap.xml missing');
  } else {
    const xml = readText(sitemapPath);
    if (!/<urlset|<\?xml/i.test(xml)) problems.push('dist/sitemap.xml does not look like XML');
  }
  if (!existsSync(robotsPath)) {
    problems.push('dist/robots.txt missing');
  } else if (readText(robotsPath).trim().length === 0) {
    problems.push('dist/robots.txt is empty');
  }
  if (problems.length > 0) {
    return { ok: false, message: problems.join('; ') };
  }
  return { ok: true, message: 'sitemap.xml and robots.txt present and well-formed' };
}

export function verifyDist(distDir) {
  const results = {};
  results.assetReferences = checkAssetReferencesResolve(distDir);
  results.noOrphanedAssets = results.assetReferences.ok
    ? checkNoOrphanedHashedAssets(distDir, results.assetReferences.refs)
    : { ok: false, message: 'skipped — asset references check failed first' };
  results.htmlWellFormed = checkHtmlWellFormed(distDir);
  results.metadataAndSchema = checkMetadataAndSchema(distDir);
  results.favicon = checkFavicon(distDir);
  results.sitemapAndRobots = checkSitemapAndRobots(distDir);
  return results;
}

function isMain() {
  return process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
}

if (isMain()) {
  const distDir = join(process.cwd(), 'dist');
  const results = verifyDist(distDir);
  let allOk = true;
  for (const [check, result] of Object.entries(results)) {
    const label = result.ok ? '✅' : '❌';
    console.log(`${label} ${check}: ${result.message}`);
    if (!result.ok) allOk = false;
  }
  if (!allOk) {
    console.error('\nverify-dist: FAILED — refusing to let this build deploy.');
    process.exit(1);
  }
  console.log('\nverify-dist: all checks passed.');
}
