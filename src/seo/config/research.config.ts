import type { SEOArticle, SEOCategory } from "../types/entities";

// Owns: deep-dive research/report content — distinct from blog.config.ts's
// day-to-day posts, matching the "Research Blog & Advisories" portal's
// own framing ("zero-day analysis reports, threat group profile
// teardowns"). Categories below are transcribed from that description
// (src/components/EcosystemDiscovery.tsx) plus the "APEX Intelligence
// Reports" commercial-service description — real, existing copy, not
// invented.
//
// RESEARCH_ARTICLES is deliberately empty: unlike blog.config.ts (which
// has 3 real sample posts in BlogView.tsx to port), no durable,
// structured "research report" content exists anywhere in this
// repository today — IntelView.tsx's CVE list is simulated/dynamic live
// data (CveItem[], passed as a runtime prop), not a content record
// worth an SEOArticle entry. This array is typed and ready; populate it
// when real research-report content exists rather than inventing
// placeholder entries now.

export const RESEARCH_CATEGORIES: SEOCategory[] = [
  { id: "zero-day-analysis", name: "Zero-Day Vulnerability Analysis" },
  { id: "apt-threat-profiles", name: "APT Threat Group Profiles" },
  { id: "compliance-guides", name: "Compliance Implementation Guides" },
  { id: "intelligence-reports", name: "APEX Intelligence Reports", description: "Monthly premium cyber threat intelligence reports curated for CISO briefings with executive summaries and technical appendices." },
];

export const RESEARCH_ARTICLES: SEOArticle[] = [];
