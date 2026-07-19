# FeatureCard

The canonical enterprise product/feature card. The single most
duplicated shape in the repository — see Evidence — covering roughly 60
real cards once wired.

## Purpose

Every service page, the ecosystem discovery panel, and the legal pages
each independently hand-rolled an "icon + title + description" card.
`FeatureCard` gives all of them one implementation with two honest,
evidenced structural variants (`layout`) instead of a dozenth
near-identical copy.

## Evidence

- `src/views/ServicePages.tsx` — 4 nearly-identical capability grids
  (soc: 8 cards, dpdp: 8, mssp: 6, vciso: 8 — 30 total), each
  `bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex gap-3`
  with an emoji icon. The owasp grid (10 cards) uses the same shape but
  swaps the emoji for a small `LLM0N` ID badge. The pentest grid (8
  cards) adds a `tags` row between title and description.
- `src/views/LegalPages.tsx` — "What We Deliver" (6 cards, same row
  shape, a colored dot instead of an emoji) and Mission/Vision/Core
  Values (3 cards, a colored-border/background panel with no icon at
  all — `variant="tinted"`).
- `src/components/EcosystemDiscovery.tsx` — the commercial-services grid
  (12 cards): a structurally different, hover-interactive card
  (`bg-surface-panel`, icon in a colored box next to a category badge,
  title+description below, a link-or-button CTA pinned to the bottom
  via `justify-between`). This is `layout="stack"`.

## Evaluated, not extracted

- **HomeView's ecosystem-portal cards** (5 cards) and **Gumroad product
  cards** (5 cards) have real per-item interactive state owned by the
  parent (`isPinging`/`onPortalPing`, `isPurchased`/`onCheckoutProduct`).
  Forcing them into `FeatureCard` would mean either leaking that state
  concept into this component's contract or gaining little by extracting
  markup that's already reasonably contained. Left as-is.
- **ServicePages' "AI Red Team Methodology" phase cards** (5 cards) use
  the icon slot for a "Week N" text label, not an icon — a single-use
  variant that would blur `icon`'s contract for everyone else. Left as
  page-specific markup rather than added as a third `layout`.

## Props

| Prop | Type | Notes |
|---|---|---|
| `icon` | `ReactNode` | emoji, lucide element, or a pre-styled badge (owasp's ID badges pass one here) |
| `iconWrapper` | `"emoji" \| "raw" \| "box" \| "dot"` | `"emoji"` (default) sizes a glyph; `"raw"` renders a pre-styled badge unwrapped (owasp); `"box"` for `layout="stack"`; `"dot"` for LegalPages' deliver cards |
| `title` | `ReactNode` | required |
| `description` | `string` | required |
| `tags` | `string[]` | pentest's tag row |
| `badge` | `ReactNode` | category label, rendered near the icon |
| `status` | `ReactNode` | e.g. a checkmark + "Ordered" — no current call site, caller-rendered |
| `cta` | `ReactNode` | pass an `<a>` or `<button>`; this component doesn't distinguish them |
| `accent` | `AccentColor` | tints `tinted`'s border/background, the `dot`, and `tags` text |
| `variant` | `"panel" \| "tinted"` | `"tinted"` = Mission/Vision/Core Values, no icon |
| `layout` | `"row" \| "stack"` | see Variants — only meaningful for `variant="panel"` |

## Variants

- **`layout="row"`** (default) — icon beside a title+description block,
  non-interactive, `bg-slate-900/40`. The dominant shape (36 of the ~48
  panel-variant cards).
- **`layout="stack"`** — icon+badge row on top, content below, CTA
  pinned to the bottom, hover-interactive, `bg-surface-panel`. Matches
  EcosystemDiscovery exactly, including the icon box's hover recolor.
- **`variant="tinted"`** — colored border+background, no icon, title
  itself carries the accent color. Matches Mission/Vision/Core Values.

## Accessibility Notes

- `layout="row"`'s emoji icons are decorative relative to `title`
  (which repeats the concept in text) — no `aria-hidden` is applied
  automatically because `icon` may also be a meaningful badge (owasp's
  `LLM01` codes are not purely decorative); pass `aria-hidden="true"` on
  the icon element yourself when it truly is decorative.
- `cta` links to external platforms should keep `target="_blank"
  rel="noopener noreferrer"` and a visible external-link icon, matching
  every real call site today.

## Usage Example

```tsx
import { FeatureCard } from "../../design-system/components/FeatureCard";

// row layout, emoji icon (ServicePages capability grids):
<FeatureCard icon="🧠" title="AI-Powered Alert Triage" description="GE-Neural AI processes millions of raw security events per hour..." />

// row layout, tags (ServicePages pentest grid):
<FeatureCard icon="🌐" title="Web Application Penetration Testing" tags={["OWASP Top 10", "API Security"]} description="Manual + automated testing..." accent="pink" />

// row layout, dot icon (LegalPages "What We Deliver"):
<FeatureCard iconWrapper="dot" title="Managed SOC-as-a-Service" description="24×7 autonomous security operations center..." />

// tinted variant (LegalPages Mission/Vision/Core Values):
<FeatureCard variant="tinted" accent="cyan" title="Mission" description="To democratize enterprise-grade cybersecurity..." />

// stack layout (EcosystemDiscovery commercial services):
<FeatureCard
  layout="stack"
  iconWrapper="box"
  icon={<Eye className="w-4 h-4" />}
  badge={<span className="text-[9px] font-mono ...">Intelligence</span>}
  title="Threat Intelligence Feeds"
  description="Live IOC data streams..."
  cta={<a href="..." className="...">Subscribe Feed <ExternalLink className="w-3 h-3" /></a>}
/>
```

## Future Extension Points

- `cta` deliberately doesn't distinguish a link from a button (the
  Phase 0.3 spec lists both "CTA" and "link" as separate requirements) —
  this component treats them as the same visual slot, matching how
  EcosystemDiscovery's own source conditionally renders one or the
  other in that exact slot. Revisit if a future call site needs the
  two to look meaningfully different rather than interchangeable.
- `status` has no real call site yet; the Gumroad product cards
  (HomeView) are the closest real candidate but were left unextracted
  for their state-coupling — see "Evaluated, not extracted."
