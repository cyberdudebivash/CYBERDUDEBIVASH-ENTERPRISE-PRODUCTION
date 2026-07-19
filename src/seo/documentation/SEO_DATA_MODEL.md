# SEO Data Model

Phase 1.0 deliverable. This is the single source of truth every future
SEO subsystem (Metadata/Canonical/OG/Twitter/Robots/Sitemap generation
in Phase 1.1, JSON-LD emission in Phase 1.2, internal-linking in Phase
1.3, automation in Phase 1.5, analytics in Phase 2) must consume rather
than bypass. It contains **no generators, no renderers, and emits
nothing** — every file here is either a type declaration or a typed,
literal data object. Nothing in `src/` imports from `src/seo/` yet;
zero runtime behavior changed as a result of this phase (verified: the
production build's module count is identical before and after, and
`git status` shows no existing file touched — see Verification Results
at the end).

## Architecture

```
src/seo/
  types/            18 interfaces/types across 9 files, barrel-exported
  config/           11 data files + 1 registry file, barrel-exported
  utils/            pure data-access helpers only (no rendering)
  documentation/    this file
  index.ts          top-level barrel
```

### types/ (owns: shape, nothing else)

| File | Owns |
|---|---|
| `common.ts` | `SEOImage`, `CanonicalConfig`, `OpenGraphConfig`, `TwitterCardConfig`, `SEOBreadcrumb` |
| `commercial.ts` | `SEOCommercialFields` and its enums (`SearchIntent`, `FunnelStage`, `CommercialPriority`, `SEOCallToAction`) — composed into both `SEOPage` and every content entity, not duplicated in either |
| `organization.ts` | `SEOOrganization`, `SEOBrand`, `SEOContactPoint`, `SEOPostalAddress` |
| `entities.ts` | `SEOProduct`, `SEOService`, `SEOServiceTier`, `SEOSolution`, `SEOAuthor`, `SEOCategory`, `SEOArticle` — Product/Service/Solution extend a shared (non-exported) `SEOEntityBase` rather than duplicating id/name/description/url |
| `navigation.ts` | `SEONavigationNode` |
| `knowledge-graph.ts` | `KnowledgeGraphEntity`, `KnowledgeGraphRelationship`, their enums |
| `internal-linking.ts` | `InternalLinkDefinition`, `InternalLinkRelationType` |
| `schema.ts` | `SchemaDefinition` — a discriminated union on `"@type"` covering every schema.org type actually found live (see Migration Mapping) |
| `page.ts` | `SEOPage` — composes `CanonicalConfig`/`OpenGraphConfig`/`TwitterCardConfig`/`SEOBreadcrumb`/`SchemaDefinition`/`SEOCommercialFields`, redeclares none of them |

No `any` anywhere in `src/seo/`. Optional fields exist where — and only
where — real evidence showed the underlying data genuinely doesn't
exist yet (documented per-field with why, not left to guess): `item.html`
has no description or canonical; the `mssp` service and three `Header.tsx`
"Solutions" nav items have no stable URL at all.

### config/ (owns: data, one domain per file)

| File | Owns | Real source ported from |
|---|---|---|
| `site.config.ts` | Domain, locale, default OG image, Search Console verification, geo signals | `_vite_entry.html`'s live `<head>` |
| `organization.config.ts` | The organization + its brand | `src/constants/ecosystemData.ts`'s `CORPORATE_REGISTRATION`, `scripts/god_mode_seo_engine.py`'s `ecosystem_urls` (now the single source for `sameAs`) |
| `products.config.ts` | The 5 live platforms | `ECOSYSTEM_PORTALS` in `ecosystemData.ts` |
| `services.config.ts` | The 6 managed services | `src/views/ServicePages.tsx` (descriptions, pricing tiers) |
| `solutions.config.ts` | The 5 downloadable kits | `src/App.tsx`'s `premiumProducts` array |
| `authors.config.ts` | Content bylines | `src/views/BlogView.tsx`'s post attributions |
| `blog.config.ts` | Blog articles + categories | `BlogView.tsx`'s 3 sample posts |
| `research.config.ts` | Research categories (articles array deliberately empty — see file comment) | `EcosystemDiscovery.tsx`'s blog-portal description |
| `navigation.config.ts` | Primary + footer nav structure | `Header.tsx`, `Footer.tsx` |
| `knowledge-graph.config.ts` | Entities + relationships, computed from every array above | (derived, not hand-authored) |
| `seo.config.ts` | The per-page registry (17 static pages + home) | Each page's own live `<title>`/description/canonical, grep'd directly from the files |

### utils/ (owns: pure data access — deliberately thin)

`lookup.ts` (find-by-id helpers) and `url.ts` (one relative-to-absolute
path joiner). Neither renders, generates, or emits anything — this is
the boundary the "do not create generators/renderers" rule draws, and
these two files sit exactly on the safe side of it.

## Ownership rules enforced

- Every array in `config/` owns exactly one domain; none re-declare
  another's fields. `knowledge-graph.config.ts` doesn't restate
  product/service/solution data — it maps over the arrays those files
  already export.
- `organization.config.ts`'s `sameAs` array is now the **only** copy of
  that list in the codebase going forward — previously it was
  physically duplicated across ~19 static HTML files by
  `scripts/god_mode_seo_engine.py` (RETIREd per `SEO_MIGRATION_PLAN.md`).
- `services.config.ts`'s pricing tiers are the only copy outside
  `ServicePages.tsx` itself — the SPA's own rendering is untouched (out
  of scope, see below), but any *future* generator for the static pages
  reads tier data from here, not by re-parsing JSX.

## Dependencies

```
commercial.ts ──┐
common.ts ──────┼──> entities.ts, page.ts
organization.ts ─┘

entities.ts, organization.ts ──> knowledge-graph config (composes both)
schema.ts ──────────────────────> page.ts (SEOPage.schemas)

config/*.ts ──> types/*.ts (data files import their shapes, never the reverse)
utils/*.ts ───> config/*.ts (lookups read config; config never imports utils)
```

Nothing in `types/` imports from `config/` or `utils/` — the type
layer has zero dependency on data existing, so future consumers can
import just the types they need without pulling in this repo's actual
content.

## Relationship diagram (Knowledge Graph, current data)

```
Organization (CYBERDUDEBIVASH PRIVATE LIMITED)
  └─ partOf ── Brand (CyberDudeBivash®)

Product (apex) ─ relatedTo ─> Service (soc), Service (mssp)
Product (ai_hub) ─ relatedTo ─> Service (owasp), Service (dpdp)
Product (tools) ─ relatedTo ─> Service (pentest)
Product (official) ─ relatedTo ─> Service (soc, dpdp, owasp, mssp, vciso, pentest)

Service (dpdp) ─ relatedTo ─> Solution (dpdp_tool)
Service (owasp) ─ relatedTo ─> Solution (ai_tool)
Service (pentest) ─ relatedTo ─> Solution (red_tool)

Article (dirtyclone-*) ─ authoredBy ─> Author (bivasha-kumar-nayak)
Article (bluekit-*) ─ authoredBy ─> Author (sentinel-apex-team)
Article (owasp-llm-*) ─ authoredBy ─> Author (cyberdude-research-lab)
```

`knowledge-graph.config.ts` computes this from each entity's own
`relatedProducts`/`relatedServices`/`relatedSolutions`/`authorId`
fields — this diagram is a rendering of that computed output for
readability, not a second source of truth.

## Migration mapping (schema types → live evidence)

Every variant in `types/schema.ts`'s `SchemaDefinition` union corresponds
to a real, currently-live schema.org `@type` found during the Phase 0
audit, at this frequency:

| `SchemaDefinition` variant | Live count | Where |
|---|---|---|
| `OrganizationSchema` | 40 occurrences (incl. the 19-file duplicate — see Migration Plan) | Every static page |
| `ServiceSchema` | 16 | Service description pages |
| `BreadcrumbListSchema` | 12 | Most static pages |
| `FAQPageSchema` | 5 | `compliance.html` and others |
| `WebSiteSchema` | 3 | Homepage-level pages |
| `SoftwareApplicationSchema` | 2 | Product-adjacent pages |
| `LocalBusinessSchema` | 2 | Contact/about pages |
| `ProductSchema`, `AboutPageSchema`, `ContactPageSchema` | 1 each | `about.html`, `contact.html` |
| `ArticleSchema` | 0 live (new — for `blog.config.ts`'s ported posts) | n/a yet |

No schema type was invented; `ArticleSchema` is the only variant without
a live precedent, added because `blog.config.ts` needs somewhere to
eventually express its 3 real posts as structured data in Phase 1.2.

## Explicitly out of scope (unchanged by this phase)

Per the program's own rule and `SEO_MIGRATION_PLAN.md`'s decision
record: `src/App.tsx`, every SPA view (`ServicePages.tsx`,
`LegalPages.tsx`, `HomeView.tsx`, etc.), routing, the design system,
analytics wiring, and every static HTML file's actual `<head>` content
are all untouched. This data model exists; nothing yet reads from it.

## Future consumers (not built yet — named for continuity)

- **Phase 1.1 (Metadata/Canonical/OG/Twitter/Robots/Sitemap/Breadcrumb
  Engine)** reads `seo.config.ts`'s `PAGES` array and writes real
  `<head>` tags per static page.
- **Phase 1.2 (Knowledge Graph / Schema generation)** reads
  `knowledge-graph.config.ts` plus each `SEOPage.schemas` array and
  emits actual `<script type="application/ld+json">` blocks —
  finally retiring `scripts/god_mode_seo_engine.py`.
- **Phase 1.3 (Internal Linking Engine)** reads the `relatedProducts`/
  `relatedServices`/`relatedSolutions`/`relatedEntityIds` fields already
  present throughout this model and produces `InternalLinkDefinition[]`
  recommendations — the type already exists (`internal-linking.ts`),
  the engine doesn't yet.
- **Phase 1.5 (Automation)** validates that every `SEOPage` has a
  `description`/`canonical` (flagging `item.html` automatically instead
  of a human remembering it's missing) and that every `relatedEntityIds`
  reference actually resolves via `utils/lookup.ts`.
- **Phase 2 (Analytics)** can key GA4/Search Console reporting off
  `SEOPage.id`/`path` once wired.

## Extension strategy

Adding a new product/service/page means adding one object to the
relevant `config/*.ts` array — no other file changes, because every
relationship is expressed as an id reference (`relatedServices: ["soc"]`),
not a duplicated inline copy. Adding an entirely new *domain* (e.g.
"Downloads" or "GitHub Repositories," both named in the program's
Knowledge Graph scope but with no config file yet since no real data
for them exists in this repo today) follows the same pattern used
throughout this phase: add the type to `types/entities.ts` (or a new
file if the shape doesn't fit there), add a `downloads.config.ts`
sourced from real data once it exists, wire it into
`knowledge-graph.config.ts`'s entity list the same way every other
domain is. Nothing about the existing files needs to change to
accommodate a new one.

## Verification results

- `npm run lint` (`tsc --noEmit`): zero errors, including across all
  ~30 new files in this phase.
- `npx vite build`: succeeds; **module count identical** before and
  after this phase (2116 modules both times) — confirms nothing in
  `src/seo/` is bundled, because nothing imports it yet.
- `git status`: only new files under `src/seo/` — zero existing files
  modified.
- No visual, behavioral, or SEO-output change occurred, because no
  running code reads this data yet. This satisfies the phase's stated
  exit criteria exactly: the model exists and typechecks, and nothing
  else changed.

## Known risks / caveats carried forward

- Three different contact emails are currently live across three
  sources (see `organization.config.ts`'s header comment) — modeled as
  two distinct `contactPoints`, not merged; a real decision on which is
  authoritative for which purpose is still open.
- Every service's `primaryCta.path` points at
  `mailto:bivash@cyberdudebivash.com`, verified directly against the
  live static pages — not the SPA's `onContact` modal (no URL) and not
  each service's own page (already confirmed inaccurate during this
  phase before being corrected).
- `research.config.ts`'s article array is intentionally empty; populate
  it from real content when it exists rather than treating the empty
  array as a bug.
- The live compliance-badge wording discrepancy noted informally during
  this phase (production dashboard text appears to say "Certified"/
  "Audited" in places, while `ecosystemData.ts`'s own `aligned()` helper
  and the Phase 0.1 trust-claim fixes deliberately use "...Aligned"
  wording) was not investigated further — out of scope for a data-model
  phase, flagged here for whoever owns that content next.
