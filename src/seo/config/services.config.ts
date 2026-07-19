import type { SEOService } from "../types/entities";

// Owns: the 6 managed/professional services. Ids and pricing tiers are
// transcribed from src/views/ServicePages.tsx and the nav labels shared
// by src/components/header/Header.tsx and Footer.tsx (identical labels
// in both — ported once here instead of matching three places by hand).
// Only soc/mssp/vciso have real pricing tiers in the source (via
// PricingCard) — dpdp/owasp/pentest use a different content shape
// there (obligations lists, deliverables, methodology) with no
// tier/price data to port, so their pricingTiers are correctly omitted
// rather than invented.
//
// Every primaryCta.path below is "mailto:bivash@cyberdudebivash.com" —
// verified directly in the static pages themselves (e.g. soc-services.html,
// vciso.html both use this exact mailto link as their real conversion
// mechanism), not the SPA's onContact modal (which has no URL) and not
// each service's own page URL (clicking a CTA doesn't navigate to the
// page it's already on).

export const SERVICES: SEOService[] = [
  {
    id: "soc",
    name: "Managed SOC-as-a-Service",
    description: "CyberDudeBivash® delivers a fully autonomous 24×7 Security Operations Center powered by our GE-Neural AI engine — combining real-time threat detection, automated alert triage, human-expert incident response, and continuous threat hunting into a single managed service.",
    url: "/soc-services.html",
    category: "managed-security",
    primaryKeyword: "managed SOC as a service India",
    secondaryKeywords: ["24x7 SOC", "AI threat detection", "SOC provider India"],
    searchIntent: "commercial",
    funnelStage: "decision",
    primaryCta: { label: "Start Free SOC Assessment", path: "mailto:bivash@cyberdudebivash.com" },
    pricingTiers: [
      { name: "Essential SOC", price: "₹2.5L/mo", features: ["8×5 monitoring", "SIEM log management", "Alert triage (up to 500 alerts/day)", "Monthly compliance report", "Email support (SLA: 4h)"] },
      { name: "Professional SOC", price: "₹6L/mo", features: ["24×7 monitoring", "AI triage + threat hunting", "Unlimited alert processing", "SOAR playbook automation", "Weekly reports + MITRE ATT&CK mapping", "Dedicated analyst (SLA: 1h)"] },
      { name: "Enterprise SOC", price: "Custom", features: ["24×7 dedicated SOC team", "Full SIEM/SOAR/EDR deployment", "On-prem + cloud + OT/ICS coverage", "vCISO inclusion", "Real-time executive dashboard", "15-minute MTTR SLA guarantee"] },
    ],
    relatedProducts: ["apex"],
  },
  {
    id: "dpdp",
    name: "India DPDP Act 2023 Compliance Scans",
    description: "End-to-end DPDP compliance scanning, data mapping, DPO advisory, and breach-readiness assessments to bring your organization into full conformance.",
    url: "/compliance.html",
    category: "compliance",
    primaryKeyword: "DPDP Act compliance India",
    secondaryKeywords: ["data fiduciary obligations", "DPDP gap assessment", "India data protection law"],
    searchIntent: "commercial",
    funnelStage: "decision",
    primaryCta: { label: "Request DPDP Assessment", path: "mailto:bivash@cyberdudebivash.com" },
    relatedProducts: ["ai_hub"],
    relatedSolutions: ["dpdp_tool"],
  },
  {
    id: "owasp",
    name: "OWASP LLM Red Team Testing",
    description: "Adversarial testing of LLM-powered applications against the full OWASP LLM Top 10 2024 threat catalogue — identifying vulnerabilities before your AI becomes a liability.",
    url: "/bug-bounty.html",
    category: "offensive-security",
    primaryKeyword: "OWASP LLM red team testing",
    secondaryKeywords: ["AI red team", "prompt injection testing", "LLM security audit"],
    searchIntent: "commercial",
    funnelStage: "decision",
    primaryCta: { label: "Schedule AI Red Team", path: "mailto:bivash@cyberdudebivash.com" },
    relatedProducts: ["ai_hub"],
    relatedSolutions: ["ai_tool"],
  },
  {
    // No `url`: unlike the other 5 services, App.tsx's redirect map has
    // no static-page entry for "mssp" (verified against SEO_ARCHITECTURE.md
    // Finding 1's evidence) — it exists only as an SPA view today. Left
    // unset rather than guessed, per SEOEntityBase.url's documented intent.
    id: "mssp",
    name: "Multi-Tenant MSSP Suite",
    description: "White-labeled threat intelligence, SOC tooling, client management portals, and billing automation for MSSPs delivering enterprise security services to dozens of clients.",
    category: "mssp",
    primaryKeyword: "white label MSSP platform",
    secondaryKeywords: ["multi-tenant security platform", "MSSP partner program"],
    searchIntent: "commercial",
    funnelStage: "decision",
    primaryCta: { label: "Apply for MSSP Partnership", path: "mailto:bivash@cyberdudebivash.com" },
    pricingTiers: [
      { name: "MSSP Starter", price: "₹50K/mo", subtitle: "Up to 10 clients", features: ["10 client tenants", "White-label threat feeds", "Basic client portal", "Email support", "Standard reporting"] },
      { name: "MSSP Professional", price: "₹1.5L/mo", subtitle: "Up to 50 clients", features: ["50 client tenants", "Full white-label suite", "SOC tooling included", "Dedicated partner manager", "Custom reporting", "PSA/RMM integrations"] },
      { name: "MSSP Enterprise", price: "Custom", subtitle: "Unlimited clients", features: ["Unlimited tenants", "On-prem deployment option", "Revenue share model", "Co-marketing program", "Priority engineering support", "SLA: 99.99% uptime"] },
    ],
    relatedProducts: ["apex"],
  },
  {
    id: "vciso",
    name: "Virtual CISO (vCISO) Advisory",
    description: "Strategic security leadership of a seasoned CISO — available on-demand, aligned to your business objectives, and integrated with your executive team — at a fraction of a full-time hire's cost.",
    url: "/vciso.html",
    category: "advisory",
    primaryKeyword: "virtual CISO services India",
    secondaryKeywords: ["vCISO advisory", "fractional CISO", "security governance consulting"],
    searchIntent: "commercial",
    funnelStage: "decision",
    primaryCta: { label: "Book Free vCISO Session", path: "mailto:bivash@cyberdudebivash.com" },
    pricingTiers: [
      { name: "Advisory Retainer", price: "₹75K/mo", subtitle: "8 hrs/month", features: ["Monthly strategy call", "Board report template", "Policy review (2/quarter)", "Incident escalation support", "Email advisory access"] },
      { name: "Embedded vCISO", price: "₹1.5L/mo", subtitle: "20 hrs/month", features: ["Bi-weekly leadership calls", "Full policy development", "Compliance program management", "Risk register management", "Vendor risk assessments", "Board presentations included"] },
      { name: "Full vCISO", price: "₹3L/mo", subtitle: "40+ hrs/month", features: ["Weekly executive alignment", "ISO 27001 / SOC 2 program", "24hr incident response SLA", "Full security roadmap ownership", "Regulatory interface", "Annual security strategy offsite"] },
    ],
  },
  {
    id: "pentest",
    name: "Professional Penetration Testing",
    description: "Full-spectrum penetration testing — web application and API security, network infrastructure, cloud environments, mobile applications, and social engineering — following OWASP, PTES, and NIST 800-115 methodologies.",
    url: "/services.html",
    category: "offensive-security",
    primaryKeyword: "penetration testing services India",
    secondaryKeywords: ["web app pentest", "network penetration testing", "red team operations"],
    searchIntent: "commercial",
    funnelStage: "decision",
    primaryCta: { label: "Request Pentest Quote", path: "mailto:bivash@cyberdudebivash.com" },
    relatedProducts: ["tools"],
    relatedSolutions: ["red_tool"],
  },
];
