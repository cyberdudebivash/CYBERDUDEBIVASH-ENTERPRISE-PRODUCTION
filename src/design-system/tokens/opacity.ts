// Opacity Tokens
//
// This app almost never uses the bare `opacity-*` utility — instead it
// layers translucency directly onto color utilities via Tailwind's
// `/NN` modifier (e.g. `bg-slate-900/60`, `border-cyan-800/40`). A
// frequency audit of every `/NN` modifier in src/ found: /50 (102x),
// /40 (80x), /60 (79x), /30 (49x), /80 (33x), /20 (27x), /10 (16x).
// These named steps are meant to be appended to a color utility
// (`` `bg-slate-900${opacity.medium}` ``-style composition), not used
// standalone.

export const opacity = {
  faint: "/10",     // barely-there tint (glow orb backgrounds)
  soft: "/20",
  light: "/30",
  medium: "/40",     // the most common "subtle panel" tint
  balanced: "/50",   // the single most-used step in the app
  strong: "/60",
  heavy: "/80",
  solid: "/85",
} as const;
