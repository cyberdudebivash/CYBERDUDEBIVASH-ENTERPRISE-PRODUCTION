import type { ViewType } from "../types/app";
import { PricingCard } from "../components/cards/PricingCard";
import { SectionHeader } from "../design-system/components/SectionHeader";
import { StatCard } from "../design-system/components/StatCard";
import { FeatureCard } from "../design-system/components/FeatureCard";

interface ServicePagesProps {
  currentView: "soc" | "dpdp" | "owasp" | "mssp" | "vciso" | "pentest";
  onNavigate: (view: ViewType) => void;
  onContact: () => void;
  roiStaff: number;
  roiEndpoints: number;
  roiBreach: number;
  onRoiStaffChange: (v: number) => void;
  onRoiEndpointsChange: (v: number) => void;
  onRoiBreachChange: (v: number) => void;
}

export default function ServicePages({ currentView, onNavigate, onContact, roiStaff, roiEndpoints, roiBreach, onRoiStaffChange, onRoiEndpointsChange, onRoiBreachChange }: ServicePagesProps) {
  return (
    <div className="min-h-screen bg-[#030912] border-t border-slate-800/60">
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-violet-500/70 to-transparent" />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <button onClick={() => onNavigate("home")} className="mb-10 text-xs text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-2 font-mono group">
          <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span> Back to Gateway
        </button>

        {/* ===== MANAGED SOC-AS-A-SERVICE ===== */}
        {currentView === "soc" && (
          <div className="space-y-10">
            <SectionHeader
              size="page"
              accent="violet"
              subtitle="Enterprise Service · SOC Operations"
              title="Managed SOC-as-a-Service"
              description="CyberDudeBivash® delivers a fully autonomous 24×7 Security Operations Center powered by our GE-Neural AI engine — combining real-time threat detection, automated alert triage, human-expert incident response, and continuous threat hunting into a single managed service that protects your enterprise without the overhead of building an in-house SOC."
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "24×7", l: "Continuous Monitoring", c: "violet" as const },
                { v: "<15m", l: "Target Response SLA", c: "cyan" as const },
                { v: "99.7%", l: "Target Detection Accuracy", c: "emerald" as const },
                { v: "100+", l: "Detection Playbooks", c: "amber" as const },
              ].map(s => (
                <StatCard key={s.l} value={s.v} label={s.l} tone={s.c} />
              ))}
            </div>
            <div className="bg-violet-950/20 border border-violet-800/30 rounded-xl p-6">
              <h2 className="text-sm font-bold text-violet-300 mb-3 uppercase tracking-widest">What is Managed SOC-as-a-Service?</h2>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">Our Managed SOC eliminates the need to hire, train, and retain a 20-person security team. Instead, you get the full power of an enterprise SOC — staffed by CyberDudeBivash analysts, augmented by our proprietary GE-Neural AI engine — delivered as a subscription service with predictable monthly pricing, SLA guarantees, and full integration into your existing infrastructure.</p>
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="Core SOC Capabilities" />
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "AI-Powered Alert Triage", icon: "🧠", desc: "GE-Neural AI processes millions of raw security events per hour, reducing alert noise by 94%. Only true positives reach your dedicated analyst queue — zero alert fatigue." },
                  { title: "24×7 Threat Hunting", icon: "🎯", desc: "Proactive hunting for advanced persistent threats (APTs), living-off-the-land attacks (LotL), and zero-day exploitation attempts across your endpoints, network, and cloud workloads." },
                  { title: "MITRE ATT&CK Mapped Detection", icon: "🗺️", desc: "Every detection rule is mapped to MITRE ATT&CK v14 tactics and techniques. You receive real-time visibility into which attack stages are being blocked and where coverage gaps exist." },
                  { title: "Automated Incident Response", icon: "⚡", desc: "Pre-built SOAR playbooks automatically contain threats — isolating compromised endpoints, blocking malicious IPs, revoking compromised credentials — within minutes of detection." },
                  { title: "SIEM Log Management", icon: "📊", desc: "Ingest, normalize, correlate, and retain logs from 200+ sources: firewalls, EDR, cloud (AWS/Azure/GCP), SaaS applications, identity providers, and custom log pipelines." },
                  { title: "Vulnerability Management", icon: "🔍", desc: "Continuous asset discovery and vulnerability scanning with risk-prioritized remediation guidance aligned to your business impact and exposure window." },
                  { title: "Threat Intelligence Integration", icon: "🌐", desc: "Real-time feed from Sentinel APEX™ — 500K+ IOCs updated every 4 hours — automatically enriching alerts with threat actor context, malware family attribution, and global campaign tracking." },
                  { title: "Compliance Reporting", icon: "📋", desc: "Monthly SOC reports mapped to ISO 27001, SOC 2 Type II, DPDP Act, NIST CSF, and PCI-DSS. Evidence packages ready for auditors and board presentations." },
                ].map(c => (
                  <FeatureCard key={c.title} icon={c.icon} title={c.title} description={c.desc} />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="SOC Technology Stack" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["Splunk SIEM", "Microsoft Sentinel", "CrowdStrike EDR", "Palo Alto XSOAR", "Elastic Stack", "AWS GuardDuty", "Azure Defender", "Wazuh HIDS", "Zeek Network Monitor", "MITRE ATT&CK", "SIGMA Rules Engine", "GE-Neural AI v4"].map(t => (
                  <div key={t} className="bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-[10px] font-mono text-slate-400 text-center">{t}</div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="Service Tiers" />
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { tier: "Essential SOC", price: "₹2.5L/mo", color: "border-slate-700", badge: "text-slate-400 bg-slate-800", features: ["8×5 monitoring", "SIEM log management", "Alert triage (up to 500 alerts/day)", "Monthly compliance report", "Email support (SLA: 4h)"] },
                  { tier: "Professional SOC", price: "₹6L/mo", color: "border-violet-700", badge: "text-violet-400 bg-violet-950", features: ["24×7 monitoring", "AI triage + threat hunting", "Unlimited alert processing", "SOAR playbook automation", "Weekly reports + MITRE ATT&CK mapping", "Dedicated analyst (SLA: 1h)"] },
                  { tier: "Enterprise SOC", price: "Custom", color: "border-cyan-700", badge: "text-cyan-400 bg-cyan-950", features: ["24×7 dedicated SOC team", "Full SIEM/SOAR/EDR deployment", "On-prem + cloud + OT/ICS coverage", "vCISO inclusion", "Real-time executive dashboard", "15-minute MTTR SLA guarantee"] },
                ].map(t => (
                  <PricingCard key={t.tier} tier={t.tier} price={t.price} color={t.color} badge={t.badge} features={t.features} />
                ))}
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-6 space-y-6">
              <div>
                <SectionHeader size="subsection" title="SOC Operations Cost & ROI Calculator" />
                <p className="text-[11px] text-slate-500 font-sans mt-2">Compare the financial investment of building an in-house Security Operations Center versus subscribing to our autonomous managed SOC services.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-350 font-bold mb-1.5">
                      <span>Security Analysts (In-House Team)</span>
                      <span className="text-emerald-400 font-mono">{roiStaff} Analysts</span>
                    </div>
                    <input type="range" min="1" max="15" value={roiStaff} onChange={(e) => onRoiStaffChange(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400" />
                    <div className="flex justify-between text-[9px] text-slate-600 mt-1"><span>1 Analyst</span><span>15 Analysts</span></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-350 font-bold mb-1.5">
                      <span>Endpoints / Active Cloud Workloads</span>
                      <span className="text-cyan-400 font-mono">{roiEndpoints} Nodes</span>
                    </div>
                    <input type="range" min="10" max="2000" step="10" value={roiEndpoints} onChange={(e) => onRoiEndpointsChange(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
                    <div className="flex justify-between text-[9px] text-slate-600 mt-1"><span>10 Nodes</span><span>2,000 Nodes</span></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-350 font-bold mb-1.5">
                      <span>Est. Breach Event Liability Exposure</span>
                      <span className="text-red-400 font-mono">${roiBreach.toLocaleString()}</span>
                    </div>
                    <input type="range" min="25000" max="1000000" step="25000" value={roiBreach} onChange={(e) => onRoiBreachChange(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-400" />
                    <div className="flex justify-between text-[9px] text-slate-600 mt-1"><span>$25,000</span><span>$1,000,000</span></div>
                  </div>
                </div>
                <div className="bg-[#040810] border border-slate-800/40 rounded-xl p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-slate-900/35 border border-slate-900 rounded-lg p-2.5">
                      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">In-House Cost</div>
                      <div className="text-lg font-bold text-red-500 mt-1 font-mono">${((roiStaff * 85000) + (roiEndpoints * 120) + 15000).toLocaleString()}<span className="text-[9px] text-slate-600 font-normal">/yr</span></div>
                    </div>
                    <div className="bg-slate-900/35 border border-slate-900 rounded-lg p-2.5">
                      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Managed SOC</div>
                      <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">${((999 * 12) + (roiEndpoints * 24)).toLocaleString()}<span className="text-[9px] text-slate-600 font-normal">/yr</span></div>
                    </div>
                  </div>
                  <div className="border-t border-slate-900 pt-3 text-center">
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Est. Annual SOC Cost Savings</div>
                    <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mt-1 font-mono">
                      ${(((roiStaff * 85000) + (roiEndpoints * 120) + 15000) - ((999 * 12) + (roiEndpoints * 24))).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1 font-sans">Includes 24/7 coverage, endpoint licenses &amp; 97.4% risk reduction</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-violet-950/30 to-slate-900/60 border border-violet-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Ready to activate your SOC in 72 hours?</h3>
                <p className="text-xs text-slate-400 font-sans">Our onboarding team deploys log collectors and integrations in under 3 business days. No hardware required.</p>
              </div>
              <button onClick={onContact} className="shrink-0 px-6 py-2.5 bg-violet-500 hover:bg-violet-400 text-white text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
                Start Free SOC Assessment
              </button>
            </div>
          </div>
        )}

        {/* ===== DPDP ACT COMPLIANCE SCANS ===== */}
        {currentView === "dpdp" && (
          <div className="space-y-10">
            <SectionHeader
              size="page"
              accent="amber"
              subtitle="Enterprise Service · India Compliance"
              title="India DPDP Act 2023 Compliance Scans"
              description="The Digital Personal Data Protection Act 2023 (DPDP Act) is India's landmark data protection law — and non-compliance carries penalties up to ₹250 crore per violation. CyberDudeBivash® delivers end-to-end DPDP compliance scanning, data mapping, DPO advisory, and breach-readiness assessments to bring your organization into full conformance before regulators come knocking."
            />
            <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-6">
              <h2 className="text-sm font-bold text-amber-400 mb-3">Why DPDP Act Compliance Cannot Wait</h2>
              <div className="grid md:grid-cols-3 gap-4 text-xs font-sans">
                {[
                  { head: "₹250 Crore Penalty", body: "Maximum financial penalty per DPDP Act violation — applicable to Data Fiduciaries who fail to implement adequate safeguards." },
                  { head: "Significant Data Fiduciary", body: "Certain categories of businesses (by data volume or sensitivity) will be designated SDF with heightened obligations — are you ready?" },
                  { head: "72-Hour Breach Notification", body: "Mandatory notification to Data Protection Board and affected Data Principals within 72 hours of breach discovery." },
                ].map(c => (
                  <div key={c.head} className="bg-amber-950/30 border border-amber-900/40 rounded-lg p-3">
                    <h4 className="font-bold text-amber-300 mb-1">{c.head}</h4>
                    <p className="text-slate-400 leading-relaxed">{c.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="Our DPDP Compliance Service Portfolio" />
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "DPDP Gap Assessment", icon: "🔍", desc: "Comprehensive audit of your current data processing activities against all DPDP Act 2023 obligations — identifying gaps in consent management, data localisation, purpose limitation, and retention policies." },
                  { title: "Personal Data Inventory & Mapping", icon: "🗂️", desc: "Full data discovery and mapping across your IT estate — identifying where personal data of Indian citizens is collected, stored, processed, and transferred. Output: RoPA (Record of Processing Activities) document." },
                  { title: "Consent Framework Implementation", icon: "✅", desc: "Design and technical implementation of a DPDP-compliant consent management platform — covering notice requirements, granular consent, withdrawal mechanisms, and consent audit trails." },
                  { title: "Data Localisation Architecture Review", icon: "🏛️", desc: "Technical review of your data storage architecture to ensure personal data of Indian residents is stored within India, with compliant cross-border transfer mechanisms for approved jurisdictions." },
                  { title: "DPO Advisory & Training", icon: "👤", desc: "Virtual Data Protection Officer (DPO) service — advising on day-to-day DPDP compliance, employee training, privacy-by-design reviews, and board-level data governance reporting." },
                  { title: "Breach Notification Readiness", icon: "🚨", desc: "Develop and test your Personal Data Breach Response Plan — including 72-hour notification workflows, communication templates, Data Protection Board reporting procedures, and post-breach remediation." },
                  { title: "Privacy Impact Assessment (PIA)", icon: "📝", desc: "Structured PIA methodology for new products, features, and data processing activities — identifying privacy risks before they become compliance violations." },
                  { title: "Third-Party Data Processor Audits", icon: "🔗", desc: "Audit of vendor and data processor agreements (DPAs) to ensure your entire supply chain meets DPDP Act obligations. Non-compliant processors are a direct liability for Data Fiduciaries." },
                ].map(c => (
                  <FeatureCard key={c.title} icon={c.icon} title={c.title} description={c.desc} />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="DPDP Act Key Obligations We Cover" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  ["Section 4", "Grounds for processing personal data (consent + legitimate use)"],
                  ["Section 5", "Notice requirements before collecting personal data"],
                  ["Section 6", "Consent management obligations"],
                  ["Section 7", "Certain legitimate uses without consent"],
                  ["Section 8", "General obligations of Data Fiduciaries"],
                  ["Section 9", "Processing children's personal data"],
                  ["Section 10", "Significant Data Fiduciary obligations"],
                  ["Section 11", "Rights of Data Principals (access, correction, erasure)"],
                  ["Section 12", "Right to nominate data successor"],
                  ["Section 13-14", "Duties and remedies for Data Principals"],
                  ["Section 16", "Transfer of personal data outside India"],
                  ["Section 17-18", "Data Protection Board establishment"],
                  ["Section 19", "Breach notification to Board and individuals"],
                  ["Section 33", "Penalties — up to ₹250 crore per violation"],
                ].map(([sec, desc]) => (
                  <div key={sec} className="flex gap-3 text-[11px] font-sans bg-slate-900/30 border border-slate-800/60 rounded px-3 py-2">
                    <span className="font-mono text-amber-400 shrink-0 font-bold">{sec}</span>
                    <span className="text-slate-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-r from-amber-950/30 to-slate-900/60 border border-amber-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Get your DPDP readiness score in 48 hours</h3>
                <p className="text-xs text-slate-400 font-sans">We'll run a preliminary DPDP gap assessment and deliver a readiness scorecard with prioritized remediation steps.</p>
              </div>
              <button onClick={onContact} className="shrink-0 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
                Request DPDP Assessment
              </button>
            </div>
          </div>
        )}

        {/* ===== OWASP LLM RED TEAM ===== */}
        {currentView === "owasp" && (
          <div className="space-y-10">
            <SectionHeader
              size="page"
              accent="red"
              subtitle="Enterprise Service · AI Security"
              title="OWASP LLM Red Team Testing"
              description="As enterprises rush to deploy AI and Large Language Models, attackers have developed a new class of attacks specifically targeting AI systems. CyberDudeBivash® is India's leading AI Red Team, specializing in adversarial testing of LLM-powered applications against the full OWASP LLM Top 10 2024 threat catalogue — identifying vulnerabilities before your AI becomes a liability."
            />
            <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-6">
              <h2 className="text-sm font-bold text-red-400 mb-4">OWASP LLM Top 10 2024 — Our Testing Coverage</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { id: "LLM01", name: "Prompt Injection", desc: "Direct and indirect prompt injection attacks that override system instructions, exfiltrate data, or manipulate AI behavior." },
                  { id: "LLM02", name: "Insecure Output Handling", desc: "XSS, SSRF, RCE, and SQLi via unvalidated LLM outputs passed to downstream systems and parsers." },
                  { id: "LLM03", name: "Training Data Poisoning", desc: "Manipulation of training data to create backdoors, bias outputs, or embed adversarial triggers in fine-tuned models." },
                  { id: "LLM04", name: "Model Denial of Service", desc: "Resource exhaustion attacks via prompt flooding, context window abuse, and recursive token amplification." },
                  { id: "LLM05", name: "Supply Chain Vulnerabilities", desc: "Compromised base models, poisoned LoRA adapters, malicious plugins in the LLM development and deployment pipeline." },
                  { id: "LLM06", name: "Sensitive Information Disclosure", desc: "Extraction of training data, system prompts, API keys, PII, and proprietary business logic from LLM memory." },
                  { id: "LLM07", name: "Insecure Plugin Design", desc: "Privilege escalation and data exfiltration via poorly sandboxed LLM plugins, tool calls, and function execution." },
                  { id: "LLM08", name: "Excessive Agency", desc: "LLM autonomy exploits where manipulated agents take unauthorized actions beyond their intended permissions." },
                  { id: "LLM09", name: "Overreliance", desc: "Business risk assessment of over-dependence on LLM outputs in security-critical decision workflows without human review." },
                  { id: "LLM10", name: "Model Theft", desc: "Model extraction attacks, intellectual property theft via API probing, and reconstruction of proprietary model weights." },
                ].map(v => (
                  <FeatureCard
                    key={v.id}
                    iconWrapper="raw"
                    icon={<span className="text-[10px] font-mono text-red-400 bg-red-950/50 border border-red-900/40 px-1.5 py-0.5 rounded h-fit shrink-0 font-bold">{v.id}</span>}
                    title={v.name}
                    description={v.desc}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="AI Red Team Methodology" />
              <div className="space-y-3">
                {[
                  { phase: "Phase 1: AI Asset Discovery", weeks: "Week 1", desc: "Map all AI/LLM components in your environment — base models, fine-tuned versions, RAG pipelines, agent frameworks (LangChain, AutoGen, CrewAI), API integrations, and plugin ecosystems." },
                  { phase: "Phase 2: Threat Modelling", weeks: "Week 1-2", desc: "STRIDE/DREAD threat modelling specific to your AI architecture. Identify attack surfaces: API endpoints, user input channels, tool execution paths, memory systems, and training data pipelines." },
                  { phase: "Phase 3: Automated Adversarial Testing", weeks: "Week 2-3", desc: "Deploy our proprietary AI attack suite — running 10,000+ automated prompt injection variants, jailbreak attempts, data extraction probes, and plugin abuse scenarios against your LLM deployment." },
                  { phase: "Phase 4: Manual Expert Red Teaming", weeks: "Week 3-4", desc: "Our AI security researchers conduct manual adversarial testing — chaining vulnerabilities, simulating sophisticated APT-level attacks, and testing edge cases not captured by automated tools." },
                  { phase: "Phase 5: Report & Remediation", weeks: "Week 4", desc: "Deliver executive summary + technical report with CVSSv4-scored findings, proof-of-concept exploit demonstrations, and a prioritized remediation roadmap aligned to your AI deployment timeline." },
                ].map(p => (
                  <div key={p.phase} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex gap-4">
                    <div className="shrink-0 text-right">
                      <div className="text-[9px] font-mono text-red-400 font-bold">{p.weeks}</div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 mb-1">{p.phase}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="Deliverables" />
              <div className="grid md:grid-cols-3 gap-3">
                {["Executive Risk Summary (board-ready)", "Full OWASP LLM Top 10 test report", "CVSSv4-scored vulnerability findings", "PoC exploit demonstrations (controlled)", "Remediation roadmap (prioritized)", "Re-test validation included", "AI Security Policy templates", "Developer secure AI coding guidelines", "MITRE ATLAS technique mapping"].map(d => (
                  <div key={d} className="flex items-start gap-2 bg-slate-900/30 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-400 font-sans">
                    <span className="text-emerald-400 shrink-0">✓</span>{d}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-r from-red-950/30 to-slate-900/60 border border-red-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Is your AI application adversarially hardened?</h3>
                <p className="text-xs text-slate-400 font-sans">Book a free 30-minute AI security scoping call with our red team lead.</p>
              </div>
              <button onClick={onContact} className="shrink-0 px-6 py-2.5 bg-red-500 hover:bg-red-400 text-white text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
                Schedule AI Red Team
              </button>
            </div>
          </div>
        )}

        {/* ===== MULTI-TENANT MSSP SUITE ===== */}
        {currentView === "mssp" && (
          <div className="space-y-10">
            <SectionHeader
              size="page"
              accent="sky"
              subtitle="Enterprise Service · MSSP Platform"
              title="Multi-Tenant MSSP Suite"
              description="Launch or scale your Managed Security Service Provider (MSSP) business on CyberDudeBivash®'s battle-tested multi-tenant infrastructure. Our MSSP Suite gives you white-labeled threat intelligence, SOC tooling, client management portals, and billing automation — everything you need to deliver enterprise security services to dozens of clients from a single pane of glass."
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "500+", l: "Active MSSP Tenants", c: "sky" as const },
                { v: "99.99%", l: "Platform Uptime", c: "emerald" as const },
                { v: "50+", l: "Countries Supported", c: "violet" as const },
                { v: "72hr", l: "Onboarding SLA", c: "amber" as const },
              ].map(s => (
                <StatCard key={s.l} value={s.v} label={s.l} tone={s.c} />
              ))}
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="Platform Capabilities" />
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "True Multi-Tenancy", icon: "🏢", desc: "Fully isolated tenant environments with dedicated data stores, separate RBAC policies, and zero data bleed between client environments. Each client sees only their data." },
                  { title: "White-Label Branding", icon: "🎨", desc: "Deploy the entire CYBERDUDEBIVASH platform under your own brand — custom domain, your logo, your color scheme, your product names. Clients never see the CyberDudeBivash name." },
                  { title: "Unified Client Management Portal", icon: "🖥️", desc: "Single-pane-of-glass dashboard for managing all client tenants. Monitor health, alerts, SLA compliance, and escalations across your entire client portfolio simultaneously." },
                  { title: "Threat Intelligence Resale", icon: "🌐", desc: "White-labeled Sentinel APEX™ threat feeds delivered under your brand. Resell real-time IOC feeds, CVE intelligence, and SIGMA rules as part of your managed security offering." },
                  { title: "Automated Billing & Reporting", icon: "💰", desc: "Client-specific usage metering, automated invoice generation, white-labeled monthly security reports, and SLA scorecards — all generated automatically for each client." },
                  { title: "API-First Integration", icon: "🔌", desc: "Full REST API for integrating MSSP Suite with your existing PSA tools (ConnectWise, Autotask), RMM platforms, ticketing systems (Jira, ServiceNow), and billing systems." },
                ].map(c => (
                  <FeatureCard key={c.title} icon={c.icon} title={c.title} description={c.desc} />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="MSSP Partner Tiers" />
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { tier: "MSSP Starter", price: "₹50K/mo", clients: "Up to 10 clients", color: "border-slate-700", badge: "text-slate-400 bg-slate-800", features: ["10 client tenants", "White-label threat feeds", "Basic client portal", "Email support", "Standard reporting"] },
                  { tier: "MSSP Professional", price: "₹1.5L/mo", clients: "Up to 50 clients", color: "border-sky-700", badge: "text-sky-400 bg-sky-950", features: ["50 client tenants", "Full white-label suite", "SOC tooling included", "Dedicated partner manager", "Custom reporting", "PSA/RMM integrations"] },
                  { tier: "MSSP Enterprise", price: "Custom", clients: "Unlimited clients", color: "border-cyan-700", badge: "text-cyan-400 bg-cyan-950", features: ["Unlimited tenants", "On-prem deployment option", "Revenue share model", "Co-marketing program", "Priority engineering support", "SLA: 99.99% uptime"] },
                ].map(t => (
                  <PricingCard key={t.tier} tier={t.tier} price={t.price} subtitle={t.clients} color={t.color} badge={t.badge} features={t.features} />
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-r from-sky-950/30 to-slate-900/60 border border-sky-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Ready to launch your MSSP practice?</h3>
                <p className="text-xs text-slate-400 font-sans">Get a personalized MSSP business case with projected revenue models for your target client base.</p>
              </div>
              <button onClick={onContact} className="shrink-0 px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
                Apply for MSSP Partnership
              </button>
            </div>
          </div>
        )}

        {/* ===== vCISO ADVISORY ===== */}
        {currentView === "vciso" && (
          <div className="space-y-10">
            <SectionHeader
              size="page"
              accent="emerald"
              subtitle="Enterprise Service · Executive Advisory"
              title="Virtual CISO (vCISO) Advisory"
              description="A full-time Chief Information Security Officer costs ₹1–2 crore annually in India. Our Virtual CISO service gives you the strategic security leadership of a seasoned CISO — available on-demand, aligned to your business objectives, and integrated with your executive team — at a fraction of the cost. Built for SMEs, startups, and mid-market enterprises that need enterprise-grade security governance without a full-time hire."
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "₹15L/yr", l: "vs ₹1.5Cr full-time CISO", c: "emerald" as const },
                { v: "48hr", l: "Incident Response SLA", c: "cyan" as const },
                { v: "100+", l: "Security Frameworks", c: "violet" as const },
                { v: "15yr+", l: "Avg. vCISO Experience", c: "amber" as const },
              ].map(s => (
                <StatCard key={s.l} value={s.v} label={s.l} tone={s.c} valueSize="sm" />
              ))}
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="What Your vCISO Does" />
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "Security Strategy & Roadmap", icon: "🗺️", desc: "Develop a 3-year cybersecurity strategy aligned to your business goals, risk appetite, regulatory requirements, and budget. Deliver quarterly roadmap updates to your board." },
                  { title: "Risk Assessment & Management", icon: "⚖️", desc: "Conduct ISO 27005/NIST-aligned risk assessments. Maintain your risk register, track treatment status, and ensure residual risk is within board-approved tolerance levels." },
                  { title: "Policy & Framework Development", icon: "📋", desc: "Draft, review, and maintain your complete security policy library — information security policy, BYOD, acceptable use, incident response, vendor management, BCP/DR policies." },
                  { title: "Regulatory Compliance Oversight", icon: "🏛️", desc: "Primary contact for auditors, regulators, and certification bodies. Manage ISO 27001, SOC 2, PCI-DSS, DPDP Act, and RBI cybersecurity framework compliance programs." },
                  { title: "Board & Executive Reporting", icon: "📊", desc: "Monthly security posture reports for the board. Translate technical risk into business language — board members understand business impact, not CVE scores." },
                  { title: "Security Awareness Program", icon: "🎓", desc: "Design and manage company-wide security awareness training, phishing simulation campaigns, and security culture transformation initiatives." },
                  { title: "Vendor Risk Management", icon: "🔗", desc: "Third-party risk assessments for critical vendors and cloud providers. Negotiate security requirements into contracts and ensure ongoing vendor compliance monitoring." },
                  { title: "Incident Response Leadership", icon: "🚨", desc: "Command your incident response during active breaches — coordinating technical teams, communicating with executives, managing regulatory notifications, and leading post-incident reviews." },
                ].map(c => (
                  <FeatureCard key={c.title} icon={c.icon} title={c.title} description={c.desc} />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="vCISO Engagement Models" />
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { tier: "Advisory Retainer", price: "₹75K/mo", hours: "8 hrs/month", color: "border-slate-700", badge: "text-slate-400 bg-slate-800", features: ["Monthly strategy call", "Board report template", "Policy review (2/quarter)", "Incident escalation support", "Email advisory access"] },
                  { tier: "Embedded vCISO", price: "₹1.5L/mo", hours: "20 hrs/month", color: "border-emerald-700", badge: "text-emerald-400 bg-emerald-950", features: ["Bi-weekly leadership calls", "Full policy development", "Compliance program management", "Risk register management", "Vendor risk assessments", "Board presentations included"] },
                  { tier: "Full vCISO", price: "₹3L/mo", hours: "40+ hrs/month", color: "border-cyan-700", badge: "text-cyan-400 bg-cyan-950", features: ["Weekly executive alignment", "ISO 27001 / SOC 2 program", "24hr incident response SLA", "Full security roadmap ownership", "Regulatory interface", "Annual security strategy offsite"] },
                ].map(t => (
                  <PricingCard key={t.tier} tier={t.tier} price={t.price} subtitle={t.hours} color={t.color} badge={t.badge} features={t.features} />
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-r from-emerald-950/30 to-slate-900/60 border border-emerald-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Get your first vCISO session free</h3>
                <p className="text-xs text-slate-400 font-sans">60-minute complimentary security strategy session with a senior CyberDudeBivash security executive.</p>
              </div>
              <button onClick={onContact} className="shrink-0 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
                Book Free vCISO Session
              </button>
            </div>
          </div>
        )}

        {/* ===== PENETRATION TESTING ===== */}
        {currentView === "pentest" && (
          <div className="space-y-10">
            <SectionHeader
              size="page"
              accent="pink"
              subtitle="Enterprise Service · Offensive Security"
              title="Professional Penetration Testing"
              description="CyberDudeBivash® delivers full-spectrum penetration testing engagements — from web application and API security to network infrastructure, cloud environments, mobile applications, and social engineering. Our certified red team follows rigorous methodologies (OWASP, PTES, NIST 800-115) and delivers actionable, risk-scored reports that your developers can implement — not just a PDF of CVE numbers."
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "2,500+", l: "Engagements Completed", c: "pink" as const },
                { v: "97%", l: "Critical Findings Rate", c: "red" as const },
                { v: "5 days", l: "Avg. Delivery Time", c: "cyan" as const },
                { v: "CERT-In", l: "Empanelled Organization", c: "emerald" as const },
              ].map(s => (
                <StatCard key={s.l} value={s.v} label={s.l} tone={s.c} />
              ))}
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="Penetration Testing Services" />
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "Web Application Penetration Testing", icon: "🌐", tags: ["OWASP Top 10", "API Security", "Authentication Bypass", "Business Logic Flaws"], desc: "Manual + automated testing of web applications covering authentication, authorization, injection flaws, IDOR, SSRF, XXE, deserialization, and business logic vulnerabilities. Includes OWASP WSTG compliance coverage." },
                  { title: "API Security Testing", icon: "🔌", tags: ["REST", "GraphQL", "gRPC", "OAuth2"], desc: "Comprehensive API penetration testing — BOLA/BFLA, mass assignment, rate limiting bypasses, authentication flaws, improper asset management, and excessive data exposure per OWASP API Security Top 10." },
                  { title: "Network Infrastructure Pentest", icon: "🔌", tags: ["Internal", "External", "Segmentation", "Firewall"], desc: "External perimeter assessment, internal network penetration (post-breach simulation), network segmentation testing, firewall rule analysis, and lateral movement simulation across VLANs and DMZ segments." },
                  { title: "Cloud Security Assessment", icon: "☁️", tags: ["AWS", "Azure", "GCP", "Multi-Cloud"], desc: "Cloud configuration review, IAM privilege escalation, S3/Blob misconfiguration hunting, serverless function exploitation, container escape testing, and Kubernetes cluster penetration testing." },
                  { title: "Mobile Application Testing", icon: "📱", tags: ["Android", "iOS", "React Native", "Flutter"], desc: "Static and dynamic analysis of Android and iOS applications — insecure data storage, weak cryptography, certificate pinning bypass, deeplink exploitation, and backend API security assessment." },
                  { title: "Social Engineering Assessment", icon: "🎭", tags: ["Phishing", "Vishing", "Pretexting", "Physical"], desc: "Realistic social engineering campaigns — spear phishing simulations, vishing attacks, pretexting scenarios, and (if authorized) physical security testing of office premises and data center facilities." },
                  { title: "Red Team Operations", icon: "🔴", tags: ["APT Simulation", "C2 Framework", "Persistence", "Exfiltration"], desc: "Full adversary simulation engagements — emulating specific threat actor TTPs (MITRE ATT&CK mapped), establishing persistent access, moving laterally, exfiltrating data, and testing detection + response capabilities." },
                  { title: "Source Code Security Review", icon: "💻", tags: ["SAST", "Manual Review", "Secrets Scanning", "Dependency Audit"], desc: "Manual and automated source code security review — OWASP ASVS compliance, secret detection, dependency vulnerability analysis, and architectural security review of critical application logic." },
                ].map(c => (
                  <FeatureCard key={c.title} icon={c.icon} title={c.title} tags={c.tags} description={c.desc} accent="pink" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <SectionHeader size="subsection" title="Methodology & Certifications" />
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-300">Testing Methodologies</h3>
                  {["OWASP Testing Guide (WSTG) v4.2", "OWASP API Security Top 10 2023", "PTES (Penetration Testing Execution Standard)", "NIST SP 800-115 Technical Guide", "MITRE ATT&CK v14 (Red Team)", "OSSTMM (Open Source Security Testing Methodology)", "CERT-In Guidelines for Penetration Testing"].map(m => (
                    <div key={m} className="flex items-center gap-2 text-[11px] text-slate-400 font-sans">
                      <span className="w-1 h-1 rounded-full bg-pink-400 shrink-0" />{m}
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-300">Report Deliverables</h3>
                  {["Executive Summary (risk-rated, board-ready)", "Technical Finding Details with PoC evidence", "CVSSv4-scored vulnerability ratings", "Exploitation impact narratives", "Step-by-step remediation guidance", "Developer-friendly code-level fixes", "MITRE ATT&CK technique mapping", "Re-test within 30 days included", "Attestation letter for compliance/audit purposes"].map(d => (
                    <div key={d} className="flex items-center gap-2 text-[11px] text-slate-400 font-sans">
                      <span className="text-emerald-400 shrink-0">✓</span>{d}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-pink-950/30 to-slate-900/60 border border-pink-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Get a pentest quote in 24 hours</h3>
                <p className="text-xs text-slate-400 font-sans">Tell us your scope — we'll send a detailed proposal with timeline, methodology, and fixed-price quote within one business day.</p>
              </div>
              <button onClick={onContact} className="shrink-0 px-6 py-2.5 bg-pink-500 hover:bg-pink-400 text-white text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
                Request Pentest Quote
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
