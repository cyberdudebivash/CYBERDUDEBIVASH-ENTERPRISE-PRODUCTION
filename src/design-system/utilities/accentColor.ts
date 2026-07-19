// Shared accent-color lookup — extracted once SectionHeader and
// StatCard both needed the identical "color name -> Tailwind class"
// mapping (a real, observed duplication, not a speculative utility).
// Covers every color used for value/eyebrow/dot accents across the
// service pages and stat tiles: cyan, emerald, amber, red, violet,
// purple, sky, pink, orange, slate.

export type AccentColor =
  | "cyan" | "emerald" | "amber" | "red" | "violet"
  | "purple" | "sky" | "pink" | "orange" | "slate";

export const ACCENT_TEXT: Record<AccentColor, string> = {
  cyan: "text-cyan-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
  violet: "text-violet-400",
  purple: "text-purple-400",
  sky: "text-sky-400",
  pink: "text-pink-400",
  orange: "text-orange-400",
  slate: "text-slate-400",
};

export const ACCENT_DOT: Record<AccentColor, string> = {
  cyan: "bg-cyan-400", emerald: "bg-emerald-400", amber: "bg-amber-400", red: "bg-red-400",
  violet: "bg-violet-400", purple: "bg-purple-400", sky: "bg-sky-400", pink: "bg-pink-400",
  orange: "bg-orange-400", slate: "bg-slate-400",
};

export const ACCENT_BORDER: Record<AccentColor, string> = {
  cyan: "border-cyan-500", emerald: "border-emerald-500", amber: "border-amber-500", red: "border-red-500",
  violet: "border-violet-500", purple: "border-purple-500", sky: "border-sky-500", pink: "border-pink-500",
  orange: "border-orange-500", slate: "border-slate-500",
};
