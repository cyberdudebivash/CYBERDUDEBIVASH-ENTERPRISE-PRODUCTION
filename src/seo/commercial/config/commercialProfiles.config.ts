import type { CommercialProfile } from "./types";

// Owns: the pilot's 12 real commercial profiles — the "about" page, all
// 6 SERVICES, and all 5 PRODUCTS (per this phase's own PILOT scope; no
// solution or article is enriched this pass). Every field traces to
// text, pricing, or cross-references already committed in
// src/seo/config/ (seo.config.ts, services.config.ts, products.config.ts,
// organization.config.ts) — quoted or directly paraphrased, never
// invented. Fields with no traceable evidence (competitivePosition
// almost everywhere; primaryIndustry for horizontal offerings;
// targetCompanySize/trustSignals for the two content-only products) are
// left unset rather than guessed — see documentation/COMMERCIAL_MODEL.md's
// Known Risks for the full, itemized list of what this phase did NOT
// populate and why.
//
// Fields SEOCommercialFields already declares (businessObjective,
// commercialPriority, audience, conversionGoal, primaryCta, secondaryCta)
// appear below ONLY where the real seo.config.ts/services.config.ts/
// products.config.ts record leaves them unset today — never redeclared
// where the original is already populated (verified per-entity against
// the real files before writing this, not assumed). searchIntent and
// funnelStage are never redeclared here at all: every one of these 12
// entities already has both set in its real record.

export const COMMERCIAL_PROFILES: CommercialProfile[] = [
  // ===== about (page) =====
  {
    entityId: "about",
    entityKind: "page",
    businessObjective:
      "Establish CYBERDUDEBIVASH as a credible, established global AI cybersecurity vendor, converting trust-verification visitors toward a Contact or Services engagement.",
    commercialPriority: "medium",
    audience: ["Enterprises evaluating an unfamiliar AI-security vendor", "CISOs", "Security Directors", "Procurement Teams"],
    conversionGoal: "Drive qualified visitors to Contact or Services for a security consultation",
    primaryCta: { label: "Contact Us", path: "/contact.html" },
    secondaryCta: { label: "Explore Services", path: "/services.html" },
    valueProposition:
      "Autonomous AI-powered cybersecurity defense platform delivering real-time threat intelligence, managed SOC auditing, and 100+ security tools to enterprise teams globally.",
    customerPainPoints: [
      "Uncertainty about a new AI-security vendor's legitimacy and operational scale",
      "Difficulty verifying a global security vendor's real founding history and leadership",
    ],
    customerOutcomes: [
      "Confidence in an established company with a named founder, founding date, and multi-country reach",
      "A clear, direct path to Contact or Services",
    ],
    targetCompanySize: ["enterprise"],
    targetGeography: ["Global"],
    buyingStage: "problem-identification",
    trustSignals: [{ type: "Regulatory Alignment", description: "Privacy practices aligned with GDPR, India's DPDP Act 2023, and ISO 27001 principles" }],
    contentClassification: ["awareness"],
    keywords: {
      semanticKeywords: ["threat intelligence", "SOC", "penetration testing"],
      entityKeywords: ["CyberDudeBivash", "Bivash", "Bivasha Kumar Nayak"],
      commercialKeywords: ["AI cybersecurity company", "global security vendor"],
    },
  },

  // ===== services =====
  {
    entityId: "soc",
    entityKind: "service",
    businessObjective:
      "Convert security-conscious mid-market and enterprise buyers who lack 24x7 in-house monitoring into recurring managed-SOC subscribers, using tiered pricing to capture both cost-sensitive and full-service budgets.",
    commercialPriority: "critical",
    audience: ["IT Security Managers", "CISOs without an in-house SOC", "Compliance Officers needing continuous monitoring evidence"],
    conversionGoal: "Book a Free SOC Assessment",
    secondaryCta: { label: "Compare SOC Tiers", path: "/soc-services.html" },
    valueProposition:
      "A fully autonomous 24x7 SOC powered by the GE-Neural AI engine — real-time detection, automated triage, and human-expert response in one managed service.",
    customerPainPoints: [
      "Alert fatigue from unfiltered SIEM noise",
      "No budget or headcount for a 24x7 in-house SOC team",
      "Slow mean-time-to-respond during off-hours incidents",
    ],
    customerOutcomes: [
      "24x7 threat coverage without hiring an internal team",
      "MTTR as fast as 15 minutes on the Enterprise tier",
      "MITRE ATT&CK-mapped weekly reporting on the Professional tier",
    ],
    targetCompanySize: ["smb", "mid-market", "enterprise"],
    targetGeography: ["India", "Global"],
    buyingStage: "vendor-evaluation",
    trustSignals: [{ type: "Framework Alignment", description: "SOAR playbook automation and MITRE ATT&CK-mapped reporting (Professional tier)" }],
    contentClassification: ["decision"],
    keywords: {
      commercialKeywords: ["managed SOC pricing", "24x7 SOC assessment"],
      semanticKeywords: ["security operations center", "threat detection", "incident response", "threat hunting"],
      entityKeywords: ["GE-Neural AI engine"],
    },
  },
  {
    entityId: "dpdp",
    entityKind: "service",
    businessObjective:
      "Capture Indian organizations facing DPDP Act 2023 compliance deadlines, converting regulatory urgency into paid gap-assessment and DPO advisory engagements.",
    commercialPriority: "high",
    audience: ["Data Protection Officers", "Legal & Compliance Teams at India-operating companies", "Data Fiduciaries under DPDP Act 2023"],
    conversionGoal: "Request a DPDP gap assessment",
    secondaryCta: { label: "View Compliance Automation Platform", path: "/compliance.html" },
    valueProposition:
      "End-to-end DPDP Act 2023 compliance — scanning, data mapping, DPO advisory, and breach-readiness assessment — brought into full conformance under one engagement.",
    customerPainPoints: [
      "Uncertainty about DPDP Act 2023 obligations as a \"data fiduciary\"",
      "No internal DPO expertise for India's new data protection regime",
      "Risk of breach-notification non-compliance penalties",
    ],
    customerOutcomes: [
      "A documented DPDP gap assessment and remediation roadmap",
      "DPO-level advisory without a full-time hire",
      "Breach-readiness posture aligned with statutory notification timelines",
    ],
    targetCompanySize: ["smb", "mid-market", "enterprise"],
    targetGeography: ["India"],
    buyingStage: "vendor-evaluation",
    trustSignals: [{ type: "Regulatory Framework", description: "India's Digital Personal Data Protection (DPDP) Act 2023" }],
    contentClassification: ["decision"],
    keywords: {
      commercialKeywords: ["DPDP compliance assessment", "DPO advisory service"],
      semanticKeywords: ["data fiduciary", "breach-readiness", "data mapping"],
    },
  },
  {
    entityId: "owasp",
    entityKind: "service",
    businessObjective:
      "Position as a specialist AI/LLM security red-team vendor as enterprises adopt generative AI, converting AI-risk concern into paid adversarial-testing engagements before incidents occur.",
    commercialPriority: "high",
    audience: ["AppSec Teams shipping LLM-powered features", "AI/ML Engineering Leads", "CISOs assessing generative-AI risk exposure"],
    conversionGoal: "Schedule an AI red team engagement",
    secondaryCta: { label: "Get the OWASP LLM Toolkit", path: "https://www.cyberdudebivash.com/#gumroad-ai_tool" },
    valueProposition: "Adversarial testing against the full OWASP LLM Top 10 2024 catalogue — find LLM vulnerabilities before your AI becomes a liability.",
    customerPainPoints: [
      "No established methodology for testing LLM-specific vulnerabilities (prompt injection, jailbreaks)",
      "Traditional pentest vendors lack LLM-specific red-team expertise",
      "Regulatory or reputational exposure from an unvetted production LLM feature",
    ],
    customerOutcomes: [
      "A documented OWASP LLM Top 10 2024 assessment",
      "Identified and remediated prompt-injection/jailbreak vectors before production exposure",
    ],
    targetCompanySize: ["mid-market", "enterprise"],
    targetGeography: ["Global"],
    buyingStage: "vendor-evaluation",
    trustSignals: [{ type: "Industry Standard", description: "OWASP LLM Top 10 2024 threat catalogue" }],
    contentClassification: ["decision"],
    keywords: {
      commercialKeywords: ["AI red team engagement", "LLM security audit"],
      semanticKeywords: ["prompt injection", "adversarial testing", "jailbreak"],
    },
  },
  {
    entityId: "mssp",
    entityKind: "service",
    businessObjective:
      "Recruit other MSSPs and security resellers as white-label partners, generating platform-licensing and revenue-share income rather than selling directly to end customers.",
    commercialPriority: "medium",
    audience: ["Managed Security Service Providers (MSSPs)", "Security Resellers/VARs seeking a white-label platform", "IT Solution Providers expanding into managed security"],
    conversionGoal: "Apply for MSSP Partnership",
    valueProposition:
      "A white-labeled threat-intelligence, SOC tooling, and client-management platform letting MSSPs deliver enterprise-grade security services to dozens of clients under their own brand.",
    customerPainPoints: [
      "Building multi-tenant SOC tooling in-house is expensive for a growing MSSP",
      "No white-label platform to scale beyond a handful of manually-managed clients",
      "Billing and administration overhead across many client tenants",
    ],
    customerOutcomes: [
      "Up to 50 client tenants on the Professional tier with white-label branding",
      "Revenue-share model available at Enterprise scale",
      "Co-marketing program access (Enterprise tier)",
    ],
    targetCompanySize: ["smb", "mid-market", "enterprise"],
    targetGeography: ["India", "Global"],
    buyingStage: "vendor-evaluation",
    contentClassification: ["decision"],
    keywords: {
      commercialKeywords: ["MSSP partnership program", "white label security platform"],
      semanticKeywords: ["multi-tenant", "client management portal", "billing automation"],
    },
  },
  {
    entityId: "vciso",
    entityKind: "service",
    businessObjective:
      "Convert companies without the budget or need for a full-time CISO into recurring fractional-advisory retainer clients, using tiered hours/scope to match company maturity.",
    commercialPriority: "critical",
    audience: ["Boards and Executive Teams without a full-time CISO", "Growth-stage companies preparing for ISO 27001/SOC 2 certification", "Companies needing board-level security governance reporting"],
    conversionGoal: "Book a Free vCISO Session",
    secondaryCta: { label: "View vCISO Engagement Tiers", path: "/vciso.html" },
    valueProposition: "Strategic security leadership of a seasoned CISO — on-demand, board-integrated, at a fraction of a full-time hire's cost.",
    customerPainPoints: [
      "Cannot justify a full-time CISO salary at the company's current stage",
      "No board-level security governance or reporting in place",
      "Approaching ISO 27001/SOC 2 certification without in-house program leadership",
    ],
    customerOutcomes: [
      "Board presentations and executive alignment included (Embedded tier)",
      "A named ISO 27001/SOC 2 program under Full vCISO",
      "24-hour incident response SLA at the top tier",
    ],
    targetCompanySize: ["startup", "smb", "mid-market"],
    targetGeography: ["India", "Global"],
    buyingStage: "vendor-evaluation",
    trustSignals: [{ type: "Framework Alignment", description: "ISO 27001 / SOC 2 program development (Full vCISO tier)" }],
    contentClassification: ["decision"],
    keywords: {
      commercialKeywords: ["vCISO pricing", "fractional CISO retainer"],
      semanticKeywords: ["security governance", "board reporting", "risk register"],
    },
  },
  {
    entityId: "pentest",
    entityKind: "service",
    businessObjective:
      "Convert organizations needing compliance-driven or pre-launch security validation into project-based penetration-testing engagements across their full technology stack.",
    commercialPriority: "high",
    audience: ["AppSec/Engineering Teams needing pre-launch security validation", "Compliance Teams requiring an annual pentest for audit evidence", "CISOs validating network, cloud, and mobile attack surface"],
    conversionGoal: "Request a Pentest Quote",
    secondaryCta: { label: "Get the Red Team Playbook", path: "https://www.cyberdudebivash.com/#gumroad-red_tool" },
    valueProposition:
      "Full-spectrum penetration testing across web, API, network, cloud, mobile, and social engineering — following OWASP, PTES, and NIST 800-115 methodologies.",
    customerPainPoints: [
      "Need audit-ready pentest evidence for a compliance deadline",
      "Uncertain attack-surface exposure across web, cloud, and mobile simultaneously",
      "No internal red-team capability for realistic adversary simulation",
    ],
    customerOutcomes: [
      "A pentest report following recognized OWASP/PTES/NIST 800-115 methodology",
      "Coverage across web, API, network, cloud, mobile, and social engineering in one engagement",
    ],
    targetCompanySize: ["smb", "mid-market", "enterprise"],
    targetGeography: ["India", "Global"],
    buyingStage: "vendor-evaluation",
    trustSignals: [{ type: "Methodology Standard", description: "OWASP, PTES, and NIST 800-115 penetration testing methodologies" }],
    contentClassification: ["decision"],
    keywords: {
      commercialKeywords: ["pentest quote request", "penetration testing pricing"],
      semanticKeywords: ["red team", "attack surface", "web app security", "cloud security"],
    },
  },

  // ===== products =====
  {
    entityId: "apex",
    entityKind: "product",
    businessObjective:
      "Drive adoption of Sentinel APEX as the platform-level entry point for threat-intelligence consumption, creating upsell pull toward the Managed SOC and MSSP services it integrates with.",
    commercialPriority: "critical",
    conversionGoal: "Start a Sentinel APEX trial or request platform access",
    primaryCta: { label: "Explore Sentinel APEX", path: "https://intel.cyberdudebivash.com/" },
    secondaryCta: { label: "Talk to Managed SOC", path: "/soc-services.html" },
    valueProposition:
      "Real-time threat feeds, active IOC maps, and deep dark web scraping nodes delivering global threat vectors — the intelligence layer behind CYBERDUDEBIVASH's managed SOC and MSSP services.",
    customerPainPoints: [
      "Fragmented, low-fidelity threat feeds with no dark-web coverage",
      "No STIX/TAXII-native integration for existing SIEM pipelines",
      "Slow IOC delivery relative to active threat campaigns",
    ],
    customerOutcomes: ["Real-time IOC feeds delivered via STIX/TAXII", "Dark-web visibility feeding directly into SOC/MSSP workflows"],
    targetCompanySize: ["mid-market", "enterprise"],
    targetGeography: ["Global"],
    buyingStage: "solution-exploration",
    trustSignals: [{ type: "Data Standard", description: "STIX/TAXII-compliant threat intelligence feeds" }],
    contentClassification: ["threat-intelligence", "consideration"],
    keywords: {
      commercialKeywords: ["threat intelligence platform trial"],
      semanticKeywords: ["IOC feed", "dark web scraping", "threat vectors"],
      entityKeywords: ["Sentinel APEX", "STIX TAXII"],
    },
  },
  {
    entityId: "ai_hub",
    entityKind: "product",
    businessObjective:
      "Establish AI Security Hub as the technical proof point behind the OWASP LLM Red Team and DPDP Compliance services, converting self-serve usage into paid engagement leads.",
    commercialPriority: "high",
    conversionGoal: "Run a SAST or compliance audit scan",
    primaryCta: { label: "Launch AI Security Hub", path: "https://cyberdudebivash.in/" },
    secondaryCta: { label: "Schedule AI Red Team Testing", path: "/bug-bounty.html" },
    valueProposition: "Deep static code auditing (SAST), system log compliance checks, and secure neural chatbot services in one AI-native security platform.",
    customerPainPoints: [
      "No automated SAST coverage across AI-assisted codebases",
      "Manual, slow compliance-log review processes",
      "Uncertainty about AI chatbot data-handling security",
    ],
    customerOutcomes: ["Automated SAST findings", "System log compliance evidence for auditors", "A secure, audited neural chatbot deployment path"],
    targetCompanySize: ["smb", "mid-market", "enterprise"],
    targetGeography: ["India", "Global"],
    buyingStage: "solution-exploration",
    contentClassification: ["consideration"],
    keywords: {
      commercialKeywords: ["SAST scan platform", "AI compliance audit tool"],
      semanticKeywords: ["static code auditing", "log forensics", "neural chatbot"],
    },
  },
  {
    entityId: "tools",
    entityKind: "product",
    businessObjective:
      "Drive direct, self-serve usage of ThreatCore Tools among practitioners, using the free utility suite as a top-of-funnel acquisition channel for the Penetration Testing service.",
    commercialPriority: "medium",
    conversionGoal: "Use a ThreatCore tool, then request a Pentest quote",
    primaryCta: { label: "Browse ThreatCore Tools", path: "https://tools.cyberdudebivash.com/" },
    secondaryCta: { label: "Request a Pentest Quote", path: "/services.html" },
    valueProposition: "Over 100 on-demand defensive utility tools — IP recon scanners, sub-domain scouts, cryptographic analyzers — free for practitioners to use directly.",
    customerPainPoints: ["Scattered, low-trust free security tools across the web", "No single trusted toolkit for routine recon and analysis tasks"],
    customerOutcomes: ["Direct access to 100+ vetted defensive utilities", "A credible entry point into CYBERDUDEBIVASH's broader pentest capability"],
    targetGeography: ["Global"],
    buyingStage: "problem-identification",
    contentClassification: ["decision"],
    keywords: {
      semanticKeywords: ["IP recon scanner", "subdomain enumeration", "cryptographic analyzer"],
    },
  },
  {
    entityId: "blog",
    entityKind: "product",
    businessObjective: "Build organic search authority and brand credibility through original threat research, nurturing top-of-funnel readers toward commercial services over time.",
    commercialPriority: "low",
    conversionGoal: "Return for future research; no direct transaction",
    valueProposition: "Deep-dive zero-day analysis, threat group profile teardowns, and educational security research.",
    customerPainPoints: ["No trusted, in-depth source for emerging zero-day analysis", "Generic security content lacking original threat research"],
    customerOutcomes: ["Access to original zero-day and APT research not available elsewhere", "Ongoing threat-landscape education for security teams"],
    targetGeography: ["Global"],
    contentClassification: ["awareness", "research", "threat-intelligence"],
    keywords: {
      semanticKeywords: ["zero-day analysis", "threat group profiles", "security education"],
    },
  },
  {
    entityId: "official",
    entityKind: "product",
    businessObjective:
      "Serve as the single enterprise-facing gateway consolidating the full service catalogue, converting navigational and brand-search traffic into a routed path toward the matching service.",
    commercialPriority: "critical",
    conversionGoal: "Route the visitor to the specific service matching their need",
    primaryCta: { label: "Explore Enterprise Services", path: "/services.html" },
    secondaryCta: { label: "Contact Sales", path: "/contact.html" },
    valueProposition: "The corporate interface consolidating CYBERDUDEBIVASH's full enterprise service catalogue, secure client consulting channel, and official point of contact.",
    customerPainPoints: [
      "Difficulty finding the right service among a multi-product security vendor's offerings",
      "No single, authoritative starting point for enterprise procurement",
    ],
    customerOutcomes: ["A consolidated view of all 6 managed services from one gateway", "A direct, official contact channel for enterprise procurement"],
    targetCompanySize: ["enterprise"],
    targetGeography: ["Global"],
    buyingStage: "problem-identification",
    contentClassification: ["awareness"],
    keywords: {
      semanticKeywords: ["enterprise service catalog", "corporate interface"],
    },
  },
];
