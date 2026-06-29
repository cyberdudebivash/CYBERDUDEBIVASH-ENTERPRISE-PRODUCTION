import { Globe, Terminal, Shield } from "lucide-react";

interface ToolsViewProps {
  toolSubdomainInput: string;
  scoutingActive: boolean;
  scoutLogs: string[];
  scoutResults: { subdomain: string; ip: string; status: number }[];
  toolPortInput: string;
  portScanningActive: boolean;
  portScanLogs: string[];
  portScanResults: { port: number; service: string; state: string }[];
  hashInput: string;
  hashReport: string | null;
  onSubdomainInputChange: (v: string) => void;
  onPortInputChange: (v: string) => void;
  onHashInputChange: (v: string) => void;
  onRunScout: () => void;
  onRunPortScan: () => void;
  onRunHashCheck: () => void;
  onSetBadHash: () => void;
}

export default function ToolsView({
  toolSubdomainInput, scoutingActive, scoutLogs, scoutResults,
  toolPortInput, portScanningActive, portScanLogs, portScanResults,
  hashInput, hashReport,
  onSubdomainInputChange, onPortInputChange, onHashInputChange,
  onRunScout, onRunPortScan, onRunHashCheck, onSetBadHash,
}: ToolsViewProps) {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
      <div className="space-y-1 border-l-4 border-purple-500 pl-3">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">ThreatCore™ Security Tools Portal</h2>
        <p className="text-xs text-slate-500">Access, run, and query 100+ simulated production security tools directly in your workspace sandbox.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Subdomain Scout */}
        <div className="lg:col-span-6 bg-[#0c1117] border border-slate-800 rounded-lg p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-500" />
              Subdomain CT Recon Scout
            </h3>
            <p className="text-[10px] text-slate-500">Brute-force DNS prefix mapping &amp; query Certificate Transparency logs.</p>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={toolSubdomainInput}
                onChange={(e) => onSubdomainInputChange(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500"
                placeholder="e.g. cyberdudebivash.com"
              />
              <button
                onClick={onRunScout}
                disabled={scoutingActive}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-1.5 rounded text-xs font-extrabold uppercase transition-all disabled:opacity-50 cursor-pointer"
              >
                Scout
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-900 rounded p-3 h-48 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1">
              {scoutLogs.length === 0 ? (
                <span className="text-slate-600 block italic">Awaiting target domain input. Click scout to resolve routes.</span>
              ) : scoutLogs.map((log, idx) => <div key={idx} className="truncate">{log}</div>)}
              {scoutResults.length > 0 && (
                <div className="pt-2 mt-2 border-t border-slate-900 space-y-1 text-emerald-400">
                  <div className="font-bold">[RESOLVED SUBDOMAINS]</div>
                  {scoutResults.map((res, idx) => (
                    <div key={idx} className="flex justify-between gap-2">
                      <span>{res.subdomain}</span>
                      <span className="text-slate-500">[{res.ip}] Status {res.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Port Scanner */}
        <div className="lg:col-span-6 bg-[#0c1117] border border-slate-800 rounded-lg p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-purple-400" />
              SYN Port Scanner Probe
            </h3>
            <p className="text-[10px] text-slate-500">Map and probe open industrial ports against target IP host.</p>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={toolPortInput}
                onChange={(e) => onPortInputChange(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500"
                placeholder="e.g. 103.142.12.98"
              />
              <button
                onClick={onRunPortScan}
                disabled={portScanningActive}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-1.5 rounded text-xs font-extrabold uppercase transition-all disabled:opacity-50 cursor-pointer"
              >
                Scan Port
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-900 rounded p-3 h-48 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1">
              {portScanLogs.length === 0 ? (
                <span className="text-slate-600 block italic">Awaiting IP address input. Click scan to map targets.</span>
              ) : portScanLogs.map((log, idx) => <div key={idx} className="truncate">{log}</div>)}
              {portScanResults.length > 0 && (
                <div className="pt-2 mt-2 border-t border-slate-900 space-y-1 text-cyan-400">
                  <div className="font-bold">[PROBED PORT STATUS]</div>
                  {portScanResults.map((res, idx) => (
                    <div key={idx} className="flex justify-between gap-2">
                      <span>PORT {res.port} &bull; {res.service}</span>
                      <span className="text-slate-500">[{res.state}]</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hash Reputation */}
      <div className="bg-[#0c1117] border border-slate-800 rounded-lg p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-500" />
            Malware File Hash Reputation Tracker
          </h3>
          <p className="text-[10px] text-slate-500">Query SHA-256 signatures to check reputation indexes against Cozy Bear, LockBit, or standard dropper databases.</p>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={hashInput}
              onChange={(e) => onHashInputChange(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-4 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500"
              placeholder="Enter SHA-256 target hash"
            />
            <div className="flex gap-2">
              <button
                onClick={onRunHashCheck}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-2 rounded text-xs font-extrabold uppercase transition-all shrink-0 cursor-pointer"
              >
                Check Signature
              </button>
              <button
                onClick={onSetBadHash}
                className="bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 px-3 py-2 rounded text-xs font-mono shrink-0 cursor-pointer"
              >
                Try Bad Hash
              </button>
            </div>
          </div>
          {hashReport && (
            <div className="bg-slate-950 border border-slate-900 rounded p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {hashReport}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
