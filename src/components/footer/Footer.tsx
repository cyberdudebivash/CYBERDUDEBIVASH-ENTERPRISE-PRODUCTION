import { Phone } from "lucide-react";
import { TrustBadge } from "../badges/TrustBadge";
import { aligned } from "../../constants/ecosystemData";
import type { ViewType } from "../../types/app";

interface FooterProps {
  onNavigate: (view: ViewType) => void;
  onContactClick: () => void;
}

// Extracted verbatim from App.tsx — same markup, same classNames, same data.
export function Footer({ onNavigate, onContactClick }: FooterProps) {
  return (
    <footer className="relative bg-[#020810] border-t-0 overflow-hidden">
      {/* Top gradient accent border */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
      <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-900/40 to-transparent mb-0" />

      {/* Trust badge strip */}
      <div className="bg-[#050c14] border-b border-slate-800/60 py-3 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            { label: aligned("iso27001"), color: "text-cyan-400" },
            { label: aligned("soc2"), color: "text-emerald-400" },
            { label: aligned("gdpr"), color: "text-sky-400" },
            { label: aligned("pciDss"), color: "text-violet-400" },
            { label: "India DPDP Act 2023", color: "text-amber-400" },
            { label: "MITRE ATT&CK Mapped", color: "text-red-400" },
            { label: "OWASP LLM Top 10", color: "text-pink-400" },
          ].map(b => (
            <TrustBadge key={b.label} label={b.label} colorClassName={b.color} variant="dot-text" />
          ))}
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 [&>*]:border-0">

        {/* Brand column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-lg shadow-cyan-900/50">
              <span className="text-white font-black text-sm">C</span>
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide">CyberDudeBivash<span className="text-cyan-400">®</span></div>
              <div className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">ECOSYSTEM V4 · EST. 2020</div>
            </div>
          </div>
          <p className="text-[12px] text-slate-400 leading-relaxed font-sans max-w-xs">
            Autonomous AI-powered cybersecurity defense platform delivering real-time threat intelligence, managed SOC auditing, and 100+ security tools to enterprise teams globally.
          </p>
          {/* Legal registration */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 space-y-1.5">
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Legal Registration</div>
            <div className="text-[11px] text-slate-300 font-mono">CYBERDUDEBIVASH PRIVATE LIMITED</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-[10px] text-slate-500 font-mono">PAN: <span className="text-cyan-400">ARKPN8270G</span></span>
              <span className="text-[10px] text-slate-500 font-mono">GSTIN: <span className="text-cyan-400">21ARKPN8270G1ZP</span></span>
            </div>
            <div className="text-[10px] text-slate-500 font-sans leading-relaxed">
              29, Korai-Sukinda Rd, Ragadi, Jajpur Road, Odisha 755019, India
            </div>
            <a href="tel:+918179881447" className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 pt-0.5">
              <Phone className="w-3 h-3" /> +91 81798 81447
            </a>
            <a href="mailto:bivash@cyberdudebivash.com" className="text-[11px] font-mono text-cyan-400/80 hover:text-cyan-300 transition-colors block">
              bivash@cyberdudebivash.com
            </a>
          </div>
        </div>

        {/* Workspace links */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-cyan-500 border-b border-slate-800 pb-2">Workspace</h4>
          <ul className="space-y-2">
            {[
              { label: "Gateway", view: "home" as const },
              { label: "Sentinel APEX™", view: "intel" as const },
              { label: "AI Hub & Audit", view: "ai" as const },
              { label: "ThreatCore™ Tools", view: "tools" as const },
              { label: "Blog & Academy", view: "blog" as const },
              { label: "REST API", view: "api" as const },
            ].map(l => (
              <li key={l.view}>
                <button onClick={() => onNavigate(l.view)} className="text-[12px] text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer text-left font-sans flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-slate-700 group-hover:bg-cyan-400 transition-colors" />
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Live platforms */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 border-b border-slate-800 pb-2">Live Platforms</h4>
          <ul className="space-y-2">
            {[
              { label: "Official Gateway", url: "https://www.cyberdudebivash.com" },
              { label: "Sentinel APEX™", url: "https://intel.cyberdudebivash.com" },
              { label: "AI Security Hub", url: "https://cyberdudebivash.in" },
              { label: "ThreatCore™ Tools", url: "https://tools.cyberdudebivash.com" },
              { label: "Research Blog", url: "https://blog.cyberdudebivash.in" },
              { label: "Developer APIs", url: "https://cyberdudebivash.in/api" },
            ].map(l => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-slate-400 hover:text-emerald-400 transition-colors font-sans flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-slate-700 group-hover:bg-emerald-400 transition-colors" />
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Enterprise & legal */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-violet-400 border-b border-slate-800 pb-2">Enterprise Services</h4>
          <ul className="space-y-2">
            {[
              { label: "Managed SOC-as-a-Service", view: "soc" as const },
              { label: "DPDP Act Compliance Scans", view: "dpdp" as const },
              { label: "OWASP LLM Red Team", view: "owasp" as const },
              { label: "Multi-Tenant MSSP Suite", view: "mssp" as const },
              { label: "vCISO Advisory", view: "vciso" as const },
              { label: "Penetration Testing", view: "pentest" as const },
            ].map(s => (
              <li key={s.label}>
                <button
                  onClick={() => onNavigate(s.view)}
                  className="text-left w-full text-[11px] text-slate-400 hover:text-violet-300 font-sans flex items-start gap-2 group transition-colors"
                >
                  <span className="w-1 h-1 rounded-full bg-violet-500/60 group-hover:bg-violet-400 mt-1.5 shrink-0 transition-colors" />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={onContactClick}
            className="w-full mt-1 py-1.5 bg-violet-950/40 hover:bg-violet-900/40 border border-violet-800/30 hover:border-violet-600/50 text-violet-400 hover:text-violet-300 text-[10px] font-bold uppercase tracking-wider rounded transition-all"
          >
            Request Enterprise Demo →
          </button>
          <div className="pt-2 space-y-1.5">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800/60 pb-2">Legal</h4>
            {[
              { label: "About Us", view: "about" as const },
              { label: "Privacy Policy", view: "privacy" as const },
              { label: "Terms of Service", view: "terms" as const },
              { label: "Copyright & IP", view: "copyright" as const },
            ].map(l => (
              <button key={l.label} onClick={() => onNavigate(l.view)} className="block text-[11px] text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer text-left font-sans">
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Social row */}
      <div className="border-t border-slate-800/60 bg-[#030912]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            {[
              { label: "LinkedIn", url: "https://linkedin.com/company/cyberdudebivash", color: "hover:text-sky-400" },
              { label: "X / Twitter", url: "https://twitter.com/CDBSENTINELAPEX", color: "hover:text-slate-200" },
              { label: "Instagram", url: "https://instagram.com/cyberdudebivash_official", color: "hover:text-pink-400" },
              { label: "YouTube", url: "https://youtube.com/@CYBERDUDEBIVASHSentinelAPEX", color: "hover:text-red-400" },
              { label: "Medium", url: "https://medium.com/@cyberdudebivash", color: "hover:text-emerald-400" },
              { label: "GitHub", url: "https://github.com/cyberdudebivash", color: "hover:text-violet-400" },
            ].map(s => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                aria-label={`CYBERDUDEBIVASH® on ${s.label} (opens in new tab)`}
                className={`text-[11px] text-slate-500 ${s.color} transition-colors font-sans`}>
                {s.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Secure Engine v4.1
            </span>
            <span className="text-slate-700">|</span>
            <span>NODE: 103.142.12.98</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-black border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
          <div className="text-[10px] text-slate-600 font-mono">
            &copy; {new Date().getFullYear()} CyberDudeBivash Private Limited. All rights reserved.
            &nbsp;&bull;&nbsp;TLP:CLEAR unless otherwise marked.
            &nbsp;&bull;&nbsp;Registered in India under Companies Act 2013.
          </div>
          <div className="text-[10px] text-slate-700 font-mono">SESSION: APEX-9922-BIVASH</div>
        </div>
      </div>
    </footer>
  );
}
