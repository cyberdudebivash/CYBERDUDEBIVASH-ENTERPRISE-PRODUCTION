// Blur Tokens
//
// Sparse but real usage: blur-xl for the decorative glow orb behind
// portal cards (HomeView), blur-2xl for larger hero-scale glows, and
// backdrop-blur-sm/.glass-card (src/styles/index.css) for the
// glassmorphism panel treatment.

export const blur = {
  glow: "blur-xl",
  glowLarge: "blur-2xl",
  glassBackdrop: "backdrop-blur-sm",
} as const;
