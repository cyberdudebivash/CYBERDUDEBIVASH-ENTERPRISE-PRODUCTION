import type { SEONavigationNode } from "../types/navigation";

// Owns: the site's navigation structure as data. Transcribed from
// src/components/header/Header.tsx's SERVICE_ITEMS/solutionsItems arrays
// and its 5 top-level nav buttons, plus src/components/footer/Footer.tsx's
// link sections — not re-authored.
//
// `path` is only set where a real static page exists. Verified by
// direct file listing (`find . -maxdepth 1 -name "*.html"`) and cross-
// checked against App.tsx's redirect map:
//   - about, privacy DO have real static pages (about.html, privacy.html).
//   - terms, copyright do NOT — only a root TERMS.md exists, no
//     terms.html/copyright.html file. The redirect map's own
//     `"terms.html"` / `"copyright.html"` checks are for paths that
//     would 404 into the SPA, not real servable files.
//   - intel, ai, mssp do NOT have static equivalents either (see
//     SEO_ARCHITECTURE.md Finding 1 and services.config.ts's mssp entry).
// Header.tsx's own "Solutions" dropdown items are nav shortcuts with no
// independent URL of their own (see solutions.config.ts's naming note)
// — represented here as children with no `path`, not as SEOSolution
// entities.

export const PRIMARY_NAVIGATION: SEONavigationNode[] = [
  { id: "nav-gateway", label: "Gateway", path: "/index.html" },
  {
    id: "nav-services",
    label: "Services",
    children: [
      { id: "nav-services-soc", label: "Managed SOC-as-a-Service", path: "/soc-services.html", description: "24/7 autonomous monitoring" },
      { id: "nav-services-dpdp", label: "DPDP Act Compliance Scans", path: "/compliance.html", description: "India data protection audits" },
      { id: "nav-services-owasp", label: "OWASP LLM Red Team Testing", path: "/bug-bounty.html", description: "Adversarial AI validation" },
      { id: "nav-services-mssp", label: "Multi-Tenant MSSP Suite", description: "Client partner command center" },
      { id: "nav-services-vciso", label: "vCISO Advisory Services", path: "/vciso.html", description: "Executive security governance" },
      { id: "nav-services-pentest", label: "Professional Penetration Testing", path: "/services.html", description: "Full-spectrum pentests" },
    ],
  },
  {
    id: "nav-solutions",
    label: "Solutions",
    children: [
      { id: "nav-solutions-ai-governance", label: "AI Security Governance", description: "OWASP LLM & AI compliance audits" },
      { id: "nav-solutions-threat-intel", label: "Threat Intelligence Feeds", description: "Sentinel APEX IOC feed telemetry" },
      { id: "nav-solutions-zero-trust", label: "Zero Trust Architecture", description: "NIST 800-207 design frameworks" },
      { id: "nav-solutions-devsecops", label: "DevSecOps Integration", description: "SAST vulnerability scanners" },
    ],
  },
  { id: "nav-apex", label: "Sentinel APEX™" },
  { id: "nav-ai-hub", label: "AI Hub & Audit" },
  { id: "nav-threatcore", label: "ThreatCore™ Tools", path: "/apps.html" },
  { id: "nav-blog", label: "Blog & Academy", path: "/research.html" },
  { id: "nav-api", label: "REST API" },
];

export const FOOTER_NAVIGATION: SEONavigationNode[] = [
  {
    id: "footer-live-platforms",
    label: "Live Platforms",
    children: [
      { id: "footer-platform-gateway", label: "Official Gateway", path: "/index.html" },
      { id: "footer-platform-apex", label: "Sentinel APEX™" },
      { id: "footer-platform-ai-hub", label: "AI Security Hub" },
      { id: "footer-platform-tools", label: "ThreatCore™ Tools", path: "/apps.html" },
      { id: "footer-platform-blog", label: "Research Blog", path: "/research.html" },
      { id: "footer-platform-api", label: "Developer APIs" },
    ],
  },
  {
    id: "footer-enterprise-services",
    label: "Enterprise Services",
    children: [
      { id: "footer-service-soc", label: "Managed SOC-as-a-Service", path: "/soc-services.html" },
      { id: "footer-service-dpdp", label: "DPDP Act Compliance Scans", path: "/compliance.html" },
      { id: "footer-service-owasp", label: "OWASP LLM Red Team", path: "/bug-bounty.html" },
      { id: "footer-service-mssp", label: "Multi-Tenant MSSP Suite" },
      { id: "footer-service-vciso", label: "vCISO Advisory", path: "/vciso.html" },
      { id: "footer-service-pentest", label: "Penetration Testing", path: "/services.html" },
    ],
  },
  {
    id: "footer-legal",
    label: "Legal",
    children: [
      { id: "footer-legal-about", label: "About Us", path: "/about.html" },
      { id: "footer-legal-privacy", label: "Privacy Policy", path: "/privacy.html" },
      { id: "footer-legal-terms", label: "Terms of Service" },
      { id: "footer-legal-copyright", label: "Copyright & IP" },
    ],
  },
];
