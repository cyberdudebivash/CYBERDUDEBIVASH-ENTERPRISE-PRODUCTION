import type { ReactNode } from "react";
import "./Badge.css";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "error";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

/**
 * The shared low-level primitive behind every domain-specific badge (EAP-2:
 * StatusBadge, RiskBadge) — one place that owns "what a tone looks like",
 * so a future badge (e.g. a priority indicator) is a values-to-tone mapping
 * function, not a new component with its own copy of this styling.
 */
export function Badge({ tone = "neutral", children }: BadgeProps) {
  return <span className={`titan-badge titan-badge--${tone}`}>{children}</span>;
}
