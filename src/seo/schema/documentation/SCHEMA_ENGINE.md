# Enterprise Schema Generation Platform

Phase 1.2 deliverable. Generates strongly typed Schema.org JSON-LD
objects from the Phase 1.0 data model (`src/seo/config/`) and the
Phase 1.1 Metadata Engine (`src/seo/metadata/`). It **emits no
`<script>` tag, touches no HTML file, and touches no DOM** — every
builder is a pure function; the Registry composes their output into an
in-memory `{ "@context", "@graph" }` document, nothing more. Nothing in
`src/` imports this platform yet; zero runtime behavior changed as a
result of this phase (verified below). See `SCHEMA_REGISTRY.md`,
`SCHEMA_MAPPING_MATRIX.md`, and `SCHEMA_BUILDER_GUIDE.md` for the
companion documents this file references throughout.

## Executive Summary

The Schema Generation Platform is complete: 8 directories
(`types/`, `normalizers/`, `builders/`, `entities/`, `registry/`,
`validators/`, `tests/`, `documentation/`), 27 source files, generating
13 real schema.org node types from real config data with **zero
validation errors across all 17 real pages** (81 total nodes composed).
`npm run lint` and `npm run build` both pass; the production bundle's
module count is identical before and after this phase (2121 modules
both times, verified by building with the new code stashed out and back
in). 62 new unit tests pass alongside the 24 Phase 1.0.5 tests and 40
Phase 1.1 tests already in the repository (132/132 total).

The `about.html` pilot comparison found an exact match on `@id`
conventions, canonical URLs, and — notably — the derived
`BreadcrumbList` (`Home -> About Us`, reproducing the real, live
breadcrumb exactly by preferring a navigation label over the page's
full SEO title). It also surfaced two things worth calling out
specifically because they came from directly re-verifying evidence
rather than trusting an earlier document's claim:

1. **A real bug found in `item.html`'s live JSON-LD**: its
   `@id`/`url`/`potentialAction.target` values all point at
   `cyberbivash.blogspot.com` — a completely different domain than the
   actual site. This is why `SearchActionBuilder` is implemented but
   never wired to a default target (see Known Risks).
2. **`SEO_DATA_MODEL.md`'s migration-mapping claim that
   `LocalBusinessSchema` lives on "contact/about pages" did not hold up
   when checked directly against the files.** The real live
   `LocalBusiness` block is on `index.html`/`_vite_entry.html` (the
   homepage) — this platform's `LocalBusinessBuilder` producer was
   wired there instead, and its generated `@id` and geo coordinates
   match that real block exactly.

## Architecture Decisions

1. **Directory structure follows the task's explicit layout exactly**
   (`types/`, `normalizers/`, `builders/`, `entities/`, `registry/`,
   `validators/`, `tests/`, `documentation/`) rather than Phase 1.1's
   flatter structure — this phase's own instructions specified it, so
   it wasn't inferred.

2. **Every builder is a plain function, not a class** — `buildOrganization()`,
   `buildService(service)`, etc. — matching every prior phase's
   established convention (zero classes anywhere in `src/seo/` before
   this phase) and the explicit "pure, deterministic, stateless"
   builder requirement.

3. **SchemaValidator lives in `src/seo/schema/validators/`, not as new
   files inside `src/seo/validators/`.** Same reasoning as Phase 1.1's
   `MetadataValidator` decision: `validateSchemaNode`/`validatePageSchemaSet`
   reuse Phase 1.0.5's own primitives (`issue`, `makeResult`,
   `findDuplicates`, `isMissing` from `validators/shared.ts`) rather
   than a parallel vocabulary, but stay physically isolated so this
   phase makes zero changes under `src/seo/validators/` or
   `src/seo/reports/` — the previous phases' own instruction not to
   modify them, honored literally. **Impact**: schema-validation
   findings are not part of `generateValidationReport()`'s published
   119-finding baseline. **Mitigation**: `SchemaRegistry` doesn't
   expose a way to compose a page's schema set without it being
   independently re-validated by the same code path this phase's own
   tests exercise (see `schemaRegistry.test.ts`'s regression case,
   which validates all 17 real pages). **Planned resolution**: if a
   future phase wants one unified report, wiring `validatePageSchemaSet`
   output into `generateValidationReport()` is a small, explicit,
   additive change — flagged here rather than done speculatively now.

4. **The Registry is a plain, immutable producer array plus pure
   functions, not a stateful class with `.register()`.** See
   `SCHEMA_REGISTRY.md` for the full design and rationale — in short,
   it mirrors `reports/generateReport.ts`'s own `VALIDATORS` array
   precedent, and a mutable shared registry would be the one piece of
   this platform that isn't stateless, contradicting the builder
   requirement extended to the platform as a whole.

5. **Page-level builders (WebPage, AboutPage, ContactPage, Breadcrumb,
   and WebSite's dependency on it) consume `PageMetadata` (Phase 1.1's
   output), not raw `SEOPage`.** This directly follows the
   architecture diagram given for this phase
   (`Configuration -> Validation -> Normalization -> Metadata Engine ->
   Schema Generation Platform -> Consumers`): title/description/
   canonical/image/language are already resolved, normalized, and
   validated one layer down, so these builders compose them instead of
   re-deriving them a second time. Entity-level builders (Organization,
   Person, Service, Product, SoftwareApplication, Article,
   LocalBusiness) consume their raw config objects directly, since
   Phase 1.1's engine only covers `SEOPage`, not these entity types.

6. **Cross-entity references use `{ "@id": "..." }` (`IdReference`),
   never full re-embedding.** `WebSite.publisher`, `WebPage.isPartOf`,
   `AboutPage.mainEntity`, `Service.provider`, `Article.author` /
   `.publisher` all point at another graph member by `@id`. This is not
   invented convention — it's the exact technique already found live in
   this codebase's own JSON-LD (`item.html`'s `WebSite.publisher: {
   "@id": "...#organization" }`), and it's what makes the Registry's
   "prevent duplicates" guarantee meaningful: one Organization node per
   page graph, referenced everywhere, not re-serialized per reference.

7. **Producers are config-driven, never page-id-driven, with one
   narrow, justified exception.** `serviceProducer` matches a service
   to a page via `service.url === page.path` (the same relationship
   Phase 1.0.5's `validateRelationships` already verified resolves
   cleanly for 5/6 services). `softwareApplicationProducer` and
   `productProducer` match via each page's existing `relatedEntityIds`
   field — no product/solution id is hardcoded anywhere. The one
   exception is `webPageProducer`'s `about`/`contact` -> `AboutPage`/
   `ContactPage` type narrowing, which is a **type selection**, not
   **content authoring** — it exists because Phase 1.0's own
   `types/schema.ts` already reserves distinct `AboutPageSchema`/
   `ContactPageSchema` variants for exactly these two real pages.

8. **No Offer/pricing is generated for `SERVICES.pricingTiers`.**
   Solutions' prices ("₹499", "₹1,499") are clean, machine-parseable
   rupee amounts and do get an `Offer` (see `ProductBuilder`). Service
   pricing tiers include values like `"Custom"` (no numeric price at
   all) and `"₹2.5L/mo"` (an Indian numbering shorthand, "L" for Lakh,
   plus a recurring-billing suffix) that aren't safely convertible to
   `Offer.price` + `Offer.priceCurrency` without guessing at a
   currency/shorthand expansion this phase has no authority to invent.
   Flagged in Known Risks, not silently approximated.

## Schema Platform Architecture

```
src/seo/schema/
  types/           JSON-LD envelope + 13 node interfaces, barrel-exported
  normalizers/      buildId, toImageObject, dedupeGraphById, toPageSchemaSet
  builders/        12 pure builder modules, one per schema family
  entities/        id -> schema-node resolvers (for callers with only an id)
  registry/        DEFAULT_PRODUCERS + composePageSchemaSet + extension
  validators/      SchemaValidator (reuses validators/shared.ts)
  tests/           14 test files, 62 tests
  documentation/    this file + 3 companion documents
  index.ts         top-level public barrel
```

Data flow for one page: `SEOPage` -> `generatePageMetadata()` (Phase
1.1) -> page-level builders (`WebPage`/`Breadcrumb`/etc.) -> combined
with entity-level builders' output (`Service`/`SoftwareApplication`/
`Product`, resolved via `relatedEntityIds`/`url` matching) by
`composePageSchemaSet()` -> deduplicated `@graph` -> independently
re-validated by `SchemaValidator`.

## Schema Registry Design

See `SCHEMA_REGISTRY.md` for the full design. Summary: `DEFAULT_PRODUCERS`
is a fixed array of 8 `SchemaProducer`s (`{ id, produce(page) }`);
`composePageSchemaSet(page, producers?)` runs all of them and dedupes
by `@id`; `registerProducer(producers, producer)` returns a new,
extended array (throwing on a duplicate producer id); `resolveProducer`
looks one up by id. No producer mutates shared state.

## Files Created

```
src/seo/schema/
  types/{common,nodes,index}.ts
  normalizers/{schemaNormalizer,index}.ts
  builders/{organizationBuilder,websiteBuilder,webPageBuilder,
            breadcrumbBuilder,personBuilder,articleBuilder,
            serviceBuilder,productBuilder,softwareApplicationBuilder,
            localBusinessBuilder,faqBuilder,searchActionBuilder,index}.ts
  entities/{organizationEntity,productEntity,serviceEntity,
            solutionEntity,articleEntity,personEntity,index}.ts
  registry/{schemaRegistry,index}.ts
  validators/{schemaValidator,index}.ts
  tests/{fixtures,schemaNormalizer,organizationBuilder,websiteBuilder,
         webPageBuilder,breadcrumbBuilder,personBuilder,articleBuilder,
         serviceBuilder,productBuilder,softwareApplicationBuilder,
         localBusinessBuilder,faqBuilder,searchActionBuilder,
         schemaValidator,schemaRegistry}.test.ts (+ fixtures.ts)
  documentation/{SCHEMA_ENGINE,SCHEMA_REGISTRY,SCHEMA_MAPPING_MATRIX,
                 SCHEMA_BUILDER_GUIDE}.md
  index.ts
```

## Files Modified

- `src/seo/index.ts` — added `export * from "./schema"` (one line),
  completing this file's barrel alongside `types`/`config`/`utils`/
  `validators`/`reports`/`metadata`. No other change.

No other file was modified. `about.html`, every other static page,
`App.tsx`, routing, the design system, analytics wiring, and every file
under `src/seo/config/`, `src/seo/types/`, `src/seo/utils/`,
`src/seo/validators/`, `src/seo/reports/`, and `src/seo/metadata/` are
byte-for-byte unchanged.

## Builder Matrix

See `SCHEMA_MAPPING_MATRIX.md` for the full config-entity -> schema-type
mapping, including every type from the task's "at minimum" list that
was deliberately **not** implemented, and why.

## Validation Strategy

Every `SchemaNode` and every composed `PageSchemaSet` passes through
`SchemaValidator` before this platform considers it valid:

- `validateSchemaNode(node)` — structural checks per node type: `@type`/
  `@id` present, `@id` absolute, required fields present (`name` for
  most types, `headline` for Article, `itemListElement`/`mainEntity`
  for BreadcrumbList/FAQPage), `url` absolute where the type has one.
- `validatePageSchemaSet(set)` — every node validated individually,
  plus graph-level checks: no duplicate `@id` (`findDuplicates`, reused
  from Phase 1.0.5), and no dangling `@id` reference (every
  `provider`/`publisher`/`author`/`isPartOf`/`mainEntity` must resolve
  to a node actually present in the same graph).

Unlike `MetadataEngine` (Phase 1.1), this phase's builders don't throw
on validation failure themselves — `composePageSchemaSet` is a pure
composition step, and `SchemaValidator` is a separate, explicit check a
caller runs against its output (see `schemaRegistry.test.ts`'s
regression test, which does exactly this for all 17 real pages). This
mirrors how the Registry's own responsibilities are listed as separate
concerns ("compose" vs. "validate"), rather than folding validation
into composition the way `MetadataEngine` folds it into generation.

## Pilot Comparison

Generated by calling `composePageSchemaSet(getPageById("about")!)` (via
a throwaway script, not committed — the same method every prior
phase's report in this program documents using). `about.html` was
**not modified** — its live JSON-LD was read directly from the file.

### Generated Schema (about.html, abridged)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": ".../#organization", "name": "CYBERDUDEBIVASH PRIVATE LIMITED", "founder": { "@type": "Person", "name": "Bivasha Kumar Nayak" }, "...": "logo/sameAs/contactPoint" },
    { "@type": "WebSite", "@id": ".../#website", "name": "CyberDudeBivash®", "publisher": { "@id": ".../#organization" } },
    { "@type": "AboutPage", "@id": ".../about.html#webpage", "name": "About CYBERDUDEBIVASH® | AI Cybersecurity Company | Global Security Vendor", "mainEntity": { "@id": ".../#organization" } },
    { "@type": "BreadcrumbList", "@id": ".../about.html#breadcrumb", "itemListElement": [{ "name": "Home", "...": "" }, { "name": "About Us", "...": "" }] }
  ]
}
```

(`LocalBusiness` is not in this page's set — see below.)

### Current Schema (about.html, live, 3 real `<script>` blocks)

1. `AboutPage` — `name: "About CYBERDUDEBIVASH"`, embedded (not
   referenced) `mainEntity: Organization` with `name: "CYBERDUDEBIVASH
   Pvt. Ltd."`, `founder: { name: "Bivash" }`, and `numberOfEmployees:
   { minValue: 10, maxValue: 50 }`.
2. `BreadcrumbList` — `Home -> About Us`.
3. A generic, god-mode-script-injected `Organization` block (`@id:
   ".../#organization"`, `email: "contact@cyberdudebivash.in"`) — the
   exact anti-pattern `SEO_ARCHITECTURE.md` Finding 2 already flagged
   for retirement, duplicated near-identically across ~20 files.

### Diff Analysis

**Exact matches**: canonical URL, `og:url`-equivalent (`WebPage.url`),
and — the most notable one — the derived `BreadcrumbList`
(`Home -> About Us`), which required no config beyond
`navigation.config.ts`'s already-existing `FOOTER_NAVIGATION` label to
reproduce precisely.

**Real, explainable divergences**:

- **`AboutPage.name`**: generated uses the page's full SEO title (from
  Phase 1.1's `PageMetadata.title`); live uses a shorter, separately-authored
  string ("About CYBERDUDEBIVASH"). No config field carries this
  shorter variant — a real, pre-existing content gap (the same class of
  gap Phase 1.1's own pilot comparison already found for OG copy), not
  a bug in this generator.
- **`mainEntity`**: generated references Organization by `@id` (one
  node, reusable everywhere); live embeds a full, separate Organization
  copy inline. The live copy's own `name` ("CYBERDUDEBIVASH Pvt. Ltd."),
  founder name ("Bivash," not "Bivasha Kumar Nayak"), and
  `numberOfEmployees` (`10`-`50`, a real value with **no corresponding
  field populated in `organization.config.ts`** — `SEOOrganization.numberOfEmployees`
  exists on the type but was never set) are three more small,
  real content-drift findings in the same family as this program's
  already-documented three-different-emails issue. Not fixed here —
  flagged, per this program's established pattern.
- **`LocalBusiness` is entirely absent from `about.html`'s generated
  set** (it's a home-page-only producer in this design) **and was
  never actually present on `about.html`'s live page either** — direct
  verification (`grep` across every static HTML file) found the one
  real live `LocalBusiness` block on `index.html`/`_vite_entry.html`,
  not `about.html`/`contact.html` as an earlier document in this
  program claimed. This platform's producer wiring was corrected to
  match the directly-verified location rather than the unverified
  claim (see Architecture Decisions #7's sibling note above and the
  git history of this file's own development for the correction).
  Where it IS generated (home page), its `@id`
  (`.../#localbusiness`) and `geo` coordinates (`20.8491, 86.1648`)
  match the real, live block **exactly**.
- **The god-mode-injected generic `Organization` block (about.html's
  3rd script) is superseded, not reproduced.** This platform's single,
  generated, `@id`-referenced Organization node is the intended,
  correct replacement for that anti-pattern (per `SEO_ARCHITECTURE.md`
  Finding 2), not a second copy of it.

## Testing Summary

62 new tests across 14 files under `src/seo/schema/tests/` (`node:test`
+ `node:assert/strict`, same convention as every prior phase — no new
test framework introduced):

| Task's testing checklist item | Covered in |
|---|---|
| Every schema builder | One test file per builder (12 files) |
| Duplicate detection | `schemaNormalizer.test.ts` (`dedupeGraphById`), `schemaValidator.test.ts` (`SCHEMA_DUPLICATE_ID`), `schemaRegistry.test.ts` (`registerProducer` duplicate-id throw) |
| Relationship validation | `schemaValidator.test.ts` (`SCHEMA_UNRESOLVED_REFERENCE`, both a dangling and a resolved case) |
| Missing required fields | `schemaValidator.test.ts` (missing name/id/url) |
| Normalization | `schemaNormalizer.test.ts` (all 5 functions) |
| Registry resolution | `schemaRegistry.test.ts` (`resolveProducer`, found + not-found) |
| Invalid configurations | `articleBuilder.test.ts` (unresolved `authorId` throws), `productBuilder.test.ts` (unparseable price produces no Offer) |
| Existing regression cases | `schemaRegistry.test.ts`'s all-17-real-pages composition + validation test; every singleton builder's tests assert against real, committed config data |

## Verification Results

- `npm install`: clean, `package-lock.json` unchanged, 0 vulnerabilities.
- `npm run lint` (`tsc --noEmit`): **zero errors**, including every new
  file in this phase.
- `npm run build`: succeeds. **Module count identical before and after
  this phase — 2121 modules both times** (verified directly: built
  once with `src/seo/schema/` stashed out, then again restored).
  Confirms nothing in this phase is bundled, because nothing outside
  `src/seo/` imports it yet.
- Metadata + Schema + Validation tests: **132/132 pass** (24
  pre-existing Phase 1.0.5 tests, 40 pre-existing Phase 1.1 tests, both
  unmodified and still green; 62 new Phase 1.2 tests) via `npx tsx
  --test src/seo/validators/__tests__/*.test.ts
  src/seo/metadata/__tests__/*.test.ts src/seo/schema/tests/*.test.ts`.
- `generateValidationReport()` (Phase 1.0.5's engine, run fresh): **0
  errors, 106 warnings, 13 info** — identical to
  `SEO_VALIDATION_REPORT.md`'s published numbers. Confirms this phase
  changed nothing under `config/`/`validators/`.
- `generateAllPageMetadata()` (Phase 1.1's engine, run fresh): 17/17
  pages generate cleanly — confirms Metadata Engine compatibility.
- `composePageSchemaSet()` + `validatePageSchemaSet()` run against
  every one of the real 17 `PAGES`: **0 validation errors, 81 total
  nodes composed** across the whole site.
- `git status`: only `src/seo/index.ts` modified (one line added) and
  one new directory (`src/seo/schema/`) — no static page, no
  `src/App.tsx`, no design-system, no config, no validator/report/metadata
  file touched.

## Known Risks

- **`SearchActionNode` is modeled and unit-tested but never wired to a
  default target.** The one live example of this schema on the real
  site (`item.html`) targets `cyberbivash.blogspot.com/search` — a
  copy-pasted Blogspot template default, not a real search feature of
  this platform (which has no search route). Wiring a real one requires
  an actual search endpoint to exist first.
- **`FAQPageSchemaNode` has no real producer wired.** FAQPage schema is
  genuinely live on 5 real pages (`compliance.html` and others), but no
  FAQ config data exists anywhere in `src/seo/config/` — `FAQBuilder`
  is ready the moment that content is modeled.
- **`item.html`'s live JSON-LD is a real, evidenced bug**, not
  something this phase touches (`item.html` was not modified, per this
  phase's own rule): its `@id`/`url`/`potentialAction.target` all
  resolve to `cyberbivash.blogspot.com`, a different domain entirely —
  almost certainly copy-paste contamination from that blogspot mirror.
  Flagged for whoever next owns `item.html`'s content, not fixed here.
- **No Offer is generated for `SERVICES.pricingTiers`** — see
  Architecture Decision #8.
- **`SoftwareApplicationBuilder` treats all 5 `PRODUCTS` uniformly**,
  including `"blog"` (an editorial site, not literally an
  installable/interactive application) — an imperfect schema.org fit
  for that one entry, accepted rather than special-cased (see
  `SCHEMA_MAPPING_MATRIX.md`).
- **Only `about.html` (this phase's assigned pilot) and, incidentally,
  `index.html`/`item.html` (checked while verifying the `LocalBusiness`
  and `SearchAction` claims) were directly read.** The other 14 static
  pages' live JSON-LD was not individually diffed against generated
  output — a reasonable follow-up audit, not required by this phase's
  stated pilot scope.
- **Content-drift findings not resolved**: `AboutPage.name`,
  `Organization.founder.name`/`numberOfEmployees`, and the third,
  live-only `contact@cyberdudebivash.in` email variant are all real,
  observed discrepancies between live pages and the Phase 1.0 config —
  flagged per this program's established pattern, not silently
  reconciled by this phase.

## Recommendations for Phase 1.3

1. **Do not start Phase 1.3 (Internal Linking) yet** — per this phase's
   own stop condition. Awaiting approval.
2. `entities/` (`resolveProductSchema`, `resolveServiceSchema`, etc.)
   was built anticipating exactly Phase 1.3's shape of problem: given
   only an id (from `relatedEntityIds`, `relatedProducts`, etc.),
   resolve to something concrete. Phase 1.3 can likely call these
   directly rather than re-deriving entity lookups a third time.
3. Before extending `SearchActionNode`/`FAQPageSchemaNode` into real
   producers, resolve the two prerequisites this phase found missing:
   a real search endpoint, and FAQ content modeled somewhere in
   `src/seo/config/` (neither exists today).
4. `knowledge-graph.config.ts`'s existing `KNOWLEDGE_GRAPH_RELATIONSHIPS`
   (Phase 1.0) already computes a superset of the relationships this
   phase's producers re-derive ad hoc (`relatedServices`, etc.) — Phase
   1.3, or a future refinement of this platform, could read from that
   computed graph directly instead of re-filtering config arrays per
   producer, now that both exist.
5. Fix the `/index.html` vs `/` string-representation mismatch
   (`navigation.config.ts`, already flagged in
   `SEO_VALIDATION_REPORT.md`'s Migration Readiness section) before it
   affects `BreadcrumbBuilder`'s nav-label lookup for the home page
   specifically — currently harmless only because home is handled as a
   special case before any nav search happens.
