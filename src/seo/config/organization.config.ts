import type { SEOOrganization, SEOBrand } from "../types/organization";

// Owns: the organization entity and its brand(s). sameAs and address
// are transcribed from real existing sources (see comments per field)
// rather than re-derived — this is the single place those values now
// live; everything else should reference this file, not redeclare them.
//
// RESOLVED 2026-07-24: three different contact emails used to compete for
// this role — "iambivash.BN@gmail.com" (CORPORATE_REGISTRATION.email),
// "bivash@cyberdudebivash.com" (Footer.tsx's rendered mailto:), and
// "contact@cyberdudebivash.in" (the retired god_mode_seo_engine.py's
// choice, and what this program's own operating brief already called
// "Corporate Email"). The founder picked the third explicitly — it is now
// canonical everywhere below and in CORPORATE_REGISTRATION.email. See
// RISK_REGISTER.md risk 12 for the closure record. Footer.tsx's rendered
// mailto: link was not part of this program's scope to change; if it still
// shows bivash@cyberdudebivash.com, that's a separate follow-up, not a
// contradiction of this decision.

export const BRANDS: SEOBrand[] = [
  {
    id: "cyberdudebivash",
    name: "CyberDudeBivash®",
    legalName: "CYBERDUDEBIVASH PRIVATE LIMITED",
    logo: {
      url: "https://www.cyberdudebivash.com/assets/images/logo.jpg",
      alt: "CyberDudeBivash® logo",
    },
    url: "https://www.cyberdudebivash.com/",
    description: "Autonomous AI-powered cybersecurity defense platform delivering real-time threat intelligence, managed SOC auditing, and 100+ security tools to enterprise teams globally.",
  },
];

export const ORGANIZATION: SEOOrganization = {
  id: "cyberdudebivash-pvt-ltd",
  name: "CYBERDUDEBIVASH PRIVATE LIMITED",
  legalName: "CYBERDUDEBIVASH PRIVATE LIMITED",
  brand: "cyberdudebivash",
  url: "https://www.cyberdudebivash.com/",
  logo: {
    url: "https://www.cyberdudebivash.com/assets/images/logo.jpg",
    alt: "CyberDudeBivash® logo",
  },
  // "EST. 2020" per the footer / About page — not independently
  // re-verified in this phase, ported as the existing displayed value.
  foundingDate: "2020",
  founder: { name: "Bivasha Kumar Nayak" },
  address: {
    streetAddress: "29, Korai-Sukinda-Ramchandrapur Rd, Ragadi, Jajpur Road",
    addressLocality: "Ragadi",
    addressRegion: "Odisha",
    postalCode: "755019",
    addressCountry: "IN",
  },
  contactPoints: [
    {
      telephone: "+91 81798 81447",
      email: "contact@cyberdudebivash.in",
      contactType: "customer service",
      areaServed: "IN",
    },
    {
      telephone: "+91 81798 81447",
      email: "contact@cyberdudebivash.in",
      contactType: "legal",
      areaServed: "IN",
    },
  ],
  // Ported verbatim from scripts/god_mode_seo_engine.py's ecosystem_urls
  // list (see SEO_ARCHITECTURE.md Finding 2 / SEO_MIGRATION_PLAN.md) —
  // this is the one array that script hardcoded into ~19 files; this
  // config is now its single source going forward.
  sameAs: [
    "https://intel.cyberdudebivash.com/",
    "https://cyberdudebivash.in/",
    "https://cyberdudebivash.in/api",
    "https://blog.cyberdudebivash.in/",
    "https://tools.cyberdudebivash.com/",
    "https://www.cyberdudebivash.com/",
    "https://intel.cyberdudebivash.com/api-docs",
    "https://intel.cyberdudebivash.com/upgrade.html",
    "https://intel.cyberdudebivash.com/api/health",
    "https://intel.cyberdudebivash.com/api/v1/intel/latest.json",
    "https://intel.cyberdudebivash.com/api/v1/intel/apex.json",
    "https://intel.cyberdudebivash.com/api/v1/intel/ai_summary.json",
    "https://intel.cyberdudebivash.com/api/feed.json",
    "https://intel.cyberdudebivash.com/api/reports/latest.json",
    "https://www.linkedin.com/company/cyberdudebivash/",
    "https://www.instagram.com/cyberdudebivash_official/",
    "https://www.facebook.com/profile.php?id=61583373732736",
    "https://x.com/CDBSENTINELAPEX",
    "https://www.fiverr.com/bivashkumar007/",
    "https://www.upwork.com/freelancers/~010d4dde1657fa5619",
    "https://in.pinterest.com/CYBERDUDEBIVASH_Official/",
    "https://medium.com/@cyberdudebivash",
    "https://www.threads.com/@cyberdudebivash_official",
    "https://www.youtube.com/@CYBERDUDEBIVASHSentinelAPEX",
    "https://cyberdudebivash-news.blogspot.com/",
    "https://cyberbivash.blogspot.com/",
  ],
};
