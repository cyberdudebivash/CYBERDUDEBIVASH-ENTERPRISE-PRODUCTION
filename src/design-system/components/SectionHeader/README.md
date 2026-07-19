# SectionHeader

The canonical section-introduction component: an eyebrow label, a title,
and an optional description, with consistent spacing, divider, and
accent treatment. This is the single most duplicated visual pattern in
the app — see Evidence below — which is why it's Phase 0.3 priority #1.

## Purpose

Every page in this app introduces its sections the same conceptual way
(a short label, a heading, sometimes a sentence of context) but before
this extraction that pattern was hand-rolled independently at every call
site, with the same drift risk that caused the pre-Phase-0.1 trust-badge
wording inconsistency. `SectionHeader` gives every page — current and
future — one implementation to import instead of one more copy to type.

## Evidence (why this was extracted, not just recognized as similar)

- `src/views/ServicePages.tsx`: 6 identical page-level headers, one per
  service (`soc`, `dpdp`, `owasp`, `mssp`, `vciso`, `pentest` — lines
  ~29-37, 170-178, 260-268, 343-351, 415-423, 489-497), each an eyebrow
  (pulsing dot + mono uppercase label) + H1 + description paragraph.
- The same file also repeats a plainer subsection variant
  (`text-sm font-bold text-white uppercase tracking-widest border-b
  border-slate-800 pb-3`) roughly 15 times across those 6 pages
  ("Core SOC Capabilities", "Service Tiers", "Deliverables", etc.)
- `src/views/LegalPages.tsx` (About page): the same page-level pattern
  again, verbatim.
- `src/views/HomeView.tsx` and `src/components/EcosystemDiscovery.tsx`:
  7 more section intros at a third scale, some with a trailing live
  status chip (`ORCHESTRATOR ONLINE (v4.9.1)`), some with a left-border
  accent instead of a bottom divider (`border-l-4 border-cyan-500 pl-3`
  — "Corporate Entity Coordinates", "Cyber Defense Store").

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `ReactNode` | — | required; almost always a plain string, but accepts a fragment for cases like a styled `®` mark |
| `subtitle` | `string` | — | eyebrow/kicker line; renders with a pulsing accent dot |
| `description` | `string` | — | paragraph below the title |
| `badge` | `ReactNode` | — | trailing content (status chip, a `SecurityBadge`, a count) |
| `icon` | `ReactNode` | — | inline before the title (no current call site — future growth) |
| `cta` | `ReactNode` | — | action element, shares the trailing slot with `badge` |
| `align` | `"left" \| "center"` | `"left"` | `"center"` has no current call site; included per spec |
| `size` | `"page" \| "section" \| "subsection"` | `"section"` | see Variants |
| `accent` | `"cyan" \| "emerald" \| "amber" \| "red" \| "violet" \| "sky" \| "pink" \| "slate"` | `"cyan"` | matches each ServicePages tier's distinct color |
| `divider` | `"bottom" \| "left" \| "none"` | `"none"` for `page`, else `"bottom"` | `"left"` matches the HomeView border-accent variant |
| `headingLevel` | `"h1" \| "h2" \| "h3" \| "h4"` | by `size` — see below | escape hatch for correct document outline |
| `pulse` | `boolean` | `true` | eyebrow dot animation; the 3 static legal-document pages (Privacy/Terms/Copyright) pass `false` |
| `animate` | `boolean` | `false` | applies `animate-fade-in` |

## Variants (`size`)

- **`page`** — big H1 (`text-3xl md:text-4xl font-extrabold`), eyebrow
  with dot, `max-w-3xl` description. Default heading tag `h1`.
- **`section`** (default) — `text-xs uppercase tracking-widest font-mono`
  heading, optional small description, optional trailing badge/CTA row.
  Default heading tag `h3`.
- **`subsection`** — bare heading + bottom divider, no eyebrow, no
  description. Default heading tag `h2`.

Each size's default `headingLevel` matches the tag already used at its
real call sites today (page→h1, section→h3, subsection→h2) specifically
so that wiring an existing block into `SectionHeader` changes zero DOM
semantics. Override `headingLevel` when nesting requires a different
level — the prop exists because heading levels in this app were, before
this component, assigned inconsistently by feel (see Future Extension
Points).

## Accessibility Notes

- Renders a real heading element (`h1`–`h4`, chosen via `headingLevel`/
  `size`), not a styled `div` — screen reader users get the section in
  their heading-navigation outline.
- The pulsing eyebrow dot and live-status dot are decorative; they carry
  no `aria-hidden` today because they're plain `<span>`s with no icon
  font or semantic weight, but a future icon-based variant should mark
  purely decorative icons `aria-hidden="true"` (see FeatureCard, which
  already does this for its `ExternalLink` icons).
- Known pre-existing gap this component does *not* silently fix:
  `HomeView.tsx`'s true page hero currently renders as an `h2` with no
  `h1` anywhere on that view. Flagging here rather than changing it,
  since correcting a page's heading hierarchy is a behavior change
  outside this extraction's scope — see Future Extension Points.

## Usage Example

```tsx
import { SectionHeader } from "../../design-system/components/SectionHeader";

<SectionHeader
  size="page"
  accent="violet"
  subtitle="Enterprise Service · SOC Operations"
  title="Managed SOC-as-a-Service"
  description="CyberDudeBivash® delivers a fully autonomous 24×7 Security Operations Center..."
/>

// Subsection divider, no description:
<SectionHeader size="subsection" title="Core SOC Capabilities" />

// Section header with a trailing live-status badge:
<SectionHeader
  title="Autonomous AI SOC Orchestration & Response Terminal"
  description="Fully unified AI native network threat assessment..."
  badge={
    <span className="text-[9px] font-mono text-slate-500 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
      ORCHESTRATOR ONLINE (v4.9.1)
    </span>
  }
/>
```

## Future Extension Points

- `align="center"` is implemented but has no real call site yet — the
  true candidate (HomeView's hero intro block) belongs to the `Hero`
  component instead, which owns that layout.
- A page-wide heading-hierarchy audit (every view has exactly one `h1`)
  is a natural Phase 1 follow-up now that `SectionHeader` makes heading
  levels an explicit, visible prop instead of an implicit tag choice.
- `icon` is unused today; once a call site needs it, confirm the icon
  should sit before the title (current assumption) rather than as part
  of the eyebrow row.
