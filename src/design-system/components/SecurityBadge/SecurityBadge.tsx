import { Check } from "lucide-react";

export type SecurityBadgeVariant = "pill-icon" | "pill-solid" | "text" | "dot-text";

export interface SecurityBadgeProps {
  label: string;
  colorClassName: string;
  variant?: SecurityBadgeVariant;
}

// Four variants because that's what actually exists across the site today
// (homepage trust bar, About page framework list, footer strip) — not a
// speculative API. Each was independently hand-rolled before this extraction,
// which is exactly how the ISO/SOC2 wording drifted out of sync in the first
// place. Change how a variant looks once, here, instead of at every call site.
//
// Formerly TrustBadge (src/components/badges/) — Phase 0.3 formalized it
// as the canonical SecurityBadge (compliance/trust/verification/
// certification/platform status) rather than building a second, redundant
// component for the same job. See README.md.
export function SecurityBadge({ label, colorClassName, variant = "text" }: SecurityBadgeProps) {
  if (variant === "pill-icon") {
    return (
      <span className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-[11px] font-mono font-semibold flex items-center gap-1.5">
        <Check className="w-3 h-3 text-emerald-400" />
        <span className={colorClassName}>{label}</span>
      </span>
    );
  }

  if (variant === "pill-solid") {
    return (
      <span className={`text-[12px] font-mono font-bold px-3 py-1.5 rounded-lg border ${colorClassName}`}>
        {label}
      </span>
    );
  }

  if (variant === "dot-text") {
    return (
      <span className={`text-[11px] font-mono font-semibold ${colorClassName} flex items-center gap-1.5 transition-opacity`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colorClassName.replace("text-", "bg-")}`} />
        {label}
      </span>
    );
  }

  return <span className={colorClassName}>{label}</span>;
}
