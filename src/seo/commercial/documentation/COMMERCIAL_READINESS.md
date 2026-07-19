# Commercial Readiness Scoring — Phase 1.4

Companion to `COMMERCIAL_MODEL.md`. Covers the deterministic scoring
methodology in `reports/readinessScore.ts`, its four dimensions, and a
worked example against real data. For the actual generated report output
(the numbers this methodology produces for all 12 pilot entities), see
`COMMERCIAL_READINESS_REPORT.md`.

## 1. Why a deterministic score, and what it is not

The task specification is explicit: *"Do NOT use AI. Do NOT use
probabilistic ranking."* `computeReadinessScore()` is built entirely from
field-presence ratios and a fixed per-error penalty — no model call, no
learned weight, no random or time-based input. The same
`(view, enrichment, errorCount)` triple always produces the exact same
score, and the arithmetic is auditable by hand (§4 below does exactly
that).

This score is a **completeness/coverage metric**, not a content-quality
or conversion-likelihood prediction. A 100 means every field this phase
tracks is present and no validation error was found for that entity — it
says nothing about whether the copy in those fields is persuasive,
accurate beyond what's checked, or will actually convert a visitor. Reading
it as anything beyond "how much of the commercial model is filled in,
cleanly" is a misuse of the number.

## 2. The four dimensions

Every pilot entity gets an `EntityReadinessScore` with four component
percentages and one overall score:

### 2.1 `fieldCompleteness` — the 6 pre-existing `SEOCommercialFields`

```ts
const FIELD_COMPLETENESS_KEYS = ["audience", "businessObjective", "commercialPriority", "conversionGoal", "primaryCta", "secondaryCta"];
fieldCompleteness = round((keys present in the merged view / 6) * 100)
```

These are the six fields `SEOCommercialFields` already declared back in
Phase 1.0 — the ones `buildCommercialView()` fills from the profile,
falling back to the real entity's own value. This dimension answers "of
the fields Phase 1.0 already had a slot for, how many are now actually
populated after this phase's overlay?"

### 2.2 `relationshipCompleteness` — the 6 real Phase 1.3 relationship kinds

```ts
const kinds = [relatedProducts, relatedServices, relatedSolutions, relatedArticles, relatedCategories, relatedPages];
relationshipCompleteness = round((kinds with length > 0 / 6) * 100)
```

Presence-only, not volume — an entity with one `relatedProducts` entry
scores the same on this dimension as one with five. Only the 6 real,
config-backed Phase 1.3 kinds count; the 7 reserved kinds
(`relatedResearch`, `relatedDownloads`, etc.) are always `[]` today by
construction and are excluded from this ratio for the same reason
`validateRelationshipEnrichment` excludes them — penalizing every entity
for a gap no entity can currently close would not be an actionable
signal.

### 2.3 `commercialCompleteness` — the 11 new profile fields + keyword intelligence

```ts
const COMMERCIAL_COMPLETENESS_KEYS = ["buyerPersona", "valueProposition", "customerPainPoints", "customerOutcomes", "primaryIndustry", "targetCompanySize", "targetGeography", "buyingStage", "trustSignals", "competitivePosition", "contentClassification"]; // 11 keys
commercialCompleteness = round((11 keys present + (1 if any keyword facet present else 0)) / 12 * 100)
```

The 11 fields this phase's `CommercialProfile` introduces that Phase 1.0
had no equivalent slot for at all, plus one combined slot for "has any
keyword-intelligence facet" (see `KEYWORD_STRATEGY.md` §1) — 12 slots
total. `buyerPersona` and `competitivePosition` are both 0/12 across
every pilot entity today (see `COMMERCIAL_MODEL.md`'s Known Risks), so
every entity's `commercialCompleteness` is capped below 100% by
construction, not by a bug — this is intentional and documented, not an
oversight in the scoring code.

### 2.4 `validationHealth` — error penalty

```ts
const ERROR_PENALTY = 20;
validationHealth = max(0, 100 - errorCount * 20)
```

`errorCount` is the count of `severity: "error"` issues (not warnings)
found for that entity by `validateCommercialView()` combined with
`validateRelationshipEnrichment()`. Every issue either of those two
validators currently raises is a `"warning"`, never an `"error"` — so
every one of the 12 pilot entities scores `validationHealth: 100` today.
This dimension exists for entities that could someday accumulate a real
`"error"`-severity finding (a broken reference, a contradictory field
combination) — none exist yet in the pilot, and none were manufactured
to demonstrate the penalty.

### 2.5 Overall score

```ts
overallScore = round((fieldCompleteness + relationshipCompleteness + commercialCompleteness + validationHealth) / 4)
```

A plain, equal (25% each) unweighted average. No dimension is judged
more commercially important than another by this formula — a deliberate
simplicity choice consistent with "no probabilistic ranking": weighting
one dimension over another would itself be a judgment call this phase
was not asked to make. `COMMERCIAL_MODEL.md`'s Recommendations for Phase
2 flags unequal weighting as a candidate future refinement, not
something this phase should introduce unilaterally.

## 3. Full score table (real, generated data)

| Entity | Kind | fieldCompleteness | relationshipCompleteness | commercialCompleteness | validationHealth | **overallScore** |
|---|---|---|---|---|---|---|
| about | page | 100 | 0 | 75 | 100 | **69** |
| soc | service | 100 | 50 | 75 | 100 | **81** |
| dpdp | service | 100 | 67 | 75 | 100 | **86** |
| owasp | service | 100 | 67 | 75 | 100 | **86** |
| mssp | service | 83 | 50 | 67 | 100 | **75** |
| vciso | service | 100 | 33 | 75 | 100 | **77** |
| pentest | service | 100 | 50 | 75 | 100 | **81** |
| apex | product | 100 | 50 | 75 | 100 | **81** |
| ai_hub | product | 100 | 67 | 67 | 100 | **84** |
| tools | product | 100 | 67 | 58 | 100 | **81** |
| blog | product | 67 | 17 | 50 | 100 | **59** |
| official | product | 100 | 67 | 67 | 100 | **84** |

**Average overall score: 79.** Range: 59 (`blog`, lowest) to 86 (`dpdp`
and `owasp`, tied highest).

## 4. Worked example — `blog` (the lowest-scoring entity)

`blog` is the only pilot entity below 70, so it is the clearest
demonstration of how the four dimensions compose:

- **`fieldCompleteness` = 67** (4/6): `audience`, `businessObjective`,
  `commercialPriority`, `conversionGoal` are all present (the entity is
  a product, and products already carry a real `audience` from Phase
  1.0); `primaryCta` and `secondaryCta` are both absent — `blog`'s real
  entry has no CTA of its own, and no profile CTA was set for it because
  none of blog's real copy names a concrete conversion action (see
  `COMMERCIAL_MODEL.md` §Known Risks). 4/6 = 66.67% → rounds to 67.
- **`relationshipCompleteness` = 17** (1/6): only one of the six real
  Phase 1.3 relationship kinds has an entry for `blog` — its position in
  the relationship graph is the thinnest of any pilot product.
- **`commercialCompleteness` = 50** (6/12): `valueProposition`,
  `customerPainPoints`, `customerOutcomes`, `targetGeography`,
  `contentClassification`, and "has a keyword facet" are present;
  `buyerPersona`, `primaryIndustry`, `targetCompanySize`, `buyingStage`,
  `trustSignals`, and `competitivePosition` are all absent — more gaps
  than any other pilot entity, because `blog` (an editorial/research
  product, not a sold service or product tier) has the least
  company-size/industry/buying-stage framing to draw from in its real
  copy.
- **`validationHealth` = 100**: zero error-severity issues (same as
  every other pilot entity).
- **Overall**: `(67 + 17 + 50 + 100) / 4 = 234 / 4 = 58.5` → rounds to
  **59**.

The score correctly reflects that `blog` is real, valid, evidence-backed
content — nothing about it is broken — but it is structurally the
thinnest-linked, least commercially-framed entity in the pilot, which is
an accurate reading of its role as awareness/research content rather
than a sold offering.

## 5. Interpretation guidance

- A low score is a **coverage gap pointer**, not a defect report. It
  tells a reader which of the four dimensions to look at for that
  entity, not that something is wrong.
- Because `buyerPersona` and `competitivePosition` are 0/12
  fleet-wide, no pilot entity can reach 100 today — **86 is the
  practical ceiling** given today's evidence, not a scoring bug. Closing
  that ceiling requires new evidence (see `COMMERCIAL_MODEL.md`'s Known
  Risks), not a scoring-formula change.
- Comparing scores **within** a kind (service vs. service, product vs.
  product) is more meaningful than comparing across kinds, since
  `about` is the only `page`-kind entity in the pilot and has no peer to
  benchmark against.

## 6. Non-goals

- This score does not feed back into `rankRecommendations()` or any
  Phase 1.3 ranking signal — the two systems are deliberately
  independent (commercial readiness measures *this entity's own*
  completeness; Phase 1.3 ranking measures *relationship relevance
  between two entities*).
- No score is persisted or cached; `computeReadinessScore()` is called
  fresh every time `generateCommercialReadinessReport()` runs, and
  recomputes identically from the same source data every time.
