# Runtime Health

Owns: `checkRuntimeHealth()`'s five dimensions, its status-aggregation
rule, and why it exists as a separate call from `generateSEO()`'s own
`diagnostics` field. See `health/checkRuntimeHealth.ts` and
`health/types.ts`.

## Diagnostics vs. Health — Two Different Questions

| | `SEORuntimeDiagnostics` | `SEORuntimeHealthCheck` |
|---|---|---|
| Produced by | every `generateSEO(pageId)` call | a separate call, `checkRuntimeHealth()` |
| Scope | one page | the whole platform |
| Answers | "what happened composing *this* page?" | "is the platform, as a whole, in a good state?" |
| Cost | one pipeline run (already paid for) | re-runs the pipeline for all 17 pages, plus 4 platform-wide checks |

These are easy to conflate — both report warnings/errors — which is why
this file exists to state the distinction explicitly rather than leave
it implicit in two similarly-named modules.

## The Five Dimensions

```ts
type SEORuntimeHealthStatus = "healthy" | "warning" | "error";

interface SEORuntimeHealthCheck {
  status: SEORuntimeHealthStatus;       // worst of the five below
  checkedAt: string;
  configuration: SEORuntimeHealthStatus;
  pipeline: SEORuntimeHealthStatus;
  relationships: SEORuntimeHealthStatus;
  validation: SEORuntimeHealthStatus;
  commercial: SEORuntimeHealthStatus;
  issues: string[];
}
```

1. **`configuration`** — `error` if `PAGES` is empty, or if any id is
   duplicated *within* `PAGES` itself (via `findDuplicates` from
   `validators/shared.ts`, Phase 1.0.5). Distinct from the known,
   documented cross-*collection* id ambiguity (`vciso` is both a page id
   and a service id) that `validateConfiguration` already tracks
   separately — see `contracts/errors.ts`'s `DuplicateEntityError`
   header comment.
2. **`validation`** — runs `generateValidationReport()` fresh (all 16
   domain validators). `error` if any error-severity issue exists,
   `warning` if only warning-severity ones do (the platform's real,
   documented baseline — 106 warnings today), else `healthy`.
3. **`relationships`** — builds the graph fresh
   (`buildRelationshipGraph()`) and runs `validateRelationshipGraph()`
   against it. Same error/warning/healthy rule as `validation`.
4. **`commercial`** — `buildAllCommercialViews()` (all 12 pilot
   entities) + `validateAllCommercialViews()`. Same rule.
5. **`pipeline`** — runs `runPipeline(page.id)` for every page in
   `PAGES` (uncached — this always exercises a fresh run, deliberately
   bypassing `generateSEO()`'s cache so a stale cached success can never
   mask a real regression), catching and collecting any thrown
   `SEORuntimeError`. `error` if any page fails, else `healthy`. Run
   last: a failure here that traces back to Configuration, Validation,
   Relationships, or Commercial will already be explained by one of the
   four checks above; `pipeline` only adds signal when it fails for a
   reason none of the other four caught (e.g. a Schema-stage-only
   failure — Schema has no standalone health dimension of its own; see
   Known Risks).

**Overall `status`** is the worst of the five (`error` > `warning` >
`healthy`) — see `checkRuntimeHealth.ts`'s `worse()` helper.

## Why `pipeline` Exists as a Fifth Dimension

The RESUME prompt names four domains explicitly ("Configuration,
Pipeline, Relationships, Validation, Commercial" — five, in fact,
including Pipeline itself). `configuration`/`validation`/
`relationships`/`commercial` each check one *engine's own* data
directly. None of them, individually or together, proves the *pipeline*
that composes them still integrates correctly — a bug introduced only in
`pipeline/stages/schemaStage.ts` or `diagnostics/buildDiagnostics.ts`,
for instance, would not be caught by any of the other four checks, since
none of them calls Schema or Diagnostics at all. Running the real
pipeline for every real page is the one check that would catch that
class of failure.

## Known Risks

- **Cost scales with page count.** At 17 pages, the full `pipeline`
  check completes in tens of milliseconds (see `SEO_RUNTIME.md`'s
  Verification Results). This has not been load-tested at a larger page
  count; if `PAGES` grows by an order of magnitude, `checkRuntimeHealth()`
  may become too slow for a synchronous health-endpoint call. Not a
  problem at today's scale, and no premature optimization (e.g.
  memoizing this check) was added for a scale this platform is not at.
- **No standalone Schema dimension.** Schema-stage failures surface only
  via the `pipeline` dimension's per-page failure messages, not a
  dedicated `schema` field alongside `configuration`/`relationships`/
  `commercial`. This matches the RESUME prompt's own five named
  dimensions exactly (Configuration, Pipeline, Relationships,
  Validation, Commercial — no separate Schema entry), so it is not
  treated as a gap to fix without an explicit instruction to add one.
