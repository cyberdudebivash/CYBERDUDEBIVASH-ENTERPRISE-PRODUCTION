import React, { useState } from "react";
import {
  Shield, Activity, Cpu, BookOpen, Globe, Code, ExternalLink,
  Zap, Lock, Database, FileText, Users, ArrowRight, Star,
  Server, Radio, Eye, TrendingUp, Award, ChevronRight
} from "lucide-react";
import { FeatureCard } from "../design-system/components/FeatureCard";

interface EcosystemPlatform {
  id: string;
  name: string;
  tagline: string;
  url: string;
  category: string;
  categoryColor: string;
  icon: any;
  purpose: string;
  capabilities: string[];
  audience: string;
  valueProposition: string;
  primaryCta: string;
  secondaryCta?: string;
  secondaryCtaUrl?: string;
  accentColor: string;
  borderColor: string;
  badgeColor: string;
}

interface CommercialService {
  icon: any;
  title: string;
  description: string;
  category: string;
  url?: string;
  ctaText: string;
}

const PLATFORMS: EcosystemPlatform[] = [
  {
    id: "gateway",
    name: "CYBERDUDEBIVASH® Official Gateway",
    tagline: "Corporate Headquarters",
    url: "https://www.cyberdudebivash.com",
    category: "HEADQUARTERS",
    categoryColor: "text-cyan-400",
    icon: <Globe className="w-5 h-5" />,
    purpose: "The central corporate entry point for the entire CYBERDUDEBIVASH® ecosystem — enterprise services catalog, secure client consultations, official legal entity, and primary commercial engagement channel.",
    capabilities: [
      "Enterprise service catalog",
      "Secure client onboarding portal",
      "AI SOC live command center",
      "Compliance badge verification",
      "GSTIN corporate registry",
      "Multi-provider AI Security Analyzer",
      "Threat Intelligence live feed",
      "Premium products marketplace"
    ],
    audience: "Enterprises, CISOs, Security Directors, Procurement Teams",
    valueProposition: "Single unified entry point to every CYBERDUDEBIVASH product, service, API, and intelligence platform with enterprise-grade credibility.",
    primaryCta: "Explore Gateway",
    accentColor: "from-cyan-500/10 to-sky-500/5",
    borderColor: "border-cyan-500/30",
    badgeColor: "bg-cyan-950 text-cyan-400 border-cyan-800"
  },
  {
    id: "sentinel",
    name: "Sentinel APEX™ Intelligence Platform",
    tagline: "Global Threat Intelligence",
    url: "https://intel.cyberdudebivash.com/",
    category: "THREAT INTEL",
    categoryColor: "text-red-400",
    icon: <Activity className="w-5 h-5" />,
    purpose: "Real-time global threat intelligence platform delivering live IOC feeds, dark web monitoring, CVE tracking, APEX threat actor profiles, and programmable STIX-2.1 data streams for SIEM integration.",
    capabilities: [
      "Live IOC reputation feeds (IP/Domain/Hash)",
      "Dark web scraping and actor profiling",
      "CVE cross-reference database",
      "STIX-2.1 / TAXII 2.1 data streams",
      "Threat actor TTPs (MITRE ATT&CK)",
      "SIEM-ready JSON feeds",
      "API health and telemetry monitoring",
      "Enterprise upgrade portal"
    ],
    audience: "SOC Analysts, Threat Hunters, SIEM Engineers, MSSPs",
    valueProposition: "Operational-grade threat intelligence with sub-second latency feeds trusted by security operations centers across 50+ countries.",
    primaryCta: "Visit Platform",
    secondaryCta: "API Docs",
    secondaryCtaUrl: "https://intel.cyberdudebivash.com/api-docs",
    accentColor: "from-red-500/10 to-orange-500/5",
    borderColor: "border-red-500/30",
    badgeColor: "bg-red-950 text-red-400 border-red-800"
  },
  {
    id: "ai_hub",
    name: "AI Security Hub Live",
    tagline: "AI-Powered Security Forensics",
    url: "https://cyberdudebivash.in/",
    category: "AI SECURITY",
    categoryColor: "text-purple-400",
    icon: <Shield className="w-5 h-5" />,
    purpose: "Next-generation AI security forensics platform providing deep static code analysis (SAST), log forensics, compliance auditing against ISO 27001 / SOC 2 / DPDP, and secure AI-powered advisory chatbot.",
    capabilities: [
      "AI-powered SAST code vulnerability scanning",
      "Security log forensics and correlation",
      "Compliance gap analysis (ISO/SOC 2/DPDP)",
      "Domain and IP threat intelligence lookups",
      "Real-time AI security advisory chatbot",
      "Multi-provider AI (Gemini, Groq, DeepSeek)",
      "OWASP LLM Top 10 analysis",
      "REST API for programmatic analysis"
    ],
    audience: "Security Engineers, AppSec Teams, Compliance Officers, Developers",
    valueProposition: "Enterprise SAST and compliance analysis powered by multi-model AI with offline resilience — analysis that would take days done in seconds.",
    primaryCta: "Launch AI Hub",
    secondaryCta: "AI API",
    secondaryCtaUrl: "https://cyberdudebivash.in/api",
    accentColor: "from-purple-500/10 to-violet-500/5",
    borderColor: "border-purple-500/30",
    badgeColor: "bg-purple-950 text-purple-400 border-purple-800"
  },
  {
    id: "tools",
    name: "ThreatCore™ Tools Marketplace",
    tagline: "100+ Cybersecurity Utilities",
    url: "https://tools.cyberdudebivash.com/",
    category: "TOOLS",
    categoryColor: "text-amber-400",
    icon: <Cpu className="w-5 h-5" />,
    purpose: "Comprehensive on-demand cybersecurity utility suite with 100+ production-grade tools for reconnaissance, vulnerability assessment, cryptographic analysis, network scanning, and threat detection.",
    capabilities: [
      "IP and subdomain reconnaissance scanners",
      "Port scanning and service fingerprinting",
      "Hash reputation and malware analysis",
      "Cryptographic utility tools (enc/dec)",
      "DNS and WHOIS intelligence lookups",
      "Certificate transparency log analysis",
      "WAF bypass detection tools",
      "OSINT collection frameworks"
    ],
    audience: "Penetration Testers, Red Teams, Security Researchers, Bug Bounty Hunters",
    valueProposition: "All the reconnaissance, analysis, and exploitation-testing tools a security professional needs in one authenticated SaaS platform — no local setup required.",
    primaryCta: "Access Tools",
    accentColor: "from-amber-500/10 to-yellow-500/5",
    borderColor: "border-amber-500/30",
    badgeColor: "bg-amber-950 text-amber-400 border-amber-800"
  },
  {
    id: "blog",
    name: "Research Blog & Advisories",
    tagline: "Threat Intelligence Academy",
    url: "https://blog.cyberdudebivash.in/",
    category: "EDUCATION",
    categoryColor: "text-emerald-400",
    icon: <BookOpen className="w-5 h-5" />,
    purpose: "Deep technical research publications covering zero-day vulnerabilities, APT group teardowns, compliance implementation guides, and cybersecurity education for teams at every skill level.",
    capabilities: [
      "Zero-day vulnerability analysis reports",
      "APT threat group attribution profiles",
      "Compliance implementation guides (ISO/DPDP)",
      "Technical security research publications",
      "CVE walkthroughs and PoC analysis",
      "Red team and blue team playbooks",
      "MITRE ATT&CK technique breakdowns",
      "Weekly threat intelligence digests"
    ],
    audience: "Security Researchers, Analysts, CISO Offices, Engineering Teams",
    valueProposition: "Practitioner-authored intelligence from active incident responders — bridging the gap between raw threat data and actionable security knowledge.",
    primaryCta: "Read Research",
    accentColor: "from-emerald-500/10 to-green-500/5",
    borderColor: "border-emerald-500/30",
    badgeColor: "bg-emerald-950 text-emerald-400 border-emerald-800"
  }
];

const COMMERCIAL_SERVICES: CommercialService[] = [
  {
    icon: <Eye className="w-4 h-4" />,
    title: "Threat Intelligence Feeds",
    description: "Live IOC data streams (IP/Domain/Hash) in JSON/STIX format. Direct SIEM integration. Updated every 60 seconds from global sensors.",
    category: "Intelligence",
    url: "https://intel.cyberdudebivash.com/",
    ctaText: "Subscribe Feed"
  },
  {
    icon: <Server className="w-4 h-4" />,
    title: "Managed SOC Services",
    description: "24/7 staffed SOC with <15-minute SLA. AI-assisted threat hunting, incident response, and escalation handling for enterprise clients.",
    category: "Managed Security",
    ctaText: "Request SOC"
  },
  {
    icon: <Shield className="w-4 h-4" />,
    title: "AI Security Analysis API",
    description: "Programmatic access to SAST scanning, log forensics, and compliance auditing. REST API with Gemini-grade AI engine. Pay per query.",
    category: "Developer APIs",
    url: "https://cyberdudebivash.in/api",
    ctaText: "Get API Access"
  },
  {
    icon: <Award className="w-4 h-4" />,
    title: "vCISO Advisory Services",
    description: "Fractional CISO engagement for organizations that need executive-level security leadership without full-time overhead. ISO 27001 roadmapping included.",
    category: "Professional Services",
    ctaText: "Enquire Now"
  },
  {
    icon: <FileText className="w-4 h-4" />,
    title: "Compliance Audit & Certification",
    description: "End-to-end ISO 27001:2022, SOC 2 Type II, DPDP 2023, and PCI-DSS v4 audit preparation, gap analysis, and remediation advisory.",
    category: "Compliance",
    ctaText: "Start Audit"
  },
  {
    icon: <TrendingUp className="w-4 h-4" />,
    title: "Penetration Testing",
    description: "Network, web application, API, and cloud penetration testing by certified professionals. MITRE ATT&CK mapped reports with remediation SLAs.",
    category: "Red Team",
    ctaText: "Book Pentest"
  },
  {
    icon: <Radio className="w-4 h-4" />,
    title: "Dark Web Monitoring",
    description: "Continuous monitoring of dark web forums, paste sites, and marketplaces for credential leaks, brand mentions, and data exfiltration signals.",
    category: "Intelligence",
    ctaText: "Enable Monitoring"
  },
  {
    icon: <Database className="w-4 h-4" />,
    title: "APEX Intelligence Reports",
    description: "Monthly premium cyber threat intelligence reports. Curated for CISO briefings with executive summaries and technical appendices.",
    category: "Reports",
    url: "https://intel.cyberdudebivash.com/api/reports/latest.json",
    ctaText: "View Reports"
  },
  {
    icon: <Lock className="w-4 h-4" />,
    title: "Security Automation",
    description: "Custom SOAR playbooks, SIGMA rule development, YARA rule creation, and automated response workflow engineering for your SIEM stack.",
    category: "Automation",
    ctaText: "Build Playbooks"
  },
  {
    icon: <Code className="w-4 h-4" />,
    title: "Developer Premium APIs",
    description: "Enterprise API tier: 10,000 queries/sec, dedicated endpoints, SLA guarantees, and co-managed integration support for production deployments.",
    category: "Developer APIs",
    url: "https://intel.cyberdudebivash.com/upgrade.html",
    ctaText: "Upgrade Plan"
  },
  {
    icon: <Users className="w-4 h-4" />,
    title: "Security Training Programs",
    description: "Hands-on cybersecurity training for engineering teams. Blue team, red team, and cloud security tracks with certification pathways.",
    category: "Training",
    ctaText: "Enroll Team"
  },
  {
    icon: <Star className="w-4 h-4" />,
    title: "Premium Tools Subscription",
    description: "Unlimited access to 100+ ThreatCore security tools. Commercial license for professional security teams and freelancers.",
    category: "Tools",
    url: "https://tools.cyberdudebivash.com/",
    ctaText: "Subscribe Tools"
  }
];

const CATEGORY_COLORS: Record<string, string> = {
  "Intelligence":        "text-red-400 bg-red-950/50 border-red-900/50",
  "Managed Security":    "text-cyan-400 bg-cyan-950/50 border-cyan-900/50",
  "Developer APIs":      "text-purple-400 bg-purple-950/50 border-purple-900/50",
  "Professional Services": "text-amber-400 bg-amber-950/50 border-amber-900/50",
  "Compliance":          "text-emerald-400 bg-emerald-950/50 border-emerald-900/50",
  "Red Team":            "text-orange-400 bg-orange-950/50 border-orange-900/50",
  "Reports":             "text-sky-400 bg-sky-950/50 border-sky-900/50",
  "Automation":          "text-violet-400 bg-violet-950/50 border-violet-900/50",
  "Tools":               "text-yellow-400 bg-yellow-950/50 border-yellow-900/50",
  "Training":            "text-green-400 bg-green-950/50 border-green-900/50"
};

const API_ENDPOINTS = [
  { label: "API Health",         url: "https://intel.cyberdudebivash.com/api/health",                 method: "GET",  desc: "Platform health and cluster telemetry" },
  { label: "Latest Threats",     url: "https://intel.cyberdudebivash.com/api/v1/intel/latest.json",   method: "GET",  desc: "Latest global IOC records" },
  { label: "APEX Intelligence",  url: "https://intel.cyberdudebivash.com/api/v1/intel/apex.json",     method: "GET",  desc: "Tactical threat indicators (STIX-2.1)" },
  { label: "AI Summary",         url: "https://intel.cyberdudebivash.com/api/v1/intel/ai_summary.json", method: "GET", desc: "Daily AI threat summary" },
  { label: "Threat Feed",        url: "https://intel.cyberdudebivash.com/api/feed.json",              method: "GET",  desc: "JSON feed for SIEM integration" },
  { label: "Latest Reports",     url: "https://intel.cyberdudebivash.com/api/reports/latest.json",    method: "GET",  desc: "SOC intelligence report catalog" },
  { label: "AI Analysis",        url: "https://cyberdudebivash.in/api",                               method: "POST", desc: "AI security analysis endpoint" },
  { label: "API Docs",           url: "https://intel.cyberdudebivash.com/api-docs",                   method: "DOC",  desc: "OpenAPI/Swagger documentation" },
  { label: "Upgrade Portal",     url: "https://intel.cyberdudebivash.com/upgrade.html",               method: "WEB",  desc: "Enterprise tier upgrade" }
];

export default function EcosystemDiscovery({ onContact }: { onContact: () => void }) {
  const [activeTab, setActiveTab] = useState<"platforms" | "services" | "apis">("platforms");
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
            <h2 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest font-mono">
              CYBERDUDEBIVASH® Complete Ecosystem
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 font-sans">
            Discover every platform, service, API, and commercial offering in the unified cybersecurity ecosystem.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-900 shrink-0">
          {(["platforms", "services", "apis"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-cyan-500 text-black shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "platforms" ? "Platforms" : tab === "services" ? "Services" : "APIs"}
            </button>
          ))}
        </div>
      </div>

      {/* TAB: PLATFORMS */}
      {activeTab === "platforms" && (
        <div className="space-y-4">
          {PLATFORMS.map((p) => {
            const isExpanded = expandedPlatform === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-lg border transition-all bg-gradient-to-br ${p.accentColor} ${p.borderColor} bg-[#0c1117] overflow-hidden`}
              >
                {/* Platform Card Header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Icon + Category */}
                  <div className="shrink-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${p.badgeColor}`}>
                      {p.icon}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-mono font-bold uppercase tracking-widest border px-1.5 py-0.5 rounded ${p.badgeColor}`}>
                            {p.category}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{p.tagline}</span>
                        </div>
                        <h3 className="text-sm font-extrabold text-white tracking-tight">{p.name}</h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-[10px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-all"
                        >
                          {p.primaryCta} <ExternalLink className="w-3 h-3 text-cyan-400" />
                        </a>
                        {p.secondaryCta && p.secondaryCtaUrl && (
                          <a
                            href={p.secondaryCtaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border flex items-center gap-1.5 transition-all ${p.badgeColor} hover:opacity-80`}
                          >
                            {p.secondaryCta} <ArrowRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">{p.purpose}</p>

                    {/* Value Proposition */}
                    <div className="bg-slate-950/60 rounded-md p-3 border border-slate-900/60">
                      <div className="flex items-start gap-2">
                        <Zap className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-slate-300 leading-relaxed">{p.valueProposition}</p>
                      </div>
                    </div>

                    {/* Audience Tag */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] text-slate-600 uppercase tracking-wider font-mono">Best for:</span>
                      {p.audience.split(", ").map((a) => (
                        <span key={a} className="text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expand Toggle */}
                  <button
                    onClick={() => setExpandedPlatform(isExpanded ? null : p.id)}
                    className="shrink-0 text-slate-500 hover:text-slate-200 transition-colors mt-1 cursor-pointer"
                    title={isExpanded ? "Collapse" : "Show capabilities"}
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                </div>

                {/* Expandable Capabilities Grid */}
                {isExpanded && (
                  <div className="border-t border-slate-800/60 px-5 py-4 bg-slate-950/40">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono mb-3">Key Capabilities</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {p.capabilities.map((cap) => (
                        <div key={cap} className="flex items-start gap-2 text-[11px] text-slate-300">
                          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${p.categoryColor.replace("text-", "bg-")}`}></span>
                          {cap}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Ecosystem Relationship Note */}
          <div className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-4 text-center space-y-2">
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl mx-auto">
              All platforms share a unified identity, authentication layer, and data backbone. Threat data from Sentinel APEX feeds directly into AI Hub analysis. Tools results integrate with Sentinel IOC scoring. Research published on the Blog originates from live platform investigations.
            </p>
            <button
              onClick={onContact}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider rounded transition-all mt-1 cursor-pointer"
            >
              Request Full Ecosystem Briefing <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TAB: COMMERCIAL SERVICES */}
      {activeTab === "services" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COMMERCIAL_SERVICES.map((svc, idx) => (
              <FeatureCard
                key={idx}
                layout="stack"
                iconWrapper="box"
                icon={svc.icon}
                badge={
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[svc.category] || "text-slate-400 bg-slate-900 border-slate-800"}`}>
                    {svc.category}
                  </span>
                }
                title={svc.title}
                description={svc.description}
                cta={
                  svc.url ? (
                    <a
                      href={svc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-all"
                    >
                      {svc.ctaText} <ExternalLink className="w-3 h-3 text-cyan-400" />
                    </a>
                  ) : (
                    <button
                      onClick={onContact}
                      className="w-full py-2 bg-slate-900 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-800/40 text-slate-300 hover:text-cyan-300 text-[10px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {svc.ctaText} <ArrowRight className="w-3 h-3" />
                    </button>
                  )
                }
              />
            ))}
          </div>

          {/* Enterprise CTA Banner */}
          <div className="bg-gradient-to-r from-cyan-950/60 to-slate-950 border border-cyan-900/40 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-extrabold text-white">Need a Custom Enterprise Package?</h4>
              <p className="text-[11px] text-slate-400">
                Multi-service bundles, white-label options, co-managed SOC arrangements, and regional SLA contracts available for enterprise clients.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href="https://intel.cyberdudebivash.com/upgrade.html"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-cyan-700 text-cyan-400 text-xs font-bold uppercase tracking-wider rounded hover:bg-cyan-950/30 transition-all flex items-center gap-1.5"
              >
                Upgrade Portal <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={onContact}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-extrabold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-1.5"
              >
                Contact Sales <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: API ENDPOINTS */}
      {activeTab === "apis" && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
                <Code className="w-4 h-4 text-cyan-500" />
                CYBERDUDEBIVASH® REST API Endpoint Directory
              </div>
              <a
                href="https://intel.cyberdudebivash.com/api-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 transition-colors"
              >
                Full Docs <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="divide-y divide-slate-900">
              {API_ENDPOINTS.map((ep, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 hover:bg-slate-900/30 transition-all group">
                  <div className="shrink-0 w-14 text-center">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      ep.method === "POST" ? "text-orange-400 bg-orange-950/50 border-orange-900/50" :
                      ep.method === "DOC"  ? "text-sky-400 bg-sky-950/50 border-sky-900/50" :
                      ep.method === "WEB"  ? "text-purple-400 bg-purple-950/50 border-purple-900/50" :
                      "text-emerald-400 bg-emerald-950/50 border-emerald-900/50"
                    }`}>
                      {ep.method}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-200">{ep.label}</span>
                      <span className="text-[9px] text-slate-500 font-mono truncate max-w-full">{ep.url}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">{ep.desc}</p>
                  </div>
                  <a
                    href={ep.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[10px] text-slate-500 hover:text-cyan-400 font-mono flex items-center gap-1 transition-colors group-hover:text-cyan-400"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Auth note */}
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-4 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-400 font-mono">Authentication Required for Commercial Access</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Public endpoints return sampled data. Commercial tiers require a <code className="bg-slate-900 px-1 rounded text-amber-300">Bearer cdb_live_key_*</code> token in the Authorization header.
                Contact the team or visit the <a href="https://intel.cyberdudebivash.com/upgrade.html" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">upgrade portal</a> to generate your production API key.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
