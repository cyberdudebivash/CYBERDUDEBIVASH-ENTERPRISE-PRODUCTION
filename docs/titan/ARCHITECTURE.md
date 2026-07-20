# Architecture — CyberDudeBivash Compliance Platform (Project Titan)

Planning-phase document. Every choice below is a recommendation to review, not a decision already executed — nothing has been built yet.

## Where this lives

Chosen: inside this repository (`CYBERDUDEBIVASH-ENTERPRISE-PRODUCTION`), not a new repo. Recommendation for *how*: as a **separate top-level application directory**, e.g. `titan/`, not woven into `src/` (the existing marketing SPA).

Why separate, even in the same repo:

| Dimension | Existing site (`src/`, root `*.html`) | Titan |
|---|---|---|
| State | Stateless static content | Stateful — accounts, assessments, leads, CRM records |
| Data | None (no database) | Needs a real database, multi-tenant |
| Auth | None | Needs real authentication (admin + customer portal) |
| Deploy target | Static hosting (GitHub Pages / Cloudflare Pages) | Needs a real application host (backend + DB) — cannot deploy the same way |
| Release cadence | Content-driven, infrequent structural change | Product-driven, frequent |

A monorepo with `titan/` as its own directory (own `package.json`, own build, own deploy pipeline) keeps one repository, one git history, one PR/review convention — but doesn't force a stateful SaaS product and a static marketing site through the same build or the same deployment target, which the current repo's five-stage audit trail (`docs/audit/`) already shows causes real problems even *within* a single static site's build pipeline.

**Marketing pages for Titan** (landing, pricing, blog, resources — everything in Module 1 that needs SEO) are a different concern from **the application** (questionnaire, admin portal, customer portal — everything behind auth, none of which needs to be indexed). Recommendation: Titan's own marketing pages ship as static/SSG content (consistent with how the existing site already handles SEO-critical pages), and the authenticated app is a separate SPA. This mirrors the split the existing repo already has between its 16 static pages and its `src/` SPA — a pattern this engagement has already spent five stages validating works, including its failure modes.

## Module → subsystem map

The original 20-module list groups into five subsystems:

| Subsystem | Modules |
|---|---|
| **Public/Marketing** | 1 (Marketing Website) |
| **Assessment Core** | 2 (Questionnaire Engine), 3 (Risk Engine), 4 (Recommendation Engine), 5 (AI Insights), 6 (PDF Generator) |
| **Growth/Ops** | 7 (Lead Qualification), 8 (CRM Integration), 10 (Analytics), 11 (Automation), 12 (Booking) |
| **Internal/Customer-facing apps** | 9 (Admin Portal), 13 (Customer Portal) |
| **Platform (cross-cutting, applies to all of the above)** | 14 (APIs), 15 (Security), 16 (Performance), 17 (Accessibility), 18 (SEO), 19 (Observability), 20 (Testing) |

The Platform row isn't a phase — it's a standard every module in the other four rows has to meet, per the original brief's own quality gates. `ROADMAP.md` treats it that way.

## Tech stack — recommendations, not decisions

| Layer | Recommendation | Rationale | Alternative considered |
|---|---|---|---|
| Frontend (app) | React 19 + TypeScript + Vite | Matches existing repo conventions and dependencies already in `package.json`; no new frontend paradigm to learn | Next.js app router — rejected for the *app* since nothing behind auth needs SSR |
| Frontend (marketing) | Static/SSG pages, same approach as the existing site's 16 static pages, or a lightweight SSG (Astro/Next.js static export) if templated content generation (blog, resource pages) becomes worth automating | SEO is a Module 1 requirement; the existing site already proves this pattern works and is already audited for it | Full SSR framework for the whole app — rejected, adds infrastructure complexity for pages that don't need it |
| Backend | Node.js + Express (extends the existing `server.ts` pattern) or a dedicated API framework (Fastify/NestJS) if the team wants stronger structure for a larger codebase | Express is the existing convention; NestJS gives more structure for a system this size (20 modules) at the cost of a steeper learning curve | Serverless functions per-endpoint — viable, revisit at Phase 0 based on deployment-target decision below |
| Database | PostgreSQL | Relational data model (organizations, users, assessments, questions, responses, leads, CRM records) fits relational modeling; strong tooling, migrations, and hosting options | A document store (Mongo) — viable but loses relational integrity guarantees for data that's inherently relational (an assessment belongs to one org, has many responses, each response to one question) |
| Auth | A vetted auth library/service (e.g., Lucia, Auth.js, or a managed provider like Clerk/Auth0) rather than hand-rolled sessions | Module 15 requires OWASP-grade auth; rolling this from scratch is the highest-risk place to introduce a security defect in the whole platform | Hand-rolled JWT — explicitly not recommended |
| AI Insights | Google Gemini via `@google/genai` | Already a dependency in this repo, already integrated in `server.ts` for a different feature — reuse, don't introduce a second AI provider without reason | — |
| PDF generation | Headless-browser HTML-to-PDF (Playwright, already available in this environment) rendering a templated report | Produces pixel-accurate, brand-consistent reports from the same design system as the web UI; avoids maintaining a second, parallel PDF-layout system | A dedicated PDF library (pdf-lib, etc.) — more control, more manual layout work; revisit if headless-browser rendering proves too slow at volume |
| Email | Needs a transactional email provider — **not yet chosen, no candidate currently in this repo's dependencies** | Required for Module 11 (Automation) and the whole lead/report-delivery flow | Decision needed at Phase 0 |
| Payments | **Not in the original module list at all — flagged as a gap in `PRODUCT_VISION.md`.** Recommendation when addressed: a payment gateway with strong India support (Razorpay is the common default for Indian SaaS; Stripe also supports India) | Four of seven business tiers require charging money | Decision needed before Phase 2 |
| CRM | Build a lightweight CRM data model inside Titan's own database (Module 9's "CRM" tab) rather than integrate a third-party CRM initially | Avoids an external dependency and its cost/complexity before there's proven lead volume to justify it; the data model is simple (lead, activity, pipeline stage) | Integrate HubSpot/Salesforce/Zoho — revisit once lead volume or team size makes an internal CRM UI insufficient |
| Booking | Embed an existing scheduling tool (Calendly-equivalent) initially rather than build calendar/timezone logic from scratch | Calendar/timezone handling is a notoriously easy place to introduce subtle bugs; an embed gets Module 12 working correctly on day one | Build native scheduling — revisit if embed limitations (branding, data ownership) become a real problem |
| Deployment target (Titan app) | **Needs a real application host — cannot use GitHub Pages/Cloudflare Pages (static-only) the way the current site does.** Candidates: Cloudflare Workers + D1/Postgres, or a traditional Node host (Render, Railway, Fly.io) | Decision needed at Phase 0; affects the database choice above (D1 is SQLite-based, not Postgres) | — |

## Data model (entities, not full schema — schema is Phase 0 implementation work)

```
Organization ──< User (admin | customer role)
Organization ──< Assessment ──< Response >── Question ──< QuestionCategory
Assessment ──1 RiskScore ──< RiskFinding
Assessment ──< Recommendation
Assessment ──1 Report (generated PDF artifact)
Lead ──1 Organization (nullable until qualified)
Lead ──< CRMActivity
Lead ──0..1 Booking
User ──< AuditLogEntry
```

Every entity above needs a tenant boundary (`organization_id` or equivalent) enforced at the query layer, not just the application layer — this is the highest-severity security requirement for a multi-tenant SaaS handling organizations' self-reported security posture data, and belongs in Module 15's acceptance criteria explicitly, not as an assumed default.

## Security architecture (Module 15, elaborated)

- **Tenant isolation**: every data access path scoped by organization ID, enforced with row-level security or an equivalent query-layer guarantee — not just checked in application code, which is one missed check away from a cross-tenant leak.
- **Auth**: see Tech Stack table — a vetted library, not custom.
- **Secrets**: environment-variable-injected at the hosting layer, never committed (this repo already has a clean track record here — `PRODUCTION_SCORECARD.md` confirms zero secrets found across five audit stages — the same discipline carries forward).
- **Input validation**: schema validation (e.g., Zod) at every API boundary, particularly the questionnaire-response endpoints, which are the highest-volume, most user-controlled input surface.
- **Rate limiting**: required on the free-assessment start endpoint specifically (abuse/scraping vector) and the AI Insights endpoint (cost-abuse vector — the existing repo's own architecture audit already flagged this exact risk class on its current Gemini-backed endpoint).
- **Audit logging**: every admin action, every access to another organization's data (support access), append-only.
- **Encryption**: TLS in transit (standard for any modern host); at-rest encryption via the database host's native support (Postgres providers generally offer this by default) rather than custom application-layer encryption, which is a common source of key-management bugs.

## Observability & testing strategy (approach, not implementation)

- **Logging**: structured (JSON) application logs, correlation IDs per request.
- **Monitoring/health checks**: a `/health` endpoint from Phase 0 onward — this repo's own `PROGRAM_BACKLOG.md` #9 already flags the *current* site's total absence of this as a real gap; Titan should not repeat it.
- **Error reporting**: a hosted error-tracking service (Sentry-class) from Phase 0 — same rationale.
- **Testing pyramid**: unit tests for the risk-scoring engine specifically get the highest priority and coverage bar, since a scoring bug is a correctness bug with real consequences for what an organization is told about their compliance posture. Integration tests for API boundaries. E2E tests for the critical path (landing → questionnaire → results, and admin login → view assessment). Accessibility and performance tests run in CI, not manually, from Phase 0 — retrofitting them later, as this repo's own architecture audit found for the *existing* site, is far more expensive than building them in from the start.

## Open decisions (need a human answer before the relevant phase starts)

1. Payments provider (before Phase 2 — no free-to-paid conversion is possible without this)
2. Application hosting target (before Phase 0 implementation starts — affects database choice)
3. Email provider (before Phase 0)
4. Auth provider — build on a library vs. use a managed service (before Phase 0)
5. Whether the DPDP assessment framework content (`DPDP_ASSESSMENT_FRAMEWORK.md`) gets expert legal review before Phase 1, or the framework ships labeled "draft" and gets reviewed in parallel — recommend the former, but this is a business risk tradeoff, not a technical one
