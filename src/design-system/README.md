# CyberDudeBivash Enterprise Design System

Phase 0.3 foundation. This directory is the canonical home for **generic,
reusable enterprise UI primitives** — the vocabulary every page in the
platform draws from — as distinct from `src/components/`, which holds
**feature-specific** components (`header/`, `footer/`, `navigation/`,
`cards/PricingCard`) tied to one part of the product.

Rule of thumb: if a component represents a domain concept specific to one
feature (a pricing tier, the site header), it belongs in `src/components/`.
If it's a generic enterprise pattern reused — or intended to be reused —
across many pages regardless of feature (a section intro, a metric tile, a
bordered panel), it belongs here.

## Structure

```
design-system/
  tokens/          Design tokens — colors, typography, spacing, radius,
                    shadows, motion, breakpoints, opacity, blur, icon
                    sizes, container widths. Every value here documents an
                    existing, real value already in use somewhere in the
                    app — see each file's header comment for the evidence.
                    Nothing here invents a new visual language.
  components/       One folder per component: `ComponentName.tsx`,
                    `index.ts` (barrel export), `README.md` (Purpose,
                    Props, Variants, Accessibility Notes, Usage Example,
                    Future Extension Points).
  documentation/    System-level docs (this file's companion overview,
                    token-usage guide). Per-component docs live next to
                    their component, not here — colocation keeps them from
                    drifting out of sync with the code they describe.
```

`icons/`, `hooks/`, and `utilities/` are reserved extension points, not
created yet — nothing in this phase has evidenced a real need for a custom
icon wrapper, a shared hook, or a class-joining utility beyond what
`lucide-react` and plain template-literal `className` strings (the
existing codebase convention) already provide. Add them when a second
component genuinely needs to share that logic, not speculatively.

## Why extraction happened here and not elsewhere

Every component in `components/` was extracted because it met at least one
of: reused in multiple real call sites, represents a domain concept,
reduces duplicated business logic, or is explicitly required as design-system
foundation (see each component's README for its specific evidence — file
and line references to the call sites that justified it). Nothing was
extracted just because it looked reusable in the abstract.
