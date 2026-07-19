// Color Tokens
//
// Documents the palette already in production use — derived from a
// frequency audit of src/views and src/components (2026-07-19):
// slate 796x, cyan 271x, emerald 138x, red 98x, amber 76x, violet 46x,
// purple 34x, orange 27x, sky 26x, pink 16x, yellow 12x. Nothing below
// is a new color decision; it's a name for a decision already made
// repeatedly across the app.
//
// `surface.*` values map to the four `--color-surface-*` custom
// properties added to src/styles/index.css's @theme block, which
// promotes the most-repeated arbitrary hex values (bg-[#0c1117] alone
// appeared 34 times) into real Tailwind utilities. Everything else
// here is the existing Tailwind palette — no new hex values invented.

export const brand = {
  primary: { text: "text-cyan-400", bg: "bg-cyan-500", bgHover: "hover:bg-cyan-400", border: "border-cyan-500", ring: "ring-cyan-500", hex: "#22d3ee" },
  secondary: { text: "text-sky-400", bg: "bg-sky-500", border: "border-sky-500", hex: "#38bdf8" },
} as const;

// Fixed meaning across the app — do not repurpose (e.g. don't use
// `danger` for anything but a real error/critical/blocked state).
export const status = {
  success: { text: "text-emerald-400", bg: "bg-emerald-500", bgSubtle: "bg-emerald-950", border: "border-emerald-800", hex: "#34d399" },
  danger: { text: "text-red-400", bg: "bg-red-500", bgSubtle: "bg-red-950", border: "border-red-800", hex: "#ef4444" },
  warning: { text: "text-amber-400", bg: "bg-amber-500", bgSubtle: "bg-amber-950", border: "border-amber-800", hex: "#f59e0b" },
  info: { text: "text-cyan-400", bg: "bg-cyan-500", bgSubtle: "bg-cyan-950", border: "border-cyan-800", hex: "#22d3ee" },
} as const;

// Used for visual category differentiation where there is no
// success/danger/warning meaning — e.g. each ServicePages tier picks a
// different accent (SOC=violet, DPDP=amber, OWASP=red, MSSP=sky,
// vCISO=emerald, Pentest=pink) purely so adjacent services read as
// distinct, not because one is "more dangerous" than another.
export const categoryAccents = {
  violet: { text: "text-violet-400", bg: "bg-violet-500", bgSubtle: "bg-violet-950", border: "border-violet-800" },
  purple: { text: "text-purple-400", bg: "bg-purple-500", bgSubtle: "bg-purple-950", border: "border-purple-800" },
  sky: { text: "text-sky-400", bg: "bg-sky-500", bgSubtle: "bg-sky-950", border: "border-sky-800" },
  pink: { text: "text-pink-400", bg: "bg-pink-500", bgSubtle: "bg-pink-950", border: "border-pink-800" },
  orange: { text: "text-orange-400", bg: "bg-orange-500", bgSubtle: "bg-orange-950", border: "border-orange-800" },
} as const;

export const neutral = {
  text: {
    strong: "text-white",
    primary: "text-slate-200",
    body: "text-slate-300",
    muted: "text-slate-400",
    subtle: "text-slate-500",
    faint: "text-slate-600",
  },
  border: {
    default: "border-slate-800",
    subtle: "border-slate-900",
    strong: "border-slate-700",
  },
  surface: {
    // Root/page-level background (ServicePages, LegalPages).
    canvas: "bg-surface-canvas",
    // The dominant card/panel background — use this for new panels.
    panel: "bg-surface-panel",
    // A visually deeper panel, used for nested/emphasis containers.
    recessed: "bg-surface-recessed",
    // Deepest nested sub-panels (e.g. inside a panel inside a panel).
    overlay: "bg-surface-overlay",
    // Plain Tailwind slate surfaces, still common alongside the above.
    slatePanel: "bg-slate-900",
    slateDeep: "bg-slate-950",
  },
} as const;

export type CategoryAccent = keyof typeof categoryAccents;
export type StatusTone = keyof typeof status;
