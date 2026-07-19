# Hero

The canonical enterprise page hero: badge, headline, description, CTA
buttons, and a metrics row, with optional subheadline/background/
illustration/trust-indicator slots for pages this platform doesn't have
yet.

## Purpose

`HomeView.tsx` has exactly one hero today — but Phase 0.3's own brief is
explicit that this design system is "the foundation for the complete
transformation of CyberDudeBivash.com into the official enterprise
gateway," which means more page heroes are coming (product pages, a
platform-specific landing page, etc.). Building `Hero` to the full
spec now, from the one real example that exists, means the next hero
composes a finished component instead of hand-rolling a second one that
drifts from the first — exactly the inconsistency this whole engagement
started by fixing on trust badges.

This is the one Phase 0.3 component whose extraction is justified by
**Future Growth** and **Business Importance** rather than current reuse
count — see the evaluation criteria in the Phase 0.3 brief, which asks
for at least one of several qualifying reasons, not reuse alone.

## Evidence

- `src/views/HomeView.tsx` lines ~33-92 (before extraction): the pill
  badge ("CYBERDUDEBIVASH® Global Cybersecurity Authority"), the h2
  headline with an inline gradient-highlighted second line, the
  description paragraph, two CTA buttons (one solid/primary, one
  outlined/secondary), and immediately below, a 5-tile stats grid
  (500K+ Threat IOCs, Global Threat Coverage, 100+ AI Tools, 99.9%
  Uptime SLA, 24/7 Automated Monitoring — the last with a pulsing dot).
  The stats grid sits directly adjacent with nothing in between, which
  is why it's modeled as this component's `metrics` prop rather than a
  separate block the caller has to remember to place underneath.

## Props

| Prop | Type | Notes |
|---|---|---|
| `badge` | `ReactNode` | the pill chip above the headline |
| `headline` | `ReactNode` | required; `ReactNode` so the gradient-highlighted second line survives |
| `subheadline` | `ReactNode` | no current call site — future growth |
| `description` | `string` | — |
| `buttons` | `HeroButton[]` | `{ label, icon?, onClick?, href?, variant?: "primary" \| "secondary" }` |
| `metrics` | `HeroMetric[]` | `{ value, label, tone?, valueSize? }` — rendered via `StatCard variant="surface"` |
| `background` | `"none" \| "grid" \| "scanline"` | `"grid"`/`"scanline"` reuse the existing `.bg-cyber-grid`/`.scanline-overlay` CSS already live in `AiSocDashboard.tsx` — real textures, not invented here. Default `"none"` matches HomeView today. |
| `illustration` | `ReactNode` | no current call site — future growth |
| `trustIndicators` | `ReactNode` | no current call site inside a hero — future growth (HomeView's compliance badge bar is a separate, distant section, not moved here) |
| `align` | `"center" \| "left"` | default `"center"`, matching the only real call site |

## Accessibility Notes

- Renders the headline as a real `<h1>`. HomeView's original hero
  heading was an `h2` with no `h1` anywhere on that view — wiring Hero
  in corrects that gap rather than perpetuating it, since a page hero
  is definitionally the page's top-level heading. Verify no other `h1`
  exists on a page before adding a second `Hero`.
- Decorative elements (the pulsing badge dot, gradient text) carry no
  semantic weight and need no additional ARIA.

## Usage Example

```tsx
import { Hero } from "../../design-system/components/Hero";
import { Activity, Shield } from "lucide-react";

<Hero
  badge={<><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />CYBERDUDEBIVASH® Global Cybersecurity Authority</>}
  headline={<>AI-Powered Cyber Defense &amp; <br /><span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">Threat Intelligence Platform</span></>}
  description="CYBERDUDEBIVASH® delivers real-time threat intelligence, AI-powered SOC operations..."
  buttons={[
    { label: "View Live Threat Feed", icon: <Activity className="w-4 h-4" />, variant: "primary", onClick: () => onNavigate("intel") },
    { label: "Start Free Security Audit", icon: <Shield className="w-4 h-4 text-cyan-400" />, variant: "secondary", onClick: () => onNavigate("ai") },
  ]}
  metrics={[
    { value: "500K+", label: "Threat IOCs", tone: "cyan" },
    { value: "Global", label: "Threat Coverage", tone: "emerald" },
    { value: "100+", label: "AI Tools", tone: "purple" },
    { value: "99.9%", label: "Uptime SLA", tone: "amber" },
    { value: <><span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />24/7</>, label: "Automated Monitoring", tone: "red" },
  ]}
/>
```

## Future Extension Points

- `buttons` renders inline rather than delegating to a dedicated
  `Button`/`CTAButton` component — CTA buttons repeat with the same
  primary/secondary visual language dozens of times across this app
  (every ServicePages CTA banner, EcosystemDiscovery, etc.), which is
  strong evidence for extracting one. It wasn't in Phase 0.3's named
  priority list, so it's flagged here rather than built speculatively;
  Hero's button rendering should switch to consume it once it exists.
- `illustration`, `subheadline`, and `trustIndicators` are implemented
  per spec but unused — confirm actual placement against the first real
  second-hero call site rather than assuming this guess is final.
