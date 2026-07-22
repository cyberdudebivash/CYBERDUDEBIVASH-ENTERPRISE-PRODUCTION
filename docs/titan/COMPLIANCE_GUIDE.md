# Compliance Guide (SEC-1)

**This document does not claim, and cannot grant, any compliance certification** (SOC 2, ISO 27001, GDPR, DPDP, or any other framework). `ROADMAP.md` has already recorded this honestly: "Compliance (SOC 2/ISO 27001 readiness, formal GDPR/DPDP compliance) — not started. Organizational/legal work (external audits, legal review, retention-policy decisions), not something a code session completes." That remains true. What this document does: maps the real, evidenced controls this repository already has to the compliance domains a future real audit would examine — so that work isn't starting from zero the day one is commissioned, and so nothing here is mistaken for a certification that doesn't exist.

## Security policies

No formal, organization-level written security policy document exists (that's an organizational artifact, not a code one). What exists instead, as real evidence a policy would cite: `SECURITY_GUIDE.md` (threat model, control review, known gaps), `SECURITY_ARCHITECTURE.md` (trust boundaries, authorization model), `THREAT_MODEL.md` (STRIDE analysis, findings register), `INCIDENT_RESPONSE_GUIDE.md` (severity matrix, response procedure), and this document — together, the real technical substance a written policy would formalize and an organization would need to adopt.

## Access control

| Control | Real evidence |
|---|---|
| Deny-by-default authorization | Every one of 45 routes fails closed to 401/403 for a caller `resolveCaller` can't positively authorize (`SECURITY_GUIDE.md`'s ASVS V4 row, verified against a real running Worker) |
| Least privilege | Three-tier role model (`member`/`admin`/`owner`) plus a Platform Administrator sentinel convention, each with an evidenced, narrow grant (`SECURITY_ARCHITECTURE.md`'s authorization flow) |
| Tenant/customer data isolation | `resolvePortalOrganizationId` — server-side-resolved scope, never client-supplied (`SECURITY_ARCHITECTURE.md`'s tenant isolation model) |
| Privileged-role bootstrap control | The very first Platform Administrator requires a direct database action, not a self-service route — a deliberate anti-escalation control, not an oversight (`SECURITY_GUIDE.md`'s "Authorization model") |
| Access review / recertification | **Not built** — no scheduled review process for who holds Platform Administrator exists. A real gap for a future phase with a real user base to review, not stubbed speculatively today |

## Logging and audit evidence

| Control | Real evidence |
|---|---|
| Structured application logs | Every request logged with `level`/`message`/`timestamp`/`requestId` (`observability/logger.ts`, `MONITORING_GUIDE.md`'s log classification) |
| Business-event audit trail | `audit_events` — append-only interface (no `update`/`delete` method exists on `AuditRepository` at all, `SECURITY_GUIDE.md`'s Surface 3 STRIDE table), real events for every creation, update, archival, restoration, role change, and privileged view across every module |
| Operational-event logging | `"operational alert evaluated"` structured log lines (OPS-1), correlated by `requestId` |
| Log retention | **Not durable today** — no deployed environment, no log drain, no persisted retention (`MONITORING_GUIDE.md`'s own honest limitation). A real audit would need Cloudflare Workers Logs (or an external drain) enabled and a retention period chosen — both blocked on a real deployment existing |
| Audit-log integrity | Real evidence: no writer anywhere in this codebase can modify or delete an `audit_events` row once written (append-only by omission, not just convention) |

## Configuration and change management

| Control | Real evidence |
|---|---|
| Configuration-as-code | `wrangler.toml`'s named environments, version-controlled, reviewed via the same PR process as application code |
| Production configuration validation | `config/validateEnv.ts`'s `validateProductionConfig` — a real, tested check that fails a misconfigured `staging`/`production` deployment's readiness (PRD-1, OPS-1) |
| Change tracking | Git history itself — every phase's own commits, `DECISION_LOG.md`'s chronological record of every design decision with its real rationale |
| Secrets separation from code | `.dev.vars`/`.env.local` gitignored; `wrangler.toml` holds only non-secret `[vars]`; real secrets would live in Cloudflare's own write-only secret store (`SECURITY_GUIDE.md`'s "Secrets management") |
| CI/CD least-privilege | Explicit `permissions: contents: read` on both `titan-ci.yml`/`titan-deploy.yml` (**SEC-1**, matching the marketing site's own `deploy.yml` convention) |

## Risk management

| Control | Real evidence |
|---|---|
| Threat modeling | `SECURITY_GUIDE.md`'s STRIDE tables (Surfaces 1-4) plus `THREAT_MODEL.md`'s (Surfaces 5-6) |
| Findings register | `THREAT_MODEL.md`'s security findings register — every finding classified by real-world severity in this system's actual context, with status and evidence |
| Dependency/supply-chain risk | Fresh `npm audit` this phase (3 high-severity CVEs found, classified, and honestly deferred with reasoning — not silently ignored); ERP-1's prior lockfile-integrity/postinstall-script/dependency-confusion review, re-checked this phase (postinstall script count grew from 3 to 7 since ERP-1 — `fsevents` ×2 and `sharp` newly present, both fitting the identical "well-known package, platform-specific prebuilt binary" pattern ERP-1 already established as safe, not a new anomaly) |
| Vulnerability remediation tracking | `THREAT_MODEL.md`'s findings register doubles as the remediation tracker — each finding has a real status (Fixed/Deferred/Blocked/Known accepted), not just a list of problems |

## Data protection

| Control | Real evidence |
|---|---|
| Data minimization | `GET /api/reports/export`/`GET /api/portal/reports/export` contain only aggregate counts, never individual records (`SECURITY_GUIDE.md`'s EAP-8/CPP-1 paragraphs, verified directly against the row-construction code) |
| No payment/card data | `COM-1`'s commercial model is provider-agnostic by construction — no payment amount, card, or invoice field exists anywhere in this schema (`SECURITY_GUIDE.md`) |
| Encryption in transit | HSTS header present (`max-age=63072000; includeSubDomains`) — takes effect the day this is served over real HTTPS; meaningless over local plain-HTTP `wrangler dev` today, by spec, not a gap in the code |
| Encryption at rest | Cloudflare D1's own platform-level encryption at rest, once deployed — not something this application's own code implements or could verify from inside the repository |
| Data subject rights (access/deletion) | **Not built** — no self-service "export my data"/"delete my account" flow exists. A real, likely GDPR/DPDP-relevant gap for the day this handles real personal data in production, not stubbed speculatively ahead of a real legal review |
| Data retention policy | **Not built** — `audit_events` grows unboundedly with no retention/archival policy (`SRE_GUIDE.md`'s real, named capacity finding, OPS-1). Not urgent at today's real volume (373 rows), but a real gap a compliance review would flag |

## Operational controls

| Control | Real evidence |
|---|---|
| Health/readiness monitoring | `GET /health`/`GET /health/ready`, now also reflecting configuration validity (OPS-1) |
| Incident response process | `INCIDENT_RESPONSE_GUIDE.md` — severity matrix, response procedure, templates, honestly framed around today's single-maintainer, nothing-deployed reality |
| Disaster recovery | A real, executed, verified backup/restore drill with exact data-integrity match (`DISASTER_RECOVERY.md`, PRD-1) |
| Change deployment control | `titan-deploy.yml` is `workflow_dispatch`-only — no automatic production deployment exists, by design |
| Segregation of environments | `staging`/`production` are separate Cloudflare environments with independently-set secrets — a `staging` compromise cannot forge a `production` session, by Cloudflare's own per-environment secret scoping (`ENVIRONMENT_GUIDE.md`) |

## What a real future compliance effort would need, in real dependency order

1. **A real deployment** — nearly every "Blocked" item across `SECURITY_GUIDE.md`/`THREAT_MODEL.md`'s findings register sits behind this one external dependency (no Cloudflare account has ever existed).
2. **A data retention/deletion policy decision** — organizational and legal, not a code change; needed before data-subject-rights tooling can be built correctly.
3. **A real external audit engagement** — SOC 2/ISO 27001/GDPR/DPDP formal compliance requires an independent auditor; this document is real preparation material for that engagement, not a substitute for it.
4. **GitHub Environment protection rules configured** (SEC-1-10, `THREAT_MODEL.md`) — a repository setting, real and actionable today, independent of the above.
