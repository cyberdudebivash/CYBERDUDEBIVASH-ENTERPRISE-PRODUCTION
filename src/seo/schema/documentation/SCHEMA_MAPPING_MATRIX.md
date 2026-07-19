# Schema Mapping Matrix

Every schema.org type this platform generates, what real config data it
comes from, and — per this phase's own explicit instruction ("do not
implement types that are unsupported by the current data model") —
every type from the task's "at minimum" list that was deliberately
**not** implemented, with the evidence behind each decision. See
`SCHEMA_ENGINE.md` for the platform-wide report.

## Implemented types

| Schema.org type | Builder | Real source data | Notes |
|---|---|---|---|
| `Organization` | `organizationBuilder.ts` | `organization.config.ts`'s `ORGANIZATION`/`BRANDS` | Singleton; includes `founder` (real, previously-unused `ORGANIZATION.founder` field) |
| `WebSite` | `websiteBuilder.ts` | `site.config.ts`'s `SITE_CONFIG` + the resolved brand description | Singleton; `description` sources the real, already-ported `BRANDS[].description`, not new copy |
| `WebPage` | `webPageBuilder.ts` | `generatePageMetadata()` (Phase 1.1) | Generic default for any page that isn't About/Contact |
| `AboutPage` | `webPageBuilder.ts` (`buildAboutPage`) | same, narrowed for `page.id === "about"` | Matches Phase 1.0's existing `AboutPageSchema` type reservation |
| `ContactPage` | `webPageBuilder.ts` (`buildContactPage`) | same, narrowed for `page.id === "contact"` | Matches Phase 1.0's existing `ContactPageSchema` type reservation |
| `BreadcrumbList` | `breadcrumbBuilder.ts` | `navigation.config.ts` + `PageMetadata` | Prefers a nav node's own `label` over the full SEO title — see pilot comparison |
| `Person` | `personBuilder.ts` | `authors.config.ts`'s `AUTHORS` | Used internally by `ArticleBuilder`, not a standalone page producer |
| `Article` | `articleBuilder.ts` | `blog.config.ts`'s `BLOG_ARTICLES` | `author`/`publisher` resolve to `@id` references, not bare id strings |
| `Service` | `serviceBuilder.ts` | `services.config.ts`'s `SERVICES` | `provider` resolves Phase 1.0's `ServiceSchema.provider` comment ("resolved by a future generator") |
| `Product` | `productBuilder.ts` | `solutions.config.ts`'s `SOLUTIONS` | See "Product vs. SoftwareApplication" below |
| `SoftwareApplication` | `softwareApplicationBuilder.ts` | `products.config.ts`'s `PRODUCTS` | See "Product vs. SoftwareApplication" below |
| `LocalBusiness` | `localBusinessBuilder.ts` | `ORGANIZATION.address` + `SITE_CONFIG.geo` | Home page only — see `SCHEMA_ENGINE.md`'s Pilot Comparison for why |
| `FAQPage` | `faqBuilder.ts` | none (see below) | Built and tested; no registry producer wired |

Plus reusable JSON-LD fragments (`types/common.ts`): `ImageObjectNode`,
`OfferNode`, `PostalAddressNode`, `ContactPointNode`, `GeoCoordinatesNode`,
`BrandNode`, `SearchActionNode`, `ListItemNode`, `QuestionNode`,
`IdReference`.

## Product vs. SoftwareApplication

The task's type list includes both `Product` and `SoftwareApplication`,
and this data model has two entity collections that could plausibly map
to either: `PRODUCTS` (5 live platform/subdomains — Sentinel APEX, AI
Security Hub, ThreatCore Tools, the Research Blog, the official
gateway) and `SOLUTIONS` (5 priced, purchasable Gumroad kits).

**Decision**: `SOLUTIONS` -> `Product` (they have a real `price` field,
literally purchasable, the closest schema.org commerce-semantic match);
`PRODUCTS` -> `SoftwareApplication` (they're live software
platforms/subdomains, not tangible or purchasable goods in the
schema.org sense). This is the more semantically accurate mapping in
both directions, not an arbitrary 50/50 split.

**Known imperfect fit**: `PRODUCTS`' `"blog"` entry (Research Blog &
Advisories) is an editorial site, not literally an installable or
interactive application — modeling it as `SoftwareApplication` is a
stretch. `SoftwareApplicationBuilder` treats all 5 `PRODUCTS` uniformly
rather than carving out a `"blog"`-specific exception, because a
per-product special case inside a builder would itself be the
page/entity-specific logic this platform is built to avoid. Flagged
here rather than silently special-cased.

## Deliberately NOT implemented

Per this phase's explicit instruction, every type below from the "at
minimum" list was evaluated and excluded because no real config data
backs it — implementing it would mean fabricating content or inventing
a data source this program hasn't authorized:

| Type | Why not |
|---|---|
| `BlogPosting` | `types/schema.ts` (Phase 1.0) already models blog content as `ArticleSchema`, with no separate `BlogPosting` variant and no config field distinguishing "blog posting" from "article." Modeling both would duplicate one real entity under two types with no data-driven way to choose between them. |
| `CollectionPage` | No config data marks any page as a "collection" (e.g. `apps.html`, `research.html` are plausible candidates by name alone, but no field in `seo.config.ts` or elsewhere encodes this distinction). |
| `WebApplication` | Schema.org models it as a subtype of `SoftwareApplication`; Phase 1.0's `types/schema.ts` only reserves `SoftwareApplicationSchema`, with nothing distinguishing "web" from other application types in the data. |
| `Review` | No review/rating data exists anywhere in `src/seo/config/`. |
| `AggregateRating` | Same as `Review` — no rating data exists. |
| `VideoObject` | No video config data exists. |
| `Dataset` | No dataset config data exists. |
| `TechArticle` | Subtype of `Article`; no field distinguishes a "technical" article from any other in `blog.config.ts`. |
| `Course` | No course config data exists. |
| `DefinedTerm` | No glossary/definitions config data exists. |
| `CreativeWork` | Too generic to justify a standalone builder once every real, more-specific type it could describe (`Article`, `Product`, etc.) already has its own builder. |
| `Collection` | Same reasoning as `CollectionPage` — no data marks any entity set as a "collection." |

`SearchAction` and `FAQPage` are implemented (both are explicitly named
example builders in this phase's instructions) but **not wired to any
default producer**, for a different reason than the exclusions above —
see `SCHEMA_ENGINE.md`'s Known Risks: real evidence exists that the
data these would need (a real search endpoint; FAQ content) doesn't
exist yet, even though the schema shape itself is legitimate and
already reserved by Phase 1.0 (`FAQPageSchema`) or requested by this
phase (`SearchActionNode`).

## Extending this matrix

Adding a new schema type to this platform means: confirm real config
data exists for it (or a real live page demonstrates the need clearly
enough to justify adding config data first, as this phase did for
`Organization.founder`), add its node type to `schema/types/nodes.ts`,
add a builder under `schema/builders/`, and — only if it should attach
to pages automatically — register a producer in
`schema/registry/schemaRegistry.ts`. See `SCHEMA_BUILDER_GUIDE.md` for
the concrete steps.
