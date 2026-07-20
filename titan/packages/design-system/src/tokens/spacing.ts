// Spacing scale — 4px base unit, matching the common convention this
// engagement's own Tailwind-based marketing site already uses, so the two
// don't drift into two incompatible mental models of "spacing" across the
// same company's products.

export const spacing = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

export type SpacingToken = typeof spacing;
