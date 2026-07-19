// Border Radius Tokens
//
// Frequency audit across src/: rounded-lg 89x, rounded-full 52x,
// rounded-xl 43x, rounded-md 5x. rounded-sm/2xl/3xl are not used
// anywhere in the app — omitted here rather than offered as an unused
// option.

export const radius = {
  sm: "rounded",       // small inline chips/tags
  md: "rounded-md",    // rare — least-used real value, kept for parity
  lg: "rounded-lg",    // the default for cards and panels
  xl: "rounded-xl",    // elevated/hero-level containers, pricing cards
  pill: "rounded-full", // badges, avatars, status dots
} as const;
