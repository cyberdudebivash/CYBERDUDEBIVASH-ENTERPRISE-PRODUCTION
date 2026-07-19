import type { SEOProduct } from "../types/entities";

// Owns: the ecosystem's live platforms/subdomains. Transcribed
// directly from src/constants/ecosystemData.ts's ECOSYSTEM_PORTALS —
// same ids, names, URLs, descriptions — not re-described. That file
// remains the SPA's own source for rendering; this one is the SEO-facing
// mirror with commercial fields added, per SEO_MIGRATION_PLAN.md
// ("Reuse existing repository assets... Normalize duplicated values").

export const PRODUCTS: SEOProduct[] = [
  {
    id: "apex",
    name: "Sentinel APEX™",
    description: "Real-time threat feeds, active IOC maps, and deep dark web scraping nodes delivering threat vectors globally.",
    url: "https://intel.cyberdudebivash.com/",
    category: "intelligence",
    responseTimeMs: 34,
    primaryKeyword: "threat intelligence platform",
    secondaryKeywords: ["IOC feed", "dark web monitoring", "STIX TAXII"],
    searchIntent: "commercial",
    audience: ["SOC Analysts", "Threat Hunters", "SIEM Engineers", "MSSPs"],
    funnelStage: "consideration",
    relatedServices: ["soc", "mssp"],
  },
  {
    id: "ai_hub",
    name: "AI Security Hub Live",
    description: "Next-gen deep static code auditing (SAST), system log compliance checks, and secure neural chatbot services.",
    url: "https://cyberdudebivash.in/",
    category: "defense",
    responseTimeMs: 56,
    primaryKeyword: "AI security forensics platform",
    secondaryKeywords: ["SAST", "log forensics", "AI compliance audit"],
    searchIntent: "commercial",
    audience: ["Security Engineers", "AppSec Teams", "Compliance Officers", "Developers"],
    funnelStage: "consideration",
    relatedServices: ["owasp", "dpdp"],
  },
  {
    id: "tools",
    name: "ThreatCore™ Tools",
    description: "Over 100 on-demand defensive utility tools including IP recon scanners, sub-domain scouts, and cryptographic analyzers.",
    url: "https://tools.cyberdudebivash.com/",
    category: "tools",
    responseTimeMs: 41,
    primaryKeyword: "cybersecurity utility tools",
    secondaryKeywords: ["IP recon scanner", "subdomain enumeration", "crypto analyzer"],
    searchIntent: "transactional",
    audience: ["Penetration Testers", "Red Teams", "Security Researchers", "Bug Bounty Hunters"],
    funnelStage: "decision",
    relatedServices: ["pentest"],
  },
  {
    id: "blog",
    name: "Research Blog & Advisories",
    description: "Deep dive zero-day analysis reports, threat group profile teardowns, and educational resources.",
    url: "https://blog.cyberdudebivash.in/",
    category: "education",
    responseTimeMs: 62,
    primaryKeyword: "cybersecurity research blog",
    secondaryKeywords: ["zero-day analysis", "APT threat profiles", "security education"],
    searchIntent: "informational",
    audience: ["Security Researchers", "Analysts", "CISO Offices", "Engineering Teams"],
    funnelStage: "awareness",
  },
  {
    id: "official",
    name: "Official Gateway Site",
    description: "Corporate interface, enterprise service catalog, client secure consulting channel, and official contact point.",
    url: "https://www.cyberdudebivash.com/",
    category: "portal",
    responseTimeMs: 45,
    primaryKeyword: "enterprise cybersecurity platform",
    secondaryKeywords: ["managed SOC provider India", "cybersecurity company Odisha"],
    searchIntent: "navigational",
    audience: ["Enterprises", "CISOs", "Security Directors", "Procurement Teams"],
    funnelStage: "awareness",
    relatedServices: ["soc", "dpdp", "owasp", "mssp", "vciso", "pentest"],
  },
];
