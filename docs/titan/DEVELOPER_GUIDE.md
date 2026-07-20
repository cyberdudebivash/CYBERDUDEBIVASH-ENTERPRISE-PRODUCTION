# Developer Guide — Titan

How to work in `titan/`. Assumes you're already set up for the main repository (Node 22 — `titan/.nvmrc` pins the same version).

## Layout

```
titan/
  apps/
    web/                  # @titan/web — the application shell (routing, layout, error handling)
      src/features/dpdp-assessment/  # the public DPDP scan route (/assessment/dpdp) — its own visual system, not @titan/design-system
  packages/
    design-system/        # @titan/design-system — tokens + reusable UI components (for the authenticated app shell only)
    assessment-core/       # @titan/assessment-core — question banks + risk-scoring engine (framework-agnostic)
    platform/               # @titan/platform — Cloudflare Worker + Repository Pattern (D1-backed, tested against a fake D1)
    config/                # @titan/config — shared tsconfig/eslint, not a runtime package
  package.json             # workspace root — npm workspaces, scoped to titan/ only
```

This is a separate npm workspace from the repository root — `titan/` has its own `package.json`, its own `package-lock.json`, its own dependency tree. Running `npm install` at the repo root does not touch `titan/`, and vice versa. This is deliberate (`ARCHITECTURE.md`): the marketing site's build pipeline has five audit stages of hard-won stability behind it, and nothing about Titan should be able to put that at risk.

## Getting started

```bash
cd titan
npm install
npm run dev          # starts @titan/web on Vite's default dev port
```

## Everyday commands (from `titan/`)

| Command | What it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` across every package |
| `npm run lint` | ESLint, `--max-warnings=0` — a warning fails CI the same as an error |
| `npm run format` | Prettier `--check` (use `format:write` to auto-fix) |
| `npm run build` | Production build of every package |
| `npm run test` | Full test suite (Vitest) |
| `npm run test:coverage` | Same, with a coverage report |
| `npm run test:watch` (per-package) | Watch mode while developing |

CI (`.github/workflows/titan-ci.yml`) runs typecheck → lint → format → build → test, in that order, only on changes under `titan/**`. It is fully independent of `deploy.yml` — no shared steps, no shared install, no way for a Titan CI failure to block or affect the marketing site's deploy, or vice versa.

## Testing conventions

- **Vitest + Testing Library + jsdom**, not this repo's main convention (`node:test`, used by the marketing site's build scripts). This is intentional, not drift: Titan is a fully separate workspace, and Vitest's jsdom/React integration is meaningfully better suited to component testing than hand-wiring `node:test` for the same purpose would be.
- Query by role/label/text (`screen.getByRole(...)`), the way a real user or assistive-technology user would find the element — not by test IDs or CSS selectors, which don't verify the thing actually being asked for (accessibility).
- Every interactive component gets: a rendering test, an interaction test (click/keyboard, via `@testing-library/user-event`, not `fireEvent` — `user-event` fires the fuller sequence of real browser events), and an `axe-core` structural accessibility check.

### What the `axe-core` checks in this repo do and don't catch

`vitest-axe` runs `axe-core` against jsdom-rendered output. jsdom does not do real layout or paint — there's no real canvas, no real computed visual styles. This means:

- **Caught**: missing/incorrect ARIA attributes, invalid roles, missing accessible names, invalid nesting patterns axe can detect structurally.
- **Not caught**: color contrast (explicitly disabled in every `axe()` call in this codebase, with a comment at each call site — don't remove the disable without understanding why it's there), real focus-order/visibility issues, anything that depends on actual rendering.

Closing that gap for good needs a real browser test runner wired into CI (Playwright, which this environment already has available) or a recurring manual/automated review — not implemented as a standing part of this phase's CI; not implied to be covered by "accessibility passes" in CI. (One golden-path run of the DPDP assessment flow has been checked manually in real Chromium as part of Stage 3 — see `PLATFORM_FOUNDATION.md` — which is real signal for that one flow, not a substitute for the gap above closing generally.)

## Design system usage

```tsx
import { Button, Alert, colors, spacing } from "@titan/design-system";

<Button variant="primary" onClick={handleSave} isLoading={isSaving}>
  Save changes
</Button>

<Alert variant="error" title="Couldn't save">
  Check your connection and try again.
</Alert>
```

Component CSS currently hand-mirrors the token values in `src/tokens/` (see the comment at the top of `Button.css`/`Alert.css`) — there's no build-time step that generates CSS custom properties from the TypeScript token modules yet. If you change a token value, update the corresponding CSS by hand and note it in the PR; a token→CSS pipeline is a reasonable improvement, not built here to keep this phase's scope honest about what's actually automated versus manually kept in sync.

## Assessment engine usage

```ts
import { dpdpV1, scoreAssessment, type Answers } from "@titan/assessment-core";

const answers: Answers = { has_dpo: false, consent_mechanism: true /* ... */ };
const result = scoreAssessment(dpdpV1.questions, answers);
// result.score (0-100), result.riskLevel ("low"|"medium"|"high"|"critical"),
// result.breakdown (counts per level), result.gaps (failed questions with penalty/section)
```

`titan/apps/web/src/features/dpdp-assessment/DpdpAssessmentPage.tsx` is the real consumer — it imports `dpdpV1`/`scoreAssessment` directly, holds no question data or scoring logic of its own. `scoreAssessment` always derives its denominator from the question bank (`getScoredQuestions`) rather than a hardcoded count — don't reintroduce a hardcoded count anywhere that consumes this; that's the exact bug Phase 2's Discovery pass (`ARCHITECTURE.md`) found in the original scanner, and the reason this module exists as tested code instead of inline `<script>`. Adding a second framework (ISO/SOC/etc., per `PRODUCT_VISION.md`'s "DPDP is the first module, not the whole product") means adding a new file next to `questions/dpdp-v1.ts`, not changing anything in `risk-engine/` — the engine takes a `Question[]` and doesn't know what framework it's scoring.

## Repository Pattern usage (`@titan/platform`)

```ts
import { createInMemoryLeadRepository, createD1LeadRepository } from "@titan/platform";

// Anything that needs leads depends on the LeadRepository interface, never a
// concrete store:
async function handle(leads: import("@titan/platform").LeadRepository) {
  const saved = await leads.save({ name, email, company, answers, result, timestamp, source });
  const all = await leads.list();
}
```

Both implementations (`repositories/leadRepository.memory.ts`, `repositories/leadRepository.d1.ts`) are proven interchangeable by one shared assertion suite (`repositories/leadRepository.contract.ts`, run against each in its own thin `*.test.ts` file) — when adding a second repository implementation for anything, write the contract once and run it against every implementation, rather than writing separate ad hoc tests per implementation that could silently drift apart.

The D1 implementation is tested against a hand-written fake (`repositories/testUtils/fakeD1.ts`), not real D1/`workerd` — real enough to prove this package's own SQL/binding/row-mapping code is correct, not a substitute for testing against actual D1 semantics. `@cloudflare/vitest-pool-workers` is the right tool for that gap but needs Vitest 4; this workspace is on Vitest 3 everywhere else (`DECISION_LOG.md` has the reasoning for not bumping that silently).

## Adding a new component to the design system

1. `packages/design-system/src/components/YourComponent.tsx` + co-located `.css` + `.test.tsx`.
2. Export it from `packages/design-system/src/index.ts`.
3. Tests: rendering, every interactive behavior, an `axe()` check with `color-contrast` disabled (see existing components for the pattern).
4. `npm run ci`-equivalent locally (`typecheck && lint && format && build && test`) before opening a PR — matches exactly what `titan-ci.yml` will run.

## What NOT to do (things this phase deliberately doesn't have yet)

- Don't add auth-shaped code (protected routes, session context, login forms) — the approach is decided (self-hosted Auth.js, `DECISION_LOG.md`) but nothing is built. Adding a "temporary" auth stub risks it quietly becoming permanent and shaping the real implementation around an assumption nobody actually chose.
- Don't wire `titan/apps/web` to call `@titan/platform`'s API yet. The Worker exists and is tested, but isn't deployed anywhere reachable — there's nowhere for a real fetch call to go. `leadStore.ts` stays `localStorage`-backed until that changes.
- Don't add a second repository (`AssessmentRepository`, etc.) ahead of a real, already-built consumer needing one — `LeadRepository` exists because the lead-capture UI already does; follow that pattern (interface + contract test + two implementations) when the next one has an actual reason to exist, per `DECISION_LOG.md`.
- Don't bump this workspace's Vitest 3 → 4 as a side effect of some other task, even though `@cloudflare/vitest-pool-workers` wants it — that's a deliberate, workspace-wide decision on its own, not a dependency bump to absorb quietly (`DECISION_LOG.md`).
- Don't reach for the main repository's `node:test`/`tsx` conventions inside `titan/` — this workspace has its own toolchain, documented above.
