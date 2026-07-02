export type ViewType =
  | "home" | "intel" | "ai" | "tools" | "blog" | "api"
  | "about" | "privacy" | "terms" | "copyright"
  | "soc" | "dpdp" | "owasp" | "mssp" | "vciso" | "pentest";

export interface ThreatAlert {
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

export interface SecurityStats {
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

export interface CveItem {
  id: string;
  title: string;
  score: number;
  published: string;
  mitigation: string;
}

export interface LiveLogEntry {
  time: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "BLOCKED";
  msg: string;
}

export interface PremiumProduct {
  id: string;
  title: string;
  price: string;
  desc: string;
}
