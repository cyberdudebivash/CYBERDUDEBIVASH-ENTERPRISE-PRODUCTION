import { Globe, Terminal, RefreshCw, Shield, Info } from "lucide-react";
import type { ThreatAlert, CveItem } from "../types/app";

interface IntelViewProps {
  alerts: ThreatAlert[];
  cves: CveItem[];
  loadingFeed: boolean;
  firewallLoad: number;
  scanSpeedHz: number;
  onRefreshFeed: () => void;
  onSelectAlert: (alert: ThreatAlert) => void;
}

function getSeverityBadge(severity: string) {
  const norm = severity.toLowerCase();
  if (norm === "critical") return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-950 text-red-400 border border-red-800 uppercase animate-pulse">CRITICAL</span>;
  if (norm === "high") return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-950 text-orange-400 border border-orange-800 uppercase">HIGH</span>;
  if (norm === "medium") return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-950 text-yellow-400 border border-yellow-800 uppercase">MEDIUM</span>;
  return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-800 uppercase">LOW</span>;
}

export default function IntelView({ alerts, cves, loadingFeed, firewallLoad, scanSpeedHz, onRefreshFeed, onSelectAlert }: IntelViewProps) {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Live Attack Map Simulation */}
        <div className="lg:col-span-8 bg-[#0c1117] border border-slate-800 rounded-lg p-4 flex flex-col justify-between min-h-[380px]">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3">
            <div className="space-y-1">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-500" />
                Live Threat Map Indicator
              </h3>
              <p className="text-[10px] text-slate-500 leading-none">Interactive nodes &bull; Real-time global intercept paths</p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
              SCAN SPEED: {scanSpeedHz} K/sec
            </span>
          </div>

          <div className="flex-1 bg-slate-950/70 border border-slate-900 rounded p-4 relative overflow-hidden flex flex-col justify-center items-center">
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 opacity-[0.03] pointer-events-none">
              {Array.from({ length: 48 }).map((_, i) => <div key={i} className="border border-cyan-500"></div>)}
            </div>
            <div className="absolute top-[20%] left-[20%] text-center">
              <span className="absolute inline-flex h-4 w-4 rounded-full bg-cyan-500/20 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              <span className="block text-[8px] font-mono text-cyan-400 mt-1 uppercase">US-EAST-01</span>
            </div>
            <div className="absolute bottom-[25%] left-[45%] text-center">
              <span className="absolute inline-flex h-5 w-5 rounded-full bg-emerald-500/20 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              <span className="block text-[8px] font-mono text-emerald-400 mt-1 uppercase">HQ_Odisha_IN</span>
            </div>
            <div className="absolute top-[40%] right-[25%] text-center">
              <span className="absolute inline-flex h-6 w-6 rounded-full bg-red-500/20 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              <span className="block text-[8px] font-mono text-red-400 mt-1 uppercase">AP-NORTH-04</span>
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              <line x1="20%" y1="20%" x2="45%" y2="75%" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="5,5" className="animate-[pulse_2s_infinite]" />
              <line x1="75%" y1="40%" x2="45%" y2="75%" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3" />
            </svg>
            <div className="text-center max-w-sm space-y-2 z-10">
              <Shield className="w-10 h-10 text-cyan-500 mx-auto animate-pulse" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Active Scan Core</span>
              <p className="text-xs font-semibold text-slate-300">Sentinel APEX Threat Mapping Operational</p>
              <p className="text-[11px] text-slate-500 leading-normal">Our global sensor network continuously captures, validates, and correlates cyber event streams back to Ragadi, Odisha command center.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-900 text-center font-mono">
            <div><span className="text-xs text-slate-500">Origin: USA</span><span className="block text-xs font-bold text-slate-300 mt-0.5">38 Attacks</span></div>
            <div><span className="text-xs text-slate-500">Origin: Russia</span><span className="block text-xs font-bold text-[#ef4444] mt-0.5">43 Attacks</span></div>
            <div><span className="text-xs text-slate-500">Origin: China</span><span className="block text-xs font-bold text-orange-400 mt-0.5">26 Attacks</span></div>
            <div><span className="text-xs text-slate-500">Defense Index</span><span className="block text-xs font-bold text-emerald-400 mt-0.5">99.98% OK</span></div>
          </div>
        </div>

        {/* Perimeter Status Metrics */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-[#0c1117] border border-slate-800 p-4 rounded-lg flex flex-col justify-between shrink-0">
            <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest mb-3">Defensive Perimeter Metrics</h3>
            <div className="space-y-4">
              {[
                { label: "WAF / Sentinel Load", value: `${firewallLoad}%`, color: "bg-cyan-500", width: `${firewallLoad}%` },
                { label: "AI Model Synchronization", value: "100% SECURE", color: "bg-emerald-500", width: "100%" },
                { label: "Sentinel Threat Vault", value: "OPTIMAL", color: "bg-amber-500", width: "90%" },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between text-[10px] mb-1 font-mono">
                    <span>{m.label}</span>
                    <span className={m.color.replace("bg-", "text-")}>{m.value}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900">
                    <div className={`${m.color} h-full rounded-full transition-all duration-1000`} style={{ width: m.width }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-slate-800 pt-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-2">Global Threat Distribution</h4>
              <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-center">
                <div className="p-1.5 bg-slate-950 border border-slate-900 rounded text-slate-400">US-EAST: OK</div>
                <div className="p-1.5 bg-slate-950 border border-slate-900 rounded text-slate-400 font-bold">EU-WEST: OK</div>
                <div className="p-1.5 bg-slate-950 border border-slate-900 rounded text-emerald-400 font-bold">IN-SOUTH: LIVE</div>
                <div className="p-1.5 bg-slate-950 border border-slate-900 text-red-400 rounded animate-pulse">AP-NORTH: BUSY</div>
              </div>
            </div>
          </div>

          <div className="bg-[#0c1117] border border-slate-800 p-4 rounded-lg flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>Threat Risk Index</span>
                <span className="text-red-400 text-[10px]">P1 CRISIS</span>
              </h3>
              <div className="text-3xl font-extrabold text-[#ef4444] font-mono tracking-tight">7.4 <span className="text-xs text-slate-500">/ 10</span></div>
              <p className="text-[11px] text-slate-400 leading-snug">Multiple high-severity CVE releases on authentication mechanisms have been published. Immediate patch enforcement recommended on enterprise gateways.</p>
            </div>
            <div className="pt-3 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
              Updated: {new Date().toLocaleTimeString()} &bull; NVD NIST Feed
            </div>
          </div>
        </div>
      </div>

      {/* Live Feed + CVE Database */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#0c1117] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-500" />
              Sentinel Live Ingestion Feed
            </h3>
            <button onClick={onRefreshFeed} disabled={loadingFeed} className="text-cyan-500 hover:text-cyan-400 p-1 rounded hover:bg-slate-800 disabled:opacity-50 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFeed ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-[11px] font-mono whitespace-nowrap">
              <thead>
                <tr className="bg-slate-950 text-slate-500 border-b border-slate-800">
                  <th className="p-3 pl-4">ID</th>
                  <th className="p-3">SOURCE IP</th>
                  <th className="p-3">VECTOR TYPE</th>
                  <th className="p-3">RISK LEVEL</th>
                  <th className="p-3 pr-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-900/50 cursor-pointer transition-colors" onClick={() => onSelectAlert(alert)}>
                    <td className="p-3 pl-4 font-bold text-slate-400">{alert.id}</td>
                    <td className="p-3 text-slate-300">{alert.sourceIp}</td>
                    <td className="p-3 text-slate-400 truncate max-w-[180px]">{alert.threatType}</td>
                    <td className="p-3">{getSeverityBadge(alert.severity)}</td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        className="px-2 py-1 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60 hover:bg-cyan-500 hover:text-black hover:border-transparent transition-all"
                        onClick={(e) => { e.stopPropagation(); onSelectAlert(alert); }}
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#0c1117] border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest flex items-center justify-between">
              <span>CVE Intelligence Alert Database</span>
              <span className="bg-red-950 text-red-400 border border-red-900 text-[9px] px-1.5 py-0.5 rounded font-normal font-mono">CVSS 9.0+</span>
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {cves.map((cve) => (
                <div key={cve.id} className="bg-slate-950 p-3 rounded border border-slate-900 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-400 font-mono">{cve.id}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{cve.published}</span>
                  </div>
                  <h4 className="text-[11px] text-slate-200 font-bold leading-tight">{cve.title}</h4>
                  <p className="text-[10px] text-slate-500 font-mono"><span className="text-cyan-500">Mitigation:</span> {cve.mitigation}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-900 text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-4">
            <Info className="w-3.5 h-3.5 text-cyan-500" />
            <span>Cross-referenced against verified CISA KEV listings</span>
          </div>
        </div>
      </div>
    </div>
  );
}
