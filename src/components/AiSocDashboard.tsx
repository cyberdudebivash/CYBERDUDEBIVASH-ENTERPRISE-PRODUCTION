import React, { useState, useEffect, useRef } from "react";
import {
  Shield, Activity, Cpu, Terminal, AlertTriangle, CheckCircle2,
  Send, Globe, RefreshCw, Lock, FileCheck, Zap, Server, Download,
  Copy, Search, MessageSquare, Sparkles, Volume2, VolumeX, Check,
  X, Radio, TrendingUp, Eye, Wifi
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CORPORATE_REGISTRATION } from "../ecosystemData";

interface LogItem {
  id: number;
  timestamp: string;
  category: "ALERT" | "MITIGATION" | "SYSTEM" | "INFO";
  msg: string;
  source: string;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

// ─── LIVE CLOCK ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString("en-IN", { hour12: false }));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("en-IN", { hour12: false })), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-cyan-400 tabular-nums">{time}</span>;
}

// ─── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, accent, barPct
}: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; accent: string; barPct: number;
}) {
  const barColors: Record<string, string> = {
    cyan:   "bg-cyan-500",
    emerald:"bg-emerald-500",
    purple: "bg-purple-500",
    amber:  "bg-amber-500",
    red:    "bg-red-500",
  };
  const textColors: Record<string, string> = {
    cyan:   "text-cyan-400",
    emerald:"text-emerald-400",
    purple: "text-purple-400",
    amber:  "text-amber-400",
    red:    "text-red-400",
  };
  const borderColors: Record<string, string> = {
    cyan:   "border-cyan-500/20 hover:border-cyan-500/50",
    emerald:"border-emerald-500/20 hover:border-emerald-500/50",
    purple: "border-purple-500/20 hover:border-purple-500/50",
    amber:  "border-amber-500/20 hover:border-amber-500/50",
    red:    "border-red-500/20 hover:border-red-500/50",
  };
  const subBg: Record<string, string> = {
    cyan:   "bg-cyan-950/60 text-cyan-400 border-cyan-900/40",
    emerald:"bg-emerald-950/60 text-emerald-400 border-emerald-900/40",
    purple: "bg-purple-950/60 text-purple-400 border-purple-900/40",
    amber:  "bg-amber-950/60 text-amber-400 border-amber-900/40",
    red:    "bg-red-950/60 text-red-400 border-red-900/40",
  };

  return (
    <div className={`relative bg-[#080d14] border ${borderColors[accent]} rounded-xl p-4 flex flex-col justify-between gap-3 overflow-hidden group transition-all duration-300`}>
      {/* Subtle corner glow */}
      <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity ${barColors[accent]}`}></div>

      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">{label}</span>
          <div className={`text-lg font-extrabold font-mono ${textColors[accent]} flex items-center gap-1.5 leading-tight`}>
            <span className={`${textColors[accent]} opacity-70`}>{icon}</span>
            {value}
          </div>
        </div>
        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${subBg[accent]}`}>
          {sub}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 h-1 bg-slate-900 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColors[accent]} rounded-full transition-all duration-1000`}
          style={{ width: `${barPct}%` }}
        ></div>
      </div>
    </div>
  );
}

// ─── LOG BADGE ──────────────────────────────────────────────────────────────────
function LogBadge({ cat }: { cat: "ALERT" | "MITIGATION" | "SYSTEM" | "INFO" }) {
  const map = {
    ALERT:      "bg-red-950 text-red-400 border-red-800/50",
    MITIGATION: "bg-emerald-950 text-emerald-400 border-emerald-800/50",
    SYSTEM:     "bg-purple-950 text-purple-400 border-purple-800/50",
    INFO:       "bg-slate-900 text-slate-400 border-slate-800/50",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border shrink-0 ${map[cat]}`}>
      {cat}
    </span>
  );
}

// ─── RISK RING ───────────────────────────────────────────────────────────────
function RiskRing({ score }: { score: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const fill = circ - (circ * score) / 100;
  const color = score >= 90 ? "#ef4444" : score >= 70 ? "#f97316" : "#22c55e";

  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={fill}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)", filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold font-mono" style={{ color }}>{score}%</span>
        <span className="text-[8px] font-mono text-slate-500 uppercase">Risk</span>
      </div>
    </div>
  );
}

// ─── COMPLIANCE PROGRESS ─────────────────────────────────────────────────────
function ComplianceBar({ score, accent }: { score: number; accent: string }) {
  const colors: Record<string, string> = {
    cyan:   "from-cyan-500 to-sky-400",
    emerald:"from-emerald-500 to-green-400",
    amber:  "from-amber-500 to-yellow-400",
    red:    "from-red-500 to-orange-400",
  };
  const tiers = score >= 80 ? "EXCELLENT" : score >= 50 ? "INTERMEDIATE" : "AT RISK";
  const tierColor = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-400">{score}%</span>
        <span className={`font-bold ${tierColor}`}>{tiers}</span>
      </div>
      <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colors[accent]} rounded-full transition-all duration-1000`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
let _logSeq = 100;

export function AiSocDashboard() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState<"ddos" | "ransomware" | "zero_day" | null>(null);
  const [packetCount, setPacketCount] = useState(3_421_102);
  const [mitigationRate, setMitigationRate] = useState(99.98);
  const [liveScore, setLiveScore] = useState(98);
  const [logsPaused, setLogsPaused] = useState(false);
  const [logFilter, setLogFilter] = useState<"ALL" | "ALERT" | "MITIGATION" | "SYSTEM">("ALL");
  const [logSearch, setLogSearch] = useState("");
  const [socLogs, setSocLogs] = useState<LogItem[]>([
    { id: _logSeq++, timestamp: "08:30:12", category: "SYSTEM",     msg: "AI SOC Central Ingestion Engine (CDB-Central-v4) initiated successfully.", source: "Core Node" },
    { id: _logSeq++, timestamp: "08:30:14", category: "SYSTEM",     msg: "Establishing trust handshake tunnels with global sub-nets.", source: "DNS Guard" },
    { id: _logSeq++, timestamp: "08:30:15", category: "INFO",       msg: "Synchronized with active Sentinel APEX real-time block registry.", source: "Sentinel Ingestion" },
    { id: _logSeq++, timestamp: "08:30:19", category: "MITIGATION", msg: "Inbound SSH connection request from port-scanner source flagged and rate-limited.", source: "WAF Proxy" },
    { id: _logSeq++, timestamp: "08:30:24", category: "ALERT",      msg: "Brute-force query threshold exceeded on port 22 from 185.220.101.4.", source: "IP Filter" },
  ]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([{
    sender: "ai",
    text: "Hello! I am the CyberDude AI Security Copilot. I can assist you with real-time log analysis, threat modeling, security compliance, or generating custom mitigation rulesets. Ask me anything or select a quick query below!",
    timestamp: new Date().toLocaleTimeString()
  }]);
  const [chatInput, setChatInput] = useState("");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [targetInput, setTargetInput] = useState("185.220.101.4");
  const [hunterType, setHunterType] = useState<"ip" | "domain" | "hash">("ip");
  const [hunterResult, setHunterResult] = useState<any>(null);
  const [hunterRunning, setHunterRunning] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const [selectedFramework, setSelectedFramework] = useState<"dpdp" | "iso" | "soc2">("dpdp");
  const [complianceControls, setComplianceControls] = useState({
    dpdp: [
      { id: "dpdp_1", title: "Verify corporate legal entity coordinates on common registers", status: true,  score: 20 },
      { id: "dpdp_2", title: "Publish clear, readable bilingual privacy disclosure policies",  status: true,  score: 20 },
      { id: "dpdp_3", title: "Enforce user opt-out controls for tracking and cookies",          status: true,  score: 15 },
      { id: "dpdp_4", title: "Appoint designated Data Protection Officer (DPO) contacts",      status: false, score: 15 },
      { id: "dpdp_5", title: "Configure automated Data Principal Erasure request pipelines",   status: false, score: 15 },
      { id: "dpdp_6", title: "Secure active incident response and breach warning procedures",  status: false, score: 15 },
    ],
    iso: [
      { id: "iso_1", title: "Establish and review Information Security Management guidelines",     status: true,  score: 15 },
      { id: "iso_2", title: "Mandate organizational roles, responsibilities & security training",  status: true,  score: 15 },
      { id: "iso_3", title: "Configure active firewalls and TLS 1.3 edge proxy protections",      status: true,  score: 20 },
      { id: "iso_4", title: "Enforce MFA and rotate REST API access tokens dynamically",          status: true,  score: 15 },
      { id: "iso_5", title: "Implement continuous dependency vulnerability analysis webhooks",    status: false, score: 20 },
      { id: "iso_6", title: "Perform scheduled static audit sweeps of repository codebases",     status: false, score: 15 },
    ],
    soc2: [
      { id: "soc2_1", title: "Establish zero-trust authentication checks across services",          status: true,  score: 20 },
      { id: "soc2_2", title: "Continuous log collection and monitoring of network entry-points",    status: true,  score: 20 },
      { id: "soc2_3", title: "Dynamic rate-limiting to protect API routing availability",           status: true,  score: 15 },
      { id: "soc2_4", title: "Enforce encryption of personal data both in transit and at rest",    status: true,  score: 15 },
      { id: "soc2_5", title: "Establish incident reporting runbooks with dynamic PDF alerts",       status: false, score: 15 },
      { id: "soc2_6", title: "Maintain separate sandbox, testing, and production subnets",         status: false, score: 15 },
    ],
  });

  const calcScore = (fw: "dpdp" | "iso" | "soc2") => {
    const c = complianceControls[fw];
    const total = c.reduce((a, x) => a + x.score, 0);
    const done  = c.reduce((a, x) => a + (x.status ? x.score : 0), 0);
    return Math.round((done / total) * 100);
  };

  const toggleControl = (fw: "dpdp" | "iso" | "soc2", id: string) => {
    setComplianceControls(prev => ({
      ...prev,
      [fw]: prev[fw].map(c => c.id === id ? { ...c, status: !c.status } : c)
    }));
    playTickAudio();
  };

  // ─── AUDIO ──────────────────────────────────────────────────────────────────
  const playTickAudio = () => {
    if (!audioEnabled) return;
    try {
      const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = "sine"; osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.05, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
    } catch (_) {}
  };
  const playAlertAudio = (freq = 150) => {
    if (!audioEnabled) return;
    try {
      const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = "sawtooth"; osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.3);
      g.gain.setValueAtTime(0.08, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch (_) {}
  };

  // ─── AUTOSCROLL ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (logContainerRef.current)
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [socLogs]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, aiAnalyzing]);

  // ─── LOG TICK ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (logsPaused) return;
      setPacketCount(prev => prev + Math.floor(Math.random() * 15) + 3);
      const cats: ("ALERT" | "MITIGATION" | "SYSTEM" | "INFO")[] = ["ALERT", "MITIGATION", "SYSTEM", "INFO"];
      const cat = cats[Math.floor(Math.random() * cats.length)];
      const ips = ["185.220.101.99", "45.146.164.22", "109.238.10.15", "91.240.118.5", "104.22.4.88"];
      const targets = ["Odisha-Mainframe", "WAF-Edge-Node", "CyberDude-API-Endpoint", "Auth-Token-DB"];
      const ip  = ips[Math.floor(Math.random() * ips.length)];
      const tgt = targets[Math.floor(Math.random() * targets.length)];
      const msgs: Record<typeof cat, string> = {
        ALERT:      `[WARNING] Extreme payload query detected from IP ${ip} targeting ${tgt}.`,
        MITIGATION: `[SUCCESS] Null-route firewall rule enforced on source IP ${ip}. latency: 8ms.`,
        SYSTEM:     `[SYSTEM] Rotated central telemetry credentials for node segment Jajpur_HQ.`,
        INFO:       `[TELEMETRY] Dynamic layer-7 rate-limiting applied across secure infrastructure sub-nets.`,
      };
      if (cat === "ALERT") playAlertAudio(220);
      setSocLogs(prev => {
        const entry: LogItem = { id: _logSeq++, timestamp: new Date().toLocaleTimeString(), category: cat, msg: msgs[cat], source: "Ingestion Core" };
        return [...prev, entry].slice(-60);
      });
      setMitigationRate(prev => parseFloat(Math.min(100, Math.max(99.8, prev + (Math.random() - 0.5) * 0.02)).toFixed(2)));
      setLiveScore(prev => Math.min(100, Math.max(95, prev + (Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0))));
    }, 2500);
    return () => clearInterval(interval);
  }, [logsPaused, audioEnabled]);

  // ─── SIMULATIONS ────────────────────────────────────────────────────────────
  const addLog = (cat: LogItem["category"], msg: string, src: string) =>
    setSocLogs(prev => [...prev, { id: _logSeq++, timestamp: new Date().toLocaleTimeString(), category: cat, msg, source: src }]);

  const runIncidentSimulation = (type: "ddos" | "ransomware" | "zero_day") => {
    setActiveSimulation(type); playAlertAudio(440);
    if (type === "ddos") {
      addLog("ALERT",      "[INCIDENT_SIMULATOR] Launching High-Volume DDoS Simulation (35k Bots/sec).",     "Simulator Node");
      addLog("SYSTEM",     "[INCIDENT_SIMULATOR] Packet buffer load spikes to 950%. CPU core temp elevates.", "Telemetry Sensor");
      addLog("MITIGATION", "[AUTO-RECOVERY] AI Scrubber Core: Initiating progressive cluster rate-limiting.", "AI Orchestrator");
      let cycles = 0;
      const t = setInterval(() => {
        setPacketCount(prev => prev + Math.floor(Math.random() * 3200) + 1600);
        setMitigationRate(prev => parseFloat(Math.max(98.5, prev - 0.15).toFixed(2)));
        if (++cycles === 8) { clearInterval(t); setMitigationRate(99.98); setActiveSimulation(null); addLog("MITIGATION", "[INCIDENT_SIMULATOR] Simulation completed. 100.0% traffic normalized.", "AI Orchestrator"); }
      }, 600);
    } else if (type === "ransomware") {
      addLog("ALERT",      "[INCIDENT_SIMULATOR] Simulated crypto-encryptor file-system activity captured in /var/db/storage.", "Host Shield");
      addLog("ALERT",      "[INCIDENT_SIMULATOR] Signature matched: LockBit-2026 registry write attempts.", "Host Shield");
      addLog("MITIGATION", "[AUTO-RECOVERY] Threat Sentinel: Isolating affected subnet segment DB_STORE_03 in 1.4ms.", "Orchestrator");
      setTimeout(() => { setActiveSimulation(null); addLog("MITIGATION", "[INCIDENT_SIMULATOR] Host isolated, snapshot rollback complete. Data integrity 100%.", "Host Shield"); }, 4000);
    } else {
      addLog("ALERT",      "[INCIDENT_SIMULATOR] Capture zero-day Chrome/V8 buffer overflow attempt (CVE-2026-XPL).", "RASP Agent");
      addLog("SYSTEM",     "[INCIDENT_SIMULATOR] Generating high-entropy polymorphic dynamic patch overlay.", "CDB-Neural Agent");
      addLog("MITIGATION", "[AUTO-RECOVERY] RASP patch injected directly in virtual machine memory block.", "RASP Agent");
      setTimeout(() => { setActiveSimulation(null); addLog("MITIGATION", "[INCIDENT_SIMULATOR] Buffer vulnerability shielded. Malicious origin banned permanently.", "WAF Proxy"); }, 4000);
    }
  };

  // ─── AI COPILOT ─────────────────────────────────────────────────────────────
  const submitCopilotChat = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery || chatInput;
    if (!query.trim() || aiAnalyzing) return;
    setChatHistory(prev => [...prev, { sender: "user", text: query, timestamp: new Date().toLocaleTimeString() }]);
    if (!customQuery) setChatInput("");
    setAiAnalyzing(true); playTickAudio();
    try {
      const res = await fetch("/api/security/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "chat", content: query }) });
      if (res.ok) {
        const d = await res.json();
        setChatHistory(prev => [...prev, { sender: "ai", text: d.report || "No response received.", timestamp: new Date().toLocaleTimeString() }]);
      } else throw new Error();
    } catch {
      setChatHistory(prev => [...prev, { sender: "ai", text: "⚠️ **Connection Timeout**: The AI model is processing high quantities of security threats.\n\n**Offline Recommendation:** Secure endpoints with strict rate limiting, audit external domain logs regularly, and maintain active key rotators.", timestamp: new Date().toLocaleTimeString() }]);
    } finally { setAiAnalyzing(false); }
  };
  const triggerQuickPrompt = (q: string) => submitCopilotChat(undefined, q);

  // ─── THREAT HUNTER ───────────────────────────────────────────────────────────
  const executeThreatHunter = (e: React.FormEvent) => {
    e.preventDefault(); setHunterRunning(true); setHunterResult(null); playTickAudio();
    const target = targetInput.trim();
    setTimeout(() => {
      if (hunterType === "ip") {
        setHunterResult({ query: target, classification: "CRITICAL_MALICIOUS_BOTNET_IP", riskScore: 98, threatGroup: "APT-29 (Cozy Bear campaign)", family: "Mirai polymorphic DDoS malware", origin: "NL (Amsterdam Tor Exit Edge Router)", openPorts: "22, 80, 443, 8080", shellCommand: `iptables -A INPUT -s ${target} -p tcp --dport 22 -j DROP`, nginxCode: `deny ${target};`, mitreRef: "T1110 (Brute Force), T1059.001 (PowerShell)", advice: "Perform active network segment isolation immediately." });
      } else if (hunterType === "domain") {
        setHunterResult({ query: target, classification: "HIGH_PHISHING_RECON_PORTAL", riskScore: 89, threatGroup: "Scattered Spider affiliate", family: "RedLine Information Stealer Loader", origin: "RU (Saint Petersburg hosting block)", openPorts: "80, 443", shellCommand: `dig +short ${target} | xargs -I {} iptables -A INPUT -s {} -j DROP`, nginxCode: `if ($http_referer ~* (${target})) { return 403; }`, mitreRef: "T1566 (Phishing), T1583 (Acquire Infrastructure)", advice: "Sinkhole query vectors inside company routers." });
      } else {
        setHunterResult({ query: target, classification: "CRITICAL_RANSOMWARE_SHA256", riskScore: 100, threatGroup: "LockBit 3.0 Ransomware Collective", family: "LockBit encryption compiler variant V3", origin: "Distributed (CDN file mirror server)", openPorts: "None (Executed locally)", shellCommand: `rule CyberDude_Block {\n    meta:\n        hash = "${target.slice(0,20)}..."\n    strings:\n        $header = { 4D 5A 90 00 }\n    condition: $header at 0\n}`, nginxCode: `WAF_RULE_SHA256_DENY="${target.slice(0,20)}..."`, mitreRef: "T1486 (Data Encrypted for Impact), T1027 (Obfuscated Files)", advice: "Deploy endpoint protection rules immediately." });
      }
      setHunterRunning(false);
      addLog("MITIGATION", `[THREAT_HUNTER] Audited ${target}. Flagged hazard level: ${hunterType === "hash" ? 100 : 98}%.`, "Intel Engine");
    }, 1200);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text); setCopiedText(id); playTickAudio();
    setTimeout(() => setCopiedText(null), 2000);
  };
  const downloadScript = (name: string, content: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    playTickAudio();
  };

  const filteredLogs = socLogs.filter(l =>
    (logFilter === "ALL" || l.category === logFilter) &&
    (l.msg.toLowerCase().includes(logSearch.toLowerCase()) || l.source.toLowerCase().includes(logSearch.toLowerCase()))
  );

  const dpdpScore = calcScore("dpdp");
  const isoScore  = calcScore("iso");
  const soc2Score = calcScore("soc2");
  const fwScore   = calcScore(selectedFramework);
  const fwAccent  = selectedFramework === "dpdp" ? "cyan" : selectedFramework === "iso" ? "emerald" : "purple";

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ── COMMAND CENTER HEADER ─────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-xl border ${activeSimulation ? "alert-flash" : "border-cyan-500/15"} bg-[#060b12] bg-cyber-grid`}>
        {/* Top accent strip */}
        <div className={`h-0.5 w-full ${activeSimulation ? "bg-gradient-to-r from-red-500 via-orange-400 to-red-500 animate-pulse" : "bg-gradient-to-r from-cyan-500/0 via-cyan-500/80 to-cyan-500/0"}`}></div>

        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-3">
            {/* Animated shield icon */}
            <div className="relative shrink-0">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeSimulation ? "bg-red-950/80 border border-red-700" : "bg-cyan-950/80 border border-cyan-700/40"}`}>
                <Shield className={`w-5 h-5 ${activeSimulation ? "text-red-400 animate-pulse" : "text-cyan-400"}`} />
              </div>
              <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${activeSimulation ? "bg-red-500 animate-ping" : "bg-emerald-500 animate-pulse"}`}></span>
            </div>

            <div>
              <h2 className="text-sm font-extrabold font-mono tracking-widest uppercase text-white flex items-center gap-2 flex-wrap">
                {activeSimulation ? (
                  <span className="text-red-400 animate-pulse">⚠ INCIDENT SIMULATION ACTIVE — {activeSimulation.toUpperCase().replace("_", " ")}</span>
                ) : (
                  <>
                    <span className="text-gradient-cyber">CYBERDUDEBIVASH®</span>
                    <span className="text-slate-400 font-normal text-xs">AI CYBERSECURITY COMMAND CENTER</span>
                  </>
                )}
              </h2>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                End-to-end autonomous AI SOC — Jajpur, Odisha, India &bull; Node: <span className="text-cyan-400">103.142.12.98</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Live clock */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-slate-500">
              <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
              <LiveClock />
              <span className="text-slate-600">IST</span>
            </div>

            <button
              onClick={() => setAudioEnabled(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${audioEnabled ? "bg-cyan-950/80 text-cyan-400 border-cyan-700/50" : "bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700"}`}
            >
              {audioEnabled ? <><Volume2 className="w-3.5 h-3.5" /> Audio: ON</> : <><VolumeX className="w-3.5 h-3.5" /> Audio: OFF</>}
            </button>

            <button
              onClick={() => setLogsPaused(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${logsPaused ? "bg-amber-950/80 text-amber-400 border-amber-700/50" : "bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700"}`}
            >
              <Activity className={`w-3.5 h-3.5 ${logsPaused ? "" : "animate-pulse"}`} />
              {logsPaused ? "PAUSED" : "LIVE"}
            </button>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="System Security Index"   value={`${liveScore}% STABLE`}               sub="OPTIMAL"                    icon={<Shield className="w-4 h-4" />}        accent="cyan"    barPct={liveScore} />
        <StatCard label="Mitigated Data Packets"  value={packetCount.toLocaleString()}          sub={`${mitigationRate}% SCRUBBED`} icon={<Zap className="w-4 h-4" />}          accent="emerald" barPct={mitigationRate} />
        <StatCard label="Neural Signatures Active" value="814,212 sets"                          sub="AUTO-SYNC"                  icon={<Server className="w-4 h-4" />}        accent="purple"  barPct={82} />
        <StatCard label="Active Threat Level"     value={activeSimulation ? "CRITICAL RISK" : "ELEVATED"} sub={activeSimulation ? "MITIGATING" : "SAFEGUARDED"} icon={<AlertTriangle className="w-4 h-4" />} accent={activeSimulation ? "red" : "amber"} barPct={activeSimulation ? 95 : 60} />
      </div>

      {/* ── MAP + LOG FEED ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Global Threat Map */}
        <div className="lg:col-span-7 bg-[#080d14] border border-slate-800/60 rounded-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-800/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold font-mono text-white uppercase tracking-widest">Live Ingress Threat Mitigation Map</span>
            </div>
            <div className="flex items-center gap-3">
              {activeSimulation && (
                <span className="text-[9px] font-mono text-red-400 bg-red-950/80 border border-red-800/40 px-2 py-0.5 rounded animate-pulse font-bold uppercase">
                  SIMULATION ACTIVE
                </span>
              )}
              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded hidden sm:inline">
                NODES: ONLINE
              </span>
            </div>
          </div>

          {/* SVG Map */}
          <div className="relative bg-[#040810] flex-1 min-h-[280px] overflow-hidden scanline-overlay">
            {/* Cyber grid */}
            <div className="absolute inset-0 bg-cyber-grid opacity-50"></div>

            <svg viewBox="0 0 800 380" className="w-full h-full opacity-50 select-none absolute inset-0" xmlns="http://www.w3.org/2000/svg">
              {/* Continent fills */}
              <path d="M 80 120 Q 130 85 170 105 T 210 138 T 255 115 T 285 148 T 245 218 T 172 248 T 128 178 Z" fill="#0f1a2e" stroke="#1e293b" strokeWidth="0.5"/>
              <path d="M 315 78 Q 358 38 400 58 T 452 108 T 524 78 T 582 138 T 542 218 T 482 278 T 362 210 Z" fill="#0f1a2e" stroke="#1e293b" strokeWidth="0.5"/>
              <path d="M 582 178 Q 645 148 685 188 T 742 252 T 702 318 T 622 280 Z" fill="#0f1a2e" stroke="#1e293b" strokeWidth="0.5"/>
              <path d="M 178 278 Q 212 258 242 288 T 282 338 T 222 378 T 162 330 Z" fill="#0f1a2e" stroke="#1e293b" strokeWidth="0.5"/>
              {/* Lat/Long grid */}
              {[100, 190, 280].map(y => <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#0c1829" strokeWidth="1" strokeDasharray="6,6"/>)}
              {[200, 400, 600].map(x => <line key={x} x1={x} y1="0" x2={x} y2="380" stroke="#0c1829" strokeWidth="1" strokeDasharray="6,6"/>)}

              {/* HQ — Odisha, India */}
              <g>
                <circle cx="515" cy="185" r="22" fill="#06b6d4" fillOpacity="0.06" className="ping-slow"/>
                <circle cx="515" cy="185" r="14" fill="#06b6d4" fillOpacity="0.10" className="ping-slow2"/>
                <circle cx="515" cy="185" r="6" fill="#22c55e" filter="url(#glow-hq)"/>
                <text x="526" y="190" fill="#22c55e" fontSize="9" fontFamily="monospace" fontWeight="bold">HQ_ODISHA_IN</text>
              </g>

              {/* Botnet US */}
              <g>
                <circle cx="148" cy="128" r="4" fill="#ef4444"/>
                <text x="105" y="116" fill="#ef4444" fontSize="8" fontFamily="monospace">BOTNET_US-E1</text>
                <path d="M 148 128 Q 330 75 515 185" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,5" className="animate-[dash_5s_linear_infinite]" opacity="0.7"/>
              </g>
              {/* APT Russia */}
              <g>
                <circle cx="445" cy="68" r="4" fill="#f97316"/>
                <text x="452" y="65" fill="#f97316" fontSize="8" fontFamily="monospace">APT_BLOC_RU</text>
                <path d="M 445 68 Q 480 115 515 185" fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="5,4" className="animate-[dash_3s_linear_infinite]" opacity="0.7"/>
              </g>
              {/* TOR Exit NL */}
              <g>
                <circle cx="382" cy="92" r="4" fill="#f59e0b"/>
                <text x="310" y="91" fill="#f59e0b" fontSize="8" fontFamily="monospace">TOR_EXIT_NL</text>
                <path d="M 382 92 Q 448 118 515 185" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,4" className="animate-[dash_4s_linear_infinite]" opacity="0.7"/>
              </g>
              {/* China */}
              <g>
                <circle cx="630" cy="130" r="3.5" fill="#a855f7"/>
                <text x="638" y="128" fill="#a855f7" fontSize="8" fontFamily="monospace">CN_APT</text>
                <path d="M 630 130 Q 580 160 515 185" fill="none" stroke="#a855f7" strokeWidth="1.2" strokeDasharray="4,4" className="animate-[dash_6s_linear_infinite]" opacity="0.6"/>
              </g>

              <defs>
                <filter id="glow-hq">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
            </svg>

            {/* Scan sweep line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent animate-[scan-h_5s_linear_infinite] pointer-events-none"></div>

            {/* HUD tooltip bottom-left */}
            <div className="absolute bottom-3 left-3 glass-card border border-slate-700/50 p-2.5 rounded-lg text-[10px] font-mono shadow-xl max-w-[200px] space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> ACTIVE DEFENSE
              </div>
              <div className="text-slate-500 space-y-0.5">
                <div>HQ Node IP: <span className="text-slate-200">103.142.12.98</span></div>
                <div>Filter Latency: <span className="text-cyan-400">11.8ms</span></div>
              </div>
            </div>

            {/* Attack stats bottom-right */}
            <div className="absolute bottom-3 right-3 glass-card border border-slate-700/50 p-2 rounded-lg text-[9px] font-mono space-y-1 text-right">
              <div><span className="text-slate-500">USA →</span> <span className="text-red-400 font-bold">38 blocked</span></div>
              <div><span className="text-slate-500">RU →</span> <span className="text-orange-400 font-bold">43 blocked</span></div>
              <div><span className="text-slate-500">CN →</span> <span className="text-purple-400 font-bold">26 blocked</span></div>
              <div><span className="text-slate-500">Defense:</span> <span className="text-emerald-400 font-bold">99.98%</span></div>
            </div>

            {activeSimulation && (
              <div className="absolute inset-0 bg-red-950/15 border-2 border-red-500/30 pointer-events-none flex items-center justify-center">
                <div className="glass-card border border-red-700/50 text-red-400 px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-widest uppercase animate-pulse">
                  ⚠ SIMULATING THREAT VECTORS
                </div>
              </div>
            )}
          </div>

          {/* Playbook buttons */}
          <div className="px-5 py-4 border-t border-slate-800/50 space-y-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">Inject Real-time Threat Playbooks</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "ddos" as const,      label: "Simulate DDoS",      color: "text-red-400    border-red-900/50    hover:border-red-500    hover:bg-red-950/20" },
                { type: "ransomware" as const, label: "Simulate Ransomware", color: "text-orange-400 border-orange-900/50 hover:border-orange-500 hover:bg-orange-950/20" },
                { type: "zero_day" as const,   label: "Inject Zero-Day",    color: "text-cyan-400   border-cyan-900/50   hover:border-cyan-500   hover:bg-cyan-950/20" },
              ].map(btn => (
                <button
                  key={btn.type}
                  onClick={() => runIncidentSimulation(btn.type)}
                  disabled={activeSimulation !== null}
                  className={`bg-slate-950 border py-2 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 ${btn.color}`}
                >
                  <Radio className="w-3 h-3" /> {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Console Log Feed */}
        <div className="lg:col-span-5 bg-[#080d14] border border-slate-800/60 rounded-xl flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800/60 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold font-mono text-white uppercase tracking-widest">Live Event Ingestion</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-mono text-emerald-400">LIVE</span>
              <button
                onClick={() => setSocLogs([{ id: _logSeq++, timestamp: new Date().toLocaleTimeString(), category: "SYSTEM", msg: "Telemetry log buffer cleared.", source: "Terminal" }])}
                className="text-[9px] font-mono text-slate-500 hover:text-red-400 uppercase cursor-pointer transition-colors"
              >
                [Clear]
              </button>
            </div>
          </div>

          {/* Filter row */}
          <div className="px-4 py-2 border-b border-slate-900 flex gap-1 bg-slate-950/50 shrink-0">
            {(["ALL", "ALERT", "MITIGATION", "SYSTEM"] as const).map(f => (
              <button
                key={f}
                onClick={() => setLogFilter(f)}
                className={`flex-1 py-1 rounded text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                  logFilter === f
                    ? f === "ALL"        ? "bg-cyan-950 text-cyan-400 border-cyan-800/60"
                    : f === "ALERT"      ? "bg-red-950 text-red-400 border-red-800/60"
                    : f === "MITIGATION" ? "bg-emerald-950 text-emerald-400 border-emerald-800/60"
                    :                     "bg-purple-950 text-purple-400 border-purple-800/60"
                    : "text-slate-600 border-transparent hover:text-slate-400"
                }`}
              >
                {f === "ALL" ? "All" : f}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-4 py-2 border-b border-slate-900 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                placeholder="Search syslog..."
                className="w-full bg-black/50 border border-slate-800/60 rounded-lg pl-8 pr-8 py-1.5 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500/40 placeholder-slate-700"
              />
              <Search className="w-3 h-3 text-slate-600 absolute left-2.5 top-2.5" />
              {logSearch && <button onClick={() => setLogSearch("")} className="absolute right-2.5 top-2.5 text-slate-600 hover:text-slate-400 cursor-pointer"><X className="w-3 h-3" /></button>}
            </div>
          </div>

          {/* Log lines */}
          <div ref={logContainerRef} className="flex-1 bg-black/60 p-3 font-mono text-[10px] leading-relaxed overflow-y-auto space-y-0.5 min-h-[200px] max-h-[260px] relative terminal-scan">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, i) => {
                const isNew = i === filteredLogs.length - 1;
                return (
                  <div key={log.id} className={`flex items-start gap-2 py-0.5 rounded px-1 ${isNew ? "log-line-new" : ""} hover:bg-slate-900/20 group`}>
                    <span className="text-slate-700 shrink-0 tabular-nums select-none">[{log.timestamp}]</span>
                    <LogBadge cat={log.category} />
                    <span className={`flex-1 ${
                      log.category === "ALERT"      ? "text-red-300" :
                      log.category === "MITIGATION" ? "text-emerald-400" :
                      log.category === "SYSTEM"     ? "text-purple-300" :
                      "text-slate-400"
                    }`}>{log.msg}</span>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 py-8 gap-2">
                <Search className="w-6 h-6" />
                <span className="text-[10px] font-mono uppercase">No matching events</span>
              </div>
            )}
          </div>

          {/* Footer status */}
          <div className="px-4 py-2 border-t border-slate-900 flex justify-between items-center text-[9px] font-mono shrink-0">
            <span className="text-slate-600">Node: <span className="text-slate-400">Jajpur_HQ_Sector_B</span></span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-400 font-bold">99.99% INTAKE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI COPILOT CHAT ──────────────────────────────────────────────────── */}
      <div className="bg-[#080d14] border border-slate-800/60 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between gap-2 bg-gradient-to-r from-cyan-950/20 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-700/40 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold font-mono text-white uppercase tracking-widest">CYBERDUDE® REAL-TIME AI SECURITY COPILOT</h4>
              <p className="text-[9px] text-slate-500 font-mono">Ask threat analysis queries, generate configs, or verify compliance codes.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[9px] font-mono text-slate-500 hidden sm:inline">GE-NEURAL ARCHITECTURE</span>
          </div>
        </div>

        {/* Chat thread */}
        <div className="bg-black/30 p-4 h-72 overflow-y-auto flex flex-col space-y-3 select-text">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25 }}
                className={`flex flex-col max-w-[86%] ${msg.sender === "user" ? "self-end items-end" : "self-start items-start"}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[8px] font-mono font-extrabold uppercase ${msg.sender === "user" ? "text-cyan-500" : "text-emerald-500"}`}>
                    {msg.sender === "user" ? "◉ YOU" : "⬡ CYBERDUDE_AI"}
                  </span>
                  <span className="text-[8px] font-mono text-slate-700">{msg.timestamp}</span>
                </div>
                <div className={`p-3 rounded-xl text-[11px] leading-relaxed font-sans whitespace-pre-wrap ${
                  msg.sender === "user"
                    ? "bg-cyan-950/60 border border-cyan-800/50 text-slate-100 rounded-br-sm"
                    : "bg-slate-900/80 border border-slate-800/60 text-slate-300 rounded-bl-sm"
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
            {aiAnalyzing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="self-start items-start flex flex-col max-w-[80%]">
                <span className="text-[8px] font-mono text-cyan-400 uppercase mb-1 flex items-center gap-1.5">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> AI analyzing threat data...
                </span>
                <div className="bg-slate-900/80 border border-slate-800/60 p-3 rounded-xl rounded-bl-sm flex items-center gap-1.5">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 rounded-full bg-cyan-500/70" style={{ animation: `bounce 1s ease-in-out ${d}ms infinite` }}></span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef}></div>
        </div>

        {/* Quick presets */}
        <div className="px-4 py-2 border-t border-slate-900/60 bg-slate-950/40">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest block mb-2">Quick Presets</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Audit typical Log4j payloads & write Sentinel Rules",
              "Draft active response plan under India's DPDP Act 2023",
              "Generate secure SSL/TLS Nginx parameters",
              "Protect against brute force SSH vector probes"
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => triggerQuickPrompt(preset)}
                disabled={aiAnalyzing}
                className="bg-slate-900/80 hover:bg-cyan-950/40 text-slate-500 hover:text-cyan-400 border border-slate-800 hover:border-cyan-800/50 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Input bar */}
        <div className="px-4 py-3 border-t border-slate-800/60">
          <form onSubmit={submitCopilotChat} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={aiAnalyzing}
              placeholder="Query security parameters, compliance rules, or generate configs..."
              className="flex-1 bg-black/50 border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs font-sans text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={aiAnalyzing || !chatInput.trim()}
              className="bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 disabled:opacity-40 text-black px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-lg shadow-cyan-500/10"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>
        </div>
      </div>

      {/* ── THREAT HUNTER + COMPLIANCE HUB ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Threat Hunter Lab */}
        <div className="lg:col-span-6 bg-[#080d14] border border-slate-800/60 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-800/60 bg-gradient-to-r from-red-950/10 to-transparent flex items-center gap-2">
            <Eye className="w-4 h-4 text-red-400" />
            <div>
              <h4 className="text-xs font-extrabold font-mono text-white uppercase tracking-widest">Interactive Exploit Mitigation Lab</h4>
              <p className="text-[9px] text-slate-500 font-mono">Audit IPs, domains, or hashes — exports shell scripts for immediate block.</p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1">
            <form onSubmit={executeThreatHunter} className="space-y-3">
              {/* Type selector */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Analysis Coordinate Class</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ip", "domain", "hash"] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setHunterType(type); setTargetInput(type === "ip" ? "185.220.101.4" : type === "domain" ? "scam-redirector-portal.su" : "4198fa3906a59bc8da771970b89cf8271a067ff09761da12937000e4bbf451ae"); }}
                      className={`py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all border cursor-pointer ${hunterType === type ? "bg-cyan-950 text-cyan-400 border-cyan-700/60" : "bg-slate-950/50 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700"}`}
                    >
                      {type === "ip" ? "IP Node" : type === "domain" ? "Domain/URL" : "SHA256 Hash"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Indicator Token Coordinate</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetInput}
                    onChange={e => setTargetInput(e.target.value)}
                    className="flex-1 bg-black/60 border border-slate-800/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50 placeholder-slate-700"
                  />
                  <button
                    type="submit"
                    disabled={hunterRunning}
                    className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shrink-0"
                  >
                    {hunterRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Investigate"}
                  </button>
                </div>
              </div>
            </form>

            {/* Result panel */}
            <div className="bg-black/40 border border-slate-900/60 rounded-xl p-4 flex-1 min-h-[200px]">
              {hunterResult ? (
                <div className="space-y-3 animate-fade-in">
                  {/* Risk ring + classification */}
                  <div className="flex items-start gap-4">
                    <RiskRing score={hunterResult.riskScore} />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono font-bold text-red-400 bg-red-950/60 border border-red-900/40 px-1.5 py-0.5 rounded uppercase">
                          {hunterResult.classification}
                        </span>
                        <p className="text-[10px] font-mono text-slate-500 truncate">{hunterResult.query}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-[10px] font-mono">
                        <div><span className="text-slate-600">Attribution: </span><span className="text-slate-200 font-bold">{hunterResult.threatGroup}</span></div>
                        <div><span className="text-slate-600">Origin: </span><span className="text-slate-300">{hunterResult.origin}</span></div>
                        <div><span className="text-slate-600">MITRE: </span><span className="text-amber-400">{hunterResult.mitreRef}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Shell command */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase">Mitigation Shell Script</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => copyToClipboard(hunterResult.shellCommand, "shell")} className="text-[8px] font-mono text-slate-500 hover:text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors">
                          {copiedText === "shell" ? <><Check className="w-2.5 h-2.5 text-emerald-400" /> Copied</> : <><Copy className="w-2.5 h-2.5" /> Copy</>}
                        </button>
                        <button onClick={() => downloadScript(`mitigate-${hunterType}.sh`, hunterResult.shellCommand)} className="text-[8px] font-mono text-slate-500 hover:text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors">
                          <Download className="w-2.5 h-2.5" /> .sh
                        </button>
                      </div>
                    </div>
                    <div className="bg-black border border-slate-900/60 rounded-lg p-2.5 text-[10px] font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed max-h-20">
                      {hunterResult.shellCommand}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-slate-700 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">MITIGATION GENERATOR COMPILER</span>
                  <p className="text-[10px] text-slate-700 font-sans max-w-xs">Submit an IP, domain, or hash to generate network filters and YARA detections.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Governance Compliance Hub */}
        <div className="lg:col-span-6 bg-[#080d14] border border-slate-800/60 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-800/60 bg-gradient-to-r from-emerald-950/10 to-transparent flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <h4 className="text-xs font-extrabold font-mono text-white uppercase tracking-widest">Information Security Governance Hub</h4>
                <p className="text-[9px] text-slate-500 font-mono">Toggle controls to recalculate compliance scores in real-time.</p>
              </div>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1">
            {/* Framework score overview */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { fw: "dpdp" as const, label: "DPDP Act",  score: dpdpScore, accent: "cyan",    activeBg: "bg-cyan-950/70 border-cyan-700/50"   },
                { fw: "iso"  as const, label: "ISO 27001",  score: isoScore,  accent: "emerald", activeBg: "bg-emerald-950/70 border-emerald-700/50" },
                { fw: "soc2" as const, label: "SOC 2",      score: soc2Score, accent: "purple",  activeBg: "bg-purple-950/70 border-purple-700/50" },
              ].map(tab => {
                const isActive = selectedFramework === tab.fw;
                return (
                  <button
                    key={tab.fw}
                    onClick={() => { setSelectedFramework(tab.fw); playTickAudio(); }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer text-center space-y-1 ${isActive ? tab.activeBg : "bg-slate-950/50 border-slate-800 hover:border-slate-700"}`}
                  >
                    <span className={`text-[9px] font-mono uppercase tracking-wider block ${isActive ? "text-slate-200" : "text-slate-500"}`}>{tab.label}</span>
                    <span className={`text-base font-extrabold font-mono block ${isActive ? (tab.score >= 80 ? "text-emerald-400" : tab.score >= 50 ? "text-amber-400" : "text-red-400") : "text-slate-600"}`}>{tab.score}%</span>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-700 rounded-full ${tab.score >= 80 ? "bg-emerald-500" : tab.score >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: isActive ? `${tab.score}%` : "0%" }}></div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Checklist */}
            <div className="bg-black/30 border border-slate-900/60 rounded-xl p-3 space-y-1.5 max-h-[200px] overflow-y-auto flex-1">
              {complianceControls[selectedFramework].map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleControl(selectedFramework, item.id)}
                  className={`p-2.5 rounded-lg border flex items-center gap-3 cursor-pointer transition-all select-none group ${item.status ? "bg-emerald-950/20 border-emerald-900/40 hover:bg-emerald-950/30" : "bg-slate-900/20 border-slate-800/50 hover:border-slate-700/60"}`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${item.status ? "bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]" : "border-slate-700 group-hover:border-slate-500"}`}>
                    {item.status && <Check className="w-3 h-3 text-black stroke-[3]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-sans block leading-snug ${item.status ? "text-slate-200" : "text-slate-500"}`}>{item.title}</span>
                    <span className="text-[8px] font-mono text-slate-700">Weight: {item.score} pts</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Score display */}
            <div className="bg-slate-950/60 border border-slate-800/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                  {selectedFramework === "dpdp" ? "India DPDP digital fiduciary rating" : selectedFramework === "iso" ? "ISO/IEC certification eligibility" : "SOC-2 Trust Principle posture"}
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${fwScore >= 80 ? "bg-emerald-950/60 text-emerald-400 border-emerald-900/40" : fwScore >= 50 ? "bg-amber-950/60 text-amber-400 border-amber-900/40" : "bg-red-950/60 text-red-400 border-red-900/40"}`}>
                  {fwScore}/100 — {fwScore >= 80 ? "EXCELLENT" : fwScore >= 50 ? "INTERMEDIATE" : "AT RISK"}
                </span>
              </div>
              <ComplianceBar score={fwScore} accent={fwAccent} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
