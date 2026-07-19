# Keyword Strategy — Phase 1.4

Companion to `COMMERCIAL_MODEL.md`. Covers the `KeywordIntelligence`
taxonomy, the evidence-grounding rule this phase was built under, the
merge logic in `builders/keywordIntelligence.ts`, and the real per-entity
keyword data for the 12 pilot entities.

## 1. Purpose

Phase 1.1's `PageMetadata` already carries `primaryKeyword` and
`secondaryKeywords` — a flat, single-tier keyword list built for meta
tags. That tier answers "what is this page's main SEO keyword," but
nothing in Phase 1.0/1.1 distinguishes a keyword because it names a
product from one that describes a competitor, or a broad semantic term
from a long, highly specific buyer-intent phrase.

`KeywordIntelligence` (`config/types.ts`) adds six named facets on top of
that existing tier:

```ts
export interface KeywordIntelligence {
  supportingKeywords?: string[];
  semanticKeywords?: string[];
  entityKeywords?: string[];
  commercialKeywords?: string[];
  longTailKeywords?: string[];
  competitorKeywords?: string[];
}
```

| Facet | Meaning | Real example used in the pilot |
|---|---|---|
| `supportingKeywords` | Secondary topical terms reinforcing the primary keyword | *(none populated — see §5)* |
| `semanticKeywords` | Topically related terms search engines associate with the primary intent | `soc`: `"security operations center"`, `"threat hunting"` |
| `entityKeywords` | Named entities — product names, brand terms, proper nouns | `apex`: `"Sentinel APEX"`, `"STIX TAXII"` |
| `commercialKeywords` | Buyer-intent / transactional phrases | `soc`: `"managed SOC pricing"`, `"24x7 SOC assessment"` |
| `longTailKeywords` | Long, highly specific multi-word phrases | *(none populated — see §5)* |
| `competitorKeywords` | Named-competitor comparison terms | *(none populated — see §5)* |

## 2. The evidence rule

The task specification for this phase states plainly: *"Do not invent
unsupported keywords. Use only repository-backed evidence."* Every
keyword in every facet in `commercialProfiles.config.ts` was sourced from
text that already exists in `products.config.ts`, `services.config.ts`,
or `seo.config.ts` — a real feature name, a real pricing-tier term, a
real technology named in a description. None were generated from
general SEO-keyword intuition about what a cybersecurity vendor
"should" rank for.

Concretely: `"GE-Neural AI engine"` (soc's `entityKeywords`) is the
product's own real, already-named underlying engine, not an invented
placeholder; `"STIX TAXII"` (apex's `entityKeywords`) is the real
protocol standard apex's own description already cites; `"MITRE
ATT&CK"`-adjacent phrasing appears in `trustSignals`, not manufactured
separately as a keyword with no source text.

## 3. Merge logic

`mergeAllKeywords(primaryKeyword, secondaryKeywords, intelligence)`
produces one flat, deduplicated master keyword list per entity:

```ts
function mergeAllKeywords(primaryKeyword, secondaryKeywords, intelligence) {
  return normalizeKeywordList([
    primaryKeyword,
    ...(secondaryKeywords ?? []),
    ...(intelligence?.supportingKeywords ?? []),
    ...(intelligence?.semanticKeywords ?? []),
    ...(intelligence?.entityKeywords ?? []),
    ...(intelligence?.commercialKeywords ?? []),
    ...(intelligence?.longTailKeywords ?? []),
    ...(intelligence?.competitorKeywords ?? []),
  ]);
}
```

Two decisions worth calling out:

1. **Reuses Phase 1.1's `normalizeKeywordList`, not a second
   implementation.** Trimming, blank-dropping, case-insensitive
   deduplication, and first-seen-casing preservation are exactly the
   rules Phase 1.1 already established for `secondaryKeywords`; a second
   dedup routine here would be duplicated business logic for no reason.
2. **Fixed facet order: primary → secondary → supporting → semantic →
   entity → commercial → long-tail → competitor.** The order is only
   observable when two facets share a near-duplicate term (dedup keeps
   the first-seen casing) — it is not a ranking signal by itself.

## 4. Real per-entity keyword data

Facet population and merged-list size per entity (from
`buildAllCommercialViews()` + `mergeAllKeywords()`, run directly against
the real config, not estimated):

| Entity | Kind | `primaryKeyword` (Phase 1.0, real) | secondaryKeywords | Facets populated | Merged total |
|---|---|---|---|---|---|
| about | page | "CYBERDUDEBIVASH company" | 0 | 3 | 9 |
| soc | service | "managed SOC as a service India" | 3 | 3 | 11 |
| dpdp | service | "DPDP Act compliance India" | 3 | 2 | 9 |
| owasp | service | "OWASP LLM red team testing" | 3 | 2 | 8 |
| mssp | service | "white label MSSP platform" | 2 | 2 | 8 |
| vciso | service | "virtual CISO services India" | 3 | 2 | 9 |
| pentest | service | "penetration testing services India" | 3 | 2 | 10 |
| apex | product | "threat intelligence platform" | 3 | 3 | 8 |
| ai_hub | product | "AI security forensics platform" | 3 | 2 | 8 |
| tools | product | "cybersecurity utility tools" | 3 | 1 | 5 |
| blog | product | "cybersecurity research blog" | 3 | 1 | 5 |
| official | product | "enterprise cybersecurity platform" | 2 | 1 | 5 |

Facet-level coverage across all 12 pilot entities:

| Facet | Entities populated | Coverage |
|---|---|---|
| `semanticKeywords` | 12 / 12 | 100% |
| `commercialKeywords` | 9 / 12 (all except `tools`, `blog`, `official`) | 75% |
| `entityKeywords` | 3 / 12 (`about`, `soc`, `apex`) | 25% |
| `supportingKeywords` | 0 / 12 | 0% |
| `longTailKeywords` | 0 / 12 | 0% |
| `competitorKeywords` | 0 / 12 | 0% |
| **At least one facet present** (the binary check `validateCommercialView` and the readiness score both use) | **12 / 12** | **100%** |

Total individual facet values populated across the pilot: 24 (summed
from the "Facets populated" column above), against a theoretical maximum
of 72 (12 entities × 6 facets) — 33% facet-slot fill rate, with
`semanticKeywords` and `commercialKeywords` carrying almost all of it.

## 5. Known gaps — three facets are 0/12 by design, not oversight

`supportingKeywords`, `longTailKeywords`, and `competitorKeywords` are
unpopulated for all 12 pilot entities. This was a deliberate outcome of
the evidence rule, not missed work:

- **`competitorKeywords`**: no named competitor appears anywhere in the
  current repository's committed content (`seo.config.ts`,
  `services.config.ts`, `products.config.ts`, or any page copy).
  Populating this facet would require researching and naming real
  competitor products from outside the repository — explicitly
  out-of-bounds for "repository-backed evidence."
- **`longTailKeywords`**: the real committed copy states value
  propositions and features in short, direct phrases ("24x7 SOC
  assessment," "DPDP gap assessment") rather than the long, multi-clause
  search phrases this facet is meant for (e.g., "how to get DPDP Act
  2023 compliant as a mid-market SaaS company in India"). Inventing
  such phrases would not be extracting evidence, it would be generating
  new copy.
- **`supportingKeywords`**: distinct from `semanticKeywords` only by
  being a slightly less-central topical term; every topical term found
  in the real copy was judged core enough to classify as
  `semanticKeywords` or specific enough to be `commercialKeywords` —
  nothing left over fell cleanly into a third, weaker topical tier
  without duplicating one of those two.

These three facets exist in the type and are validated identically to
the other three (see `hasAnyKeywordFacet` in
`validators/commercialValidator.ts` — it checks all six equally). A
future phase with either more source copy or explicit approval to
research external competitor terms can populate them without any code
change; see `COMMERCIAL_MODEL.md`'s Extension Strategy.

## 6. Non-goals

- No keyword volume, difficulty, or ranking-position data is modeled
  anywhere in this phase — that would require an external SEO data
  source, which this phase does not integrate.
- `mergeAllKeywords()`'s output is a flat list for internal
  completeness/consumption purposes; it does not by itself get written
  into any HTML meta tag — wiring this list into `<meta name="keywords">`
  or similar (if ever desired) is Phase 1.1's `keywordBuilder.ts`'s
  concern, and is out of scope for this phase per the PILOT
  instruction ("Do not modify production HTML").
- Facet order and dedup are the only "ranking-like" behavior in this
  file, and neither is a scoring mechanism — see
  `COMMERCIAL_READINESS.md` for what is actually scored.
