# Developer Guide — Titan

How to work in `titan/`. Assumes you're already set up for the main repository (Node 22 — `titan/.nvmrc` pins the same version).

## Layout

```
titan/
  apps/
    web/                  # @titan/web — the application shell (routing, layout, error handling)
  packages/
    design-system/        # @titan/design-system — tokens + reusable UI components
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

Closing that gap needs either a real browser test runner (Playwright, which this environment already has available) or manual/automated review with real browsers — not implemented in this phase; not implied to be covered by "accessibility passes" in CI.

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

## Adding a new component to the design system

1. `packages/design-system/src/components/YourComponent.tsx` + co-located `.css` + `.test.tsx`.
2. Export it from `packages/design-system/src/index.ts`.
3. Tests: rendering, every interactive behavior, an `axe()` check with `color-contrast` disabled (see existing components for the pattern).
4. `npm run ci`-equivalent locally (`typecheck && lint && format && build && test`) before opening a PR — matches exactly what `titan-ci.yml` will run.

## What NOT to do (things this phase deliberately doesn't have yet)

- Don't add auth-shaped code (protected routes, session context, login forms) — Workstream 4 is blocked on an open architecture decision (`ARCHITECTURE.md`). Adding a "temporary" auth stub risks it quietly becoming permanent and shaping the real implementation around an assumption nobody actually chose.
- Don't add a database client or API calls — Workstreams 6/7 are blocked on hosting/database decisions.
- Don't reach for the main repository's `node:test`/`tsx` conventions inside `titan/` — this workspace has its own toolchain, documented above.
