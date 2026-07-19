#!/usr/bin/env node
// Assembles the complete production site into dist/ after `vite build` has run.
// Vite only builds the SPA entry (_vite_entry.html + hashed assets); everything
// else that makes up the real site — the standalone static pages, portal/,
// react-portal/, and the pre-existing hand-authored assets/{images,css,js} —
// gets copied in here so dist/ is the one complete, deployable artifact both
// GitHub Pages and Cloudflare Pages publish verbatim.

import { existsSync, mkdirSync, readdirSync, copyFileSync, renameSync, cpSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const EXCLUDED_HTML = new Set([
  '_vite_entry.html', // Vite's own build entry, already consumed by `vite build`
  'index.html', // the old hand-synced root copy — part of the SPA chain, not a standalone page
]);
const COPY_DIRS = ['portal', 'react-portal'];
const ASSET_SUBDIRS = ['images', 'css', 'js'];

/** Renames Vite's built entry file to index.html — the one canonical production HTML. */
export function promoteEntryHtml(distDir) {
  const entryPath = join(distDir, '_vite_entry.html');
  const indexPath = join(distDir, 'index.html');
  if (!existsSync(entryPath)) {
    throw new Error(`assemble-site: ${entryPath} not found — did "vite build" run first?`);
  }
  renameSync(entryPath, indexPath);
  return indexPath;
}

/** Copies every standalone static HTML page at repo root into dist/, verbatim. */
export function copyStaticPages(rootDir, distDir) {
  const copied = [];
  for (const name of readdirSync(rootDir)) {
    if (!name.endsWith('.html') || EXCLUDED_HTML.has(name)) continue;
    const src = join(rootDir, name);
    if (!statSync(src).isFile()) continue;
    copyFileSync(src, join(distDir, name));
    copied.push(name);
  }
  return copied.sort();
}

/** Copies whole directories (portal/, react-portal/) into dist/ verbatim, if present. */
export function copyStaticDirs(rootDir, distDir, dirNames = COPY_DIRS) {
  const copied = [];
  for (const name of dirNames) {
    const src = join(rootDir, name);
    if (existsSync(src)) {
      cpSync(src, join(distDir, name), { recursive: true });
      copied.push(name);
    }
  }
  return copied;
}

/** Copies pre-existing hand-authored assets/{images,css,js} into dist/assets/, if present. */
export function copyPreexistingAssets(rootDir, distDir, subdirs = ASSET_SUBDIRS) {
  const copied = [];
  for (const sub of subdirs) {
    const src = join(rootDir, 'assets', sub);
    if (existsSync(src)) {
      const dest = join(distDir, 'assets', sub);
      mkdirSync(dest, { recursive: true });
      cpSync(src, dest, { recursive: true });
      copied.push(sub);
    }
  }
  return copied;
}

export function assembleSite(rootDir, distDir) {
  const indexPath = promoteEntryHtml(distDir);
  const pages = copyStaticPages(rootDir, distDir);
  const dirs = copyStaticDirs(rootDir, distDir);
  const assetDirs = copyPreexistingAssets(rootDir, distDir);
  return { indexPath, pages, dirs, assetDirs };
}

function isMain() {
  return process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
}

if (isMain()) {
  const rootDir = process.cwd();
  const distDir = join(rootDir, 'dist');
  const result = assembleSite(rootDir, distDir);
  console.log(`assemble-site: promoted ${basename(result.indexPath)}`);
  console.log(`assemble-site: copied ${result.pages.length} static pages: ${result.pages.join(', ')}`);
  console.log(`assemble-site: copied dirs: ${result.dirs.join(', ') || '(none found)'}`);
  console.log(`assemble-site: copied pre-existing asset subdirs: ${result.assetDirs.join(', ') || '(none found)'}`);
}
