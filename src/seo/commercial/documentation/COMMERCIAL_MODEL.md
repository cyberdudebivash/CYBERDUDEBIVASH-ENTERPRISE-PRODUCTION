# Enterprise Commercial Intelligence Layer

Phase 1.4 deliverable. Extends the SEO Data Model with commercial
metadata for a scoped pilot (the `about` page, all 6 `SERVICES`, all 5
`PRODUCTS` — 12 real entities) via an additive overlay, never by
modifying `src/seo/config/`. See `CONTENT_CLASSIFICATION.md`,
`KEYWORD_STRATEGY.md`, `COMMERCIAL_READINESS.md`, and
`COMMERCIAL_READINESS_REPORT.md` for the companion documents this file
references throughout.

## Executive Summary

The Commercial Intelligence Layer is complete: 24 files under
`src/seo/commercial/` (`config/`, `builders/`, `recommendations/`,
`validators/`, `reports/`, `tests/`, `documentation/`), enriching 12
real entities with a full commercial profile — every field traced to
text, pricing, or cross-references already committed elsewhere in this
repository. `npm run lint` and `npm run build` both pass; the
production bundle's module count is identical before and after this
phase (2121 modules both times). 43 new unit tests pass alongside the
187 tests already in the repository (230/230 total).

**Coverage moved from 0% to 100%** on the three fields Phase 1.0.5's
own report flagged as universal gaps across the whole model
(`businessObjective`, `commercialPriority`, `conversionGoal`) — but
only for these 12 pilot entities; the other 22 entities (11 more
pages, 5 solutions, 3 articles) are untouched, exactly matching this
phase's stated pilot scope. `primaryCta`/`secondaryCta` intentionally
did **not** reach 100%: the `blog` product has no CTA at all (a pure
content asset — inventing one would misrepresent it), and the `mssp`
service has no `secondaryCta` (it has no static page to point one at).
Both are documented gaps, not oversights. Average readiness score
across the 12 entities: **79/100** (range 59–86) — a real, evidenced
spread, not a uniform 100 that would itself be a sign of fabricated
rather than honestly-scored data.

## Architecture Decisions

1. **An additive overlay, never an in-place edit.** `CommercialProfile`
   records live in `src/seo/commercial/config/commercialProfiles.config.ts`,
   joined to real `SEOPage`/`SEOProduct`/`SEOService` records by
   `(entityKind, entityId)` — the same pattern Phase 1.1's
   `PageMetadata`, Phase 1.2's `SchemaNode`, and Phase 1.3's
   `RelationshipRecommendation` already established for "derive new
   data without touching the source." `src/seo/config/`,
   `src/seo/types/`, and every prior phase's own directory remain
   byte-for-byte unchanged — see Files Created.

2. **Only genuinely new fields live in `CommercialProfile`.**
   `searchIntent`, `funnelStage`, `primaryKeyword`, and
   `secondaryKeywords` are never redeclared — every one of the 12
   pilot entities already has all four populated in its real record
   (verified per-entity before writing any profile data, not assumed).
   `audience`, `businessObjective`, `commercialPriority`,
   `conversionGoal`, `primaryCta`, `secondaryCta` appear in a profile
   **only** for the specific entities where the real record leaves
   them unset today. Redeclaring an already-populated field would be
   exactly the "duplicate business logic/data" this program's
   governance model rules out, and would create two sources of truth
   that could silently drift.

3. **`buildCommercialView()` merges profile + real entity, preferring
   the profile's value and falling back to the real entity's own** —
   so a consumer never needs to know which of the two sources a given
   field came from, and the merge logic stays correct even if a future
   profile is added for an entity that already had one of these six
   fields set.

4. **Relationship enrichment reuses Phase 1.3 directly, never
   re-derives it.** `recommendations/relationshipEnrichment.ts` calls
   Phase 1.3's own `buildRelatedProducts`/`buildRelatedServices`/etc.
   with each commercial entity's `(kind, id)` — `CommercialEntityKind`'s
   5 values are all valid `RelationshipEntityKind` values, so no
   conversion layer was needed. The 7 relationship kinds this phase
   also names (`relatedResearch`, `relatedDownloads`,
   `relatedDocumentation`, `relatedLearning`, `relatedTechnologies`,
   `relatedIndustries`, `relatedGitHubRepositories`) stay `[]`: Phase
   1.3 already established none of them have real config-backed
   producers, and this phase introduces no new config for them either
   — populating them now would mean fabricating candidate data neither
   phase has evidence for.

5. **CommercialValidator lives in `src/seo/commercial/validators/`, not
   as new files inside `src/seo/validators/`.** Same reasoning as every
   prior phase's own validator decision: reuses Phase 1.0.5's
   primitives (`issue`, `makeResult`, `isMissing`) without touching
   that directory. It also calls Phase 1.0.5's own
   `validateCommercial()`/`validateCTA()` directly (unmodified) for the
   "before enrichment" baseline in the Readiness Report — reuse, not
   duplication, of functions that already check exactly those fields
   at the raw-entity level.

6. **`buyerPersona` was deliberately left unpopulated across all 12
   entities.** The formal, structured field this phase's instructions
   name implies a named, specific individual (e.g. "Priya Sharma, IT
   Director at a 500-person fintech") — constructing one would require
   inventing a name, a specific company, and specific attributed
   quotes that no evidence in this repository supports. `audience`,
   `customerPainPoints`, and `customerOutcomes` were populated instead
   as the evidence-grounded equivalent (who the buyer is, what problem
   they have, what they get — all traceable to real text) without
   fabricating a fictional individual. This is a deliberate scope
   decision, not an oversight — flagged here and in Known Risks rather
   than silently worked around with an invented name.

7. **Readiness scoring is a plain arithmetic mean of four deterministic
   percentages** — no AI, no probabilistic model, per this phase's
   explicit instruction. See `COMMERCIAL_READINESS.md`.

## Commercial Architecture

```
src/seo/commercial/
  config/            CommercialProfile type + the 12 real pilot profiles
  builders/          resolveCommercialEntity, buildCommercialView, classifyContent, keywordIntelligence
  recommendations/   relationshipEnrichment.ts (wraps Phase 1.3's builders)
  validators/        CommercialValidator (reuses validators/shared.ts + Phase 1.0.5's validateCommercial/validateCTA)
  reports/           readinessScore.ts (deterministic scoring) + generateReadinessReport.ts
  tests/             9 test files, 43 tests
  documentation/     this file + 3 companion documents + COMMERCIAL_READINESS_REPORT.md
  index.ts           top-level public barrel
```

Data flow for one pilot entity: `CommercialProfile` (config, real data)
+ `resolveCommercialEntity()` (reads the live Phase 1.0 record) ->
`buildCommercialView()` (merged view) -> `buildRelationshipEnrichment()`
(Phase 1.3's real graph, reused) -> `computeReadinessScore()`
(deterministic) -> `generateCommercialReadinessReport()` (all 12
entities, plus Phase 1.0.5's own baseline for comparison).

## Field Definitions

| Field | Type | Source |
|---|---|---|
| `businessObjective` | `string` | New per-entity data (Phase 1.0's own field, previously 0% populated model-wide) |
| `commercialPriority` | `"critical"\|"high"\|"medium"\|"low"` (Phase 1.0's `CommercialPriority`) | New per-entity data |
| `audience` | `string[]` | New per-entity data, only for entities where Phase 1.0's own field was unset (services) |
| `conversionGoal` | `string` | New per-entity data |
| `primaryCta` / `secondaryCta` | `SEOCallToAction` (Phase 1.0) | New per-entity data, only where unset |
| `valueProposition` | `string` | Net-new field |
| `customerPainPoints` / `customerOutcomes` | `string[]` | Net-new fields |
| `primaryIndustry` | `string` (free text — see Known Risks) | Net-new field |
| `targetCompanySize` | `("startup"\|"smb"\|"mid-market"\|"enterprise")[]` | Net-new field |
| `targetGeography` | `string[]` | Net-new field |
| `buyingStage` | `"problem-identification"\|"solution-exploration"\|"vendor-evaluation"\|"negotiation"\|"renewal"` | Net-new field — a standard B2B procurement-stage taxonomy, more granular than (and complementary to) `funnelStage` |
| `trustSignals` | `{ type, description }[]` | Net-new field — only a named, real framework/standard the entity's own description already cites |
| `competitivePosition` | `"leader"\|"challenger"\|"niche"\|"emerging"` | Net-new field — see Known Risks (no real competitive data exists) |
| `contentClassification` | `ContentClassification[]` | See `CONTENT_CLASSIFICATION.md` |
| `keywords` (`KeywordIntelligence`) | 6 optional string-array facets | See `KEYWORD_STRATEGY.md` |

## Governance

Every field in `commercialProfiles.config.ts` traces to one of:
description text, a pricing-tier feature bullet, an existing
`primaryCta`/`relatedX` cross-reference, or an organization-level fact
(`organization.config.ts`, `site.config.ts`). A field with no such
trace is left unset, never guessed. This is the same governance model
every prior phase in this program has followed (Phase 1.0's "optional
fields exist where — and only where — real evidence showed the data
genuinely doesn't exist yet"), applied here to commercial content
instead of technical metadata.

## Ownership

- `config/commercialProfiles.config.ts` is the single source of truth
  for this phase's enrichment data — no other file should hold a second
  copy of a `businessObjective`, `valueProposition`, etc.
- `src/seo/config/` remains Phase 1.0's exclusive domain for
  `searchIntent`, `funnelStage`, `primaryKeyword`, `secondaryKeywords`,
  and any field a pilot entity already had populated before this phase.
- Phase 1.3's Relationship Platform remains the exclusive owner of
  relationship-derivation logic; this phase's `recommendations/` module
  only calls it, never reimplements any part of it.

## Extension Strategy

Adding a 13th pilot entity: add one `CommercialProfile` object to
`commercialProfiles.config.ts` with real, traceable field values (skip
any field with no evidence), and it's picked up automatically —
`buildAllCommercialViews()`, `generateCommercialReadinessReport()`, and
every test that iterates `COMMERCIAL_PROFILES` require no code change.
Adding a new commercial field: add it to `CommercialProfile` and
`CommercialEntityView` (`config/types.ts`), add it to the appropriate
completeness-check list in `validators/commercialValidator.ts` and
`reports/readinessScore.ts`, and populate it only where real evidence
exists.

## Migration Plan

Expanding beyond the 12-entity pilot to the full model (11 more pages,
5 solutions, 3 articles) is additive, one `CommercialProfile` at a
time — no architectural change is needed. Priority order, based on
this phase's own Readiness Report: pages/entities most structurally
similar to `about` (thin relationship connectivity, page-only content)
should expect lower `relationshipCompleteness` scores by nature, not a
process failure; solutions and articles should be scoped next given
Phase 1.3 already has real relationship-derivation coverage for both.

## Known Risks

- **`buyerPersona` is 0% covered by design** across all 12 entities —
  see Architecture Decision #6.
- **`competitivePosition` is 0% covered** — no competitor analysis or
  market-positioning research exists anywhere in this repository (the
  uploaded "SEO Rocket Engine" package's competitor profiles were
  already found, in Phase 0's own architecture review, to reference a
  product — "SPECTER™" — that doesn't exist in this codebase, and were
  explicitly ruled unusable). Left unset everywhere rather than
  guessed.
- **`primaryIndustry` is populated for zero of the 12 entities** — every
  pilot entity is a horizontal offering (applicable across industries)
  or, for `dpdp` specifically, geography-scoped rather than
  industry-scoped. `targetGeography` was populated instead wherever
  real evidence supported it.
- **`trustSignals` covers only entities whose own description cites a
  named framework/standard** (SOC's MITRE ATT&CK/SOAR mention, DPDP's
  own Act name, OWASP's LLM Top 10, vCISO's ISO 27001/SOC 2, pentest's
  OWASP/PTES/NIST 800-115). `mssp`, `tools`, `blog`, and `official` cite
  no such standard in their own real descriptions and are left unset.
- **`targetCompanySize` and `trustSignals` are unset for `tools` and
  `blog`** — both are individual-practitioner/readership products, not
  company-size-segmented offerings; forcing a company-size fit onto
  them would misrepresent their real buyer shape.
- **Only 12 of the full model's ~40 entities are enriched** — exactly
  this phase's stated pilot scope (`about`, `services`, `products`
  only). The other 22 remain at Phase 1.0.5's original coverage levels
  until a future phase extends this pilot.

## Recommendations for Phase 2

See `COMMERCIAL_READINESS_REPORT.md`'s own Recommendations section for
the full, evidence-ranked list. Headline: do not start Phase 2 yet —
per this phase's own stop condition, awaiting approval.
