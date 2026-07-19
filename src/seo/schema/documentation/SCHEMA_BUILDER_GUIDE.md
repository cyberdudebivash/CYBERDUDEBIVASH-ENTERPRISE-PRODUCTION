# Schema Builder Guide

How this platform's builders are structured, and how to add a new one.
See `SCHEMA_ENGINE.md` for the platform-wide report and
`SCHEMA_MAPPING_MATRIX.md` for which schema.org types are already
covered.

## What a builder is

A builder is a plain, exported function that takes either a `PageMetadata`
(Phase 1.1 output, for anything page-shaped) or a raw config entity
(`SEOService`, `SEOProduct`, `SEOSolution`, `SEOArticle`, `SEOAuthor`,
for anything entity-shaped), and returns exactly one `SchemaNode`. Every
builder in `src/seo/schema/builders/` follows this shape:

```ts
export function buildX(input: InputType): XSchemaNode {
  return {
    "@type": "X",
    "@id": /* via buildId() from normalizers/ */,
    /* ...fields, each traced to a real, named source... */
  };
}
```

## The four rules every builder follows

1. **Pure.** No I/O, no network access, no reading the filesystem, no
   reading the DOM — a builder is given data and returns data.
2. **Deterministic.** The same input always produces the same output —
   no `Date.now()`, no randomness, no reliance on iteration order that
   isn't already stable.
3. **Stateless.** No builder holds state between calls; nothing here is
   a class with instance fields.
4. **Traceable.** Every field either comes from a named, real config
   value, or is one of a small number of explicit, documented defaults
   (e.g. `SoftwareApplicationBuilder`'s fixed `applicationCategory:
   "SecurityApplication"`, justified by name in that file's own header
   comment). Nothing is a silent guess — see `SCHEMA_MAPPING_MATRIX.md`'s
   "deliberately not implemented" table for what happens when no real
   source exists: the type isn't built at all, rather than built from
   invented data.

## Where fields come from: three layers

1. **Reused directly from Phase 1.0 config** — e.g.
   `ORGANIZATION.name`, `SITE_CONFIG.themeColor`.
2. **Reused from Phase 1.1's Metadata Engine** — every page-level
   builder's `title`/`description`/`canonical`/`image`/`language` comes
   from `generatePageMetadata(page)`, never re-derived from `SEOPage`
   directly. If you're adding a page-level builder and find yourself
   reaching into `page.title` or `page.openGraph` instead of
   `metadata.title`/`metadata.openGraph`, that's a sign the field
   belongs one layer up, in Phase 1.1, not here.
3. **Computed by this platform's own normalizers** — `buildId`,
   `toImageObject`, `dedupeGraphById` (`schema/normalizers/`). Never
   hand-roll a `#fragment`-appending string concatenation or a
   `.toLowerCase()` dedup check inline in a builder; add it to
   `schemaNormalizer.ts` if it doesn't already exist there.

## Adding a new builder: step by step

Say a future phase adds real FAQ content to `src/seo/config/` (closing
the gap `SCHEMA_MAPPING_MATRIX.md` flags today):

1. **Confirm the real source.** Where does the FAQ content live? What
   shape is it (a new `faq.config.ts` array, or a field added to an
   existing entity)? Don't write the builder before this is answered.
2. **The node type likely already exists** — `FAQPageSchemaNode` and
   `QuestionNode` are already in `schema/types/common.ts`/`nodes.ts`.
   Check `SCHEMA_MAPPING_MATRIX.md` first; you may only need a producer,
   not a new type.
3. **The builder likely already exists too** — `buildFAQPage(pageUrl,
   entries)` in `builders/faqBuilder.ts` is already implemented and
   tested; it just has no real data to call it with yet.
4. **Add a producer** in `registry/schemaRegistry.ts`:
   ```ts
   export const faqProducer: SchemaProducer = {
     id: "faq",
     produce: (page) => {
       const faqs = getFAQsForPage(page.id); // wherever the new config lives
       return faqs.length > 0 ? [buildFAQPage(page.path, faqs)] : [];
     },
   };
   ```
   Add it to `DEFAULT_PRODUCERS`, or leave it out and let a caller
   opt in via `registerProducer` — see `SCHEMA_REGISTRY.md`'s Extension
   Strategy for the tradeoff (built-in default vs. opt-in extension).
5. **Write tests** in `schema/tests/`, covering the same categories
   this phase's own suite does: normal generation, missing/empty input,
   and — if the producer is config-driven — a regression case against
   real data (see `schemaRegistry.test.ts`'s all-17-pages test for the
   pattern).
6. **Run the full quality gate**: `npm run lint`, `npm run build` (and
   confirm the module count is still unchanged, the same
   stash-and-rebuild check this phase's own report describes), and the
   full test command from `SCHEMA_ENGINE.md`'s Verification Results.

## What NOT to do

- **Don't add a node type without real config data behind it.**
  `SCHEMA_MAPPING_MATRIX.md`'s exclusion table exists specifically to
  make this an explicit, visible decision rather than a temptation to
  quietly fabricate.
- **Don't modify `src/seo/config/`, `src/seo/types/`,
  `src/seo/validators/`, or `src/seo/reports/`** to make a new builder
  easier to write. If a builder needs data that genuinely doesn't exist
  yet, that's a content or Phase 1.0 data-model gap to flag (per this
  program's established pattern — see `SCHEMA_ENGINE.md`'s Known
  Risks for several live examples), not something this platform's own
  code should route around by editing an earlier phase's files.
- **Don't skip `SchemaValidator`.** A new builder's output should pass
  `validateSchemaNode()` cleanly; if it doesn't, fix the builder, don't
  loosen the validator to accept incomplete output — the validator's
  own rule is "no generated schema may bypass validation."
- **Don't embed a full node where an `@id` reference will do.** See
  `SCHEMA_ENGINE.md`'s Architecture Decision #6 — this is what keeps
  the Registry's duplicate-prevention meaningful instead of cosmetic.
