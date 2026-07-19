import type { ReactNode } from "react";
import { StatCard, type StatCardProps } from "../StatCard";
import type { AccentColor } from "../../utilities/accentColor";

export interface HeroMetric {
  value: ReactNode;
  label: string;
  tone?: AccentColor;
  valueSize?: StatCardProps["valueSize"];
  /** Spans both mobile columns instead of one — for a trailing odd-numbered tile that would otherwise leave an empty gap on the 2-column mobile grid (HomeView's "24/7" tile does this). */
  spanFullOnMobile?: boolean;
}

export interface HeroButton {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
}

export type HeroBackground = "none" | "grid" | "scanline";
export type HeroAlign = "center" | "left";

export interface HeroProps {
  /** Small pill/chip rendered above the headline (e.g. "CYBERDUDEBIVASH® Global Cybersecurity Authority"). */
  badge?: ReactNode;
  headline: ReactNode;
  /** No current call site — HomeView's hero goes straight from headline to description. Included per the Phase 0.3 spec for future growth; renders between headline and description when present. */
  subheadline?: ReactNode;
  description?: string;
  buttons?: HeroButton[];
  /** Rendered as a row of StatCard tiles (variant="surface") — see StatCard/README.md. */
  metrics?: HeroMetric[];
  /** `"grid"`/`"scanline"` reuse the existing `.bg-cyber-grid`/`.scanline-overlay` CSS (already live in AiSocDashboard.tsx) — real, available textures, not invented for this component. The current HomeView hero uses `"none"`. */
  background?: HeroBackground;
  /** No current call site — HomeView's hero is text-only, no side visual. Future growth per spec. */
  illustration?: ReactNode;
  /** No current call site within the hero itself — HomeView's compliance badge bar is a separate, distant section this component does not relocate. A future hero variant can pass e.g. `<TrustBadge />` elements here. */
  trustIndicators?: ReactNode;
  align?: HeroAlign;
  className?: string;
}

const BUTTON_BASE = "px-6 py-3 font-extrabold rounded text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2";
const BUTTON_VARIANT: Record<NonNullable<HeroButton["variant"]>, string> = {
  primary: "bg-cyan-500 text-black hover:bg-cyan-400 shadow-lg shadow-cyan-500/20",
  secondary: "bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700",
};

const BACKGROUND_CLASS: Record<HeroBackground, string> = {
  none: "",
  grid: "bg-cyber-grid",
  scanline: "scanline-overlay",
};

// Tailwind's JIT scanner only picks up complete, literal class-name
// strings — `` `md:grid-cols-${n}` `` would never match anything at
// build time, so metric-count -> column-count must be a static lookup.
const METRIC_GRID_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
};

// The canonical enterprise Hero — see README.md for why this is built
// to the full Phase 0.3 spec (headline/subheadline/description/buttons/
// metrics/background/illustration/trust indicators) despite HomeView
// being its only current call site: Hero is the entry point for every
// future page in the platform's transformation into the ecosystem
// gateway, so it's designed for that growth, not just today's one use.
export function Hero({
  badge,
  headline,
  subheadline,
  description,
  buttons,
  metrics,
  background = "none",
  illustration,
  trustIndicators,
  align = "center",
  className = "",
}: HeroProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "";

  return (
    <div className={`relative ${BACKGROUND_CLASS[background]} ${className}`}>
      <div className={`space-y-4 max-w-3xl ${alignClass}`}>
        {badge && (
          <div className={`inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full py-1.5 px-4 text-xs font-mono text-cyan-400 ${align === "center" ? "mx-auto" : ""}`}>
            {badge}
          </div>
        )}

        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          {headline}
        </h1>

        {subheadline && <div className="text-lg md:text-xl text-slate-300 font-sans">{subheadline}</div>}

        {description && (
          <p className="text-sm md:text-base text-slate-400 leading-relaxed font-sans">{description}</p>
        )}

        {buttons && buttons.length > 0 && (
          <div className={`flex flex-wrap items-center gap-4 pt-3 ${align === "center" ? "justify-center" : ""}`}>
            {buttons.map((btn) => {
              const classes = `${BUTTON_BASE} ${BUTTON_VARIANT[btn.variant ?? "secondary"]}`;
              return btn.href ? (
                <a key={btn.label} href={btn.href} className={classes}>
                  {btn.icon}{btn.label}
                </a>
              ) : (
                <button key={btn.label} onClick={btn.onClick} className={classes}>
                  {btn.icon}{btn.label}
                </button>
              );
            })}
          </div>
        )}

        {trustIndicators && (
          <div className={`flex flex-wrap items-center gap-3 pt-2 ${align === "center" ? "justify-center" : ""}`}>
            {trustIndicators}
          </div>
        )}
      </div>

      {illustration && <div className="mt-8">{illustration}</div>}

      {metrics && metrics.length > 0 && (
        <div className={`grid ${METRIC_GRID_COLS[metrics.length] ?? METRIC_GRID_COLS[5]} gap-4 mt-8`}>
          {metrics.map((m) => (
            <StatCard
              key={m.label}
              variant="surface"
              value={m.value}
              label={m.label}
              tone={m.tone}
              valueSize={m.valueSize}
              className={m.spanFullOnMobile ? "col-span-2 md:col-span-1" : ""}
            />
          ))}
        </div>
      )}
    </div>
  );
}
