# SecurityBadge

The canonical badge for compliance, trust, verification, certification,
and platform-status labels (ISO 27001, SOC 2, GDPR, DPDP Act, and
similar). Formerly `TrustBadge` (`src/components/badges/`) — renamed
and relocated here in Phase 0.3, not rebuilt.

## Why this isn't a new component

Phase 0.3's priority list named `SecurityBadge` — "Unified: Compliance,
Trust, Verification, Certification, Platform status" — as its own
priority. That description is exactly what `TrustBadge` already did
(4 variants, unifying 3 previously-independent hand-rolled badge
treatments across the homepage trust bar, the About page framework
list, and the footer strip — see git history for that original
extraction). Building a second, parallel component with the same job
would recreate the exact inconsistency problem this whole engagement
started by fixing on trust-badge wording. So this pass:

1. Confirmed the overlap (this note),
2. Relocated the component from `src/components/badges/` into
   `src/design-system/components/SecurityBadge/` (a generic,
   cross-feature primitive belongs in the design system, not
   alongside feature-specific components),
3. Renamed `TrustBadge` → `SecurityBadge` (component, props type,
   variant type) to match the design system's canonical name,
4. Updated all 3 real call sites in the same change — no
   backwards-compatible re-export shim, since every caller was
   updated together.

## Purpose

One implementation for every compliance/trust/certification label in
the app, so wording and styling can be corrected in one place instead
of drifting independently at each call site (which is exactly what
happened before the original extraction — see `ARCHITECTURE-AUDIT.md`
and the trust-claims commits preceding Phase 0.1).

## Evidence (call sites, unchanged from the original extraction)

- `src/components/footer/Footer.tsx` — footer compliance strip, `variant="dot-text"`.
- `src/views/HomeView.tsx` — homepage trust bar, `variant="pill-icon"`.
- `src/views/LegalPages.tsx` — About page compliance framework list, `variant="pill-solid"`.

## Props

| Prop | Type | Notes |
|---|---|---|
| `label` | `string` | required |
| `colorClassName` | `string` | a Tailwind text-color utility (e.g. `"text-cyan-400"`); some variants derive a matching background/dot color from it via `.replace("text-", "bg-")` |
| `variant` | `"pill-icon" \| "pill-solid" \| "text" \| "dot-text"` | default `"text"` |

## Variants

- **`pill-icon`** — a bordered pill with a green checkmark (homepage trust bar).
- **`pill-solid`** — a solid bordered pill, no icon (About page framework list).
- **`dot-text`** — a colored dot + text with a hover-opacity transition (footer strip).
- **`text`** (default) — bare colored text, no container.

## Accessibility Notes

- The checkmark icon in `pill-icon` is decorative (the label text
  already states the compliance claim) — consider adding
  `aria-hidden="true"` if this component is touched again.
- `colorClassName` is caller-supplied, so contrast against the badge's
  background is the caller's responsibility — every real call site
  today uses a color from the standard accent palette against a dark
  `slate-950`/transparent background, which already meets contrast.

## Usage Example

```tsx
import { SecurityBadge } from "../../design-system/components/SecurityBadge";

<SecurityBadge label="ISO/IEC 27001:2022 Aligned" colorClassName="text-cyan-400" variant="pill-icon" />
```

## Future Extension Points

- If a future call site needs a compliance badge with a link (e.g. to
  a verification page), extend `colorClassName`'s sibling props rather
  than overloading `variant` for it — a 5th variant should represent a
  genuinely new visual treatment, not an interaction change.
