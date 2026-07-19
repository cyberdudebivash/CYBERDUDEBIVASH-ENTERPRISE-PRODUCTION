import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ACCENT_TEXT, type AccentColor } from "../../utilities/accentColor";

export type StatCardVariant = "surface" | "outlined" | "plain";
export type StatCardValueSize = "sm" | "md";
export type StatCardTrend = "up" | "down" | "flat";

const TREND_ICON: Record<StatCardTrend, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const TREND_COLOR: Record<StatCardTrend, string> = {
  up: "text-emerald-400",
  down: "text-red-400",
  flat: "text-slate-300",
};

export interface StatCardProps {
  label: string;
  /** ReactNode (not just string) so a composite value like the "24/7" tile's leading pulsing dot can be reproduced exactly. */
  value: ReactNode;
  /** No current call site uses this — included for the documented future-growth requirement. */
  icon?: ReactNode;
  /** Value text color. Ignored by `variant="plain"`, which is always slate (see Variants). */
  tone?: AccentColor;
  trend?: StatCardTrend;
  /** Text shown next to the trend arrow, e.g. "+12%". No current call site — future growth. */
  trendValue?: string;
  /** Small uppercase tag under the label (e.g. "LIVE", "BETA"). No current call site — future growth. */
  status?: string;
  variant?: StatCardVariant;
  valueSize?: StatCardValueSize;
  /** Applies the existing .counter-pop keyframe (src/styles/index.css) on mount. */
  animate?: boolean;
  className?: string;
}

const VALUE_SIZE: Record<StatCardVariant, Record<StatCardValueSize, string>> = {
  surface: { md: "text-2xl md:text-3xl", sm: "text-xl md:text-2xl" },
  outlined: { md: "text-2xl", sm: "text-xl" },
  plain: { md: "text-xl md:text-2xl", sm: "text-lg md:text-xl" },
};

// The canonical metric-tile component — see README.md for the 3-variant
// call-site audit (HomeView's bordered "core stats", ServicePages' /
// LegalPages' "outlined" tier tiles, HomeView's border-less "company
// facts" row) that justified each variant's exact styling.
export function StatCard({
  label,
  value,
  icon,
  tone = "cyan",
  trend,
  trendValue,
  status,
  variant = "outlined",
  valueSize = "md",
  animate = false,
  className = "",
}: StatCardProps) {
  const containerClass = [
    variant === "surface" ? "bg-surface-panel border border-slate-800/80 rounded-lg p-4" : "",
    variant === "outlined" ? "bg-slate-900/60 border border-slate-800 rounded-xl p-4" : "",
    "text-center",
    className,
  ].filter(Boolean).join(" ");

  const valueClass = [
    VALUE_SIZE[variant][valueSize],
    variant === "plain" ? "font-bold text-slate-300" : `font-extrabold ${ACCENT_TEXT[tone]}`,
    "font-mono flex items-center justify-center gap-1.5",
  ].join(" ");

  const labelClass = variant === "surface"
    ? "text-[11px] md:text-xs text-slate-300 font-semibold uppercase tracking-widest mt-1"
    : "text-[11px] text-slate-300 font-semibold uppercase tracking-widest mt-1";

  const TrendIcon = trend ? TREND_ICON[trend] : null;

  return (
    <div className={containerClass}>
      {icon && <div className="flex justify-center mb-1.5 text-slate-400">{icon}</div>}
      <div className={`${valueClass} ${animate ? "counter-pop" : ""}`}>{value}</div>
      <div className={labelClass}>{label}</div>
      {trend && TrendIcon && (
        <div className={`flex items-center justify-center gap-1 mt-1 text-[10px] font-mono font-semibold ${TREND_COLOR[trend]}`}>
          <TrendIcon className="w-3 h-3" aria-hidden="true" />
          {trendValue}
        </div>
      )}
      {status && (
        <div className="mt-1.5 inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">
          {status}
        </div>
      )}
    </div>
  );
}
