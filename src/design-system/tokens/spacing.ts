// Spacing Tokens
//
// Named presets over Tailwind's numeric scale, picked from actual
// frequency in src/views + src/components: padding p-4 (55x), p-6
// (29x), p-3 (30x); gaps gap-2 (82x), gap-4 (45x), gap-1.5 (44x);
// vertical rhythm space-y-4 (47x), space-y-10 (10x, always between
// major page sections). The raw Tailwind classes remain available for
// anything these presets don't cover — this is a naming layer, not a
// replacement scale.

export const padding = {
  compact: "p-3",   // tight inline elements (tags, small badges)
  card: "p-4",      // the default card/panel padding — most common
  panel: "p-5",
  section: "p-6",   // CTA banners, top-level enterprise panels
} as const;

export const gap = {
  tight: "gap-1.5",
  compact: "gap-2",  // the most common gap — icon-to-label, inline groups
  default: "gap-3",
  loose: "gap-4",
  section: "gap-6",
} as const;

// Vertical rhythm between stacked children (space-y-*).
export const stack = {
  tight: "space-y-1",
  compact: "space-y-2",
  default: "space-y-3",
  loose: "space-y-4",   // the workhorse for card internals
  section: "space-y-6", // between blocks within one section
  page: "space-y-10",   // between major sections on a page (ServicePages)
} as const;
