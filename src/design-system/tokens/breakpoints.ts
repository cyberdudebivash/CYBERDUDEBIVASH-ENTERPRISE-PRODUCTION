// Breakpoint Tokens
//
// No custom --breakpoint-* overrides exist in src/styles/index.css's
// @theme block, so this app runs on Tailwind's stock breakpoints.
// Usage today is md: (76x) and sm: (43x) and lg: (35x) — xl/2xl are
// listed for completeness (and future growth, per Phase 0.3) but have
// zero call sites right now. These px values are for JS-side use
// (matchMedia, conditional rendering) — CSS-side responsiveness should
// always use the sm:/md:/lg: Tailwind prefixes directly, not this file.

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;
