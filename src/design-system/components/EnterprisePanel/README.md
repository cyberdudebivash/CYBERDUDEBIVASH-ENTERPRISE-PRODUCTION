# EnterprisePanel

The general-purpose enterprise container: an optional header, body
content, an optional trailing action, and an optional bordered-top
footer section.

## Purpose

Beyond the more specific cards (FeatureCard, StatCard), this app is
full of plain bordered containers used to group content — CTA banners,
explainer boxes, data panels. `EnterprisePanel` gives the generic case
one implementation with the three real surface treatments actually in
use, instead of a 21st hand-typed `bg-slate-900/40 border border-slate-800
rounded-xl p-6`.

## Evidence

- **CTA banners** — `src/views/ServicePages.tsx` repeats an identical
  shape 6 times, once per service (soc/dpdp/owasp/mssp/vciso/pentest):
  a gradient-tinted panel (`bg-gradient-to-r from-{accent}-950/30 to-slate-900/60
  border-{accent}-800/30`) with a heading + description on the left and
  a CTA button on the right (`flex flex-col sm:flex-row ... justify-between`).
  This is `variant="gradient"` with the `actions` slot.
- **Explainer panels** — e.g. soc's "What is Managed SOC-as-a-Service?"
  (`bg-violet-950/20 border border-violet-800/30 rounded-xl p-6`, a
  heading + paragraph, no actions). This is `variant="tinted"`.
- **Generic data panels** — LegalPages' "Corporate Registration &
  Identity" (`bg-slate-900/50 border border-slate-800 rounded-xl p-6`,
  a heading + a list of key/value rows as body). This is the default
  `variant="plain"`.
- **Footer section** — ServicePages' ROI calculator's cost-savings
  summary sits inside its panel behind a `border-t border-slate-900
  pt-3` divider, distinct from the panel's main body. This is the
  `footer` slot.

## Props

| Prop | Type | Notes |
|---|---|---|
| `header` | `ReactNode` | styled per `variant` by default (see Variants) |
| `children` | `ReactNode` | body content — any shape, including nested grids |
| `footer` | `ReactNode` | rendered below a `border-t` divider |
| `actions` | `ReactNode` | rendered beside header+body; providing it switches to a flex-row layout on `sm:`+ |
| `accent` | `AccentColor` | tints `variant="tinted"`/`"gradient"` and the default tinted header color |
| `variant` | `"plain" \| "tinted" \| "gradient"` | see Variants |
| `padding` | `"sm" \| "md" \| "lg"` | maps to `p-4`/`p-5`/`p-6`; default `"lg"` matches the majority of real panels |

## Variants

- **`plain`** (default) — `bg-surface-panel border-slate-800`, white
  header. Matches generic data panels.
- **`tinted`** — solid single-color background (`bg-{accent}-950/20`),
  accent-colored uppercase header. Matches explainer panels.
- **`gradient`** — the two-stop gradient background used by every
  CTA banner. Pair with `actions` for the button.

## Accessibility Notes

- `header` renders as a styled `<div>`, not a heading element, because
  its real call sites mix heading levels (`h2`/`h3`) inconsistently and
  this component doesn't know which level is correct for a given
  page's outline — pass a heading element as `header` yourself
  (`header={<h3>...</h3>}`) when the content is a true section heading
  rather than a label.
- The `actions` CTA button's accessible label/contrast (e.g.
  `text-black` vs `text-white` against differently-colored buttons) is
  fully caller-controlled, matching the real per-service color choices
  already in ServicePages (amber/emerald buttons use black text,
  violet/red/sky/pink use white, for contrast).

## Usage Example

```tsx
import { EnterprisePanel } from "../../design-system/components/EnterprisePanel";

// CTA banner:
<EnterprisePanel
  variant="gradient"
  accent="violet"
  header="Ready to activate your SOC in 72 hours?"
  actions={
    <button onClick={onContact} className="px-6 py-2.5 bg-violet-500 hover:bg-violet-400 text-white text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
      Start Free SOC Assessment
    </button>
  }
>
  <p className="text-xs text-slate-400 font-sans">Our onboarding team deploys log collectors and integrations in under 3 business days. No hardware required.</p>
</EnterprisePanel>

// Explainer panel:
<EnterprisePanel variant="tinted" accent="violet" header="What is Managed SOC-as-a-Service?">
  <p className="text-xs text-slate-300 leading-relaxed font-sans">Our Managed SOC eliminates the need to hire, train, and retain a 20-person security team...</p>
</EnterprisePanel>
```

## Future Extension Points

- Only the 6 CTA banners were wired in this pass, plus one explainer
  panel as proof of `variant="tinted"`. Several more generic containers
  (data panels, other explainer boxes with nested grids as body) are
  compatible with this component via `children` but weren't migrated
  here to keep this change focused — see the commit for the exact list
  wired.
- `header` doesn't render a semantic heading tag by design (see
  Accessibility Notes) — if a future audit standardizes heading levels
  across the app the way `SectionHeader` did, reconsider whether
  `header` should accept a `headingLevel` prop the same way.
