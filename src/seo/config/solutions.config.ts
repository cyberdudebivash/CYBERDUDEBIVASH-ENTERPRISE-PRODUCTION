import type { SEOSolution } from "../types/entities";

// Owns: the 5 packaged, self-serve downloadable kits ("Cyber Defense
// Store" on the homepage). Transcribed verbatim from the `premiumProducts`
// array in src/App.tsx (ids, titles, prices, descriptions unchanged).
//
// Naming note, resolved deliberately: Header.tsx's own "Solutions" nav
// dropdown (AI Security Governance / Threat Intelligence Feeds / Zero
// Trust Architecture / DevSecOps Integration) is NOT what this file
// models — those are internal SPA navigation shortcuts with no
// independent price, description, or URL of their own (each just calls
// `onNavigate` + a secondary action), so they belong in
// navigation.config.ts as nav nodes, not here as commercial entities.
// This file models the thing that actually has SEOSolution's shape —
// id, price, description, checkout CTA — which is the Gumroad kits.

export const SOLUTIONS: SEOSolution[] = [
  {
    id: "ai_tool",
    name: "AI Security Toolkit OWASP LLM",
    description: "Complete OWASP LLM Top 10 guide - checklists, test cases, and mitigation vectors.",
    url: "https://www.cyberdudebivash.com/#gumroad-ai_tool",
    price: "₹499",
    format: "toolkit",
    category: "ai-security",
    primaryKeyword: "OWASP LLM Top 10 toolkit",
    funnelStage: "decision",
    primaryCta: { label: "Checkout", path: "https://www.cyberdudebivash.com/#gumroad-ai_tool" },
    relatedServices: ["owasp"],
  },
  {
    id: "iso_tool",
    name: "Compliance Starter Pack ISO 27001",
    description: "ISO 27001:2022 gap analysis models, SoA document, and standard policy library.",
    url: "https://www.cyberdudebivash.com/#gumroad-iso_tool",
    price: "₹999",
    format: "template",
    category: "compliance",
    primaryKeyword: "ISO 27001 gap analysis template",
    funnelStage: "decision",
    primaryCta: { label: "Checkout", path: "https://www.cyberdudebivash.com/#gumroad-iso_tool" },
  },
  {
    id: "red_tool",
    name: "Red Team Playbook MITRE ATT&CK",
    description: "12 adversary simulation pipelines mapped to MITRE ATT&CK security chains.",
    url: "https://www.cyberdudebivash.com/#gumroad-red_tool",
    price: "₹1,499",
    format: "guide",
    category: "offensive-security",
    primaryKeyword: "MITRE ATT&CK red team playbook",
    funnelStage: "decision",
    primaryCta: { label: "Checkout", path: "https://www.cyberdudebivash.com/#gumroad-red_tool" },
    relatedServices: ["pentest"],
  },
  {
    id: "zt_tool",
    name: "Zero Trust Blueprint NIST 800-207",
    description: "ZTA implementation guide - identity authentication architecture, microsegmentation models.",
    url: "https://www.cyberdudebivash.com/#gumroad-zt_tool",
    price: "₹799",
    format: "guide",
    category: "architecture",
    primaryKeyword: "zero trust architecture blueprint",
    funnelStage: "decision",
    primaryCta: { label: "Checkout", path: "https://www.cyberdudebivash.com/#gumroad-zt_tool" },
  },
  {
    id: "dpdp_tool",
    name: "DPDP Act Compliance Kit INDIA",
    description: "Data Fiduciary obligations, consent framework templates, and breach notification SOP.",
    url: "https://www.cyberdudebivash.com/#gumroad-dpdp_tool",
    price: "₹699",
    format: "template",
    category: "compliance",
    primaryKeyword: "DPDP Act compliance kit",
    funnelStage: "decision",
    primaryCta: { label: "Checkout", path: "https://www.cyberdudebivash.com/#gumroad-dpdp_tool" },
    relatedServices: ["dpdp"],
  },
];
