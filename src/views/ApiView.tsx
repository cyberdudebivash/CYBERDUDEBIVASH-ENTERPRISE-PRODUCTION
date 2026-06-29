import { Send } from "lucide-react";
import { ECOSYSTEM_APIS } from "../ecosystemData";

interface ApiViewProps {
  apiKey: string;
  apiConsoleResponse: string;
  activeEcosystemApiIndex: number;
  onRotateKey: () => void;
  onExecuteApi: (idx: number) => void;
}

export default function ApiView({ apiKey, apiConsoleResponse, activeEcosystemApiIndex, onRotateKey, onExecuteApi }: ApiViewProps) {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
      <div className="space-y-1 border-l-4 border-red-500 pl-3">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">Monetization Core™ Rest API Portal</h2>
        <p className="text-xs text-slate-500">Programmatically ingest global threat matrices directly into your local Splunk, Microsoft Sentinel, or IBM QRadar SIEM stack.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Endpoint Registry + API Key */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0c1117] border border-slate-800 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest">Ecosystem Route Registry</h3>
              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-900/30">8 endpoints</span>
            </div>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {ECOSYSTEM_APIS.map((api, idx) => {
                const isSelected = activeEcosystemApiIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => onExecuteApi(idx)}
                    className={`w-full text-left p-2.5 rounded border transition-all flex flex-col space-y-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-cyan-950/50 border-cyan-500/50 text-slate-200"
                        : "bg-slate-950/55 border-slate-900 text-slate-400 hover:border-slate-800 hover:bg-slate-900/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-tight truncate max-w-[200px]">{api.url}</span>
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">{api.responseType}</span>
                    </div>
                    <div className="space-y-0.5">
                      <h5 className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">{api.path}</h5>
                      <p className="text-[9px] text-slate-500 leading-snug line-clamp-1">{api.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[#0c1117] border border-slate-800 p-4 rounded-lg space-y-4">
            <div className="space-y-2">
              <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest">Active API Client Token</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={apiKey}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-400 focus:outline-none"
                />
                <button
                  onClick={onRotateKey}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 px-2.5 py-1.5 rounded text-xs font-mono cursor-pointer"
                >
                  Rotate
                </button>
              </div>
            </div>
            <div className="space-y-2 font-mono text-[10px] text-slate-450">
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span>Access Tier</span>
                <span className="text-emerald-400 font-bold">PRO SUBNET INTEGRITY</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1">
                <span>Rate Limit</span>
                <span>1,000 req / min</span>
              </div>
              <div className="flex justify-between">
                <span>Node Location</span>
                <span className="text-cyan-500">Jajpur, Odisha Hub</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Console */}
        <div className="lg:col-span-7 bg-[#0c1117] border border-slate-800 rounded-lg p-5 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
            <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest">SIEM / Client shell query</span>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              HTTPS SECURE GCM-256
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-900 rounded p-3.5 font-mono text-[10px] text-slate-400 select-text mb-4 leading-relaxed">
            {`curl -X GET \\\n  "https://intel.cyberdudebivash.com${ECOSYSTEM_APIS[activeEcosystemApiIndex]?.url || "/api"}" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json"`}
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Response Output Console</span>
            <button
              onClick={() => onExecuteApi(activeEcosystemApiIndex)}
              className="bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
            >
              <Send className="w-3 h-3" /> Execute Request
            </button>
          </div>

          <div className="flex-1 bg-slate-950 border border-slate-900 rounded p-4 font-mono text-[11px] text-emerald-400 select-text overflow-y-auto max-h-[380px] whitespace-pre-wrap leading-relaxed">
            {apiConsoleResponse}
          </div>
        </div>
      </div>
    </div>
  );
}
