import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, 
  Activity, 
  Cpu, 
  Terminal, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  Globe, 
  Play, 
  RefreshCw,
  Clock,
  Lock,
  Layers,
  FileCheck,
  Zap,
  Server,
  Download,
  Copy,
  Search,
  MessageSquare,
  Sparkles,
  Volume2,
  VolumeX,
  Check,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  X,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CORPORATE_REGISTRATION } from "../ecosystemData";

interface LogItem {
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

export function AiSocDashboard() {
  // Audio Feedback Toggle
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  // System States
  const [activeSimulation, setActiveSimulation] = useState<"ddos" | "ransomware" | "zero_day" | null>(null);
  const [packetCount, setPacketCount] = useState<number>(3421102);
  const [mitigationRate, setMitigationRate] = useState<number>(99.98);
  const [liveScore, setLiveScore] = useState<number>(98);
  const [logsPaused, setLogsPaused] = useState<boolean>(false);
  
  // Console Log State & Search
  const [logFilter, setLogFilter] = useState<"ALL" | "ALERT" | "MITIGATION" | "SYSTEM">("ALL");
  const [logSearch, setLogSearch] = useState<string>("");
  const [socLogs, setSocLogs] = useState<LogItem[]>([
    { timestamp: "08:30:12", category: "SYSTEM", msg: "AI SOC Central Ingestion Engine (CDB-Central-v4) initiated successfully.", source: "Core Node" },
    { timestamp: "08:30:14", category: "SYSTEM", msg: "Establishing trust handshake tunnels with global sub-nets.", source: "DNS Guard" },
    { timestamp: "08:30:15", category: "INFO", msg: "Synchronized with active Sentinel APEX real-time block registry.", source: "Sentinel Ingestion" },
    { timestamp: "08:30:19", category: "MITIGATION", msg: "Inbound SSH connection request from port-scanner source flagged and rate-limited.", source: "WAF Proxy" },
    { timestamp: "08:30:24", category: "ALERT", msg: "Brute-force query threshold exceeded on port 22 from 185.220.101.4.", source: "IP Filter" }
  ]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // AI Security Copilot Chat States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Hello! I am the CyberDude AI Security Copilot. I can assist you with real-time log analysis, threat modeling, security compliance, or generating custom mitigation rulesets. Ask me anything or select a quick query below!",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [aiAnalyzing, setAiAnalyzing] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Threat Hunter States
  const [targetInput, setTargetInput] = useState<string>("185.220.101.4");
  const [hunterType, setHunterType] = useState<"ip" | "domain" | "hash">("ip");
  const [hunterResult, setHunterResult] = useState<any | null>(null);
  const [hunterRunning, setHunterRunning] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Interactive Compliance Check-sheets
  const [selectedFramework, setSelectedFramework] = useState<"dpdp" | "iso" | "soc2">("dpdp");
  const [complianceControls, setComplianceControls] = useState({
    dpdp: [
      { id: "dpdp_1", title: "Verify corporate legal entity coordinates on common registers", status: true, score: 20 },
      { id: "dpdp_2", title: "Publish clear, readable bilingual privacy disclosure policies", status: true, score: 20 },
      { id: "dpdp_3", title: "Enforce user opt-out controls for tracking and cookies", status: true, score: 15 },
      { id: "dpdp_4", title: "Appoint designated Data Protection Officer (DPO) contacts", status: false, score: 15 },
      { id: "dpdp_5", title: "Configure automated Data Principal Erasure request pipelines", status: false, score: 15 },
      { id: "dpdp_6", title: "Secure active incident response and breach warning procedures", status: false, score: 15 }
    ],
    iso: [
      { id: "iso_1", title: "Establish and review Information Security Management guidelines", status: true, score: 15 },
      { id: "iso_2", title: "Mandate organizational roles, responsibilities & security training", status: true, score: 15 },
      { id: "iso_3", title: "Configure active firewalls and TLS 1.3 edge proxy protections", status: true, score: 20 },
      { id: "iso_4", title: "Enforce MFA and rotate REST API access tokens dynamically", status: true, score: 15 },
      { id: "iso_5", title: "Implement continuous dependency vulnerability analysis webhooks", status: false, score: 20 },
      { id: "iso_6", title: "Perform scheduled static audit sweeps of repository codebases", status: false, score: 15 }
    ],
    soc2: [
      { id: "soc2_1", title: "Establish zero-trust authentication checks across services", status: true, score: 20 },
      { id: "soc2_2", title: "Continuous log collection and monitoring of network entry-points", status: true, score: 20 },
      { id: "soc2_3", title: "Dynamic rate-limiting to protect API routing availability", status: true, score: 15 },
      { id: "soc2_4", title: "Enforce encryption of personal data both in transit and at rest", status: true, score: 15 },
      { id: "soc2_5", title: "Establish incident reporting runbooks with dynamic PDF alerts", status: false, score: 15 },
      { id: "soc2_6", title: "Maintain separate sandbox, testing, and production subnets", status: false, score: 15 }
    ]
  });

  // Calculate current compliance score dynamically
  const calculateComplianceScore = (framework: "dpdp" | "iso" | "soc2") => {
    const controls = complianceControls[framework];
    const totalWeight = controls.reduce((acc, c) => acc + c.score, 0);
    const achievedWeight = controls.reduce((acc, c) => acc + (c.status ? c.score : 0), 0);
    return Math.round((achievedWeight / totalWeight) * 100);
  };

  // Toggle checklist controls
  const toggleControl = (framework: "dpdp" | "iso" | "soc2", id: string) => {
    setComplianceControls(prev => {
      const updated = { ...prev };
      updated[framework] = updated[framework].map(c => 
        c.id === id ? { ...c, status: !c.status } : c
      );
      return updated;
    });
    playTickAudio();
  };

  // Sound cues (Web Audio API synthesis for zero extra dependency bloat!)
  const playTickAudio = () => {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (_) {}
  };

  const playAlertAudio = (frequency = 150) => {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(frequency * 1.5, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (_) {}
  };

  // Auto scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [socLogs]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, aiAnalyzing]);

  // Live event ingestion simulation tick
  useEffect(() => {
    const interval = setInterval(() => {
      if (logsPaused) return;

      // Increment packet counter
      setPacketCount(prev => prev + Math.floor(Math.random() * 15) + 3);

      // Random network threats & events
      const eventCategories: ("ALERT" | "MITIGATION" | "SYSTEM" | "INFO")[] = [
        "ALERT", "MITIGATION", "SYSTEM", "INFO"
      ];
      const selectedCategory = eventCategories[Math.floor(Math.random() * eventCategories.length)];
      
      const randomIps = ["185.220.101.99", "45.146.164.22", "109.238.10.15", "91.240.118.5", "104.22.4.88"];
      const randomTargets = ["Odisha-Mainframe", "WAF-Edge-Node", "CyberDude-API-Endpoint", "Auth-Token-DB"];
      const randomVectors = [
        "Dynamic layer-7 rate-limiting applied", 
        "Suspicious regex match on incoming JSON parameters", 
        "Brute-force threat vector blocked completely", 
        "Database health checkpoint validated successfully"
      ];

      const chosenIp = randomIps[Math.floor(Math.random() * randomIps.length)];
      const chosenTarget = randomTargets[Math.floor(Math.random() * randomTargets.length)];
      const chosenMsg = randomVectors[Math.floor(Math.random() * randomVectors.length)];

      let finalMsg = "";
      if (selectedCategory === "ALERT") {
        finalMsg = `[WARNING] Extreme payload query detected from IP ${chosenIp} targeting ${chosenTarget}.`;
        playAlertAudio(220);
      } else if (selectedCategory === "MITIGATION") {
        finalMsg = `[SUCCESS] Null-route firewall rule enforced on source IP ${chosenIp}. mitigation latency: 8ms.`;
      } else if (selectedCategory === "SYSTEM") {
        finalMsg = `[SYSTEM] Rotated central telemetry credentials for node segment Jajpur_HQ.`;
      } else {
        finalMsg = `[TELEMETRY] ${chosenMsg} across secure infrastructure sub-nets.`;
      }

      const timestamp = new Date().toLocaleTimeString();

      setSocLogs(prev => {
        const nextLogs = [...prev, { timestamp, category: selectedCategory, msg: finalMsg, source: "Ingestion Core" }];
        return nextLogs.slice(-60); // Keep last 60 events
      });

      // Micro adjustments to dynamic mitigation score
      setMitigationRate(prev => {
        const adjust = (Math.random() - 0.5) * 0.02;
        return parseFloat(Math.min(100, Math.max(99.8, prev + adjust)).toFixed(2));
      });

      // Micro adjustments to dynamic core security score
      setLiveScore(prev => {
        const adjust = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        return Math.min(100, Math.max(95, prev + adjust));
      });

    }, 2500);

    return () => clearInterval(interval);
  }, [logsPaused, audioEnabled]);

  // Handle simulations
  const runIncidentSimulation = (type: "ddos" | "ransomware" | "zero_day") => {
    setActiveSimulation(type);
    playAlertAudio(440);
    const timestamp = new Date().toLocaleTimeString();

    if (type === "ddos") {
      setSocLogs(prev => [
        ...prev,
        { timestamp, category: "ALERT", msg: "[INCIDENT_SIMULATOR] Launching High-Volume Distributed DDoS Simulation (35k Bots / sec).", source: "Simulator Node" },
        { timestamp, category: "SYSTEM", msg: "[INCIDENT_SIMULATOR] Packet buffer load spikes to 950%. CPU core temp elevates.", source: "Telemetry Sensor" },
        { timestamp, category: "MITIGATION", msg: "[AUTO-RECOVERY] AI Scrubber Core: Initiating progressive cluster rate-limiting filters.", source: "AI Orchestrator" }
      ]);

      let cycles = 0;
      const ddosTimer = setInterval(() => {
        setPacketCount(prev => prev + Math.floor(Math.random() * 3200) + 1600);
        setMitigationRate(prev => parseFloat(Math.max(98.5, prev - 0.15).toFixed(2)));
        cycles++;
        
        if (cycles === 8) {
          clearInterval(ddosTimer);
          setMitigationRate(99.98);
          setActiveSimulation(null);
          setSocLogs(prev => [
            ...prev,
            { timestamp: new Date().toLocaleTimeString(), category: "MITIGATION", msg: "[INCIDENT_SIMULATOR] Simulation completed. 100.0% traffic normalized. No packet drop registered.", source: "AI Orchestrator" }
          ]);
        }
      }, 600);
    } 
    else if (type === "ransomware") {
      setSocLogs(prev => [
        ...prev,
        { timestamp, category: "ALERT", msg: "[INCIDENT_SIMULATOR] Simulated crypto-encryptor file-system activity captured in /var/db/storage.", source: "Host Shield" },
        { timestamp, category: "ALERT", msg: "[INCIDENT_SIMULATOR] Signature matched: LockBit-2026 registry write attempts.", source: "Host Shield" },
        { timestamp, category: "MITIGATION", msg: "[AUTO-RECOVERY] Threat Sentinel: Isolating affected subnet segment 'DB_STORE_03' in 1.4ms.", source: "Orchestrator" }
      ]);

      setTimeout(() => {
        setActiveSimulation(null);
        setSocLogs(prev => [
          ...prev,
          { timestamp: new Date().toLocaleTimeString(), category: "MITIGATION", msg: "[INCIDENT_SIMULATOR] Host isolated, snapshot rollback complete. Data integrity 100% verified.", source: "Host Shield" }
        ]);
      }, 4000);
    } 
    else {
      setSocLogs(prev => [
        ...prev,
        { timestamp, category: "ALERT", msg: "[INCIDENT_SIMULATOR] Capture zero-day Chrome/V8 buffer overflow attempt (CVE-2026-XPL).", source: "RASP Agent" },
        { timestamp, category: "SYSTEM", msg: "[INCIDENT_SIMULATOR] Generating high-entropy polymorphic dynamic patch overlay.", source: "CDB-Neural Agent" },
        { timestamp, category: "MITIGATION", msg: "[AUTO-RECOVERY] RASP patch injected directly in virtual machine memory block.", source: "RASP Agent" }
      ]);

      setTimeout(() => {
        setActiveSimulation(null);
        setSocLogs(prev => [
          ...prev,
          { timestamp: new Date().toLocaleTimeString(), category: "MITIGATION", msg: "[INCIDENT_SIMULATOR] Buffer vulnerability successfully shielded. Malicious origin banned permanently.", source: "WAF Proxy" }
        ]);
      }, 4000);
    }
  };

  // Co-Pilot Chat Form submit
  const submitCopilotChat = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery || chatInput;
    if (!query.trim() || aiAnalyzing) return;

    // Add user message to history
    const userMsg: ChatMessage = {
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setChatHistory(prev => [...prev, userMsg]);
    if (!customQuery) setChatInput("");
    setAiAnalyzing(true);
    playTickAudio();

    try {
      const response = await fetch("/api/security/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "chat", content: query })
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(prev => [...prev, {
          sender: "ai",
          text: data.report || "No response received.",
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else {
        throw new Error("API Route issue");
      }
    } catch (err) {
      setChatHistory(prev => [...prev, {
        sender: "ai",
        text: `⚠️ **Connection Timeout**: The AI model is evaluating high quantities of security threats right now. \n\n**Offline Recommendation:** Always secure endpoints with strict rate limiting, audit external domain logs regularly, and maintain active key rotators. Let me know if you would like me to compile security guidelines!`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Pre-configured Copilot prompt triggers
  const triggerQuickPrompt = (promptText: string) => {
    submitCopilotChat(undefined, promptText);
  };

  // Threat Hunter Submit
  const executeThreatHunter = (e: React.FormEvent) => {
    e.preventDefault();
    setHunterRunning(true);
    setHunterResult(null);
    playTickAudio();

    const target = targetInput.trim().replace(/\s+/g, '');

    setTimeout(() => {
      if (hunterType === "ip") {
        setHunterResult({
          query: target,
          classification: "CRITICAL_MALICIOUS_BOTNET_IP",
          riskScore: 98,
          threatGroup: "APT-29 (Cozy Bear campaign)",
          family: "Mirai polymorphic DDoS malware",
          origin: "NL (Amsterdam Tor Exit Edge Router)",
          openPorts: "22 (SSH), 80, 443 (SSL), 8080",
          shellCommand: `iptables -A INPUT -s ${target} -p tcp --dport 22 -j DROP`,
          nginxCode: `# Block Botnet Host IP
deny ${target};`,
          mitreRef: "T1110 (Brute Force), T1059.001 (PowerShell)",
          advice: "Perform active network segment isolation. Verify authentication credentials across keys immediately."
        });
      } else if (hunterType === "domain") {
        setHunterResult({
          query: target,
          classification: "HIGH_PHISHING_RECON_PORTAL",
          riskScore: 89,
          threatGroup: "Scattered Spider affiliate",
          family: "RedLine Information Stealer Loader",
          origin: "RU (Saint Petersburg hosting block)",
          openPorts: "80, 443",
          shellCommand: `dig +short ${target} | xargs -I {} iptables -A INPUT -s {} -j DROP`,
          nginxCode: `# Block Referral Phishing Links
if ($http_referer ~* (${target})) {
    return 403;
}`,
          mitreRef: "T1566 (Phishing), T1583 (Acquire Infrastructure)",
          advice: "Sinkhole query vectors inside company routers. Scrub central mailing folders for identical attachments."
        });
      } else {
        setHunterResult({
          query: target,
          classification: "CRITICAL_RANSOMWARE_SHA256",
          riskScore: 100,
          threatGroup: "LockBit 3.0 Ransomware Collective",
          family: "LockBit encryption compiler variant V3",
          origin: "Distributed (CDN file mirror server)",
          openPorts: "None (Executed locally)",
          shellCommand: `# YARA Rule signature block compiled on host endpoints
rule CyberDude_SHA256_Block {
    meta:
        desc = "Block LockBit 3.0 binary"
        hash = "${target}"
    strings:
        $header = { 4D 5A 90 00 }
        $sig = "lockbit_ransom_engine_v3"
    condition:
        $header at 0 and $sig
}`,
          nginxCode: `# WAF Hash blacklist match rule
WAF_RULE_SHA256_DENY="${target}"`,
          mitreRef: "T1486 (Data Encrypted for Impact), T1027 (Obfuscated Files)",
          advice: "Deploy endpoint protection rules immediately to block binary execution. Run an automated threat sweep across the workspace."
        });
      }
      setHunterRunning(false);
      setSocLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          category: "MITIGATION",
          msg: `[THREAT_HUNTER] Audited ${target}. Flagged hazard threat level: ${hunterType === "hash" ? 100 : 98}%.`,
          source: "Intel Engine"
        }
      ]);
    }, 1200);
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    playTickAudio();
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Download script helper
  const downloadScriptFile = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    playTickAudio();
  };

  // Filter logs based on search & filter
  const filteredLogs = socLogs.filter(log => {
    const matchesFilter = logFilter === "ALL" || log.category === logFilter;
    const matchesSearch = log.msg.toLowerCase().includes(logSearch.toLowerCase()) || 
                          log.source.toLowerCase().includes(logSearch.toLowerCase()) ||
                          log.category.toLowerCase().includes(logSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION: TITLE BAR & SOUND CONTROLLER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0a0f1d] border border-cyan-500/10 p-4 rounded-lg">
        <div>
          <h2 className="text-sm font-extrabold font-mono text-cyan-400 tracking-widest uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping"></span>
            CYBERDUDEBIVASH® AI CYBERSECURITY COMMAND CENTER
          </h2>
          <p className="text-[11px] text-slate-400 font-sans leading-snug mt-1">
            End-to-end fully-autonomous AI SOC threat intelligence, vulnerability monitoring, and compliance registry node based in Jajpur, Odisha, India.
          </p>
        </div>
        
        {/* Toggle Sound cues and Pause Log feed */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${
              audioEnabled 
                ? "bg-cyan-950/80 text-cyan-400 border-cyan-800" 
                : "bg-slate-950 text-slate-500 border-slate-900 hover:text-slate-350"
            }`}
          >
            {audioEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" /> Telemetry Audio: ON
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" /> Telemetry Audio: OFF
              </>
            )}
          </button>
          
          <button
            onClick={() => setLogsPaused(!logsPaused)}
            className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${
              logsPaused 
                ? "bg-amber-950/80 text-amber-400 border-amber-800" 
                : "bg-slate-950 text-slate-500 border-slate-900 hover:text-slate-350"
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${logsPaused ? "" : "animate-pulse"}`} />
            {logsPaused ? "FEED: PAUSED" : "FEED: LIVE"}
          </button>
        </div>
      </div>

      {/* STATS OVERLAY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0c1117] border border-slate-800/80 p-4 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">System Security Index</span>
            <div className="text-xl font-bold font-mono text-cyan-400 flex items-center gap-1.5">
              <Shield className="w-4.5 h-4.5 text-cyan-500" />
              <span>{liveScore}% STABLE</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/50 px-1 py-0.5 rounded border border-emerald-900/40">
            OPTIMAL
          </span>
        </div>

        <div className="bg-[#0c1117] border border-slate-800/80 p-4 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Mitigated Data Packets</span>
            <div className="text-xl font-bold font-mono text-emerald-400 flex items-center gap-1.5">
              <Zap className="w-4.5 h-4.5 text-emerald-500" />
              <span>{packetCount.toLocaleString()}</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/50 px-1 py-0.5 rounded border border-cyan-900/40">
            {mitigationRate}% SCRUBBED
          </span>
        </div>

        <div className="bg-[#0c1117] border border-slate-800/80 p-4 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Neural Signatures Active</span>
            <div className="text-xl font-bold font-mono text-purple-450 flex items-center gap-1.5">
              <Server className="w-4.5 h-4.5 text-purple-400" />
              <span>814,212 sets</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-purple-400 bg-purple-950/50 px-1 py-0.5 rounded border border-purple-900/40">
            AUTO-SYNC
          </span>
        </div>

        <div className="bg-[#0c1117] border border-slate-800/80 p-4 rounded-lg flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Active Threat Level</span>
            <div className="text-xl font-bold font-mono text-amber-500 flex items-center gap-1.5">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
              <span>{activeSimulation ? "CRITICAL RISK" : "ELEVATED LEVEL"}</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-amber-400 bg-amber-950/50 px-1 py-0.5 rounded border border-amber-900/40">
            {activeSimulation ? "MITIGATING" : "SAFEGUARDED"}
          </span>
        </div>
      </div>

      {/* GRID SECTION 1: MAP THREAT VECTOR & LOG FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Visual Map (7 cols) */}
        <div className="lg:col-span-7 bg-[#0c1117] border border-slate-800/80 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900 pb-2 gap-2">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                Live Ingress Threat Mitigation Map
              </h4>
              <p className="text-[10px] text-slate-500 font-mono">Real-time network handshake events routed through secure edge clusters to the India HQ.</p>
            </div>
            
            {activeSimulation && (
              <span className="text-[9px] font-mono text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800/30 animate-pulse font-extrabold uppercase">
                ALERT: SIMULATION ACTIVE
              </span>
            )}
          </div>

          {/* SVG Map Graphic */}
          <div className="relative bg-slate-950 rounded border border-slate-900/60 h-64 overflow-hidden flex items-center justify-center">
            
            {/* Grid Matrix Scanning lines overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.05)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>

            <svg viewBox="0 0 800 400" className="w-full h-full opacity-35 select-none" xmlns="http://www.w3.org/2000/svg">
              {/* Earth continents outlines */}
              <path d="M 100 120 Q 150 90 180 110 T 210 140 T 250 120 T 280 150 T 240 220 T 170 250 T 130 180 Z" fill="#1e293b" />
              <path d="M 320 80 Q 360 40 400 60 T 450 110 T 520 80 T 580 140 T 540 220 T 480 280 T 360 210 Z" fill="#1e293b" />
              <path d="M 580 180 Q 640 150 680 190 T 740 250 T 700 320 T 620 280 Z" fill="#1e293b" />
              <path d="M 180 280 Q 210 260 240 290 T 280 340 T 220 380 T 160 330 Z" fill="#1e293b" />
              
              {/* Latitudes & Longitudes */}
              <line x1="0" y1="100" x2="800" y2="100" stroke="#0f172a" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="0" y1="200" x2="800" y2="200" stroke="#0f172a" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="0" y1="300" x2="800" y2="300" stroke="#0f172a" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="200" y1="0" x2="200" y2="400" stroke="#0f172a" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="400" y1="0" x2="400" y2="400" stroke="#0f172a" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="600" y1="0" x2="600" y2="400" stroke="#0f172a" strokeWidth="1" strokeDasharray="5,5" />

              {/* Jajpur Headquarter marker with expanding sonar rings */}
              <g>
                <circle cx="510" cy="180" r="14" fill="#06b6d4" fillOpacity="0.1" className="animate-pulse" />
                <circle cx="510" cy="180" r="8" fill="#06b6d4" fillOpacity="0.2" className="animate-ping" />
                <circle cx="510" cy="180" r="4.5" fill="#22c55e" />
                <text x="520" y="185" fill="#22c55e" fontSize="9" fontFamily="monospace" fontWeight="bold">HQ_ODISHA_IN</text>
              </g>

              {/* Botnet Node 1: North America */}
              <g>
                <circle cx="150" cy="130" r="3.5" fill="#ef4444" />
                <text x="110" y="115" fill="#ef4444" fontSize="8" fontFamily="monospace">BOTNET_US</text>
                {/* Flow lines */}
                <path d="M 150 130 Q 330 80 510 180" fill="none" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="4,4" className="animate-[dash_5s_linear_infinite]" />
              </g>

              {/* Botnet Node 2: Moscow APT bloc */}
              <g>
                <circle cx="440" cy="70" r="3.5" fill="#f97316" />
                <text x="450" y="70" fill="#f97316" fontSize="8" fontFamily="monospace">APT_BLOC_RU</text>
                <path d="M 440 70 Q 475 110 510 180" fill="none" stroke="#f97316" strokeWidth="1.2" strokeDasharray="4,4" className="animate-[dash_3s_linear_infinite]" />
              </g>

              {/* Botnet Node 3: Tor exit node Netherlands */}
              <g>
                <circle cx="380" cy="95" r="3.5" fill="#f59e0b" />
                <text x="310" y="95" fill="#f59e0b" fontSize="8" fontFamily="monospace">TOR_EXIT_NL</text>
                <path d="M 380 95 Q 445 110 510 180" fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="4,4" className="animate-[dash_4s_linear_infinite]" />
              </g>
            </svg>

            {/* Static Grid Scan line swipe effect */}
            <div className="absolute top-0 left-0 w-full h-0.5 bg-cyan-500/20 animate-[bounce_8s_infinite] pointer-events-none"></div>

            {/* Float HUD tooltips */}
            <div className="absolute bottom-3 left-3 bg-[#0c1117]/95 border border-slate-800 p-2 rounded text-[10px] font-mono text-slate-400 space-y-1 shadow-lg max-w-[220px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold border-b border-slate-900 pb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>ACTIVE DEFENSE ACTIVE</span>
              </div>
              <div className="text-[9px] text-slate-500 space-y-0.5">
                <div>HQ Node IP: <span className="text-slate-300">103.142.12.98</span></div>
                <div>Filter Latency: <span className="text-cyan-400">11.8ms</span></div>
              </div>
            </div>

            {activeSimulation && (
              <div className="absolute inset-0 bg-red-950/10 border border-red-500/35 pointer-events-none flex items-center justify-center animate-pulse">
                <div className="bg-red-950/90 text-red-400 px-3 py-1.5 rounded text-xs font-mono font-bold tracking-widest border border-red-800/40 uppercase">
                  SIMULATING TRAFFIC THREAT VECTORS
                </div>
              </div>
            )}
          </div>

          {/* Incident playbook buttons */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Inject Real-time Threat Playbooks</span>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => runIncidentSimulation("ddos")}
                disabled={activeSimulation !== null}
                className="bg-slate-950 hover:bg-red-950/20 text-red-400 border border-red-950/40 hover:border-red-500 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer text-center"
              >
                Simulate DDoS
              </button>
              <button 
                onClick={() => runIncidentSimulation("ransomware")}
                disabled={activeSimulation !== null}
                className="bg-slate-950 hover:bg-orange-950/20 text-orange-400 border border-orange-950/40 hover:border-orange-500 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer text-center"
              >
                Simulate Ransomware
              </button>
              <button 
                onClick={() => runIncidentSimulation("zero_day")}
                disabled={activeSimulation !== null}
                className="bg-slate-950 hover:bg-cyan-950/20 text-cyan-400 border border-cyan-950/40 hover:border-cyan-500 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer text-center"
              >
                Inject Zero-Day
              </button>
            </div>
          </div>

        </div>

        {/* Console Event Feed (5 cols) */}
        <div className="lg:col-span-5 bg-[#0c1117] border border-slate-800/80 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900 pb-2 gap-2">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-450" />
                  Live Event Ingestion feed
                </h4>
                <p className="text-[10px] text-slate-550 font-mono">Aggregated secure syslog data stream.</p>
              </div>
              <button 
                onClick={() => setSocLogs([{ timestamp: new Date().toLocaleTimeString(), category: "SYSTEM", msg: "Telemetry log buffer cleared.", source: "Terminal" }])}
                className="text-[9px] font-mono text-slate-550 hover:text-slate-350 uppercase cursor-pointer"
              >
                [Clear Syslog]
              </button>
            </div>

            {/* Filtering Controls */}
            <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded border border-slate-900">
              {(["ALL", "ALERT", "MITIGATION", "SYSTEM"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLogFilter(filter)}
                  className={`flex-1 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    logFilter === filter 
                      ? "bg-cyan-950 text-cyan-400 border border-cyan-800/60" 
                      : "text-slate-500 hover:text-slate-300 bg-transparent border border-transparent"
                  }`}
                >
                  {filter === "ALL" ? "All Logs" : filter}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <input 
                type="text" 
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search raw syslog lines..."
                className="w-full bg-slate-950 border border-slate-900 rounded pl-8 pr-3 py-1.5 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              {logSearch && (
                <button onClick={() => setLogSearch("")} className="absolute right-2.5 top-2.5 text-slate-550 hover:text-slate-350">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

          </div>

          {/* Logs lines Container */}
          <div 
            ref={logContainerRef}
            className="flex-1 bg-black border border-slate-900 rounded p-3.5 font-mono text-[10px] leading-relaxed text-slate-400 h-64 overflow-y-auto select-text space-y-1.5"
          >
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, idx) => {
                const isAlert = log.category === "ALERT";
                const isMit = log.category === "MITIGATION";
                const isSys = log.category === "SYSTEM";
                return (
                  <div key={idx} className="flex items-baseline gap-1.5 border-b border-slate-900/30 pb-1 last:border-0">
                    <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                    <span className={`px-1 rounded text-[8px] font-extrabold tracking-wide shrink-0 ${
                      isAlert ? "bg-red-950 text-red-400 border border-red-900/40" :
                      isMit ? "bg-emerald-950 text-emerald-450 border border-emerald-900/40" :
                      isSys ? "bg-purple-950 text-purple-400 border border-purple-900/40" :
                      "bg-slate-900 text-slate-400 border border-slate-800/40"
                    }`}>
                      {log.category}
                    </span>
                    <span className={
                      isAlert ? "text-red-350 font-bold" :
                      isMit ? "text-emerald-400" :
                      isSys ? "text-purple-300" :
                      "text-slate-300"
                    }>
                      {log.msg}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 py-8">
                <Search className="w-8 h-8 text-slate-800 mb-2" />
                <p className="text-[10px] uppercase font-mono tracking-wider">No matching events in trace logs</p>
              </div>
            )}
          </div>

          <div className="bg-slate-950 p-2 rounded border border-slate-900 flex justify-between items-center text-[9px] font-mono text-slate-500">
            <span>Ingress Node: Jajpur_HQ_Sector_B</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              99.99% INTAKE
            </span>
          </div>

        </div>

      </div>

      {/* GRID SECTION 2: AI INTERACTIVE COPILOT CHAT */}
      <div className="bg-[#0c1117] border border-slate-800/80 rounded-lg p-5 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900 pb-3 gap-2">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-500" />
              CYBERDUDE® REAL-TIME AI SECURITY COPILOT
            </h4>
            <p className="text-[10px] text-slate-500 font-mono">Ask standard threat analysis queries, generate configurations, or verify compliance codes.</p>
          </div>
          
          <div className="text-[9px] font-mono text-slate-500 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            POWERED BY GE-NEURAL ARCHITECTURE
          </div>
        </div>

        {/* Chat Thread Container */}
        <div className="bg-slate-950 border border-slate-900 rounded-lg p-4 h-72 overflow-y-auto flex flex-col space-y-3 select-text">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-mono text-slate-550 font-bold uppercase">
                    {msg.sender === "user" ? "USER CLIENT" : "CYBERDUDE_AI"}
                  </span>
                  <span className="text-[8px] font-mono text-slate-600">{msg.timestamp}</span>
                </div>
                
                <div className={`p-3 rounded-lg text-xs leading-relaxed font-sans whitespace-pre-wrap ${
                  msg.sender === "user" 
                    ? "bg-cyan-950/70 border border-cyan-800/60 text-slate-200" 
                    : "bg-[#0c1117] border border-slate-900 text-slate-300"
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}

            {aiAnalyzing && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="self-start flex flex-col items-start max-w-[80%]"
              >
                <span className="text-[9px] font-mono text-cyan-400 uppercase mb-1 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> CyberDude AI is thinking...
                </span>
                <div className="bg-[#0c1117] border border-slate-900 p-3 rounded-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce delay-75"></span>
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce delay-150"></span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef}></div>
        </div>

        {/* Quick query presets */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Standard Analytical Presets</span>
          <div className="flex flex-wrap gap-2">
            {[
              "Audit typical Log4j payloads & write Sentinel Rules",
              "Draft an active response plan under India's DPDP Act 2023",
              "Generate custom secure SSL/TLS Nginx parameters",
              "How should I protect against brute force SSH vector probes?"
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => triggerQuickPrompt(preset)}
                disabled={aiAnalyzing}
                className="bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-cyan-400 border border-slate-900 hover:border-cyan-900/50 px-2.5 py-1 rounded text-[10px] font-mono transition-all cursor-pointer text-left"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Chat input box */}
        <form onSubmit={submitCopilotChat} className="flex gap-2">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={aiAnalyzing}
            placeholder="Query security parameters, compliance rules, or generate configs..."
            className="flex-1 bg-slate-950 border border-slate-900 rounded px-3 py-2 text-xs font-sans text-slate-300 focus:outline-none focus:border-cyan-500/50"
          />
          <button 
            type="submit" 
            disabled={aiAnalyzing || !chatInput.trim()}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black px-4 py-2 rounded text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>

      </div>

      {/* GRID SECTION 3: MITIGATION LAB (THREAT HUNTER) & GOVERNANCE HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Threat Hunter Lab (6 cols) */}
        <div className="lg:col-span-6 bg-[#0c1117] border border-slate-800/80 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-500" />
              Interactive Exploit Mitigation Lab
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Audit suspicious IPs, malicious domain coordinates, or binary file hashes. The Central Intel engine resolves risk levels and exports shell scripts for immediate server block.
            </p>
          </div>

          <form onSubmit={executeThreatHunter} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-550 uppercase block">Analysis Coordinate Class</label>
              <div className="grid grid-cols-3 gap-2">
                {(["ip", "domain", "hash"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setHunterType(type);
                      setTargetInput(
                        type === "ip" ? "185.220.101.4" : 
                        type === "domain" ? "scam-redirector-portal.su" : 
                        "4198fa3906a59bc8da771970b89cf8271a067ff09761da12937000e4bbf451ae"
                      );
                    }}
                    className={`py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                      hunterType === type 
                        ? "bg-cyan-950 text-cyan-400 border-cyan-800" 
                        : "bg-slate-950 text-slate-500 border-slate-900 hover:text-slate-300"
                    }`}
                  >
                    {type === "ip" ? "IP Node" : type === "domain" ? "Domain/URL" : "SHA256 Hash"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-550 uppercase block">Indicator Token Coordinate</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="flex-1 bg-black border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                />
                <button 
                  type="submit" 
                  disabled={hunterRunning}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded text-xs font-extrabold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {hunterRunning ? "Auditing..." : "Investigate"}
                </button>
              </div>
            </div>
          </form>

          {/* Hunter Output Screen */}
          <div className="bg-slate-950 border border-slate-900 rounded-lg p-4 min-h-[190px] flex flex-col justify-between">
            {hunterResult ? (
              <div className="space-y-3 animate-fade-in select-text">
                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-400 font-bold bg-red-950/60 border border-red-900/30 px-1 py-0.5 rounded text-[8px] uppercase">
                      {hunterResult.classification}
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-500 truncate max-w-[150px]">{hunterResult.query}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Risk Assessment: <span className="text-red-500 font-bold">{hunterResult.riskScore}%</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                  <div>
                    <span className="text-[8px] text-slate-600 uppercase block">Threat Attribution</span>
                    <span className="text-slate-200 font-bold block">{hunterResult.threatGroup}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-600 uppercase block">Mitre Technique</span>
                    <span className="text-slate-200 block truncate">{hunterResult.mitreRef}</span>
                  </div>
                </div>

                {/* Shell payload code */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-mono text-emerald-400 uppercase font-bold">Mitigation Payload Shell Script</span>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => copyToClipboard(hunterResult.shellCommand, "shell")}
                        className="text-[8px] font-mono text-slate-500 hover:text-slate-350 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedText === "shell" ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                        {copiedText === "shell" ? "Copied" : "Copy"}
                      </button>
                      <button 
                        onClick={() => downloadScriptFile(`mitigate-${hunterType}.sh`, hunterResult.shellCommand)}
                        className="text-[8px] font-mono text-slate-500 hover:text-slate-350 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-2.5 h-2.5" /> Download
                      </button>
                    </div>
                  </div>
                  <div className="bg-black border border-slate-900 rounded p-2 text-[9.5px] font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
                    {hunterResult.shellCommand}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-2">
                <Shield className="w-8 h-8 text-slate-700 animate-pulse" />
                <h6 className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">MITIGATION GENERATOR COMPILER</h6>
                <p className="text-[10px] text-slate-600 font-sans max-w-xs">
                  Run an exploit inquiry to generate robust network filters and verified YARA payload detections.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Governance Compliance Hub (6 cols) */}
        <div className="lg:col-span-6 bg-[#0c1117] border border-slate-800/80 rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-cyan-500" />
              Information Security Governance Hub
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Evaluate policy postures against global guidelines. Toggle the checklists below to actively recalculate verified compliance scores in real-time.
            </p>
          </div>

          {/* Selector Tabs */}
          <div className="flex gap-2 bg-slate-950 p-1 rounded border border-slate-900">
            {[
              { id: "dpdp", label: "India DPDP Act" },
              { id: "iso", label: "ISO/IEC 27001" },
              { id: "soc2", label: "SOC 2 Type II" }
            ].map((tab) => {
              const isActive = selectedFramework === tab.id;
              const frameworkScore = calculateComplianceScore(tab.id as any);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedFramework(tab.id as any);
                    playTickAudio();
                  }}
                  className={`flex-1 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all border cursor-pointer text-center flex flex-col items-center justify-center ${
                    isActive 
                      ? "bg-cyan-950 text-cyan-400 border-cyan-800/60" 
                      : "bg-slate-950 text-slate-550 border-transparent hover:text-slate-350"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[8px] font-bold ${isActive ? "text-cyan-400" : "text-slate-600"}`}>
                    Score: {frameworkScore}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Check sheet findings */}
          <div className="bg-slate-950 border border-slate-900 rounded-lg p-3.5 space-y-2 max-h-[190px] overflow-y-auto">
            {complianceControls[selectedFramework].map((item) => (
              <div 
                key={item.id}
                onClick={() => toggleControl(selectedFramework, item.id)}
                className={`p-2 rounded border flex items-center gap-2.5 cursor-pointer transition-all select-none ${
                  item.status 
                    ? "bg-emerald-950/20 border-emerald-900/50 hover:bg-emerald-950/30 text-slate-200" 
                    : "bg-[#0c1117] border-slate-900 hover:border-slate-800 text-slate-400"
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  item.status ? "bg-emerald-500 border-emerald-500 text-black" : "border-slate-700"
                }`}>
                  {item.status && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="space-y-0.5 leading-snug">
                  <span className="text-[10px] font-sans block">{item.title}</span>
                  <span className="text-[8px] font-mono text-slate-550 block">Weight score index: {item.score} pts</span>
                </div>
              </div>
            ))}
          </div>

          {/* Visual Posture score rating */}
          <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-lg flex items-center justify-between gap-3 text-[11px] leading-relaxed">
            <div className="space-y-0.5">
              <span className="text-[8px] font-mono text-slate-500 uppercase block">Governance Assessment Rating</span>
              <span className="font-mono text-slate-300">
                {selectedFramework === "dpdp" ? "India DPDP digital fiduciary rating" : selectedFramework === "iso" ? "ISO/IEC certification eligibility" : "SOC-2 Trust Principle posture"}
              </span>
            </div>
            
            <div className="text-right shrink-0">
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                calculateComplianceScore(selectedFramework) >= 80 ? "bg-emerald-950 text-emerald-400 border-emerald-900/40" :
                calculateComplianceScore(selectedFramework) >= 50 ? "bg-cyan-950 text-cyan-400 border-cyan-800/40" :
                "bg-amber-950 text-amber-400 border-amber-900/40"
              }`}>
                {calculateComplianceScore(selectedFramework)}/100 {calculateComplianceScore(selectedFramework) >= 80 ? "EXCELLENT" : "INTERMEDIATE"}
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
