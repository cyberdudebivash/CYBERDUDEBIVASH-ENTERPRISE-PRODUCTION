# StatCard

The canonical metric-tile component: a big value, a small uppercase
label, in a centered tile. Unifies three visually distinct but
semantically identical tile treatments found across the app.

## Purpose

Every page that shows a headline number (threat IOC count, SLA
percentage, price, engagement duration) built its own tile markup
independently. The three treatments below all express the same concept
— `StatCard` gives them one implementation with an honest `variant` prop
for the real, evidenced differences, instead of a fourth hand-rolled copy.

## Evidence

- `src/views/HomeView.tsx` "Core Stats Counters" (5 tiles: 500K+ Threat
  IOCs, Global Threat Coverage, 100+ AI Tools, 99.9% Uptime SLA, 24/7
  Automated Monitoring) — bordered panel, responsive value/label sizing.
  One tile (24/7) prepends a pulsing dot to the value — reproduced via
  `value` accepting `ReactNode`, not just `string`.
- `src/views/ServicePages.tsx` — 4 identical 4-tile grids (one per
  service: soc/mssp/vciso/pentest), each `{ v, l, c }` mapped into a
  tile with a flat (non-responsive) value size. vCISO's tile uses a
  visibly smaller value (`text-xl` vs `text-2xl`) because its values are
  longer strings (`₹15L/yr`, `15yr+`) — reproduced as `valueSize="sm"`.
- `src/views/LegalPages.tsx` (About page) — the identical outlined
  treatment again, 1 more grid of 4.
- `src/views/HomeView.tsx` "Company facts" row (100+, 2020, `<15m`,
  24×7) — no per-tile border/background (the grid's shared parent
  supplies it), value always plain slate (never a per-tile accent
  color) and `font-bold` rather than `font-extrabold`.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | — | required |
| `value` | `ReactNode` | — | required; `ReactNode` so the pulsing-dot composite value survives |
| `icon` | `ReactNode` | — | rendered above the value; no current call site — future growth |
| `tone` | `AccentColor` | `"cyan"` | value text color; ignored by `variant="plain"` |
| `trend` | `"up" \| "down" \| "flat"` | — | renders a lucide trend arrow; no current call site — future growth |
| `trendValue` | `string` | — | text next to the trend arrow (e.g. `"+12%"`) |
| `status` | `string` | — | small uppercase tag under the label; no current call site — future growth |
| `variant` | `"surface" \| "outlined" \| "plain"` | `"outlined"` | see Variants |
| `valueSize` | `"sm" \| "md"` | `"md"` | `"sm"` matches vCISO's longer-string tiles |
| `animate` | `boolean` | `false` | applies the existing `.counter-pop` keyframe |

## Variants

- **`surface`** — `bg-surface-panel` (the design-system surface-color
  token), responsive value (`text-2xl md:text-3xl`) and label
  (`text-[10px] md:text-xs`). Matches HomeView's core stats.
- **`outlined`** (default) — `bg-slate-900/60`, `rounded-xl`, flat
  (non-responsive) value/label sizing. Matches ServicePages/LegalPages —
  by render count, this is the single most common treatment (20 tiles
  across 5 grids).
- **`plain`** — no own border or background; always `text-slate-300
  font-bold`, ignoring `tone`. Matches HomeView's company-facts row,
  which relies on its own shared grid container for the visual boundary.

## Accessibility Notes

- Purely presentational — no interactive elements, so no additional
  ARIA is required beyond what a plain `div` provides.
- The trend icon is decorative relative to `trendValue`'s text (the
  number already carries the meaning); it is marked `aria-hidden="true"`.
- If a future `icon` call site conveys meaning not present in `label`
  (rare for a metric tile), pass accessible text via the icon's own
  props rather than relying on this component to infer intent.

## Usage Example

```tsx
import { StatCard } from "../../design-system/components/StatCard";

<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
  <StatCard variant="surface" value="500K+" label="Threat IOCs" tone="cyan" />
  <StatCard
    variant="surface"
    value={<><span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />24/7</>}
    label="Automated Monitoring"
    tone="red"
  />
</div>

// ServicePages tier grid:
<StatCard value="₹15L/yr" label="vs ₹1.5Cr full-time CISO" tone="emerald" valueSize="sm" />

// HomeView company facts (shared container supplies the border):
<div className="bg-[#0c1117] border border-slate-800 p-6 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-6">
  <StatCard variant="plain" value="100+" label="Security Tools & Playbooks" />
</div>
```

## Future Extension Points

- `icon`, `trend`/`trendValue`, and `status` are implemented per the
  Phase 0.3 spec but have no real call site yet — confirm actual
  placement (icon above vs. beside the value; status as a tag vs. a
  corner dot) against the first real usage rather than assuming this
  guess is final.
- `Hero`'s `metrics` prop composes this component directly for
  HomeView's hero-adjacent stats grid — see `Hero/README.md`.
