import React from "react";
import { Terminal, Code, Globe, FileCheck, Shield, RefreshCw, Zap } from "lucide-react";

type AiTab = "log" | "code" | "domain" | "compliance" | "chat";

interface AiViewProps {
  activeAiTab: AiTab;
  analyzerInput: string;
  analyzerLoading: boolean;
  analyzerReport: string;
  onTabChange: (tab: AiTab) => void;
  onInputChange: (value: string) => void;
  onResetTemplate: () => void;
  onAnalyze: (e: React.FormEvent) => void;
}

const TABS = [
  { id: "log" as AiTab, title: "Log File Audit", icon: Terminal },
  { id: "code" as AiTab, title: "SAST Code Scanner", icon: Code },
  { id: "domain" as AiTab, title: "Threat Intel Checker", icon: Globe },
  { id: "compliance" as AiTab, title: "DPDP & SOC2 Auditor", icon: FileCheck },
  { id: "chat" as AiTab, title: "Architect Consultation", icon: Shield },
];

export default function AiView({ activeAiTab, analyzerInput, analyzerLoading, analyzerReport, onTabChange, onInputChange, onResetTemplate, onAnalyze }: AiViewProps) {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
      <div className="space-y-1 border-l-4 border-emerald-500 pl-3">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">AI Security &amp; Compliance Hub</h2>
        <p className="text-xs text-slate-500">Leverage advanced server-side Gemini intelligence models to run static scans, compliance checks, and threat audit calculations.</p>
      </div>

      <div className="bg-[#0c1117] border border-slate-800 rounded-lg flex flex-col overflow-hidden min-h-[480px]">
        {/* Sub tabs */}
        <div className="border-b border-slate-800 bg-slate-950 p-1.5 flex overflow-x-auto gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                activeAiTab === tab.id ? "bg-cyan-950 text-cyan-400 border border-cyan-800/80" : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.title}
            </button>
          ))}
        </div>

        <form onSubmit={onAnalyze} className="flex-1 flex flex-col p-4 md:p-6 gap-6">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Target Payload Input</span>
                <button
                  type="button"
                  onClick={onResetTemplate}
                  className="text-[9px] font-mono text-slate-400 hover:text-cyan-400 border border-slate-800 px-2 py-0.5 rounded bg-slate-950"
                >
                  Reset Template
                </button>
              </div>
              <textarea
                className="flex-1 w-full bg-slate-950 border border-slate-800 rounded p-4 text-xs font-mono text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-500/60 resize-none min-h-[220px]"
                value={analyzerInput}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder="Paste targets or codes here..."
              />
              <button
                type="submit"
                disabled={analyzerLoading || !analyzerInput.trim()}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black py-3 px-4 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer font-sans shadow-md"
              >
                {analyzerLoading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing targets on Active server models...</>
                ) : (
                  <><Zap className="w-4 h-4 fill-black" /> Execute Real AI Security Audit</>
                )}
              </button>
            </div>

            {/* Output */}
            <div className="flex flex-col gap-3 bg-slate-950 rounded border border-slate-800 p-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                  AI Shield Report Terminal
                </span>
                {analyzerLoading && (
                  <span className="text-[9px] font-mono text-cyan-400 animate-pulse uppercase">INGESTING STREAM...</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto text-xs leading-relaxed space-y-4 font-mono text-slate-300 select-text max-h-[360px]">
                {analyzerReport ? (
                  <div className="prose prose-invert prose-xs whitespace-pre-wrap">{analyzerReport}</div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 p-6 space-y-2">
                    <Shield className="w-10 h-10 text-slate-800" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">No Active Audit Compiled</p>
                    <p className="text-[11px] text-slate-600 max-w-xs">Write or edit your input in the left console and click execute to receive verified neural insights.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
