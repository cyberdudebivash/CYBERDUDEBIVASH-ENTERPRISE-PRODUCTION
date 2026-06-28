// CYBERDUDEBIVASH® Ecosystem Core Data Definitions

export interface PortalItem {
  id: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  baseCategory: "intelligence" | "defense" | "education" | "portal" | "tools";
  responseMs: number;
}

export interface ApiEndpointItem {
  path: string;
  url: string;
  description: string;
  responseType: "JSON" | "HTML" | "TEXT";
  mockPayload: any;
}

export interface SocialProfileItem {
  platform: string;
  url: string;
  username: string;
  category: "Executive" | "Social" | "Freelance" | "Media";
  metric: string;
  actionText: string;
}

export const ECOSYSTEM_PORTALS: PortalItem[] = [
  {
    id: "apex",
    name: "Sentinel APEX™",
    url: "https://intel.cyberdudebivash.com/",
    tagline: "Global Cyber Threat Feed",
    description: "Real-time threat feeds, active IOC maps, and deep dark web scraping nodes delivering threat vectors globally.",
    baseCategory: "intelligence",
    responseMs: 34
  },
  {
    id: "ai_hub",
    name: "AI Security Hub Live",
    url: "https://cyberdudebivash.in/",
    tagline: "AI Security Forensics",
    description: "Next-gen deep static code auditing (SAST), system log compliance checks, and secure neural chatbot services.",
    baseCategory: "defense",
    responseMs: 56
  },
  {
    id: "tools",
    name: "ThreatCore™ Tools",
    url: "https://tools.cyberdudebivash.com/",
    tagline: "Cybersecurity Utility Suite",
    description: "Over 100 on-demand defensive utility tools including IP recon scanners, sub-domain scouts, and cryptographic analyzers.",
    baseCategory: "tools",
    responseMs: 41
  },
  {
    id: "blog",
    name: "Research Blog & Advisories",
    url: "https://blog.cyberdudebivash.in/",
    tagline: "Threat Intelligence & Academy",
    description: "Deep dive zero-day analysis reports, threat group profile teardowns, and educational resources.",
    baseCategory: "education",
    responseMs: 62
  },
  {
    id: "official",
    name: "Official Gateway Site",
    url: "https://www.cyberdudebivash.com/",
    tagline: "Corporate Headquarters",
    description: "Corporate interface, enterprise service catalog, client secure consulting channel, and official contact point.",
    baseCategory: "portal",
    responseMs: 45
  }
];

export const ECOSYSTEM_APIS: ApiEndpointItem[] = [
  {
    path: "/api/health",
    url: "https://intel.cyberdudebivash.com/api/health",
    description: "Live node health index monitoring active ingestion cluster telemetry.",
    responseType: "JSON",
    mockPayload: {
      status: "UP",
      node_id: "APEX-NODE-ODISHA-01",
      timestamp: new Date().toISOString(),
      active_connections: 18402,
      latency_ms: 12,
      cluster_health: "GREEN",
      components: {
        threat_ingestion: "OPERATIONAL",
        yara_matcher: "OPERATIONAL",
        whois_lookup: "OPERATIONAL",
        dns_resolver: "OPERATIONAL"
      }
    }
  },
  {
    path: "/api/v1/intel/latest.json",
    url: "https://intel.cyberdudebivash.com/api/v1/intel/latest.json",
    description: "Primary feed of recently cataloged global security threats and IPs.",
    responseType: "JSON",
    mockPayload: {
      feed_source: "CYBERDUDEBIVASH Sentinel APEX",
      timestamp: new Date().toISOString(),
      threat_level_trend: "STABLE-ELEVATED",
      records_returned: 3,
      latest_ioc_records: [
        {
          ioc_type: "IP",
          value: "185.220.101.4",
          reputation_score: 98,
          threat_actor: "Unknown (CDB-BLOC-4)",
          first_seen: "2026-06-27T18:40:00Z",
          last_attack_vector: "SSH Brute-Force",
          country_origin: "NL",
          active_status: "ACTIVE_NULL_ROUTED"
        },
        {
          ioc_type: "DOMAIN",
          value: "malware-delivery-portal.xyz",
          reputation_score: 95,
          threat_actor: "FancyBear (attribution probable)",
          first_seen: "2026-06-27T21:12:00Z",
          last_attack_vector: "Phishing Redirect Payload",
          country_origin: "RU",
          active_status: "DNS_SINKHOLED"
        },
        {
          ioc_type: "HASH_SHA256",
          value: "4198fa3906a59bc8da771970b89cf8271a067ff09761da12937000e4bbf451ae",
          reputation_score: 100,
          threat_actor: "LockBit Team",
          first_seen: "2026-06-28T02:00:00Z",
          last_attack_vector: "Ransomware Encryptor Binary",
          country_origin: "UA",
          active_status: "SIGNATURE_COMMITTED"
        }
      ]
    }
  },
  {
    path: "/api/v1/intel/apex.json",
    url: "https://intel.cyberdudebivash.com/api/v1/intel/apex.json",
    description: "Premium tactical threat indicator feed containing full CVE cross references.",
    responseType: "JSON",
    mockPayload: {
      feed_type: "Sentinel APEX Tactical Core",
      protocol_version: "STIX-2.1-CDB",
      last_updated: new Date().toISOString(),
      indicators: [
        {
          id: "indicator--9ef1b933-4f9e-4a6c-9402-aef234f9e234",
          type: "indicator",
          name: "Log4j Payload Regex Pattern",
          pattern: "jndi:(ldap|rmi|dns|ldaps):",
          threat_behavior: "Exploiting CVE-2021-44228",
          recommended_waf_action: "BLOCK_IMMEDIATE"
        },
        {
          id: "indicator--77ba22c1-2f22-4ff9-88fa-0012bcfe1e48",
          type: "indicator",
          name: "Spring4Shell Dynamic Inbound Probe",
          pattern: "class.module.classLoader.resources.context.parent",
          threat_behavior: "Exploiting CVE-2022-22965",
          recommended_waf_action: "DROP_SILENT"
        }
      ]
    }
  },
  {
    path: "/api/v1/intel/ai_summary.json",
    url: "https://intel.cyberdudebivash.com/api/v1/intel/ai_summary.json",
    description: "Daily automated security threat summary synthesised by CyberDude AI.",
    responseType: "JSON",
    mockPayload: {
      generated_at: new Date().toISOString(),
      synthesizer_model: "CyberDude AI Security Architect Engine",
      overall_summary: "The global threat landscape in the last 24 hours has seen an 11.2% rise in SSH credential brute-forcing targeting South Asian banking networks. Mitigation is actively managed by CyberDude WAF. India DPDP Compliance frameworks must ensure prompt audit log archival.",
      risk_trends: {
        financial_sector: "HIGH_MONITOR",
        critical_infrastructure: "STABLE",
        saas_endpoints: "ELEVATED_ATTENTION"
      },
      recommended_policy: "Enforce zero-trust JWT token rotators and isolate SSH public gates on port 22 immediately."
    }
  },
  {
    path: "/api/feed.json",
    url: "https://intel.cyberdudebivash.com/api/feed.json",
    description: "Standard JSON syndication feed for integration with SIEM networks.",
    responseType: "JSON",
    mockPayload: {
      version: "https://jsonfeed.org/version/1.1",
      title: "CYBERDUDEBIVASH® Global Threat Stream",
      home_page_url: "https://intel.cyberdudebivash.com/",
      feed_url: "https://intel.cyberdudebivash.com/api/feed.json",
      items: [
        {
          id: "feed-alert-0428",
          url: "https://intel.cyberdudebivash.com/alerts/feed-alert-0428",
          title: "New LockBit Variant targeting SMB ports on Linux",
          content_text: "Sentinel Node 14 detected structured attacks targeting SMB vulnerabilities. Immediate block deployed.",
          date_published: new Date().toISOString()
        }
      ]
    }
  },
  {
    path: "/api/reports/latest.json",
    url: "https://intel.cyberdudebivash.com/api/reports/latest.json",
    description: "Deep response intelligence reports catalog published by our SOC.",
    responseType: "JSON",
    mockPayload: {
      report_classification: "CDB-SECURE-TLP-AMBER",
      release_date: new Date().toISOString(),
      report_id: "CDB-IRR-2026-9041",
      title: "Anatomy of Threat Group 'CDB-APT-22' Cloud Hijack Campaigns",
      executive_summary: "A thorough post-incident analysis of container privilege escalation methods. This report isolates the exact API telemetry logs that identify unauthorized Docker sockets access.",
      key_iocs: ["103.142.12.98", "91.240.118.50"],
      mitigation_steps: [
        "Restrict docker.sock access to root only.",
        "Verify daemon TLS settings."
      ]
    }
  },
  {
    path: "api-docs",
    url: "https://intel.cyberdudebivash.com/api-docs",
    description: "Interactive OpenAPI/Swagger Documentation for Sentinel APIs.",
    responseType: "HTML",
    mockPayload: `<!DOCTYPE html>
<html>
<head>
  <title>CYBERDUDEBIVASH Sentinel APEX API Documentation</title>
  <style>body{background:#0a0e14;color:#4af626;font-family:monospace;padding:40px;}</style>
</head>
<body>
  <h2>[SWAGGER v3.0] — Sentinel APEX Unified REST API Documentation</h2>
  <hr/>
  <p>AUTHENTICATION: Header Bearer token required. Format: <b>Authorization: Bearer cdb_live_key_******</b></p>
  <h3>GET /api/health</h3>
  <p>Returns JSON telemetry regarding core database, crawler status, and cluster pings.</p>
  <h3>GET /api/v1/intel/latest.json</h3>
  <p>Ingests active IP and Domain reputation threat counters into standard firewalls.</p>
</body>
</html>`
  },
  {
    path: "upgrade.html",
    url: "https://intel.cyberdudebivash.com/upgrade.html",
    description: "Enterprise tier upgrade portal containing multi-region SOC SLA details.",
    responseType: "HTML",
    mockPayload: `<!DOCTYPE html>
<html>
<head>
  <title>Enterprise Portal Upgrade</title>
  <style>body{background:#04080e;color:#fff;font-family:sans-serif;text-align:center;padding:100px;}</style>
</head>
<body>
  <h1 style="color:#06b6d4;">CYBERDUDEBIVASH® Enterprise Defense Suite</h1>
  <p>Unlock 10,000 queries per second, localized physical hardware security modules (HSM) backups, and live 15-minute response SLA guarantees.</p>
  <button style="background:#06b6d4;border:none;padding:12px 24px;border-radius:4px;font-weight:bold;cursor:pointer;">Contact Security Coordinator</button>
</body>
</html>`
  }
];

export const SOCIAL_PROFILES: SocialProfileItem[] = [
  {
    platform: "LinkedIn",
    url: "https://www.linkedin.com/company/cyberdudebivash/",
    username: "cyberdudebivash",
    category: "Executive",
    metric: "Official Corporate Page",
    actionText: "Follow Updates"
  },
  {
    platform: "Instagram",
    url: "https://www.instagram.com/cyberdudebivash_official/",
    username: "@cyberdudebivash_official",
    category: "Social",
    metric: "Security Tips & Reels",
    actionText: "Join Community"
  },
  {
    platform: "Facebook",
    url: "https://www.facebook.com/profile.php?id=61583373732736",
    username: "CyberDudeBivash",
    category: "Social",
    metric: "Official Profile Page",
    actionText: "Connect Page"
  },
  {
    platform: "X / Twitter",
    url: "https://x.com/CDBSENTINELAPEX",
    username: "@CDBSENTINELAPEX",
    category: "Executive",
    metric: "Threat Alerts Feed",
    actionText: "Follow Alerts"
  },
  {
    platform: "Fiverr Core",
    url: "https://www.fiverr.com/bivashkumar007/",
    username: "bivashkumar007",
    category: "Freelance",
    metric: "Verified Security Audits",
    actionText: "Hire on Fiverr"
  },
  {
    platform: "Upwork Agency",
    url: "https://www.upwork.com/freelancers/~010d4dde1657fa5619",
    username: "Bivash Kumar N.",
    category: "Freelance",
    metric: "Expert Penetration Testing",
    actionText: "Hire on Upwork"
  },
  {
    platform: "Pinterest",
    url: "https://in.pinterest.com/CYBERDUDEBIVASH_Official/",
    username: "CYBERDUDEBIVASH_Official",
    category: "Social",
    metric: "Infographics & Architecture",
    actionText: "Browse Boards"
  },
  {
    platform: "Medium Publications",
    url: "https://medium.com/@cyberdudebivash",
    username: "@cyberdudebivash",
    category: "Media",
    metric: "Cyber Security Writeups",
    actionText: "Read Articles"
  },
  {
    platform: "Threads",
    url: "https://www.threads.com/@cyberdudebivash_official",
    username: "@cyberdudebivash_official",
    category: "Social",
    metric: "Tech Snippets Feed",
    actionText: "Interact Threads"
  },
  {
    platform: "YouTube Channel",
    url: "https://www.youtube.com/@CYBERDUDEBIVASHSentinelAPEX",
    username: "CYBERDUDEBIVASHSentinelAPEX",
    category: "Media",
    metric: "Video Walkthroughs & Labs",
    actionText: "Subscribe Now"
  },
  {
    platform: "Blogspot Cybersecurity",
    url: "https://cyberdudebivash-news.blogspot.com/",
    username: "cyberdudebivash-news",
    category: "Media",
    metric: "Live News & Bulletins",
    actionText: "Visit News Blog"
  },
  {
    platform: "Blogspot Personal",
    url: "https://cyberbivash.blogspot.com/",
    username: "cyberbivash",
    category: "Media",
    metric: "Founder Security Notes",
    actionText: "Read Notes"
  }
];

export const CORPORATE_REGISTRATION = {
  gstin: "21ARKPN8270G1ZP",
  legalName: "BIVASHA KUMAR NAYAK",
  tradeName: "CYBERDUDEBIVASH PVT LTD",
  pan: "ARKPN8270G",
  address: "CYBERDUDEBIVASH PRIVATE LIMITED, 29, Korai -Sukinda-Ramchandrapur Rd, Ragadi, JAJPUR ROAD, Odisha 755019",
  phone: "+91 81798 81447",
  email: "iambivash.BN@gmail.com",
  state: "Odisha",
  country: "India",
  regNumber: "CDB-IN-2024-GST"
};
