# Schema Registry

Deep dive on `src/seo/schema/registry/schemaRegistry.ts`. See
`SCHEMA_ENGINE.md` for the platform-wide report this document is
referenced from.

## Why not a stateful class

A conventional "registry" pattern uses a mutable object with
`.register()`/`.resolve()` methods backed by a shared `Map`. This
platform's own governing requirement is that "every builder must be
reusable" and "pure, deterministic, stateless" — extended here to the
Registry itself, because a shared, mutable registry object would be the
one piece of this platform that isn't any of those things, and every
test touching it would need to worry about state leaking between runs.

Instead, the Registry is:

- **A plain, exported, immutable array** — `DEFAULT_PRODUCERS: readonly
  SchemaProducer[]` — mirroring `src/seo/reports/generateReport.ts`'s
  own `VALIDATORS: Array<() => ValidationResult>` constant. That file
  already established, one phase ago, "a fixed list of pure functions
  this program composes together" as this codebase's way of doing
  exactly this kind of thing.
- **Pure functions over that array**, not methods on a stateful
  instance: `registerProducer`, `resolveProducer`, `composePageSchemaSet`.

## The `SchemaProducer` contract

```ts
export interface SchemaProducer {
  id: string;
  produce(page: SEOPage): SchemaNode[];
}
```

A producer takes a page and returns zero or more schema nodes relevant
to it. "Zero" is a first-class, expected outcome — most producers only
apply to some pages (`localBusinessProducer` only matches the home
page; `serviceProducer` only matches pages whose path equals some
service's `url`), and returning an empty array for every other page is
the normal case, not an error path.

## The 8 default producers

| Producer | Applies to | Matched via |
|---|---|---|
| `organizationProducer` | every page | n/a — site-wide singleton |
| `websiteProducer` | every page | n/a — site-wide singleton |
| `webPageProducer` | every page | narrows to `AboutPage`/`ContactPage` for `page.id === "about"`/`"contact"`, else generic `WebPage` |
| `breadcrumbProducer` | every page | derives from `navigation.config.ts` + `PageMetadata` |
| `localBusinessProducer` | home page only | `page.id === "home"` — matches the real, live `LocalBusiness` block found on `index.html`/`_vite_entry.html` during this phase |
| `serviceProducer` | pages matching a service's own URL | `SERVICES[].url === page.path` |
| `softwareApplicationProducer` | pages referencing a product | `page.relatedEntityIds` includes a `PRODUCTS[].id` |
| `productProducer` | pages referencing a solution | `page.relatedEntityIds` includes a `SOLUTIONS[].id` |

Every match rule reads from data already in `src/seo/config/` or
`src/seo/types/page.ts`'s `relatedEntityIds` field — none hardcodes a
page id to decide *content*, only (in `webPageProducer`'s one case) to
decide *which already-modeled schema.org type* applies, per
Architecture Decision #7 in `SCHEMA_ENGINE.md`.

## Composition and deduplication

```ts
export function composePageSchemaSet(page: SEOPage, producers = DEFAULT_PRODUCERS): PageSchemaSet {
  const nodes = producers.flatMap((producer) => producer.produce(page));
  return toPageSchemaSet(nodes); // wraps in @context + @graph, dedupes by @id
}
```

`toPageSchemaSet` (in `normalizers/`) is the single place "prevent
duplicates" is enforced at the graph level — it keeps the first node
per `@id` and drops any later ones, regardless of which producer(s)
emitted them. Since every producer here happens to emit a distinct
`@id` today, this never actually triggers against `DEFAULT_PRODUCERS` —
but it's not decorative: `SchemaValidator`'s own
`SCHEMA_DUPLICATE_ID` check independently re-verifies this rather than
assuming the Registry's dedup is sufficient (see `SCHEMA_ENGINE.md`'s
Validation Strategy — "never simply trust the generator").

## Extension strategy

"Support future extension" is satisfied without any runtime mutation:

```ts
const withFaq = registerProducer(DEFAULT_PRODUCERS, {
  id: "faq",
  produce: (page) => (page.id === "compliance" ? [buildFAQPage(page.path, REAL_FAQ_DATA)] : []),
});
const set = composePageSchemaSet(page, withFaq);
```

`registerProducer` returns a **new** array with the producer appended —
it never mutates `DEFAULT_PRODUCERS` — and throws if a producer with
the same `id` is already present, so "prevent duplicates" applies to
registration itself, not just to generated node output. A caller who
wants a smaller or reordered producer set can simply build their own
array and pass it to `composePageSchemaSet` directly; nothing requires
starting from `DEFAULT_PRODUCERS` at all.

## Migration strategy

Nothing consumes this Registry today (see `SCHEMA_ENGINE.md`'s "Files
Modified" — only `src/seo/index.ts`'s barrel changed). When a future
phase is ready to actually emit `<script type="application/ld+json">`
tags:

1. Call `composePageSchemaSet(page)` for each real static page.
2. Run `validatePageSchemaSet()` on the result and treat any
   error-severity issue as a hard stop (this phase deliberately leaves
   that decision to the caller — see `SCHEMA_ENGINE.md`'s Validation
   Strategy for why composition and validation stay separate steps
   here, unlike Phase 1.1's `MetadataEngine`).
3. Serialize the validated `PageSchemaSet` and write it into the page's
   `<head>`, replacing the god-mode-script-injected generic
   `Organization` block (`SEO_ARCHITECTURE.md` Finding 2) — the schema
   this platform generates is that anti-pattern's intended, correct
   replacement.

No change to `registry/schemaRegistry.ts` itself is anticipated for
this — extension happens by adding producers, not by modifying the
composition function.
