import type { ReactNode } from "react";
import { typography, spacing } from "../../tokens";
import { ACCENT_TEXT, ACCENT_DOT, ACCENT_BORDER, type AccentColor } from "../../utilities/accentColor";

export type SectionHeaderSize = "page" | "section" | "subsection";
export type SectionHeaderAlign = "left" | "center";
export type SectionHeaderDivider = "bottom" | "left" | "none";
export type SectionHeaderAccent = AccentColor;
export type SectionHeaderHeadingLevel = "h1" | "h2" | "h3" | "h4";

// Default heading tag per size mirrors the tag already in use at each
// size's real call sites today (see README "Evidence"), so wiring an
// existing block into this component changes zero DOM semantics.
const DEFAULT_HEADING_LEVEL: Record<SectionHeaderSize, SectionHeaderHeadingLevel> = {
  page: "h1",
  section: "h3",
  subsection: "h2",
};

export interface SectionHeaderProps {
  /** Main heading content. A plain string in almost every real call site, but accepts ReactNode so an inline styled fragment (e.g. a colored ® mark) can be preserved exactly. */
  title: ReactNode;
  /** Small kicker/eyebrow line above the title (e.g. "Enterprise Service · SOC Operations"). Renders with a pulsing accent dot. `size="subsection"` never uses this — omit it there. */
  subtitle?: string;
  /** Paragraph below the title. */
  description?: string;
  /** Trailing content rendered right-aligned next to the title block (a live-status chip, a SecurityBadge, a count). Switches the layout to a justify-between row when present. */
  badge?: ReactNode;
  /** Icon rendered inline before the title. No current call site uses this — included for the documented future-growth requirement. */
  icon?: ReactNode;
  /** Action element (typically a button/link) rendered in the same trailing slot as `badge`. */
  cta?: ReactNode;
  align?: SectionHeaderAlign;
  size?: SectionHeaderSize;
  accent?: SectionHeaderAccent;
  /** `bottom` = border-b divider (the common case); `left` = border-l-4 accent bar (HomeView's Corporate Entity / Gumroad Store treatment); `none` for page-level titles, which never have a divider. */
  divider?: SectionHeaderDivider;
  /** Overrides the size-based default heading tag — see DEFAULT_HEADING_LEVEL. */
  headingLevel?: SectionHeaderHeadingLevel;
  /** Whether the eyebrow dot pulses. Default true (matches the majority of call sites — live service/corporate sections); the three static legal-document pages (Privacy/Terms/Copyright) pass `false` for a non-animated dot. */
  pulse?: boolean;
  animate?: boolean;
  className?: string;
}

// The canonical section-introduction component — see README.md for the
// 20+ call-site audit that justified this extraction (Purpose, Props,
// Variants, Accessibility Notes, Usage Example, Future Extension Points).
export function SectionHeader({
  title,
  subtitle,
  description,
  badge,
  icon,
  cta,
  align = "left",
  size = "section",
  accent = "cyan",
  divider,
  headingLevel,
  pulse = true,
  animate = false,
  className = "",
}: SectionHeaderProps) {
  const Heading = headingLevel ?? DEFAULT_HEADING_LEVEL[size];
  const resolvedDivider = divider ?? (size === "page" ? "none" : "bottom");
  const trailing = badge ?? cta;

  const titleClass =
    size === "page" ? `${typography.preset.pageTitle} text-white`
    : size === "subsection" ? "text-sm font-bold text-white uppercase tracking-widest"
    : `${typography.preset.sectionTitle} ${ACCENT_TEXT[accent]}`;

  const descriptionClass =
    size === "page" ? `${typography.preset.description} text-slate-300`
    : `${typography.microScale.caption} text-slate-500`;

  const containerClass = [
    size === "subsection" ? spacing.stack.tight : spacing.stack.compact,
    align === "center" ? "text-center mx-auto" : "",
    resolvedDivider === "bottom" ? `border-b border-slate-800 ${size === "subsection" ? "pb-3" : "pb-2"}` : "",
    resolvedDivider === "left" ? `border-l-4 ${ACCENT_BORDER[accent]} pl-3` : "",
    animate ? "animate-fade-in" : "",
    className,
  ].filter(Boolean).join(" ");

  const titleRowSpacing = size === "page" ? "space-y-3" : "space-y-0.5";
  const titleRow = (
    <div className={`${titleRowSpacing} ${align === "center" ? "text-center" : ""}`}>
      {subtitle && (
        <div className={`${typography.preset.eyebrow} ${ACCENT_TEXT[accent]} flex items-center gap-2 ${align === "center" ? "justify-center" : ""}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ACCENT_DOT[accent]} ${pulse ? "animate-pulse" : ""} shrink-0`} />
          {subtitle}
        </div>
      )}
      <Heading className={`${titleClass} flex items-center gap-2 ${align === "center" ? "justify-center" : ""}`}>
        {icon}
        {title}
      </Heading>
      {description && (
        <p className={`${descriptionClass} ${size === "page" ? "max-w-3xl" : ""} ${align === "center" ? "mx-auto" : ""}`}>
          {description}
        </p>
      )}
    </div>
  );

  if (!trailing) {
    return <div className={containerClass}>{titleRow}</div>;
  }

  return (
    <div className={`${containerClass} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
      {titleRow}
      <div className="shrink-0 flex items-center gap-2">{trailing}</div>
    </div>
  );
}
