import { Check } from "lucide-react";

export type TrustBadgeVariant = "pill-icon" | "pill-solid" | "text" | "dot-text";

interface TrustBadgeProps {
  label: string;
  colorClassName: string;
  variant?: TrustBadgeVariant;
}

// Four variants because that's what actually exists across the site today
// (homepage trust bar, About page framework list, footer strip) — not a
// speculative API. Each was independently hand-rolled before this extraction,
// which is exactly how the ISO/SOC2 wording drifted out of sync in the first
// place. Change how a variant looks once, here, instead of at every call site.
export function TrustBadge({ label, colorClassName, variant = "text" }: TrustBadgeProps) {
  if (variant === "pill-icon") {
    return (
      <span className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-[10px] font-mono flex items-center gap-1.5">
        <Check className="w-3 h-3 text-emerald-500" />
        <span className={colorClassName}>{label}</span>
      </span>
    );
  }

  if (variant === "pill-solid") {
    return (
      <span className={`text-[11px] font-mono font-semibold px-3 py-1.5 rounded-lg border ${colorClassName}`}>
        {label}
      </span>
    );
  }

  if (variant === "dot-text") {
    return (
      <span className={`text-[10px] font-mono font-semibold ${colorClassName} flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colorClassName.replace("text-", "bg-")} opacity-80`} />
        {label}
      </span>
    );
  }

  return <span className={colorClassName}>{label}</span>;
}
