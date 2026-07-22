# CLAUDE.md

Project memory for Claude Code sessions working in this repository — the production website, AI SOC dashboard, and backend for **CYBERDUDEBIVASH® PRIVATE LIMITED**, an Indian cybersecurity/AI-security company. Read this before touching anything that states a fact about the company (compliance status, certifications, stats, legal identity) or anything framed as a "strategic"/business recommendation.

## What actually governs this repo

This repo already runs a disciplined, living audit process — read it before assuming something is undocumented:
- `docs/audit/RISK_REGISTER.md` — open and retired risks. Check here before re-reporting a finding.
- `docs/audit/PROGRAM_BACKLOG.md` — prioritized action items, owners, gates.
- `docs/audit/DECISION_LOG.md` and `docs/audit/history/` — prior stages' reasoning; don't re-litigate a decision recorded there without new evidence.
- `COMPLIANCE.md`, `SECURITY.md`, `PRIVACY.md`, `TERMS.md`, `RESPONSIBLE_DISCLOSURE.md` — the company's actual public compliance/legal posture.

If you find a new bug, drift, or unsupported claim, log it in `RISK_REGISTER.md` (and `PROGRAM_BACKLOG.md` if it implies an action item) in the same style as existing entries, rather than only mentioning it in chat.

## Single sources of truth — read these, don't retype facts

Company identity, legal registration, and compliance wording exist in exactly one place each. Import/reference them; never hardcode a fresh copy, and never let a new display site invent its own wording:

| Fact | Canonical source |
|---|---|
| Legal name, PAN, GSTIN, registered address, founder, phone | `src/constants/ecosystemData.ts` → `CORPORATE_REGISTRATION` |
| Compliance framework names + honest "aligned, not certified" disclosure | `src/constants/ecosystemData.ts` → `COMPLIANCE_DISCLOSURE`, `COMPLIANCE_FRAMEWORKS`, `aligned()` |
| schema.org / SEO organization data, contact points | `src/seo/config/organization.config.ts` |
| Ecosystem URLs (Sentinel APEX, AI Hub, Tools, Blog, official site) | `src/constants/ecosystemData.ts` → `ECOSYSTEM_PORTALS` |
| Full compliance narrative | `COMPLIANCE.md` |

**Every one of these already has code comments explaining *why* they exist as single sources of truth** — a previous session hardcoded compliance wording independently in multiple places and it drifted out of sync with reality (see git history: "Fix GA-1 docs... correct claims to match reality"). `aligned()` exists specifically so no page can independently claim "Certified" or "Audited" when the company is not. Route new compliance badges through it.

## Ground truth: what CYBERDUDEBIVASH actually is today

- Small, founder-led Indian cybersecurity company (Odisha), operating since 2020. Real legal entity (PAN/GSTIN verifiable on the Indian Government GST portal — the site correctly invites this).
- **Not formally ISO/IEC 27001 certified. Not formally SOC 2 audited. Not confirmed CERT-In empanelled.** The company's own `COMPLIANCE.md` says so explicitly. Internal practices are described as "aligned," which is a real and defensible claim; "certified," "audited," "empanelled," or "notified" are not, unless someone provides evidence otherwise.
- The public dashboard's AI SOC terminal (threat map, live event feed, compliance-score sliders) is an **illustrative demo** (`AiSocDashboard.tsx`), clearly labeled as such in the UI — treat its numbers as illustrative, not real telemetry, when reasoning about the product.
- The AI Security Copilot (`POST /api/security/analyze` in `server.ts`) is a **real** feature — it calls Gemini/Groq/DeepSeek/OpenRouter with a shared system prompt, falling back to a canned offline response if all providers fail. Changes to that system prompt affect every provider at once.

## Known open decisions — do not silently resolve these

- **Canonical contact email.** Three (arguably four, counting this program's own operating brief) different addresses are live across the codebase for different purposes. A prior session found this and deliberately declined to pick one — see the header comment in `src/seo/config/organization.config.ts` and `RISK_REGISTER.md` risk 12. This is the founder's decision, not an engineering one.
- **Unverified commercial stats** ("2,500+ engagements," "97% critical findings rate," "500K+ threat IOCs," "99.9% uptime," etc.) — can't be confirmed or denied from this repository. See `RISK_REGISTER.md` risk 13. Don't invent evidence for them and don't silently change the numbers either way; ask the founder or flag it.

## Anti-fabrication rules (non-negotiable)

These are the rules the audit above exists to enforce. Apply them to code, docs, and chat responses alike:
- Never assert a certification, audit, award, empanelment, partnership, or customer count that isn't backed by something in this repo. "Aligned with X" is fine; "Certified by X" is not, unless a certificate is evidenced.
- If a fact is missing, say what's missing — don't fill the gap with a plausible-sounding number.
- A system prompt, chatbot, or generated document is a public statement of fact just as much as a webpage — hold backend prompts (`server.ts`) to the same accuracy bar as visible UI copy.
- Any feature that generates a script, config, or command a user might actually run (see the Exploit Mitigation Lab's shell/nginx/YARA generator) must validate untrusted input before interpolating it — treat generated-output injection as seriously as input injection, especially for a security-product vendor.

## Mission and what "good" means here

CYBERDUDEBIVASH is building toward being a globally credible cybersecurity/AI-security/threat-intelligence company through secure products, trustworthy claims, and real engineering quality — not vanity metrics. When making recommendations, optimize for customer value, trust, security, reliability, scalability, compliance, and durable growth over short-term/promotional wins.

### Executive lens for strategic recommendations

For genuinely strategic or business-facing asks (product direction, pricing, positioning, go-to-market, architecture with business consequences — not routine bug fixes or small features), briefly consider the request from these angles before answering: CEO/business viability, CTO/technical soundness, CISO/security and compliance exposure, CPO/customer value, CMO/CRO/brand and revenue impact, COO/operational cost. You don't need to write out every persona's opinion — use the lens to catch what a single-perspective answer would miss, then give a direct recommendation.

### Output structure for strategic/business deliverables

When a request genuinely calls for a strategic write-up (not a routine code change), structure it around whichever of these are relevant — omit sections that would be empty or padding: Executive Summary, Business Context, Technical/Security Analysis, Product & Customer Impact, Revenue & Brand Impact, SEO/Local SEO Impact (for content), Risk Assessment, Implementation Roadmap, Immediate Next Actions, Success Metrics, Assumptions & Open Questions. Match depth to the actual stakes of the question — a routine implementation task should get a normal engineering response, not this template.

### Content governance

For blogs, whitepapers, product/service pages, or anything published externally: educate before promoting, separate verified facts from assumptions explicitly, and prefer a defensible disclaimer over an inflated claim. This is the same standard `COMPLIANCE.md` and `aligned()` already enforce in code — apply it to prose too.
