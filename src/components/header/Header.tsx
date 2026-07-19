import { useState } from "react";
import { Globe, Shield, Cpu, Activity, BookOpen, Key } from "lucide-react";
import { aligned } from "../../constants/ecosystemData";
import type { ViewType, AiTab } from "../../types/app";

interface HeaderProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onContactClick: () => void;
  onOpenAiTab: (tab: AiTab) => void;
  onRunHashCheck: () => void;
}

const SERVICE_ITEMS = [
  { label: "Managed SOC-as-a-Service", view: "soc" as const, desc: "24/7 autonomous monitoring" },
  { label: "DPDP Act Compliance Scans", view: "dpdp" as const, desc: "India data protection audits" },
  { label: "OWASP LLM Red Team Testing", view: "owasp" as const, desc: "Adversarial AI validation" },
  { label: "Multi-Tenant MSSP Suite", view: "mssp" as const, desc: "Client partner command center" },
  { label: "vCISO Advisory Services", view: "vciso" as const, desc: "Executive security governance" },
  { label: "Professional Penetration Testing", view: "pentest" as const, desc: "Full-spectrum pentests" },
];

const SERVICE_VIEWS = SERVICE_ITEMS.map(s => s.view);

// Extracted verbatim from App.tsx. servicesDropdownOpen/solutionsDropdownOpen
// used to live in App.tsx's state despite only ever being read/written here
// — moved to local state since nothing outside this component ever touched
// them (confirmed via full-file search before moving).
export function Header({ currentView, onNavigate, onContactClick, onOpenAiTab, onRunHashCheck }: HeaderProps) {
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [solutionsDropdownOpen, setSolutionsDropdownOpen] = useState(false);

  const solutionsItems = [
    { label: "AI Security Governance", action: () => { onNavigate("ai"); onOpenAiTab("compliance"); }, desc: "OWASP LLM & AI compliance audits" },
    { label: "Threat Intelligence Feeds", action: () => { onNavigate("intel"); }, desc: "Sentinel APEX IOC feed telemetry" },
    { label: "Zero Trust Architecture", action: () => { onNavigate("tools"); onRunHashCheck(); }, desc: "NIST 800-207 design frameworks" },
    { label: "DevSecOps Integration", action: () => { onNavigate("ai"); onOpenAiTab("code"); }, desc: "SAST vulnerability scanners" },
  ];

  const navButtonClass = (active: boolean) =>
    `px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
      active ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
    }`;

  return (
    <header className="flex items-center justify-between px-6 h-16 border-b border-slate-800 bg-[#0c1117] shrink-0 sticky top-0 z-40 shadow-lg shadow-black/40">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate("home")}
          aria-label="CyberDudeBivash Home"
          className="w-10 h-10 bg-cyan-500 rounded flex items-center justify-center text-black font-extrabold text-xl shadow-lg shadow-cyan-500/20 glow-cyan cursor-pointer"
        >
          C
        </button>
        <button className="flex flex-col cursor-pointer text-left" onClick={() => onNavigate("home")} aria-label="Go to Gateway home">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-slate-100">
              CyberDudeBivash<span className="text-cyan-500 font-semibold text-xs ml-0.5">®</span>
            </h1>
            <span className="bg-cyan-950 text-cyan-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-cyan-800">ECOSYSTEM V4</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono tracking-wide leading-none mt-1">
            {aligned("iso27001")} &bull; {aligned("soc2")} &bull; {aligned("dpdp")}
          </span>
        </button>
      </div>

      {/* Global Tabs Navigation Selector */}
      <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-900">
        <button
          onClick={() => onNavigate("home")}
          aria-current={currentView === "home" ? "page" : undefined}
          className={navButtonClass(currentView === "home")}
        >
          <Globe className="w-3.5 h-3.5" aria-hidden="true" /> Gateway
        </button>

        {/* Services Dropdown */}
        <div
          className="relative"
          onMouseEnter={() => setServicesDropdownOpen(true)}
          onMouseLeave={() => setServicesDropdownOpen(false)}
        >
          <button
            aria-haspopup="true"
            aria-expanded={servicesDropdownOpen}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              (SERVICE_VIEWS as readonly ViewType[]).includes(currentView)
                ? "bg-cyan-900/40 text-cyan-400 border border-cyan-800"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-cyan-550" aria-hidden="true" /> Services <span className="text-[8px] opacity-70" aria-hidden="true">▼</span>
          </button>
          {servicesDropdownOpen && (
            <div role="menu" className="absolute top-full left-0 mt-1 w-56 bg-[#0c1117] border border-slate-800 rounded-lg shadow-xl shadow-black/85 p-1.5 z-50 space-y-0.5 animate-slide-up">
              {SERVICE_ITEMS.map((s) => (
                <button
                  key={s.view}
                  role="menuitem"
                  aria-current={currentView === s.view ? "page" : undefined}
                  onClick={() => {
                    onNavigate(s.view);
                    setServicesDropdownOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-900 text-slate-350 hover:text-cyan-400 transition-colors flex flex-col cursor-pointer border-0"
                >
                  <span className="text-xs font-bold font-mono">{s.label}</span>
                  <span className="text-[9px] text-slate-550 leading-none mt-0.5">{s.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Solutions Dropdown */}
        <div
          className="relative"
          onMouseEnter={() => setSolutionsDropdownOpen(true)}
          onMouseLeave={() => setSolutionsDropdownOpen(false)}
        >
          <button
            aria-haspopup="true"
            aria-expanded={solutionsDropdownOpen}
            className="px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-450" aria-hidden="true" /> Solutions <span className="text-[8px] opacity-70" aria-hidden="true">▼</span>
          </button>
          {solutionsDropdownOpen && (
            <div role="menu" className="absolute top-full left-0 mt-1 w-56 bg-[#0c1117] border border-slate-800 rounded-lg shadow-xl shadow-black/85 p-1.5 z-50 space-y-0.5 animate-slide-up">
              {solutionsItems.map((sol, idx) => (
                <button
                  key={idx}
                  role="menuitem"
                  onClick={() => {
                    sol.action();
                    setSolutionsDropdownOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-900 text-slate-350 hover:text-cyan-400 transition-colors flex flex-col cursor-pointer border-0"
                >
                  <span className="text-xs font-bold font-mono">{sol.label}</span>
                  <span className="text-[9px] text-slate-555 leading-none mt-0.5">{sol.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigate("intel")}
          aria-current={currentView === "intel" ? "page" : undefined}
          className={navButtonClass(currentView === "intel")}
        >
          <Activity className="w-3.5 h-3.5" aria-hidden="true" /> Sentinel APEX™
        </button>
        <button
          onClick={() => onNavigate("ai")}
          aria-current={currentView === "ai" ? "page" : undefined}
          className={navButtonClass(currentView === "ai")}
        >
          <Shield className="w-3.5 h-3.5" aria-hidden="true" /> AI Hub &amp; Audit
        </button>
        <button
          onClick={() => onNavigate("tools")}
          aria-current={currentView === "tools" ? "page" : undefined}
          className={navButtonClass(currentView === "tools")}
        >
          <Cpu className="w-3.5 h-3.5" aria-hidden="true" /> ThreatCore™ Tools
        </button>
        <button
          onClick={() => onNavigate("blog")}
          aria-current={currentView === "blog" ? "page" : undefined}
          className={navButtonClass(currentView === "blog")}
        >
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" /> Blog &amp; Academy
        </button>
        <button
          onClick={() => onNavigate("api")}
          aria-current={currentView === "api" ? "page" : undefined}
          className={navButtonClass(currentView === "api")}
        >
          <Key className="w-3.5 h-3.5" aria-hidden="true" /> REST API
        </button>
      </nav>

      <div className="flex items-center gap-4">
        <button
          onClick={onContactClick}
          className="hidden sm:inline-block px-4 py-2 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-black font-extrabold text-xs uppercase tracking-wider rounded transition-all shadow-md shadow-cyan-500/10"
        >
          Request Enterprise SOC
        </button>
        <div className="h-8 w-[1px] bg-slate-800"></div>
        <div className="text-right hidden md:block font-mono">
          <div className="text-[10px] text-slate-500 leading-none">NODE IP</div>
          <div className="text-xs text-slate-300 font-bold mt-1">103.142.12.98</div>
        </div>
      </div>
    </header>
  );
}
