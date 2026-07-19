import type { ReactNode } from "react";
import { ACCENT_TEXT, ACCENT_DOT, type AccentColor } from "../../utilities/accentColor";

// Tailwind's JIT scanner only picks up complete literal class-name
// strings, so `variant="tinted"`'s border+background combo (evidenced
// in LegalPages' Mission/Vision/Core Values cards) must be a static
// lookup, not `` `border-${accent}-500/40` ``.
const TINTED_CLASS: Record<AccentColor, string> = {
  cyan: "border-cyan-500/40 bg-cyan-950/10",
  emerald: "border-emerald-500/40 bg-emerald-950/10",
  amber: "border-amber-500/40 bg-amber-950/10",
  red: "border-red-500/40 bg-red-950/10",
  violet: "border-violet-500/40 bg-violet-950/10",
  purple: "border-purple-500/40 bg-purple-950/10",
  sky: "border-sky-500/40 bg-sky-950/10",
  pink: "border-pink-500/40 bg-pink-950/10",
  orange: "border-orange-500/40 bg-orange-950/10",
  slate: "border-slate-500/40 bg-slate-950/10",
};

export type FeatureCardIconWrapper = "emoji" | "raw" | "box" | "dot";
export type FeatureCardVariant = "panel" | "tinted";
export type FeatureCardLayout = "row" | "stack";

export interface FeatureCardProps {
  /** Flexible: an emoji string, a lucide element, or a fully pre-styled badge (ServicePages' OWASP LLM-ID cards pass one here, not an icon — use `iconWrapper="raw"` for it). Omit entirely for `variant="tinted"` cards, which use color instead of an icon. */
  icon?: ReactNode;
  /** `"emoji"` (default) wraps `icon` in a `text-lg` span sized for an emoji glyph. `"raw"` renders `icon` completely unwrapped — for a caller-styled badge that must not be resized (ServicePages' OWASP cards). `"box"` wraps it in a colored square (EcosystemDiscovery's commercial-service cards, `layout="stack"`). `"dot"` renders a small colored dot instead of `icon` (LegalPages' "What We Deliver" cards, `layout="row"`). */
  iconWrapper?: FeatureCardIconWrapper;
  title: ReactNode;
  description: string;
  /** Small pill row between title and description (ServicePages' pentest service cards, `layout="row"`). */
  tags?: string[];
  /** Rendered near the icon — a category label (EcosystemDiscovery) or similar. */
  badge?: ReactNode;
  /** A state indicator such as a checkmark + "Ordered" — fully caller-rendered so this component doesn't need to know what "purchased" or "live" means for any given caller. */
  status?: ReactNode;
  /** Action slot — pass an `<a>` for a link-out CTA or a `<button>` for an in-app action; this component doesn't distinguish, matching how EcosystemDiscovery's own cards conditionally render one or the other in the same visual slot. */
  cta?: ReactNode;
  accent?: AccentColor;
  /** `"panel"` (default) = the plain slate card used everywhere. `"tinted"` = a colored border+background card with no icon, used for LegalPages' Mission/Vision/Core Values. */
  variant?: FeatureCardVariant;
  /**
   * Only meaningful for `variant="panel"`. `"row"` (default) = icon beside
   * a title+description block, non-interactive, `bg-slate-900/40` — the
   * ~36 ServicePages/LegalPages capability cards. `"stack"` = icon/badge
   * row on top, content below, CTA pinned to the bottom via
   * `justify-between`, hover-interactive, `bg-surface-panel` — the 12
   * EcosystemDiscovery commercial-service cards. These are genuinely
   * different structures (not just color), so this is a real variant,
   * not a cosmetic knob.
   */
  layout?: FeatureCardLayout;
  className?: string;
}

// The canonical enterprise product/feature card — see README.md for the
// ~48-call-site audit (ServicePages' 4 capability grids, EcosystemDiscovery's
// commercial services, LegalPages' "What We Deliver" and Mission/Vision/
// Core Values) that justified this extraction.
export function FeatureCard({
  icon,
  iconWrapper = "emoji",
  title,
  description,
  tags,
  badge,
  status,
  cta,
  accent = "cyan",
  variant = "panel",
  layout = "row",
  className = "",
}: FeatureCardProps) {
  if (variant === "tinted") {
    return (
      <div className={`border rounded-xl p-5 ${TINTED_CLASS[accent]} ${className}`}>
        <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${ACCENT_TEXT[accent]}`}>{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">{description}</p>
        {cta && <div className="mt-3">{cta}</div>}
      </div>
    );
  }

  const iconNode =
    iconWrapper === "dot" ? <span className={`w-1.5 h-1.5 rounded-full ${ACCENT_DOT[accent]} mt-1.5 shrink-0`} />
    : iconWrapper === "box" ? (
      <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0 group-hover:bg-cyan-950/30 group-hover:border-cyan-800/40 transition-all">
        {icon}
      </div>
    )
    : iconWrapper === "raw" ? icon
    : icon ? <span className="text-lg shrink-0">{icon}</span>
    : null;

  const tagsRow = tags && tags.length > 0 && (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className={`text-[9px] font-mono ${ACCENT_TEXT[accent]} bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded`}>{t}</span>
      ))}
    </div>
  );

  if (layout === "stack") {
    return (
      <div className={`bg-surface-panel border border-slate-800 p-4 rounded-lg flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all group ${className}`}>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {iconNode}
              {badge}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-white group-hover:text-cyan-300 transition-colors mb-1">{title}</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">{description}</p>
          </div>
          {tagsRow}
        </div>
        {cta}
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex gap-3 ${className}`}>
      {iconNode}
      <div className="flex-1 min-w-0 space-y-1">
        {badge}
        <h4 className="text-xs font-bold text-slate-200 mb-1">{title}</h4>
        {tagsRow}
        <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{description}</p>
        {status}
        {cta}
      </div>
    </div>
  );
}
