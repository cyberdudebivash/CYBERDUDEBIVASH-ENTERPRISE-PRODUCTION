#!/usr/bin/env node
// Fetches the live Sentinel APEX threat feed and converts it into a
// NewsArticle JSON-LD graph at public/seo-intel.json, so Vite bundles it into
// dist/ the same way it already bundles public/sitemap.xml and
// public/robots.txt (see scripts/build/assemble-site.mjs) — no new mechanism.
//
// Source shape is the REAL live response (verified 2026-07-24), not the
// fictional "latest_ioc_records" mock in src/constants/ecosystemData.ts's
// ECOSYSTEM_APIS entry for this same path — that mock documents a UI demo
// payload, not this endpoint's actual JSON. Real items are CVE/threat-intel
// records: { id, title, description, severity, risk_score, timestamp,
// mitre_tactics, source, source_url, cve_ids, ... }.
//
// NewsArticle chosen over SpecialAnnouncement: schema.org's SpecialAnnouncement
// type was purpose-built for official COVID-19 announcements — reusing it for
// general CVE alerts is a real SEO-community pattern but stretches its
// documented intent. NewsArticle has no such baggage and fits threat
// bulletins cleanly.
//
// Zero runtime dependencies — Node 22 (this repo's CI Node version, see
// .github/workflows/deploy.yml) has native fetch and native Intl; nothing
// else is needed.

import { writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FEED_URL = 'https://intel.cyberdudebivash.com/api/v1/intel/latest.json';
const FETCH_TIMEOUT_MS = 15_000;
const MAX_ARTICLES = 20;
const OUTPUT_PATH = join(
  dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
  'public',
  'seo-intel.json',
);

const PUBLISHER = {
  '@type': 'Organization',
  '@id': 'https://www.cyberdudebivash.com/#organization',
  name: 'CyberDudeBivash Private Limited',
  logo: {
    '@type': 'ImageObject',
    url: 'https://www.cyberdudebivash.com/assets/images/logo.jpg',
  },
};

/** @throws on network failure, non-2xx status, or malformed JSON — never swallows. */
async function fetchLatestIntel(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': 'cyberdudebivash-seo-feed/1.0' },
    });
    if (!res.ok) {
      throw new Error(`${url} returned HTTP ${res.status}`);
    }
    const body = await res.json();
    if (!Array.isArray(body?.items)) {
      throw new Error(`${url} response missing an "items" array — feed shape may have changed`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function severityToUrgency(severity) {
  const s = String(severity ?? '').toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH') return 'High';
  if (s === 'MEDIUM') return 'Moderate';
  return 'Low';
}

/** One real feed item -> one schema.org NewsArticle node. No field is invented:
 * anything not present on the source item is simply omitted from the output. */
function itemToNewsArticle(item) {
  const headline = typeof item.title === 'string' && item.title.trim().length > 0
    ? item.title.trim()
    : `Threat advisory ${item.id ?? ''}`.trim();
  const datePublished = item.published_at ?? item.published ?? item.timestamp ?? null;
  const dateModified = item.processed_at ?? datePublished;

  const node = {
    '@type': 'NewsArticle',
    headline: headline.slice(0, 110), // Google's practical headline length guidance
    url: `https://intel.cyberdudebivash.com/#${encodeURIComponent(item.id ?? '')}`,
    publisher: PUBLISHER,
    articleSection: 'Threat Intelligence',
    isAccessibleForFree: true,
  };
  if (item.description) node.description = String(item.description).slice(0, 500);
  if (datePublished) node.datePublished = datePublished;
  if (dateModified) node.dateModified = dateModified;
  if (item.severity) {
    // Live feed items carry mitre_tactics as MITRE ATT&CK technique objects
    // ({ id, name, tactic, justification }), not plain strings — join the
    // human-readable technique name (falling back to tactic/id if a future
    // feed shape ever omits it) instead of stringifying the object.
    const tacticTerms = Array.isArray(item.mitre_tactics)
      ? item.mitre_tactics.map((t) => (typeof t === 'string' ? t : t?.name ?? t?.tactic ?? t?.id)).filter(Boolean)
      : [];
    node.keywords = [item.severity, ...tacticTerms].join(', ');
  }
  if (typeof item.risk_score === 'number') {
    node.about = { '@type': 'Thing', name: 'Risk score', additionalProperty: { '@type': 'PropertyValue', name: 'risk_score', value: item.risk_score } };
  }
  if (item.source_url) node.sameAs = item.source_url;
  if (item.severity) node.urgency = severityToUrgency(item.severity); // non-standard but harmless extra signal, ignored by parsers that don't recognize it
  return node;
}

function buildFeedDocument(feed) {
  const items = feed.items.slice(0, MAX_ARTICLES).map(itemToNewsArticle);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': 'https://www.cyberdudebivash.com/seo-intel.json#feed',
    name: 'CYBERDUDEBIVASH Sentinel APEX — Live Threat Intelligence Feed',
    description: 'Auto-generated NewsArticle structured-data feed of the latest threat intelligence, sourced from Sentinel APEX.',
    numberOfItems: items.length,
    dateModified: new Date().toISOString(),
    itemListElement: items.map((node, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: node,
    })),
    // Provenance, not part of any schema.org vocabulary — kept out of the
    // ItemList's own recognized fields so it can't be mistaken for a claim
    // about the schema itself.
    _generatedBy: 'scripts/seo/generate-seo-feed.mjs',
    _sourceFeed: FEED_URL,
    _sourceGeneratedAt: feed.generated_at ?? null,
    _sourceItemCount: feed.count ?? feed.items.length,
  };
}

async function writeAtomic(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const tmpPath = `${path}.tmp-${process.pid}`;
  await writeFile(tmpPath, contents, 'utf8');
  await rename(tmpPath, path); // atomic on the same filesystem — no reader ever sees a partial file
}

async function main() {
  const feed = await fetchLatestIntel(FEED_URL);
  const document = buildFeedDocument(feed);
  await writeAtomic(OUTPUT_PATH, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`generate-seo-feed: wrote ${document.numberOfItems} articles to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('generate-seo-feed: failed —', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
