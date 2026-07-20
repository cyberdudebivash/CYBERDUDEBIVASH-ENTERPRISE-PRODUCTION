# Security Guide — Project Titan

A threat model and control review for `titan/`, written from the system as it actually exists after the Security Release Blocker Sprint — not a generic checklist. Every "mitigated" claim below names the actual code that does it; every "open" item names why it's open and what would close it. See `PLATFORM_FOUNDATION.md` for the broader implementation status and `ARCHITECTURE.md` for the architecture audit this guide's threat model is scoped against.

## System surfaces in scope

1. **Public DPDP assessment flow** (`titan/apps/web`'s `/assessment/dpdp`) — unauthenticated, browser-facing.
2. **Worker API** (`titan/packages/platform`) — `GET /health`, `POST`/`GET /api/leads`, `POST /api/assessments`, `GET /api/assessments/:id`, `/api/auth/*`. `GET /api/leads` and `GET /api/assessments/:id` are now authorization-gated (Security Release Blocker Sprint) — see "Authorization model" below.
3. **D1 database** — organizations, users, sessions, user_profiles, assessments, leads, reports, audit_events.
4. **Auth.js authentication** — database sessions, Email (dev-mode)/Google/GitHub providers.
5. **Audit trail** — `audit_events`, written on lead/assessment creation.

## Authorization model (Security Release Blocker Sprint)

Roles, from lowest to highest privilege:

| Role | Definition | Grants |
|---|---|---|
| Anonymous | No session (`GET /api/auth/session` returns no user, or no session cookie at all) | `POST /api/leads`, `POST /api/assessments` (the public assessment flow — deliberately stays anonymous, `PRODUCT_VISION.md`), `GET /health`, `GET /health/ready` |
| Authenticated User | A real session, but no `user_profiles` row anywhere | Nothing beyond Anonymous today — there's no protected route yet that a bare authenticated user (no role anywhere) can reach |
| Organization Member/Admin/Owner | A `user_profiles` row with a real `organizationId` and `role` of `member`/`admin`/`owner` (`auth/rbac.ts`'s existing three-role model, unchanged) | Read access to their own organization's assessments (`GET /api/assessments/:id` when the assessment's `organizationId` matches) |
| Platform Administrator | A `user_profiles` row with `organizationId: null` and `role: "owner"` — a grant not scoped to any organization (`auth/rbac.ts`'s `isPlatformAdministrator`) | Everything an Organization Owner has, for every organization, plus `GET /api/leads` (see below for why this is Platform-Administrator-only, not delegated to org roles) |

Endpoint-to-policy map:

| Endpoint | Policy | Enforced by |
|---|---|---|
| `GET /health`, `GET /health/ready` | Anonymous | No check (liveness/readiness only, no sensitive data) |
| `POST /api/leads`, `POST /api/assessments` | Anonymous (+ Origin/CSRF check, rate limit) | `security/csrf.ts`, `security/rateLimiter.ts` — unchanged this sprint |
| `GET /api/leads` | Platform Administrator only | `router.ts`'s `resolveCaller` + `auth/authorize.ts`'s `requireLeadsAccess` |
| `GET /api/assessments/:id` | Platform Administrator, or a member (any role) of the assessment's own `organizationId` | `router.ts`'s `resolveCaller` + `auth/authorize.ts`'s `requireAssessmentAccess` |
| `/api/auth/*` | Auth.js's own action-level rules | `@auth/core`, unchanged |

**Why `GET /api/leads` is Platform-Administrator-only, not delegated to organization roles:** `leadRepository`'s `list()` has no per-organization `WHERE` clause — it returns every organization's leads in one unfiltered query (confirmed by reading `leadRepository.d1.ts` directly). Gating this route at "any organization member" would grant a member of Organization A visibility into every other organization's leads too — a real cross-tenant leak dressed up as a fix, not a real one. Until the repository supports organization-scoped filtering (tracked below, "Known, accepted gaps"), only a caller with no single organization to be scoped to — a Platform Administrator — may call this route at all.

**Why `GET /api/assessments/:id` *is* delegated to organization roles:** unlike leads, a single assessment fetch is naturally scoped — the record being read has exactly one `organizationId` (or none), so "is the caller a member of *that* organization" is a correct, answerable question per request, unlike the all-organizations list above.

**Provisioning the first Platform Administrator** is a direct D1 insert, not a self-service flow — there is no route that grants this role (by design: an endpoint that lets a caller grant themselves platform-wide access would be its own privilege-escalation vulnerability). See `OPERATIONAL_RUNBOOK.md`'s "Provisioning a local Platform Administrator" section.

Out of scope for this document: anything requiring a deployed Cloudflare account (Turnstile, WAF rules, Cloudflare Access) — this project has never had one, in this session or any prior stage. See `ROADMAP.md`'s deferral record for why.

## Threat model (STRIDE)

### Surface 1 — Public assessment/lead submission

| Threat | Scenario | Mitigation | Status |
|---|---|---|---|
| Spoofing | Automated bot submits fake leads at volume | Per-IP rate limiting (`security/rateLimiter.ts`, 30/min on `POST /api/leads`) | Mitigated, but weak — see "Open: bot protection" below |
| Tampering (CSRF) | A malicious site's page issues a forged cross-origin `POST /api/leads` on a visitor's behalf | Origin-header validation (`security/csrf.ts`) — a present-but-mismatched `Origin` is rejected with 403 | **Mitigated** (RC1) |
| Tampering (data integrity) | A client submits a `result` (risk score) that doesn't match the `answers` it also submitted — e.g. reporting LOW risk while every answer indicates otherwise | `router.ts`'s `createLead`/`createAssessment` recompute `result` server-side via `@titan/assessment-core`'s `scoreAssessment`, discarding whatever the client sent in the request body. `createAssessment` first resolves `framework`/`frameworkVersion` against a small registry (`resolveQuestionBank`) and rejects an unrecognized pair with 400 `unsupported_framework` rather than trusting it | **Mitigated (Security Release Blocker Sprint).** Verified against a real running Worker, not just tests: a `POST /api/leads` submitting `answers` for two failed critical DPDP controls alongside a client-claimed `score: 0`/`riskLevel: "low"` persisted the real computed result (`score: 17`, two real gaps with their actual penalties) — the tampered value never reached D1 |
| Information disclosure | Lead form fields, error messages | React's default escaping (no `dangerouslySetInnerHTML` anywhere — confirmed by `grep`, `ARCHITECTURE.md`); error responses carry a `code`/`message`, never a stack trace or internal detail (`http/responses.ts`) | Mitigated |
| Denial of service | Volumetric abuse of the public form | Per-IP rate limiting — real, but per-Worker-isolate only (see "Open" below) | Partially mitigated |

### Surface 2 — Worker API

| Threat | Scenario | Mitigation | Status |
|---|---|---|---|
| Spoofing | Forged `cf-connecting-ip` header used to evade rate limiting | Cloudflare sets `CF-Connecting-IP` itself at the edge and strips/overwrites any client-supplied value before a Worker ever sees it — this only holds once actually deployed behind Cloudflare; a direct `wrangler dev` instance (as used for all local verification so far) has no such guarantee and trusts whatever header value is sent | Mitigated once deployed; **not applicable to local-only verification today** — documented so this isn't mistaken for a deployed guarantee |
| Tampering | Malformed/oversized request bodies | Every write endpoint validates required fields and object shapes (`validation/primitives.ts`) before touching a repository; invalid JSON returns 400, not a 500 | Mitigated |
| Repudiation | A write happens with no record of who/what caused it | Every lead/assessment creation records an `audit_events` row (`router.ts`'s `recordAuditEvent`); a failed audit write is logged but never silently swallowed | Mitigated for the actions instrumented so far (lead/assessment creation); login/logout/report-generation audit events are not yet emitted because those flows don't exist yet (no portal, no server-side reports) |
| Information disclosure | Verbose internal errors leak stack traces/paths | Centralized error handling (`router.ts`'s top-level `try/catch`) returns a generic `internal_error` to the client while logging the real error server-side with a correlating `requestId` | Mitigated |
| **Information disclosure (ERP-1 finding)** | **`GET /api/leads` had no authentication at all — any caller could list every captured lead: name, email, company, DPDP answers, risk result.** Originally verified directly against `router.ts`'s route dispatch. | `router.ts`'s `resolveCaller` (a real Auth.js session lookup + `UserProfileRepository.findByUserId`) gates the route via `auth/authorize.ts`'s `requireLeadsAccess`, requiring Platform Administrator | **Fixed (Security Release Blocker Sprint).** Verified against a real running Worker + real local D1, not just tests: anonymous → 401, authenticated-non-admin → 403, real Platform Administrator (provisioned via direct SQL, signed in through the real Auth.js email magic-link flow) → 200 with real data. See "Authorization model" above and `OPERATIONAL_RUNBOOK.md` |
| Denial of service | Sustained abusive traffic against any endpoint | Rate limiting on all state-changing routes, `/api/auth/*` POST actions on a separate, stricter limiter | Partially mitigated — see "Open: rate limiting is per-isolate" |
| Elevation of privilege | A caller reaches an endpoint or performs an action their role shouldn't allow | `GET /api/leads` and `GET /api/assessments/:id` are now gated (`auth/authorize.ts`'s `requireLeadsAccess`/`requireAssessmentAccess`) — the first two routes RBAC actually protects | **Mitigated for the two routes that exist.** No Admin/Customer Portal exists yet, so there is no broader privileged surface to escalate into beyond these two. Revisit the moment either portal adds routes; the same gate pattern (`resolveCaller` + a `require*` helper) is meant to extend, not be reinvented per route |

### Surface 3 — D1 database

| Threat | Scenario | Mitigation | Status |
|---|---|---|---|
| Tampering (SQL injection) | Malicious input reaching a raw SQL string | Every repository uses parameterized `db.prepare(...).bind(...)` — no string interpolation into SQL anywhere (`grep` confirms; every `*.d1.ts` file follows the same pattern) | Mitigated |
| Information disclosure | A repository leaks another tenant's data | `organization_id`/`assessment_id` foreign keys exist on every relevant table. Tenant isolation is enforced at the application layer, not the query layer: `getAssessment` fetches the single record first, then `requireAssessmentAccess` checks the caller's membership against that record's own `organizationId` before returning it (`router.ts`). `listLeads`'s underlying query is still genuinely unfiltered by organization — that's exactly why it's restricted to Platform Administrator only rather than delegated to any organization role (see "Authorization model" above) | **Mitigated for `GET /api/assessments/:id`** (per-record application-layer check, verified against real cross-org D1 data — a member of `org_2` got 403 reading an `org_1` assessment). **`GET /api/leads`'s underlying query remains unfiltered by design** — closing that at the query layer, so it could be delegated to organization-scoped roles instead of Platform-Administrator-only, is real future work with a real consumer (an Admin Portal), not added speculatively ahead of one |
| Repudiation | Audit events themselves could be altered/deleted | `AuditRepository` exposes `record`/`list` only — no `update`/`delete` method exists on the interface at all, so nothing in this codebase can modify or remove an audit event once written | Mitigated by omission — an append-only interface, not just an append-only convention |

### Surface 4 — Auth.js authentication

| Threat | Scenario | Mitigation | Status |
|---|---|---|---|
| Spoofing (session forgery) | Forged/guessed session token | Database session strategy (not JWT-only) — every session is a real row in `sessions`, validated against D1 on each request via the adapter, not just a signature check | Mitigated |
| Spoofing (credential stuffing / brute force) | Repeated sign-in/magic-link requests | Separate, stricter rate limiter on `/api/auth/*` POST actions (10/min/IP — RC1) | Mitigated (per-isolate caveat applies, see below) |
| Tampering (CSRF on auth actions) | Forged sign-in/callback request | Auth.js's own built-in CSRF handling (double-submit cookie token) — not reimplemented here, verified as already present (`@auth/core`'s own `validateCSRF`, observed directly when a test omitted the token and got a real `MissingCSRF` error, not a silent pass) | Mitigated by the library, confirmed not assumed |
| Information disclosure (cookie theft via XSS) | A cookie is readable by injected JS | `httpOnly: true` on every Auth.js cookie by default (verified against `@auth/core`'s own `cookie.js`) — combined with "no XSS surface found" above, this is defense in depth against a vulnerability class that doesn't currently exist in this codebase | Mitigated |
| Elevation of privilege | Sign-in as another user via a provider mix-up | `@auth/d1-adapter`'s account-linking queries match on `(provider, providerAccountId)`, not email alone — the standard Auth.js account-linking safeguard | Mitigated by the library |

## OWASP ASVS — selected control review

Reviewed against the controls actually relevant to this system's current shape (a JSON API + Auth.js, no rendered application UI on the server side beyond Auth.js's own pages). Not a full ASVS Level 1/2 certification — that requires an external audit, not a self-review — but a real, evidenced pass against the controls that apply today.

| ASVS area | Control | Status | Evidence |
|---|---|---|---|
| V1 — Architecture | Business logic is separated from data access (Repository Pattern) | ✅ Pass | `ARCHITECTURE.md`'s audit — no business logic imports `D1Database` directly |
| V4 — Access Control | Deny by default | ✅ **Pass (Security Release Blocker Sprint)** | `GET /api/leads` and `GET /api/assessments/:id` now fail closed: `resolveCaller` returns `null` (→ 401) for any caller it can't positively resolve a session for, including when `authConfig`/`userProfiles` aren't even configured. Upgraded from ERP-1's "Fail" once the route was actually gated, verified against a real running Worker (401 → 403 → 200 progression) |
| V5 — Validation | All input is validated before use | ✅ Pass | Shape/presence validated (`validation/primitives.ts`); business-critical *values* (the risk score) are now re-derived server-side via `scoreAssessment` (`router.ts`'s `createLead`/`createAssessment`) rather than trusted from the client — see Surface 1's table above |
| V5 — Validation | Output encoding prevents injection | ✅ Pass | React's default escaping; no `dangerouslySetInnerHTML`; parameterized SQL everywhere |
| V7 — Error Handling & Logging | Errors don't leak internals; security events are logged | ✅ Pass | Centralized error handling + structured logging with request correlation (`observability/logger.ts`) |
| V8 — Data Protection | Sensitive data isn't logged | ✅ Pass | Log fields are structural (method, path, status, requestId) — no request bodies, no PII, no secrets are ever passed to `logger.*` calls anywhere in this codebase (checked directly). Also confirmed this pass: the Auth.js session callback (`auth/config.ts`) returns a minimal `{user: {id, name, email, image}, expires}` object, not the raw adapter session row — an earlier draft of that callback was found, by direct probing before it shipped, to leak the raw `sessionToken`/`userId` columns into `GET /api/auth/session`'s JSON body |
| V9 — Communications | TLS is enforced | N/A locally | HSTS header is present (RC1) and takes effect the day this is served over real HTTPS; meaningless over local `wrangler dev`'s plain HTTP, by spec |
| V11 — Business Logic | Business logic can't be bypassed via API manipulation | ✅ Pass | Same fix as V5 above — a client-submitted `result` inconsistent with `answers` is discarded and recomputed, verified against a real Worker (submitted `score: 0`/`low`, persisted `score: 17` with real gaps) |
| V13 — API | Rate limiting exists on state-changing endpoints | ✅ Pass, with caveat | Present on every write endpoint; per-isolate limitation documented below |
| V14 — Configuration | Secrets aren't hardcoded | ✅ Pass | `.dev.vars`/`.env.local` are gitignored; `.dev.vars.example` contains only placeholders; `AUTH_SECRET` supports rotation (RC1) |

## Supply-chain review (ERP-1)

- `package-lock.json` is lockfile v3 (npm 7+) — full integrity hashes per package, deterministic installs.
- `npm audit` (root workspace, all four packages): 0 known vulnerabilities — verified fresh this pass, not carried over.
- Postinstall scripts across the full dependency tree: exactly three (`core-js`, `esbuild`, `workerd`) — all well-known packages using postinstall to fetch platform-specific prebuilt binaries (standard practice for these tools, not an anomaly). No unfamiliar package runs a postinstall script.
- No dependency confusion risk identified — all `@titan/*` packages are private, workspace-local, never published to a public registry.

## Known, accepted gaps (not silently dropped)

- **`GET /api/leads` cannot be delegated to organization-scoped roles, only Platform Administrator.** Not a residual version of the ERP-1 finding (that's fixed — see Surface 2's table above) — a real, separate, smaller gap: `leadRepository.list()` has no organization filter, so there is no safe way today to let an organization's own admin see only their organization's leads. Closing this needs query-layer org filtering, which needs a real consumer (Admin Portal) to design against, not a speculative addition.
- **No self-service way to become a Platform Administrator.** Deliberate, not an oversight — see "Authorization model" above. Provisioning is a direct D1 insert (`OPERATIONAL_RUNBOOK.md`), which is fine for local dev and will need a real decision (an operator tool? a one-time bootstrap script?) before any deployment.
- **Rate limiting is per-Worker-isolate, not global.** `security/rateLimiter.ts` says this directly in its own doc comment — a real, working limiter for local dev and for limiting abuse from any single isolate, but Cloudflare runs many isolates concurrently with no shared memory between them. A real global limit needs Cloudflare's native Rate Limiting binding or a Durable Object — both require a deployed Cloudflare account, which doesn't exist. Closing this is Stage 5+ scope once deployment is real.
- **No bot protection (Turnstile).** Requires a Cloudflare account. Explicitly deferred this session (`ROADMAP.md`'s deferral record) — rate limiting is the only current defense against automated abuse of the public form.
- **No CSP nonce support for Auth.js's own pages.** Investigated honestly (`http/finalizeResponse.ts`'s comment) — Auth.js's built-in sign-in page doesn't expose a hook for injecting one, so a scoped `style-src 'unsafe-inline'` is used instead of a fabricated nonce claim.
