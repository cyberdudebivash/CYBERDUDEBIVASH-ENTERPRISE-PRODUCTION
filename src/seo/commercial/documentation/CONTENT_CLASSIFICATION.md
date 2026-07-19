# Content Classification — Phase 1.4

Companion to `COMMERCIAL_MODEL.md`. Covers the `ContentClassification`
taxonomy, the deterministic derivation logic in
`builders/classifyContent.ts`, and the real classification data for the
12 pilot entities.

## 1. Purpose

Phase 1.0's data model already carries a `FunnelStage`
(`awareness | consideration | decision | retention`) on every page,
product, service, solution, and article. That is a marketing-funnel
label, not a content-intent label — it says where in the buyer journey
an entity sits, not what *kind* of content it is. A SOC incident-response
runbook and a pricing page can both be `"decision"`-stage without being
the same kind of content.

`ContentClassification` is this phase's answer: a second, orthogonal tag
describing what the content *is*, independent of who is funding its
production or where it sits in the funnel. It is additive — it never
replaces `funnelStage`, and an entity can (and several pilot entities do)
carry more than one classification at once.

## 2. The taxonomy

`ContentClassification` (`config/types.ts`) is a closed union of 10
values:

| Value | Meaning | Used in the 12-entity pilot? |
|---|---|---|
| `awareness` | Top-of-funnel brand/problem education | Yes — 3 entities |
| `consideration` | Mid-funnel solution comparison content | Yes — 2 entities |
| `decision` | Bottom-of-funnel, purchase-ready content | Yes — 7 entities |
| `retention` | Post-purchase / existing-customer content | No — 0 entities |
| `support` | Help-desk / troubleshooting content | No — 0 entities |
| `training` | Structured learning/enablement content | No — 0 entities |
| `research` | Original research, not tied to a funnel stage | Yes — 1 entity |
| `threat-intelligence` | Threat/IOC/vulnerability research content | Yes — 2 entities |
| `documentation` | Reference/technical documentation | No — 0 entities |
| `learning` | Educational/how-to content | No — 0 entities |

The last five values (`retention`, `support`, `training`,
`documentation`, `learning`) are real, valid classifications with no
current pilot entity to attach them to — they exist for solutions,
articles, and future phases (see `COMMERCIAL_MODEL.md`'s Extension
Strategy), not as placeholders. They are not "reserved" in the sense
Phase 1.3's relationship kinds are reserved; nothing prevents a future
profile from using them today.

## 3. Derivation logic

`deriveContentClassification(explicit, funnelStage)`:

```ts
function deriveContentClassification(explicit, funnelStage) {
  if (explicit && explicit.length > 0) return [...explicit];
  if (funnelStage) return [FUNNEL_TO_CLASSIFICATION[funnelStage]];
  return [];
}
```

Two-tier fallback, deterministic, no defaults invented beyond what the
entity already states:

1. **Explicit wins.** If the `CommercialProfile` sets a non-empty
   `contentClassification` array, that array is returned verbatim
   (copied, not mutated). This is how an entity gets a classification
   the funnel-stage mapping alone could never produce — `blog`'s
   `["awareness", "research", "threat-intelligence"]` has no equivalent
   single `FunnelStage`.
2. **Funnel-stage fallback.** If there's no explicit classification but
   the entity has a real `funnelStage`, `FUNNEL_TO_CLASSIFICATION` maps
   it 1:1:

   ```ts
   const FUNNEL_TO_CLASSIFICATION: Record<FunnelStage, ContentClassification> = {
     awareness: "awareness",
     consideration: "consideration",
     decision: "decision",
     retention: "retention",
   };
   ```

   This only ever produces one of the four funnel-mirroring values —
   never `support`, `training`, `research`, `threat-intelligence`,
   `documentation`, or `learning`. Those six require an explicit tag.
3. **Empty, not guessed.** An entity with neither an explicit
   classification nor a `funnelStage` gets `[]`. There is no default
   classification.

An empty explicit array (`[]`, as opposed to `undefined`) is treated the
same as "not set" and falls through to the funnel-stage branch — see
`classifyContent.test.ts`'s
`"an empty explicit array falls back to funnelStage rather than staying
empty"` regression test.

## 4. Real pilot data

**Every one of the 12 pilot entities has an explicit
`contentClassification` set in `commercialProfiles.config.ts`.** This is
worth stating plainly: the funnel-stage fallback branch, while fully
implemented and unit-tested (`classifyContent.test.ts`), is not
exercised by any of today's 12 real profiles — it exists for entities a
future phase enriches without setting an explicit classification, not
for anything in this pilot. This is documented rather than hidden
because a reader diffing the pilot's output against the code should not
have to guess why the fallback path looks "dead" in current data.

Full per-entity assignment:

| Entity | Kind | `contentClassification` |
|---|---|---|
| about | page | `["awareness"]` |
| soc | service | `["decision"]` |
| dpdp | service | `["decision"]` |
| owasp | service | `["decision"]` |
| mssp | service | `["decision"]` |
| vciso | service | `["decision"]` |
| pentest | service | `["decision"]` |
| apex | product | `["threat-intelligence", "consideration"]` |
| ai_hub | product | `["consideration"]` |
| tools | product | `["decision"]` |
| blog | product | `["awareness", "research", "threat-intelligence"]` |
| official | product | `["awareness"]` |

Tag frequency across the 12 (an entity with multiple tags counts once
per tag):

| Classification | Count |
|---|---|
| `decision` | 7 |
| `awareness` | 3 |
| `consideration` | 2 |
| `threat-intelligence` | 2 |
| `research` | 1 |
| `retention` / `support` / `training` / `documentation` / `learning` | 0 |

Two entities carry more than one tag — `apex` (a threat-intelligence
platform that is also mid-funnel consideration content) and `blog`
(awareness content that is also original research and threat
intelligence). Every other entity carries exactly one.

## 5. Why these specific classifications, and not others

Every explicit tag traces to the entity's real description or purpose
already present in `products.config.ts` / `services.config.ts`:

- `apex` is tagged `threat-intelligence` because Sentinel APEX's own
  description is a threat-intelligence feed product (STIX/TAXII, IOC
  feeds, dark-web scraping) — not an inference, a restatement of what
  the product already is.
- `blog` is tagged `research` and `threat-intelligence` because its real
  description is "zero-day analysis, threat group profile teardowns" —
  the same evidence used for its `valueProposition` in
  `COMMERCIAL_MODEL.md`.
- The 6 services are uniformly `decision` because every one already sits
  at `buyingStage: "vendor-evaluation"` and offers a concrete conversion
  action (book an assessment, request a quote) rather than educational
  content.

No entity was tagged `retention`, `support`, `training`, `documentation`,
or `learning` because none of the 12 pilot entities' real content is
post-purchase, help-desk, structured-training, reference-documentation,
or tutorial content — using one of those tags would have been a guess,
which this phase's evidence rule forbids.

## 6. Non-goals

- This is not a page-type or schema-type classification (see Phase 1.2's
  `SchemaNode` kinds) — an entity's `ContentClassification` and its
  JSON-LD `@type` are unrelated axes.
- This is not a ranking or scoring signal by itself. `readinessScore.ts`
  only checks whether `contentClassification` is *present*
  (one of the 11 `COMMERCIAL_COMPLETENESS_KEYS`), never which values it
  holds — see `COMMERCIAL_READINESS.md`.
- No AI or heuristic text classifier is involved anywhere in this file's
  logic. Every value is either hand-set in `commercialProfiles.config.ts`
  from real evidence, or derived by the fixed one-to-one
  `FUNNEL_TO_CLASSIFICATION` table.
