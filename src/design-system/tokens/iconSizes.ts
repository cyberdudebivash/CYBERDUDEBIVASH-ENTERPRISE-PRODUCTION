// Icon Size Tokens
//
// Two distinct scales exist side by side: the icon glyph itself
// (lucide-react `className`, typically w-4 h-4 — 38 uses, the most
// common by far) and the colored box some icons sit inside (an
// `EnterprisePanel`/`FeatureCard` treatment, typically w-10 h-10).
// Always pair the matching w-N/h-N — every real usage in the app sets
// both to the same value.

export const iconGlyph = {
  xs: "w-3 h-3",       // inline with text-[10px]/[11px] labels
  sm: "w-3.5 h-3.5",   // the second most common — button/CTA icons
  md: "w-4 h-4",       // the default glyph size
  lg: "w-5 h-5",       // section-header / platform-card icons
  xl: "w-6 h-6",
} as const;

export const iconBox = {
  sm: "w-8 h-8",
  md: "w-9 h-9",   // Footer/Header logo mark
  lg: "w-10 h-10", // FeatureCard icon container — the standard size
  xl: "w-12 h-12",
  "2xl": "w-16 h-16", // founder/avatar-scale box (LegalPages)
} as const;
