// Elevation (Shadow) Tokens
//
// Two distinct shadow uses exist in the app today, kept as two token
// groups rather than one scale: plain elevation (shadow-lg/xl/2xl,
// shadow-black/60-85 for depth against the dark background) and brand
// "glow" shadows tinted with the accent color (shadow-cyan-500/10-20,
// shadow-cyan-900/40-50 — used on primary CTAs and logo marks). The
// .glow-cyan/.glow-red/.glow-emerald utility classes in
// src/styles/index.css cover the animated pulse variant; these tokens
// cover the static box-shadow variant.

export const elevation = {
  low: "shadow-md",
  medium: "shadow-lg",
  high: "shadow-xl",
  highest: "shadow-2xl",
  // Depth shadows tinted black rather than a color — used to lift a
  // card off the dark background without an accent tint.
  depthSoft: "shadow-lg shadow-black/40",
  depthStrong: "shadow-xl shadow-black/85",
} as const;

// Accent-tinted glow, keyed to the same tones as colors.ts. Only cyan
// is evidenced today (primary CTAs, brand logo marks) — other tones
// are provided for consistency when a second accent needs a glow, not
// because they're already in use.
export const glow = {
  cyan: "shadow-lg shadow-cyan-500/20",
  cyanSubtle: "shadow-lg shadow-cyan-500/10",
  cyanDeep: "shadow-lg shadow-cyan-900/50",
} as const;
