# Enterprise Metadata Engine

Phase 1.1 deliverable. Generates strongly typed, normalized, validated
metadata objects from the Phase 1.0 data model (`src/seo/config/`) and
Phase 1.0.5 validation primitives (`src/seo/validators/shared.ts`). It
**emits no HTML, touches no DOM, and reads no files outside
`src/seo/`** — every builder is a pure function over config data
already in memory. Nothing in `src/` imports this engine yet; zero
runtime behavior changed as a result of this phase (verified below).

## Continuity note

A prior session on this program reached Phase 1.1 and made visible
progress (directory structure, a type layer, a normalizer) before
hitting a usage limit. That work was never committed or pushed — this
repository's git history (`main` and this branch) contains Phase 0,
the SEO Migration Plan, Phase 1.0, and Phase 1.0.5 only; no `src/seo`
file predates this phase. This document and the code it describes are
a fresh implementation of Phase 1.1, not a continuation of unrecoverable
in-memory state. Nothing from Phase 1.0/1.0.5 was touched or re-derived
incorrectly as a result — both were re-verified against the real,
already-merged repository state before any new code was written.

## Executive Summary

The Metadata Engine is complete: 10 pure-function modules (~340 lines)
under `src/seo/metadata/`, none imported by existing application code,
composing the Phase 1.0 data model into one `PageMetadata` record per
page. `generateAllPageMetadata()` runs cleanly against all 17 real
pages with **zero validation errors**. `npm run lint` and `npm run
build` both pass; the production bundle's module count is identical
before and after this phase (2121 modules both times — confirmed by
building with the new code stashed out and back in). 40 new unit tests
pass alongside the 24 pre-existing Phase 1.0.5 tests (64/64 total).

The `about.html` pilot comparison (below) shows the engine generates
title/canonical/description/`og:url`/`twitter:card` identically to the
live page, and correctly surfaces — rather than silently matching or
"fixing" — real, pre-existing gaps in the Phase 1.0 data model: no
page has page-specific OpenGraph copy, a page-specific OG image, or
`secondaryKeywords` captured yet, so generated OG/Twitter titles,
descriptions, images, and keyword lists diverge from `about.html`'s own
hand-authored tags. This is not a Phase 1.1 defect — it is Phase 1.0's
own documented scope (`SEO_DATA_MODEL.md`: "openGraph/twitter reuse
each page's own verified title/description rather than inventing
separate OG-specific copy this pass didn't verify per page") made
visible for the first time by actually generating output from it.

## Architecture Decisions

1. **New top-level module (`src/seo/metadata/`), not a rework of
   `validators/` or `reports/`.** The engine is a new sibling to
   `config/`, `types/`, `utils/`, `validators/`, `reports/` — matching
   this program's established one-directory-per-concern structure
   rather than nesting generation logic inside the data-model or
   validation directories.

2. **Plain functions, not classes.** Every file under `src/seo/` prior
   to this phase — every config file, every type file, all 16
   validators, `utils/lookup.ts`/`url.ts` — is written as pure
   functions and literal data, zero classes anywhere. "Builder" in
   `CanonicalBuilder`/`OpenGraphBuilder`/etc. names a module's role in
   this program's vocabulary, not a required class; implementing them
   as `buildCanonical()`, `buildOpenGraph()`, etc. keeps the engine
   consistent with every file it sits beside instead of introducing
   the codebase's first OOP construct for no functional benefit.

3. **`lowerCamelCase` filenames with verb-first exports**
   (`canonicalBuilder.ts` → `buildCanonical()`, not
   `CanonicalBuilder.ts` → `class CanonicalBuilder`), matching
   `validateCanonical.ts`/`validatePages.ts` exactly. Every single file
   under `src/seo/` before this phase uses this convention with no
   exception; Phase 1.1 doesn't introduce the first one.

4. **MetadataValidator lives in `src/seo/metadata/metadataValidator.ts`,
   not as a 17th file in `src/seo/validators/`.** Considered and
   rejected: adding `validators/validateMetadata.ts` plus registering
   it in `validators/index.ts` and `reports/generateReport.ts`'s
   `VALIDATORS` array — the same extension pattern every prior phase
   used. Rejected because the task's explicit instruction lists
   "validation engine" among the phases not to modify, and because
   `reports/generateReport.ts` and `SEO_VALIDATION_REPORT.md` describe
   a specific, already-published 16-validator/119-finding baseline;
   changing either file would change that published output. Instead,
   `validateMetadata()` **imports and reuses** Phase 1.0.5's own
   primitives (`issue`, `makeResult`, `isMissing`, `findDuplicates` from
   `validators/shared.ts`) and returns the identical `ValidationResult`
   shape — the same engine, extended with a metadata-shaped check,
   physically isolated in a new file so Phase 1.0.5's directory and
   published report stay byte-for-byte unchanged. Net effect: zero
   lines changed under `validators/` or `reports/`.
   **Impact/mitigation**: this means `generateValidationReport()`'s
   119-finding count does not include metadata-validation findings.
   Acceptable because `MetadataEngine` enforces validation on every
   call itself (throws on any error-severity issue — see Validation
   Integration below), so no metadata object can bypass validation
   regardless of whether it's also wired into the aggregate report.
   **Planned resolution**: if a future phase wants metadata findings in
   the aggregate report, wiring `validateMetadata` output into
   `generateValidationReport()` is a small, explicit addition — flagged
   here rather than done speculatively now.

5. **Output types compose Phase 1.0's types, they don't redeclare
   them.** `GeneratedOpenGraph extends OpenGraphConfig`,
   `GeneratedTwitterCard extends Omit<TwitterCardConfig, "image">`,
   `RobotsDirective` and `SEOImage` are imported, not redefined — the
   same "compose, don't redeclare" rule `page.ts`/`SEO_DATA_MODEL.md`
   already establishes for the data model applies to the engine's
   output shapes too.

6. **`robots`, `language`, `theme`, `author`, `application`,
   `verification` all resolve to explicit, documented defaults when the
   data model has no per-page value**, rather than staying optional in
   generated output (see Normalization Strategy). `PageMetadata` has no
   optional fields at all — every field is always present, because
   "the engine must produce deterministic output" (task requirement)
   is easier to guarantee when there is no undefined/present ambiguity
   for a consumer to handle.

## Completed Modules

| Component (task spec name) | File | Exports |
|---|---|---|
| Shared metadata types | `types.ts` | `PageMetadata`, `MetadataAlternateUrl`, `GeneratedOpenGraph`, `GeneratedTwitterCard`, `MetadataPublisher`, `MetadataVerificationTag` |
| MetadataNormalizer | `metadataNormalizer.ts` | `normalizeRelativePath`, `normalizeUrl`, `normalizeImage`, `normalizeKeywordList`, `dedupeAlternates`, `deriveLanguage` |
| CanonicalBuilder | `canonicalBuilder.ts` | `buildCanonical`, `BuiltCanonical` |
| OpenGraphBuilder | `openGraphBuilder.ts` | `buildOpenGraph` |
| TwitterCardBuilder | `twitterCardBuilder.ts` | `buildTwitterCard` |
| RobotsBuilder | `robotsBuilder.ts` | `buildRobots` |
| KeywordBuilder | `keywordBuilder.ts` | `buildKeywords` |
| PageMetadataBuilder | `pageMetadataBuilder.ts` | `buildPageMetadata` |
| MetadataValidator | `metadataValidator.ts` | `validateMetadata` |
| MetadataEngine | `metadataEngine.ts` | `generatePageMetadata`, `generateAllPageMetadata` |
| Public exports | `index.ts` | re-exports all of the above |

All ten IMPLEMENT-list components are complete. No `any` anywhere in
`src/seo/metadata/`.

## Files Created

```
src/seo/metadata/
  types.ts
  metadataNormalizer.ts
  canonicalBuilder.ts
  openGraphBuilder.ts
  twitterCardBuilder.ts
  robotsBuilder.ts
  keywordBuilder.ts
  pageMetadataBuilder.ts
  metadataValidator.ts
  metadataEngine.ts
  index.ts
  __tests__/
    fixtures.ts
    metadataNormalizer.test.ts
    canonicalBuilder.test.ts
    openGraphBuilder.test.ts
    twitterCardBuilder.test.ts
    robotsBuilder.test.ts
    keywordBuilder.test.ts
    pageMetadataBuilder.test.ts
    metadataValidator.test.ts
    metadataEngine.test.ts
src/seo/documentation/SEO_METADATA_ENGINE.md   (this file)
```

## Files Modified

- `src/seo/index.ts` — added `export * from "./metadata"`, completing
  the hook that file's own Phase 1.0 comment left for this phase
  ("exported here so Phase 1.1+ has one import path once it exists").
  One line added; the pre-existing `types`/`config`/`utils`/
  `validators`/`reports` exports are untouched.

No other file was modified. `about.html`, every other static page,
`App.tsx`, routing, the design system, analytics wiring,
`src/seo/config/`, `src/seo/types/`, `src/seo/utils/`,
`src/seo/validators/`, and `src/seo/reports/` are all byte-for-byte
unchanged (`git status` confirms only the one modified file and the
one new directory above).

## Metadata API

```ts
import { generatePageMetadata, generateAllPageMetadata } from "src/seo/metadata";
import { getPageById } from "src/seo";

const metadata = generatePageMetadata(getPageById("about")!); // PageMetadata
const all = generateAllPageMetadata(); // PageMetadata[], defaults to the real PAGES registry
```

`PageMetadata` (see `types.ts` for full field comments):

```ts
interface PageMetadata {
  pageId: string;
  title: string;
  description: string;
  canonical: string;                    // absolute
  alternates: MetadataAlternateUrl[];   // absolute hrefs, deduped by hreflang
  robots: RobotsDirective;
  language: string;                     // "en", derived from SiteConfig.defaultLocale
  theme: string;                        // SiteConfig.themeColor
  publisher: MetadataPublisher;         // { name, url, logo }
  author: string;                       // ORGANIZATION.legalName
  application: string;                  // SiteConfig.siteName
  openGraph: GeneratedOpenGraph;        // OpenGraphConfig + resolved `url`
  twitter: GeneratedTwitterCard;        // TwitterCardConfig with `image` always present
  keywords: string[];                   // deduplicated, normalized
  verification: MetadataVerificationTag[];
}
```

Every field is always present — no field is left `undefined` when the
underlying config is unset; see Normalization Strategy for each
field's default.

## Normalization Strategy

| Concern | Rule | Where |
|---|---|---|
| Relative → absolute URLs | Joined with `SiteConfig.domain` via the existing `utils/url.ts#toAbsoluteUrl` (reused, not reimplemented) | `normalizeUrl` |
| Trailing slashes | Stripped except for root `/` | `normalizeRelativePath` |
| Duplicate slashes | Collapsed to one | `normalizeRelativePath` |
| Whitespace | Trimmed on every path and every image alt | `normalizeUrl`, `normalizeImage` |
| Duplicate keyword values | Case-insensitive dedupe, first-seen casing and order kept | `normalizeKeywordList` |
| Duplicate alternate hreflangs | First occurrence kept, rest dropped | `dedupeAlternates` |
| Missing `canonical` | Falls back to the page's own `path` (fixes `item.html`'s known gap as a byproduct, not a one-off patch) | `buildCanonical` |
| Missing OG/Twitter title/description | Falls back to the page's own `title`/`description`, then `""` | `buildOpenGraph`, `buildTwitterCard` |
| Missing Twitter image | Falls back to the page's OpenGraph image | `buildTwitterCard` |
| Missing `robots` | Defaults to `"index,follow"` | `buildRobots` |
| Missing `secondaryKeywords`/`primaryKeyword` | Simply contribute nothing — `keywords` becomes `[]`, not an error | `buildKeywords` |

Given identical config input, every builder always produces identical
output — no current-time reads, no randomness, no I/O.

## Validation Integration

`MetadataEngine` never returns metadata without validating it first:

```ts
export function generatePageMetadata(page: SEOPage): PageMetadata {
  const metadata = buildPageMetadata(page);
  const errors = validationErrors(metadata); // MetadataValidator, error-severity only
  if (errors.length > 0) throw new Error(/* every failing check, by code */);
  return metadata;
}
```

`generateAllPageMetadata()` applies the same rule per page and, if any
page fails, throws **one aggregate error naming every failing page** —
not just the first — rather than silently dropping bad pages from its
result array. This is what "no metadata object may bypass validation"
and "validation failures must be explicit, never silently recover"
mean concretely in this codebase: a thrown, itemized `Error`, never a
default substituted in place of a failed check. See Architecture
Decision #4 for why `MetadataValidator` reuses `validators/shared.ts`
rather than duplicating its logic, and why it isn't wired into
`reports/generateReport.ts`.

## Pilot Comparison

Generated by calling `generatePageMetadata(getPageById("about")!)` (via
a throwaway script, not committed — the same method
`SEO_VALIDATION_REPORT.md` itself documents using). `about.html` was
**not modified** — its live tags were read directly from the file.

| Field | Generated | Live (`about.html`) | Match |
|---|---|---|---|
| `title` | `About CYBERDUDEBIVASH® \| AI Cybersecurity Company \| Global Security Vendor` | identical | ✅ |
| `description` | `CYBERDUDEBIVASH® is a global AI-powered cybersecurity company founded by Bivash...` | identical | ✅ |
| `canonical` | `https://www.cyberdudebivash.com/about.html` | identical | ✅ |
| `language` (`<html lang>`) | `en` | `en` | ✅ |
| `og:url` | `https://www.cyberdudebivash.com/about.html` | identical | ✅ |
| `twitter:card` | `summary_large_image` | identical | ✅ |
| `robots` | `index,follow` | `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` | ⚠️ partial — see Known Risks |
| `keywords` | `["CYBERDUDEBIVASH company"]` (1 term) | 7-term comma list | ❌ diverges |
| `author` | `CYBERDUDEBIVASH PRIVATE LIMITED` | `CYBERDUDEBIVASH Pvt. Ltd.` | ❌ diverges |
| `theme` | `#020810` | `#00FFFF` | ❌ diverges |
| `og:title` | `About CYBERDUDEBIVASH®` | `About CYBERDUDEBIVASH® \| Global AI Cybersecurity Company` | ❌ diverges |
| `og:description` | (same as `description`) | `Meet the team behind CYBERDUDEBIVASH — the AI-native cybersecurity platform...` | ❌ diverges |
| `og:site_name` | `CyberDudeBivash®` | `CYBERDUDEBIVASH` | ❌ diverges |
| `og:locale` | `en_IN` | `en_US` | ❌ diverges |
| `og:image` | `.../assets/og-banner.png` | `.../assets/images/logo.jpg` | ❌ diverges |
| `og:image:alt` | `CYBERDUDEBIVASH® AI-Powered Cybersecurity Platform Dashboard` | `CYBERDUDEBIVASH - Global AI Cybersecurity Platform` | ❌ diverges |
| `twitter:site`/`creator` | `@CDBSENTINELAPEX` | `@cyberbivash` | ❌ diverges |
| `twitter:title`/`description`/`image`/`alt` | (mirrors OG, above) | (mirrors OG, above) | ❌ diverges |
| `application` (`application-name`) | `CyberDudeBivash®` | *(tag doesn't exist on this page)* | n/a — new capability |
| `verification` (`google-site-verification`) | present, `SiteConfig.searchConsoleVerification` | *(tag doesn't exist on this page)* | n/a — new capability |

### Diff Summary

**Exact matches (6 fields)**: title, description, canonical, language,
`og:url`, `twitter:card` — every field Phase 1.0's `seo.config.ts` was
built directly from the live page's own tags reproduces exactly.

**Real, pre-existing divergences (11 fields)**, all traceable to a
documented Phase 1.0/1.0.5 data-model gap, none a Phase 1.1 defect:

- **OG/Twitter title, description, image, and locale** all diverge
  because `seo.config.ts`'s `ogFor()`/`twitterFor()` helpers deliberately
  reuse each page's main title/description and the one shared
  `SiteConfig.defaultImage`/`defaultLocale`, rather than transcribing
  `about.html`'s own separately-authored OG copy — an explicit Phase
  1.0 scope decision (`SEO_DATA_MODEL.md`, quoted above), not something
  this phase changed or should silently correct.
- **`keywords`** diverges because `about`'s `seo.config.ts` entry has
  no `secondaryKeywords` — already known: `SEO_VALIDATION_REPORT.md`
  reports 0/17 pages have `secondaryKeywords` at all.
- **`author`** diverges because no existing config field is a verbatim
  match for the live string; `ORGANIZATION.legalName` is the closest
  single source of truth this program has established (see
  `pageMetadataBuilder.ts`'s header comment) — the live text is a third,
  undocumented variant, flagged here rather than guessed into matching.
- **`theme`** diverges because `SiteConfig.themeColor` was transcribed
  from `_vite_entry.html` (the SPA), not from any individual static
  page — `about.html` apparently carries its own, different
  theme-color value; whether other static pages agree with `about.html`
  or with the SPA was not checked (out of scope for a metadata-engine
  phase; flagged in Known Risks).
- **`og:site_name`** (`CyberDudeBivash®` vs. `CYBERDUDEBIVASH`) and
  **`twitter:site`/`creator`** (`@CDBSENTINELAPEX` vs. `@cyberbivash`)
  diverge because `SiteConfig`/`ORGANIZATION`'s values were transcribed
  from `_vite_entry.html`, while `about.html` was apparently hand-authored
  with a different handle/brand-name variant at some earlier point.
- **`robots`** partially diverges: the engine's output is constrained
  to `page.ts`'s existing `RobotsDirective` union (four values, no
  `max-image-preview`-style extensions), which is the Phase 1.0 data
  model and explicitly off-limits to modify this phase — see Known
  Risks.
- **`application`/`verification`** aren't really "diverges" — they're
  tags `about.html` never had at all; the engine can now produce both
  deterministically from data already in `SiteConfig`.

None of these are metadata-engine bugs: given the real `seo.config.ts`/
`site.config.ts`/`organization.config.ts` data, every value above is
the correct, deterministic output of that data. The divergences are
content gaps in the data model that this phase's actual generation run
— for the first time — makes concrete and measurable instead of
theoretical.

## Testing Summary

40 new tests across 9 files under `src/seo/metadata/__tests__/`
(`node:test` + `node:assert/strict`, matching
`validators/__tests__/`'s existing convention exactly — no new test
framework introduced):

| Category (from the task spec) | Covered in |
|---|---|
| Normal generation | every builder's own test file; `pageMetadataBuilder.test.ts`'s first case |
| Fallback generation | `openGraphBuilder`/`twitterCardBuilder` "falls back to..." cases; `canonicalBuilder`'s item.html-shaped case |
| Missing optional fields | `pageMetadataBuilder.test.ts`'s item.html-shaped case; `keywordBuilder.test.ts`'s empty-input case |
| Canonical normalization | `canonicalBuilder.test.ts` (trailing slash, alternate dedup); `metadataNormalizer.test.ts` |
| OpenGraph | `openGraphBuilder.test.ts` (5 cases) |
| Twitter | `twitterCardBuilder.test.ts` (4 cases, including OG-image fallback) |
| Keywords | `keywordBuilder.test.ts`, `metadataNormalizer.test.ts`'s dedupe case |
| Robots | `robotsBuilder.test.ts` (explicit + default) |
| Duplicate prevention | `metadataNormalizer.test.ts` (keywords, alternates); `metadataValidator.test.ts`'s independent duplicate-keyword re-check |
| Regression scenarios | `metadataEngine.test.ts`'s real-`PAGES` end-to-end case; `metadataValidator.test.ts`'s clean-metadata case |

## Verification Results

- `npm install`: clean, `package-lock.json` unchanged, 0 vulnerabilities.
- `npm run lint` (`tsc --noEmit`): **zero errors**, including every new
  file in this phase.
- `npm run build` (`vite build` + `esbuild server.ts`): succeeds.
  **Module count identical before and after this phase — 2121 modules
  both times** (verified directly: built once with the new
  `src/seo/metadata/` code stashed out, then again with it restored).
  Confirms nothing in this phase is bundled, because nothing outside
  `src/seo/` imports it yet — same property Phase 1.0 verified for
  itself.
- Metadata tests + Validation tests: **64/64 pass** (24 pre-existing
  Phase 1.0.5 tests, unmodified and still green; 40 new Phase 1.1
  tests) via `npx tsx --test src/seo/validators/__tests__/*.test.ts
  src/seo/metadata/__tests__/*.test.ts`.
- `generateValidationReport()` (Phase 1.0.5's own engine, run fresh
  against the real data model): **0 errors, 106 warnings, 13 info** —
  identical to `SEO_VALIDATION_REPORT.md`'s published numbers. Confirms
  this phase changed nothing under `config/`/`validators/`.
- `generateAllPageMetadata()` against the real 17-page `PAGES`
  registry: succeeds, 17/17 objects returned, zero validation errors.
- `git status`: only `src/seo/index.ts` modified (one line added)
  and one new directory (`src/seo/metadata/`) — no static page, no
  `src/App.tsx`, no design-system, no config, no validator, no report
  file touched.

## Known Risks

- **`RobotsDirective`'s four-value union can't express `about.html`'s
  live directive** (`max-image-preview:large`, `max-snippet:-1`,
  `max-video-preview:-1`). Extending it is a `page.ts` (Phase 1.0 data
  model) change, explicitly out of scope this phase — flagged for
  whoever next owns that file, not silently worked around here.
- **No page has page-specific OpenGraph copy, image, or
  `secondaryKeywords` yet** — Phase 1.0's own documented scope, now
  concretely visible in the Pilot Comparison's diff rather than
  theoretical. Populating these is real content work, not an
  engineering task.
- **`author`/`theme`/`og:site_name`/Twitter handle each have a live
  value that matches neither existing config field exactly** — three
  more small, real content-drift findings in the same family as
  `organization.config.ts`'s already-documented three-different-emails
  issue. None resolved here; a business decision on which value is
  authoritative is needed, same as that earlier case.
- **Only `about.html` was spot-checked.** Whether the other 16 pages'
  live OG/Twitter copy diverges from generated output the same way, by
  how much, and whether any page's live `theme-color` disagrees with
  `SiteConfig.themeColor` the way `about.html`'s does, is not verified
  — a reasonable follow-up audit, not required by this phase's stated
  pilot scope (`about.html` only).
- **`MetadataValidator`'s findings are not part of
  `generateValidationReport()`'s aggregate output** (Architecture
  Decision #4) — acceptable today because `MetadataEngine` enforces
  validation on every call independently, but worth revisiting if a
  future phase wants one unified report covering both the data model
  and generated metadata.

## Future Recommendations

1. **Do not start Phase 1.2 (Knowledge Graph / Schema generation) or
   Phase 1.3 (Internal Linking) yet** — per this phase's own stop
   condition. Awaiting approval.
2. When page-specific OG copy/images are eventually authored (content
   work, not engineering), no engine code needs to change —
   `buildOpenGraph`/`buildTwitterCard` already prefer per-page values
   over the shared defaults; populating `seo.config.ts` is sufficient.
3. Before extending `RobotsDirective` to cover the richer live
   directive syntax, check how many of the other 16 pages actually use
   `max-image-preview`/`max-snippet`/`max-video-preview` today (only
   `about.html` was checked this phase) so the extension covers the
   real range of values, not just one page's.
4. Resolve the `author`/`theme`/`og:site_name`/Twitter-handle drift
   findings the same way the organization.config.ts three-emails issue
   is flagged for resolution — a deliberate content decision, owned by
   whoever next touches those files.
5. When Phase 1.2 needs a per-page `<script type="application/ld+json">`
   emitter, `PageMetadata`'s `publisher` field (name/url/logo) is
   already shaped closely enough to `OrganizationSchema` that Phase 1.2
   can likely read from it directly rather than re-deriving
   organization data a third time.
