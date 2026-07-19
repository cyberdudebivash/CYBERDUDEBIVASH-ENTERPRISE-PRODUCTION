import { Activity, Shield, Terminal, ExternalLink, CheckCircle2 } from "lucide-react";
import { AiSocDashboard } from "../components/AiSocDashboard";
import EcosystemDiscovery from "../components/EcosystemDiscovery";
import { SecurityBadge } from "../design-system/components/SecurityBadge";
import { StatCard } from "../design-system/components/StatCard";
import { Hero } from "../design-system/components/Hero";
import { ECOSYSTEM_PORTALS, SOCIAL_PROFILES, CORPORATE_REGISTRATION, COMPLIANCE_DISCLOSURE, aligned } from "../constants/ecosystemData";
import type { ViewType, LiveLogEntry, PremiumProduct } from "../types/app";

interface HomeViewProps {
  liveLogs: LiveLogEntry[];
  pingingPortalId: string | null;
  pingLogs: string[];
  activeSocialFilter: string;
  purchasedProduct: string | null;
  premiumProducts: PremiumProduct[];
  onPortalPing: (id: string, name: string, url: string) => void;
  onClosePingTerminal: () => void;
  onSocialFilterChange: (filter: string) => void;
  onCheckoutProduct: (p: PremiumProduct) => void;
  onContact: () => void;
  onNavigate: (view: ViewType) => void;
}

export default function HomeView({
  liveLogs, pingingPortalId, pingLogs, activeSocialFilter,
  purchasedProduct, premiumProducts,
  onPortalPing, onClosePingTerminal, onSocialFilterChange,
  onCheckoutProduct,
  onContact, onNavigate,
}: HomeViewProps) {
  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full animate-fade-in">

      <Hero
        badge={<><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />CYBERDUDEBIVASH® Global Cybersecurity Authority</>}
        headline={<>AI-Powered Cyber Defense &amp; <br /><span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">Threat Intelligence Platform</span></>}
        description="CYBERDUDEBIVASH® delivers real-time threat intelligence, AI-powered SOC operations, 100+ production tools, and programmable REST APIs - unified in one enterprise command center used by security teams globally. Stop threat matrices before they impact your subnets."
        buttons={[
          { label: "View Live Threat Feed", icon: <Activity className="w-4 h-4" />, variant: "primary", onClick: () => onNavigate("intel") },
          { label: "Start Free Security Audit", icon: <Shield className="w-4 h-4 text-cyan-400" />, variant: "secondary", onClick: () => onNavigate("ai") },
        ]}
        metrics={[
          { value: "500K+", label: "Threat IOCs", tone: "cyan" },
          { value: "Global", label: "Threat Coverage", tone: "emerald" },
          { value: "100+", label: "AI Tools", tone: "purple" },
          { value: "99.9%", label: "Uptime SLA", tone: "amber" },
          { value: <><span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />24/7</>, label: "Automated Monitoring", tone: "red", spanFullOnMobile: true },
        ]}
      />

      {/* AI SOC Active Control Command Center */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="space-y-0.5">
            <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest font-mono">Autonomous AI SOC Orchestration &amp; Response Terminal</h3>
            <p className="text-[10px] text-slate-500 font-mono">Fully unified AI native network threat assessment, incident emulation, and real-time mitigation playbooks.</p>
          </div>
          <div className="text-[9px] font-mono text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
            ORCHESTRATOR ONLINE (v4.9.1)
          </div>
        </div>
        <AiSocDashboard />
      </div>

      {/* Grid of 5 Live Connected Platforms */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="space-y-0.5">
            <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest font-mono">CYBERDUDEBIVASH® Unified Platforms &amp; Portals</h3>
            <p className="text-[10px] text-slate-500 font-mono">Direct secure gateways to active corporate sub-nets &amp; public cloud channels.</p>
          </div>
          <div className="text-[9px] font-mono text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            GLOBAL ACTIVE DIRECTORY SYNC
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {ECOSYSTEM_PORTALS.map((portal) => {
            const isPinging = pingingPortalId === portal.id;
            return (
              <div
                key={portal.id}
                className="bg-[#0c1117] border border-slate-800 p-4 rounded-lg flex flex-col justify-between space-y-4 hover:border-cyan-500/50 hover:bg-slate-900/40 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all"></div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{portal.tagline}</span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-900/30 flex items-center gap-1 shrink-0">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                      {portal.responseMs}ms
                    </span>
                  </div>
                  <h4 className="text-xs font-extrabold text-white tracking-wide uppercase group-hover:text-cyan-400 transition-colors">{portal.name}</h4>
                  <p className="text-[10px] text-slate-400 leading-snug">{portal.description}</p>
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 py-1.5 rounded text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    Visit Live <ExternalLink className="w-3 h-3 text-cyan-400" aria-hidden="true" />
                  </a>
                  <button
                    onClick={() => onPortalPing(portal.id, portal.name, portal.url)}
                    className={`w-full py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                      isPinging
                        ? "bg-cyan-950 text-cyan-400 border-cyan-800 animate-pulse"
                        : "bg-slate-950 text-slate-500 border-slate-900 hover:text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    {isPinging ? "Handshaking..." : "Test Connection"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Handshake Logs Terminal */}
      {pingingPortalId && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden animate-fade-in">
          <div className="bg-[#0c1117] px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5 text-cyan-500" />
              <span>Active Telemetry Connection Handshaking Terminal</span>
            </div>
            <button
              onClick={onClosePingTerminal}
              className="text-slate-500 hover:text-slate-300 font-mono text-[10px] uppercase tracking-wider cursor-pointer"
            >
              [Close Terminal]
            </button>
          </div>
          <div className="p-4 font-mono text-[11px] text-slate-450 space-y-1 bg-black/90 select-text max-h-48 overflow-y-auto leading-relaxed">
            {pingLogs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-cyan-600">[{idx + 1}]</span>
                <span className={log.includes("[SUCCESS]") ? "text-emerald-400 font-bold" : log.includes("[ERR]") || log.includes("[WARNING]") ? "text-red-400" : "text-slate-300"}>
                  {log}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ecosystem Discovery Section */}
      <div className="bg-[#0a0d12] border border-slate-800/80 rounded-xl p-5 md:p-6">
        <EcosystemDiscovery onContact={onContact} />
      </div>

      {/* Global Social Intelligence Command Center */}
      <div className="bg-[#0c1117]/60 border border-slate-800/80 rounded-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-900 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest font-mono">Ecosystem Social Intelligence &amp; Gig Channels</h3>
            <p className="text-[10px] text-slate-500 font-mono">Autonomous media outlets, freelancing agency registries, and verified developer coordinates.</p>
          </div>

          <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded border border-slate-900">
            {["All", "Executive", "Social", "Freelance", "Media"].map((cat) => (
              <button
                key={cat}
                onClick={() => onSocialFilterChange(cat)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider transition-all cursor-pointer ${
                  activeSocialFilter === cat
                    ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                    : "text-slate-500 hover:text-slate-300 bg-transparent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SOCIAL_PROFILES.filter(p => activeSocialFilter === "All" || p.category === activeSocialFilter).map((prof, idx) => (
            <div
              key={idx}
              className="bg-slate-950 border border-slate-900 p-3.5 rounded flex flex-col justify-between space-y-3 hover:border-slate-800 hover:bg-slate-900/30 transition-all group"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-cyan-500 bg-cyan-950/50 px-1 py-0.5 rounded border border-cyan-900/30 font-bold uppercase tracking-wider shrink-0">{prof.platform}</span>
                  <span className="text-[8px] font-mono text-slate-650 block uppercase tracking-tight shrink-0">{prof.category}</span>
                </div>
                <h5 className="text-[11px] font-extrabold text-slate-200 truncate">{prof.username}</h5>
                <span className="text-[9px] font-mono text-slate-500 block leading-snug">{prof.metric}</span>
              </div>

              <a
                href={prof.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#0c1117] hover:bg-cyan-500 hover:text-black border border-slate-800 hover:border-cyan-500 text-slate-400 text-[9px] font-mono py-1 rounded uppercase text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                {prof.actionText} <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Live Sentinel Ticker Monitor */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
        <div className="bg-[#0c1117] border-b border-slate-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-widest text-slate-300">
            <Terminal className="w-4 h-4 text-cyan-500" />
            <span>Sentinel APEX™ Event Logger</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
            SIMULATED FEED — SAMPLE EVENTS
          </div>
        </div>
        <div className="p-4 font-mono text-xs text-slate-400 space-y-2 h-56 overflow-y-auto select-text">
          {liveLogs.map((log, index) => (
            <div key={index} className="flex items-baseline gap-3 border-b border-slate-900/40 pb-1.5 last:border-b-0">
              <span className="text-slate-600">{log.time}</span>
              <span className={`px-1 rounded text-[9px] font-bold shrink-0 font-sans tracking-wide uppercase ${
                log.severity === "CRITICAL" ? "bg-red-950/80 text-red-400 border border-red-800/30 animate-pulse" :
                log.severity === "BLOCKED" ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/30" :
                log.severity === "HIGH" ? "bg-orange-950/80 text-orange-400 border border-orange-800/30" :
                "bg-yellow-950/80 text-yellow-400 border border-yellow-800/30"
              }`}>
                {log.severity}
              </span>
              <span className="text-slate-300 truncate">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance badges and certifications bar */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-6 space-y-4">
        <div className="text-center space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-widest font-mono text-slate-400">Compliance &amp; Trust Core</h4>
          <p className="text-[11px] text-slate-500">{COMPLIANCE_DISCLOSURE} <button onClick={() => onNavigate("about")} className="underline hover:text-cyan-400 cursor-pointer">See our compliance statement.</button></p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { title: aligned("iso27001"), col: "text-cyan-400" },
            { title: aligned("soc2"), col: "text-emerald-400" },
            { title: aligned("gdpr"), col: "text-purple-400" },
            { title: aligned("pciDss"), col: "text-amber-500" },
            { title: "India DPDP Act 2023", col: "text-slate-300 font-bold" },
            { title: "MITRE ATT&CK Mapped", col: "text-red-400 font-bold" },
            { title: "OWASP LLM Top 10", col: "text-sky-400" }
          ].map((item, idx) => (
            <SecurityBadge key={idx} label={item.title} colorClassName={item.col} variant="pill-icon" />
          ))}
        </div>
      </div>

      {/* Corporate Transparency & India GSTIN Validator Node */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0c1117]/80 border border-slate-800 p-6 rounded-lg">
        <div className="lg:col-span-7 space-y-4">
          <div className="border-l-4 border-cyan-500 pl-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest font-mono text-cyan-400">Corporate Entity Coordinates &amp; Legal Identity</h4>
            <p className="text-[10px] text-slate-500 font-mono">Government of India official incorporation registry details for CyberDudeBivash Pvt Ltd.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded border border-slate-900/60 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Legal Name (Founder)</span>
              <span className="text-slate-200 font-bold block">{CORPORATE_REGISTRATION.legalName}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded border border-slate-900/60 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Trade / Brand Entity</span>
              <span className="text-cyan-400 font-bold block">{CORPORATE_REGISTRATION.tradeName}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded border border-slate-900/60 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Permanent Account Number (PAN)</span>
              <span className="text-amber-500 font-bold block">{CORPORATE_REGISTRATION.pan}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded border border-slate-900/60 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Government GSTIN ID</span>
              <span className="text-emerald-400 font-bold block">{CORPORATE_REGISTRATION.gstin}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded border border-slate-900/60 space-y-1 sm:col-span-2">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Registered HQ Physical Address</span>
              <span className="text-slate-300 block font-sans leading-normal text-[11px]">{CORPORATE_REGISTRATION.address}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-950 border border-slate-900 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h5 className="text-[11px] font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Verify This Registration Independently
            </h5>
            <p className="text-[10px] text-slate-500 font-sans leading-snug">
              We publish our GSTIN, PAN, and registered address so you can check them yourself against the Government of India's public records, rather than take our word for it.
            </p>
          </div>

          <div className="bg-black border border-slate-800 rounded p-4 space-y-3">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest block">GSTIN to search</span>
              <span className="text-emerald-400 font-bold font-mono text-sm block">{CORPORATE_REGISTRATION.gstin}</span>
            </div>
            <a
              href="https://www.gst.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer"
            >
              Open Official GST Portal <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <p className="text-[9px] text-slate-600 font-sans leading-snug">
              Use "Search Taxpayer" on the GST Portal and enter the GSTIN above to see the live government record.
            </p>
          </div>
        </div>
      </div>

      {/* Gumroad Products Marketplace */}
      <div className="space-y-4">
        <div className="border-l-4 border-cyan-500 pl-3">
          <h3 className="text-xs font-extrabold uppercase tracking-widest font-mono text-slate-400">Cyber Defense Store (Gumroad Kits)</h3>
          <p className="text-[11px] text-slate-500">Directly download production-ready compliance assets, SIGMA rules, and response playbooks.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {premiumProducts.map((p) => {
            const isPurchased = purchasedProduct === p.id;
            return (
              <div key={p.id} className="bg-[#0c1117] border border-slate-800 p-4 rounded-lg flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[11px] font-bold text-slate-200 line-clamp-2">{p.title}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1 py-0.5 rounded border border-emerald-900">{p.price}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">{p.desc}</p>
                </div>
                <button
                  onClick={() => onCheckoutProduct(p)}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                    isPurchased
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center gap-1"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                  }`}
                  id={`gumroad-${p.id}`}
                >
                  {isPurchased ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ordered
                    </>
                  ) : "Checkout"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Company facts */}
      <div className="bg-[#0c1117] border border-slate-800 p-6 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <StatCard variant="plain" value="100+" label="Security Tools & Playbooks" />
        <StatCard variant="plain" value="2020" label="Operating Since" />
        <StatCard variant="plain" value="<15m" label="Target Response SLA" />
        <StatCard variant="plain" value="24×7" label="Automated Monitoring" />
      </div>

    </div>
  );
}
