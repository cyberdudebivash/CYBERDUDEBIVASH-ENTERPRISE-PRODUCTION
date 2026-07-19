// Typography Tokens
//
// Font families match src/styles/index.css's @theme block exactly
// (font-sans = Inter, font-mono = JetBrains Mono) — not redeclared,
// just referenced here for discoverability.
//
// The "micro" scale below text-xs is a real, load-bearing part of this
// app's visual language, not an oversight: a frequency audit found
// text-[10px] used 132 times, text-[9px] 79 times, text-[11px] 48
// times, text-[8px] 17 times — Tailwind's default scale jumps straight
// from text-xs (12px) to text-sm (14px) with nothing smaller, so this
// codebase fills that gap with arbitrary values for its dense,
// terminal/data-console aesthetic (uppercase mono labels, badges,
// timestamps). New components should reuse these named sizes instead
// of picking a fresh arbitrary pixel value.

export const fontFamily = {
  sans: "font-sans",
  mono: "font-mono",
} as const;

export const microScale = {
  micro: "text-[8px]",   // rarest — inline meta only (17 uses)
  tiny: "text-[9px]",    // eyebrow labels, tags (79 uses)
  label: "text-[10px]",  // the workhorse — stat labels, badges (132 uses)
  caption: "text-[11px]", // secondary body/description text (48 uses)
} as const;

// Standard Tailwind scale, named for where each is actually used.
export const scale = {
  body: "text-xs",       // 12px — default running text in dense panels
  bodyLarge: "text-sm md:text-base", // 14px→16px — page-level descriptions (ServicePages/LegalPages)
  heading: "text-lg",    // 18px — card/panel titles (About page founder name)
  display: "text-3xl md:text-5xl", // Hero headline only (HomeView)
  pageTitle: "text-3xl md:text-4xl", // ServicePages/LegalPages H1
} as const;

export const weight = {
  bold: "font-bold",
  extrabold: "font-extrabold",
  black: "font-black",
} as const;

export const tracking = {
  tight: "tracking-tight",   // large headlines
  wide: "tracking-wide",
  widest: "tracking-widest", // uppercase eyebrow labels and section headers
} as const;

// Ready-made combinations for the two recurring text roles that show up
// verbatim across HomeView, ServicePages, LegalPages, and
// EcosystemDiscovery — see SectionHeader's README for the call-site
// evidence. Compose these instead of retyping the utility chain.
export const preset = {
  eyebrow: `${microScale.label} ${fontFamily.mono} ${weight.extrabold} uppercase ${tracking.widest}`,
  pageTitle: `${scale.pageTitle} ${weight.extrabold} leading-tight`,
  sectionTitle: `text-xs ${weight.extrabold} uppercase ${tracking.widest} ${fontFamily.mono}`,
  description: `${scale.bodyLarge} leading-relaxed ${fontFamily.sans}`,
} as const;
