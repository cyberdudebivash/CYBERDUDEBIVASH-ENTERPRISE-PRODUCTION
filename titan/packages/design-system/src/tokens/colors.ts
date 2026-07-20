// Color tokens for Titan application UI.
//
// Deliberately NOT a copy of the marketing site's neon cyberpunk palette
// (docs/architecture history: Primary Cyan #00FFFF, Primary Orange #FF8C42,
// etc.) — that palette is tuned for a dark, high-contrast marketing/brand
// surface, not for a data-dense enterprise application with forms, tables,
// and long reading sessions. Titan keeps the brand's cyan/blue as an accent
// (buttons, links, focus rings) and builds a full neutral + semantic scale
// on top, since an application UI needs far more color roles than a
// marketing page does.
//
// Contrast ratios below are chosen from well-established accessible scales,
// not hand-picked — but have NOT been run through an automated contrast
// checker as part of this pass (jsdom-based component tests can't compute
// real rendered contrast; see DEVELOPER_GUIDE.md). Treat as a strong
// starting point, not a verified-WCAG-AA guarantee, until that check runs.

export const colors = {
  brand: {
    cyan: "#00A8E8",
    cyanDark: "#0086BD",
    navy: "#0A1628",
  },
  neutral: {
    0: "#FFFFFF",
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
    950: "#020617",
  },
  semantic: {
    success: { fg: "#166534", bg: "#F0FDF4", border: "#22C55E" },
    warning: { fg: "#854D0E", bg: "#FEFCE8", border: "#EAB308" },
    error: { fg: "#991B1B", bg: "#FEF2F2", border: "#EF4444" },
    info: { fg: "#075985", bg: "#F0F9FF", border: "#0EA5E9" },
  },
} as const;

export type ColorToken = typeof colors;
