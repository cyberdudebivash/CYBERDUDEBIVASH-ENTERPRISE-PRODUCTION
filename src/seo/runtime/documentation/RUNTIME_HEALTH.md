# Runtime Health

`health/buildHealth.ts`'s `getRuntimeHealth()` is a platform-wide
fitness snapshot — deliberately separate from the per-page
`RuntimeDiagnostics` embedded in every `SEORuntimeResult` (see
`PUBLIC_API.md`). Where diagnostics answers "is *this page's* output
healthy," `getRuntimeHealth()` answers "is the *whole platform*
healthy right now."

## Shape

```ts
interface RuntimeHealthReport {
  status: "healthy" | "warning" | "error";       // worst of the five below
  configuration: "healthy" | "warning" | "error";
  pipeline: "healthy" | "warning" | "error";
  relationships: "healthy" | "warning" | "error";
  validation: "healthy" | "warning" | "error";
  commercial: "healthy" | "warning" | "error";
  issues: {
    missingEntities: string[];   // entities orphaned from their own graph/navigation despite existing
    brokenReferences: string[];  // dangling/unresolved reference issues
    duplicateIds: string[];      // duplicate-detection issues
    configurationIssues: string[]; // error-severity configuration issues
    pipelineFailures: string[];  // pages whose full pipeline run threw
  };
}
```

## How each dimension is computed

- **configuration** / **validation**: `buildValidatedConfigurationReport()`'s
  underlying report (all 16 domain validators) — `"error"` if any
  error-severity issue exists, `"warning"` if only warnings, else
  `"healthy"`. (These two are intentionally computed the same way:
  "Validation" in the HEALTH section's own five-way list is the same
  configuration-wide validation "Configuration" already names — see
  Known Risks in `SEO_RUNTIME.md` if a future phase wants to split
  them into genuinely different signals.)
- **pipeline**: runs `runPipeline(page.id, graph, configurationReport)`
  for every real page in `PAGES` and records which ones throw.
  `"error"` if any page's pipeline throws, else `"healthy"` (there is
  no meaningful "warning" state for a boolean pass/fail check).
- **relationships**: `validateRelationshipGraph()` against a freshly
  built graph.
- **commercial**: `validateAllCommercialViews()` against every real
  commercial view.

## `issues` categorization

The 16 domain validators (plus the relationship/commercial validators)
raise dozens of distinct issue codes (`PAGE_MISSING_DESCRIPTION`,
`SCHEMA_DUPLICATE_ID`, `ARTICLE_AUTHOR_UNRESOLVED`, ...). Rather than
inventing a per-code mapping table, `buildHealth.ts` buckets by
substring:

- `duplicateIds` — any code containing `DUPLICATE`.
- `brokenReferences` — any code containing `DANGLING` or `UNRESOLVED`.
- `missingEntities` — any code containing `ORPHAN` or `UNUSED`, plus
  `CONFIG_EMPTY_COLLECTION`. This is deliberately **narrow**: it means
  "an entity that exists in config but is structurally disconnected
  from the platform's own graphs" (unreferenced by navigation, by the
  relationship graph, by any `relatedEntityIds`) — not "a field on an
  otherwise-fine entity is blank."
- `configurationIssues` — only error-severity configuration issues
  (empty today, since the real baseline is 0 errors).

**Field-completeness gaps are deliberately not itemized into any
bucket.** By far the largest code family across the 16 validators is
`*_MISSING_*` (missing image, missing description, missing keyword,
missing CTA, ...) and Phase 1.4's own `COMMERCIAL_*_FIELD_MISSING`
family — real, but describing incomplete *data* on entities that
exist, not one of this section's five named categories. They still
drive the relevant dimension's `warningCount` (and therefore its
`"warning"` status) exactly like every other warning; only their
individual messages are excluded from `issues`, which would otherwise
bury `duplicateIds`/`brokenReferences`/`missingEntities` under roughly
90 field-completeness messages every single call.

## Verified baseline

Against the real, committed configuration: `status: "warning"`,
`pipeline: "healthy"`, zero `pipelineFailures`, zero `duplicateIds`,
zero `brokenReferences`, zero `configurationIssues` — matching this
phase's own pre-implementation baseline (Step 2 of the resume
protocol) exactly: 0 errors / 106 warnings / 13 info across
validation, 0 errors / 14 warnings on the relationship graph, 0 errors
/ 45 warnings across commercial. See `SEO_RUNTIME.md`'s Verification
Results.

## `assertRuntimeHealthy(report?)`

Throws `RuntimeHealthError` when `report.status === "error"`. An
opt-in strict gate — e.g. a future CI/build step calling
`assertRuntimeHealthy()` to fail a deploy on a platform-wide error,
without every caller re-implementing its own `if (status === "error")`
check. Never throws against the real platform today (status is
`"warning"`, not `"error"`).
