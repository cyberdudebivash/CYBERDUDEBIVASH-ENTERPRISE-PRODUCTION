// Extracted verbatim from App.tsx. Purely presentational — external links
// only, no props needed.
const ECOSYSTEM_LINKS = [
  { label: "Official Website",    url: "https://www.cyberdudebivash.com",               dot: "bg-cyan-500" },
  { label: "Sentinel APEX™",      url: "https://intel.cyberdudebivash.com/",             dot: "bg-red-500" },
  { label: "AI Security Hub",     url: "https://cyberdudebivash.in/",                    dot: "bg-purple-500" },
  { label: "Tools Marketplace",   url: "https://tools.cyberdudebivash.com/",             dot: "bg-amber-500" },
  { label: "Research Blog",       url: "https://blog.cyberdudebivash.in/",               dot: "bg-emerald-500" },
  { label: "Developer Docs",      url: "https://intel.cyberdudebivash.com/api-docs",     dot: "bg-sky-500" },
  { label: "Upgrade Enterprise",  url: "https://intel.cyberdudebivash.com/upgrade.html", dot: "bg-amber-400" },
];

export function EcosystemStrip() {
  return (
    <div className="hidden md:flex items-center gap-0 bg-[#080d12] border-b border-slate-900/80 px-6 py-0 overflow-x-auto">
      <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest pr-3 border-r border-slate-900 mr-1 shrink-0 py-2">Ecosystem</span>
      {ECOSYSTEM_LINKS.map((item) => (
        <a
          key={item.label}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono text-slate-500 hover:text-slate-200 hover:bg-slate-900/40 transition-all border-r border-slate-900 shrink-0 group"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${item.dot} opacity-60 group-hover:opacity-100 transition-opacity`}></span>
          {item.label}
        </a>
      ))}
      <div className="flex-1"></div>
      <a
        href="https://intel.cyberdudebivash.com/upgrade.html"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-[9px] font-mono text-amber-400 bg-amber-950/30 border-l border-amber-900/30 px-3 py-2 hover:bg-amber-950/50 transition-all flex items-center gap-1.5"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
        ENTERPRISE UPGRADE
      </a>
    </div>
  );
}
