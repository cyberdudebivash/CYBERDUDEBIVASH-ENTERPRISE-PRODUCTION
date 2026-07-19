# CyberDudeBivash Enterprise Design System

Phase 0.3 deliverable. This document is the system-level overview —
per-component Purpose/Props/Variants/Accessibility/Usage/Extension-point
documentation lives next to each component (`src/design-system/components/*/README.md`)
rather than here, so it can't drift out of sync with the code it describes.

## What Phase 0.3 changed

Phase 0.1 and 0.2 extracted components as duplication was found
(Header, Footer, Navigation, TrustBadge, PricingCard) while reducing
`App.tsx` from 1,498 to 1,053 lines. Phase 0.3's objective was
different: not extraction for its own sake, but the deliberate start of
a genuine **enterprise design system** — a token vocabulary plus a set
of generic, documented, evidence-justified UI primitives that every
future page in the platform's transformation into the CyberDudeBivash
ecosystem gateway can build on, instead of each page hand-rolling its
own version of the same pattern.

Everything in `src/design-system/` was extracted because it met at
least one of the stated criteria — reused in multiple places, represents
a domain concept, improves maintainability, reduces duplicated business
logic, or forms part of the design system's own foundation (Hero and
SecurityBadge specifically — see their READMEs) — not because it looked
reusable in the abstract. Every token documents a real, already-in-use
value, quantified by a frequency audit of `src/views` and
`src/components`; none invent new visual language.

## Directory structure

```
src/design-system/
  tokens/            11 files + barrel — colors, typography, spacing,
                      radius, shadows, motion, breakpoints, opacity,
                      blur, icon sizes, container widths
  components/         SectionHeader, Hero, FeatureCard, StatCard,
                      EnterprisePanel, SecurityBadge — each its own
                      folder: Component.tsx, index.ts, README.md
  utilities/           accentColor.ts — the color-name -> Tailwind
                      class lookup shared by 3 components
  documentation/       this file
```

`icons/` and `hooks/` (listed in the original recommended structure)
were not created — nothing in this phase evidenced a real need for a
custom icon wrapper or a shared behavioral hook beyond what
`lucide-react` and plain conditional rendering already provide. Add
them when a second real consumer needs that logic, not speculatively.

## Token system

All 11 files live in `tokens/`, each with a header comment citing its
evidence (a frequency count from the actual codebase). Highlights:

- **colors.ts** — promotes `bg-[#0c1117]` (34 arbitrary-value
  occurrences found by audit) and 3 sibling near-black surface colors
  into real Tailwind utilities via new `--color-surface-*` custom
  properties added to `src/styles/index.css`'s `@theme` block
  (additive only — no existing class was changed).
- **typography.ts** — documents the app's "micro" type scale
  (`text-[8px]` through `text-[11px]`), which exists because Tailwind's
  default scale has nothing between `text-xs` (12px) and `text-sm`
  (14px), and this app's dense data-console aesthetic relies on sizes
  below that gap.
- **spacing.ts, radius.ts, shadows.ts, motion.ts, breakpoints.ts,
  opacity.ts, blur.ts, iconSizes.ts, containerWidths.ts** — each names
  the real scale already in use, ranked by actual frequency.

New design-system components consume these tokens instead of
hardcoding a fresh literal string per component — see `colors.ts`'s
`ACCENT_TEXT`-style maps (relocated to `utilities/accentColor.ts` once
a second component needed the identical lookup) for the pattern.

## Components

| Component | Priority | JSX call sites | Rendered instances | Justification |
|---|---|---|---|---|
| `SectionHeader` | 1 | 27 (ServicePages 20, LegalPages 7) | 27 (none mapped) | reuse — 6 page headers + 16+ subsections, independently hand-rolled |
| `Hero` | 2 | 1 (HomeView) | 1 | future growth / business importance — see README |
| `FeatureCard` | 3 | 9 (ServicePages 6, LegalPages 2, EcosystemDiscovery 1) | ~69 (most sites `.map()` over a data array) | reuse — the single strongest-evidenced shape in the repo |
| `StatCard` | 4 | 10 (ServicePages 4, LegalPages 1, HomeView 4, Hero 1) | ~29 | reuse — 3 real visual treatments unified |
| `EnterprisePanel` | 5 | 7 (ServicePages: 6 CTA banners + 1 explainer panel) | 7 (none mapped) | reuse — the generic bordered-container pattern |
| `SecurityBadge` | 6 | 3 (Footer, HomeView, LegalPages) | ~23 (each site maps over a compliance-label array) | formalized existing `TrustBadge`, not a new extraction — see README |

Every component's README documents its **Evidence** (exact files/counts
that justified it), its **Variants** (real, observed structural
differences — not invented options), and an **Evaluated, not
extracted** or **Future Extension Points** section listing what was
deliberately left alone and why (e.g. `FeatureCard`'s README explains
why HomeView's stateful portal/Gumroad cards and the "AI Red Team
Methodology" phase cards were not forced into the shared component).

## Two real Tailwind JIT bugs caught during this phase

Tailwind's content scanner only picks up **complete literal
class-name strings** — a dynamic template literal like
`` `border-${accent}-500/40` `` or `` `md:grid-cols-${n}` `` is invisible
to it and silently produces no CSS. This surfaced twice while wiring
`Hero`'s metrics grid and `FeatureCard`'s tinted variant; both were
fixed with a static `Record<AccentColor, string>` lookup (the same
pattern already used throughout the token files). Documented here so a
future component doesn't reintroduce it.

## Verification methodology

Every commit in this phase — 7 total, one per token-system pass and
per component — was verified with the same gate used since Phase 0.1:
`npm run lint` (`tsc --noEmit`), `npx vite build`, and a headless-Chromium
smoke test (via `playwright-core` against the pre-installed Chromium
binary, since this isn't a project dependency) covering every real view
touched, including screenshot review for visual changes and DOM
bounding-box checks where a screenshot couldn't easily confirm a
responsive layout detail (e.g. the mobile `col-span-2` behavior on
Hero's trailing metric tile).

A small number of minor, deliberate visual normalizations were made and
are called out in their commit messages rather than hidden — e.g.
consolidating `amber-500`/`red-500` to the same `amber-400`/`red-400`
family already used by sibling stat tiles, or `mb-1` vs `mb-0.5` on
otherwise-identical capability cards. These are exactly the kind of
drift a design system exists to resolve, not accidents.

## What this is not

This phase did not reduce `App.tsx` further (Phase 0.3's explicit
instruction), did not touch state architecture (Task 6, not started),
and did not introduce CI/CD enforcement (Task 8, deliberately deferred
until the component library stabilizes). Those remain open items from
the original engagement plan.
