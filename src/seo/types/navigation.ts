// Owns: the site's navigation structure, as data — a typed mirror of
// what Header.tsx/Footer.tsx already render, so future sitemap and
// internal-linking work has one source to read instead of parsing JSX.
// This does NOT replace Header.tsx/MobileNav.tsx/Footer.tsx as the
// render source for the live SPA nav (out of scope for this program —
// see SEO_MIGRATION_PLAN.md) — it's a parallel, SEO-facing description
// of the same structure for sitemap/breadcrumb/internal-link purposes.

export interface SEONavigationNode {
  id: string;
  label: string;
  /** Relative path for a real, indexable static page (this program's actual target); omitted for SPA-only nav actions that have no stable URL (see SEO_ARCHITECTURE.md Finding 1). */
  path?: string;
  description?: string;
  children?: SEONavigationNode[];
}
