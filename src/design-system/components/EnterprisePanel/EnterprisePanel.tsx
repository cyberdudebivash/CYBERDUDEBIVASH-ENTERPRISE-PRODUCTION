import type { ReactNode } from "react";
import { ACCENT_TEXT, type AccentColor } from "../../utilities/accentColor";

export type EnterprisePanelVariant = "plain" | "tinted" | "gradient";
export type EnterprisePanelPadding = "sm" | "md" | "lg";

const PADDING_CLASS: Record<EnterprisePanelPadding, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

// Tailwind's JIT scanner needs complete literal strings, so per-accent
// tinted/gradient backgrounds are static lookups (same fix already
// applied in FeatureCard's TINTED_CLASS and Hero's METRIC_GRID_COLS).
const TINTED_SURFACE: Record<AccentColor, string> = {
  cyan: "bg-cyan-950/20 border-cyan-800/30", emerald: "bg-emerald-950/20 border-emerald-800/30",
  amber: "bg-amber-950/20 border-amber-800/30", red: "bg-red-950/20 border-red-800/30",
  violet: "bg-violet-950/20 border-violet-800/30", purple: "bg-purple-950/20 border-purple-800/30",
  sky: "bg-sky-950/20 border-sky-800/30", pink: "bg-pink-950/20 border-pink-800/30",
  orange: "bg-orange-950/20 border-orange-800/30", slate: "bg-slate-900/50 border-slate-800",
};

const GRADIENT_SURFACE: Record<AccentColor, string> = {
  cyan: "bg-gradient-to-r from-cyan-950/30 to-slate-900/60 border-cyan-800/30",
  emerald: "bg-gradient-to-r from-emerald-950/30 to-slate-900/60 border-emerald-800/30",
  amber: "bg-gradient-to-r from-amber-950/30 to-slate-900/60 border-amber-800/30",
  red: "bg-gradient-to-r from-red-950/30 to-slate-900/60 border-red-800/30",
  violet: "bg-gradient-to-r from-violet-950/30 to-slate-900/60 border-violet-800/30",
  purple: "bg-gradient-to-r from-purple-950/30 to-slate-900/60 border-purple-800/30",
  sky: "bg-gradient-to-r from-sky-950/30 to-slate-900/60 border-sky-800/30",
  pink: "bg-gradient-to-r from-pink-950/30 to-slate-900/60 border-pink-800/30",
  orange: "bg-gradient-to-r from-orange-950/30 to-slate-900/60 border-orange-800/30",
  slate: "bg-gradient-to-r from-slate-900/60 to-slate-900/60 border-slate-800",
};

export interface EnterprisePanelProps {
  /** Rendered above the body. Styled per `variant` by default (see Variants) — pass pre-styled JSX to override entirely. */
  header?: ReactNode;
  /** Body content. */
  children?: ReactNode;
  /** Rendered as a full-width border-top section below the body (the ROI calculator's cost-savings summary is the real example). */
  footer?: ReactNode;
  /** Rendered beside header+body in a justify-between row (a CTA banner's button is the real example) — providing this switches the panel to a flex-row layout on sm+ viewports. */
  actions?: ReactNode;
  accent?: AccentColor;
  variant?: EnterprisePanelVariant;
  padding?: EnterprisePanelPadding;
  className?: string;
}

// The general-purpose enterprise container — see README.md for the
// 20+-call-site audit (capability grid wrappers, CTA banners, explainer
// panels, the ROI calculator) that justified this extraction.
export function EnterprisePanel({
  header,
  children,
  footer,
  actions,
  accent = "cyan",
  variant = "plain",
  padding = "lg",
  className = "",
}: EnterprisePanelProps) {
  const surfaceClass =
    variant === "tinted" ? `border ${TINTED_SURFACE[accent]}`
    : variant === "gradient" ? `border ${GRADIENT_SURFACE[accent]}`
    : "bg-surface-panel border border-slate-800";

  const headerClass =
    variant === "tinted" ? `text-sm font-bold uppercase tracking-widest mb-3 ${ACCENT_TEXT[accent]}`
    : "text-sm font-bold text-white mb-1";

  const headerAndBody = (
    <div>
      {header && <div className={headerClass}>{header}</div>}
      {children}
    </div>
  );

  return (
    <div className={`rounded-xl ${surfaceClass} ${PADDING_CLASS[padding]} ${className}`}>
      {actions ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {headerAndBody}
          <div className="shrink-0">{actions}</div>
        </div>
      ) : (
        headerAndBody
      )}
      {footer && <div className="border-t border-slate-900 pt-3 mt-3">{footer}</div>}
    </div>
  );
}
