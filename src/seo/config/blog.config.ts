import type { SEOArticle, SEOCategory } from "../types/entities";

// Owns: blog article records and their categories. Transcribed
// directly from the three sample posts in src/views/BlogView.tsx —
// same titles, descriptions, authors, categories, and dates. The real
// blog itself is hosted externally (blog.cyberdudebivash.in — see
// products.config.ts's "blog" entry); these three are what's actually
// present as structured content in this repository today, not a
// fabricated larger catalog.

export const BLOG_CATEGORIES: SEOCategory[] = [
  { id: "kernel-exploits", name: "Kernel Exploits" },
  { id: "phishing-analysis", name: "Phishing Analysis" },
  { id: "llm-security", name: "LLM Security" },
];

export const BLOG_ARTICLES: SEOArticle[] = [
  {
    id: "dirtyclone-cve-2026-43503",
    title: "Deep-Dive Teardown of DirtyClone (CVE-2026-43503) Linux Privilege Escalation",
    description: "An exhaustive static and behavioral walkthrough of the DirtyClone memory corruption flaw allowing unprivileged users to silently rewrite executable code segments directly in kernel buffers.",
    url: "https://blog.cyberdudebivash.in/dirtyclone-cve-2026-43503",
    authorId: "bivasha-kumar-nayak",
    categoryIds: ["kernel-exploits"],
    publishedDate: "2026-06-26",
    primaryKeyword: "CVE-2026-43503 DirtyClone",
    searchIntent: "informational",
    funnelStage: "awareness",
  },
  {
    id: "bluekit-aitm-phishing-report",
    title: "MFA Bypass via Adversary-in-the-Middle (AiTM) Phishing Kits: Bluekit Operational Report",
    description: "Analysis of nearly 70 active hostnames distributing browser-in-the-middle proxy configurations, OIDC token stealing patterns, and direct countermeasures.",
    url: "https://blog.cyberdudebivash.in/bluekit-aitm-phishing-report",
    authorId: "sentinel-apex-team",
    categoryIds: ["phishing-analysis"],
    publishedDate: "2026-06-24",
    primaryKeyword: "AiTM phishing kit MFA bypass",
    searchIntent: "informational",
    funnelStage: "awareness",
  },
  {
    id: "owasp-llm-prompt-injection-mapping",
    title: "OWASP Top 10 Mapping for Large Language Models: Prompt Injection Vectors Explored",
    description: "How prompt injections bypass sanitization logic to trick AI coding assistants into cloning malicious subrepositories and executing local OS shell codes.",
    url: "https://blog.cyberdudebivash.in/owasp-llm-prompt-injection-mapping",
    authorId: "cyberdude-research-lab",
    categoryIds: ["llm-security"],
    publishedDate: "2026-06-20",
    primaryKeyword: "OWASP LLM prompt injection",
    searchIntent: "informational",
    funnelStage: "awareness",
  },
];
