// Owns: site-wide defaults — domain, locale, default social image, and
// the handful of site-level meta values (Search Console verification,
// geo signals) that apply once, not per page. Every value below is
// transcribed from _vite_entry.html's existing <head> (the canonical
// frontend's real, live meta tags) — none invented. See
// SEO_MIGRATION_PLAN.md's Metadata section for the REPLACE/REUSE
// classification this config feeds.

export interface SiteConfig {
  domain: string;
  siteName: string;
  defaultLocale: string;
  alternateLocales: string[];
  defaultImage: {
    url: string;
    width: number;
    height: number;
    alt: string;
  };
  twitterHandle: string;
  themeColor: string;
  searchConsoleVerification: string;
  geo: {
    region: string;
    placename: string;
    /** [latitude, longitude] */
    position: [number, number];
  };
}

export const SITE_CONFIG: SiteConfig = {
  domain: "https://www.cyberdudebivash.com",
  siteName: "CyberDudeBivash®",
  defaultLocale: "en_IN",
  alternateLocales: ["en_US"],
  defaultImage: {
    url: "https://www.cyberdudebivash.com/assets/og-banner.png",
    width: 1200,
    height: 630,
    alt: "CYBERDUDEBIVASH® AI-Powered Cybersecurity Platform Dashboard",
  },
  twitterHandle: "@CDBSENTINELAPEX",
  themeColor: "#020810",
  // Present in _vite_entry.html without the placeholder-style comment
  // that flagged the GA4 ID in ANALYTICS_VALIDATION.md — no sign this
  // one is a stand-in, ported as-is rather than re-verified here.
  searchConsoleVerification: "h2-r2PND-L3iT53L8wO3w7m84d-L_9",
  geo: {
    region: "IN-OR",
    placename: "Jajpur Road, Odisha, India",
    position: [20.8491, 86.1648],
  },
};
