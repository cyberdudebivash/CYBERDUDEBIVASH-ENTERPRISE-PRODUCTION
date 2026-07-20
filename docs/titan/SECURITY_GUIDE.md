# Security Guide — Project Titan

A threat model and control review for `titan/`, written from the system as it actually exists after RC1's security hardening pass — not a generic checklist. Every "mitigated" claim below names the actual code that does it; every "open" item names why it's open and what would close it. See `PLATFORM_FOUNDATION.md` for the broader implementation status and `ARCHITECTURE.md` for the architecture audit this guide's threat model is scoped against.

## System surfaces in scope

1. **Public DPDP assessment flow** (`titan/apps/web`'s `/assessment/dpdp`) — unauthenticated, browser-facing.
2. **Worker API** (`titan/packages/platform`) — `GET /health`, `POST`/`GET /api/leads`, `POST /api/assessments`, `GET /api/assessments/:id`, `/api/auth/*`.
3. **D1 database** — organizations, users, sessions, assessments, leads, reports, audit_events.
4. **Auth.js authentication** — database sessions, Email (dev-mode)/Google/GitHub providers.
5. **Audit trail** — `audit_events`, written on lead/assessment creation.

Out of scope for this document: anything requiring a deployed Cloudflare account (Turnstile, WAF rules, Cloudflare Access) — this project has never had one, in this session or any prior stage. See `ROADMAP.md`'s deferral record for why.

## Threat model (STRIDE)

### Surface 1 — Public assessment/lead submission

| Threat | Scenario | Mitigation | Status |
|---|---|---|---|
| Spoofing | Automated bot submits fake leads at volume | Per-IP rate limiting (`security/rateLimiter.ts`, 30/min on `POST /api/leads`) | Mitigated, but weak — see "Open: bot protection" below |
| Tampering (CSRF) | A malicious site's page issues a forged cross-origin `POST /api/leads` on a visitor's behalf | Origin-header validation (`security/csrf.ts`) — a present-but-mismatched `Origin` is rejected with 403 | **Mitigated** (RC1) |
| Tampering (data integrity) | A client submits a `result` (risk score) that doesn't match the `answers` it also submitted — e.g. reporting LOW risk while every answer indicates otherwise | None — `POST /api/leads` currently trusts the client-submitted `result` object as-is; the server never recomputes it from `answers` via `@titan/assessment-core`'s `scoreAssessment` | **Open — real finding, not yet fixed.** The visitor's own on-screen result is always correct (computed client-side, `DpdpAssessmentPage.tsx`, and displayed before submission) — the risk is to the business's own lead/CRM data integrity, not to the visitor. Recommended fix: `POST /api/leads` (and `POST /api/assessments`) should recompute `result` server-side from `answers` and discard whatever the client sent, the same trust-boundary principle OWASP ASVS V5 requires for any business-critical value. Not implemented this pass — flagged here rather than silently expanding this session's scope beyond what was agreed (`DECISION_LOG.md`) |
| Information disclosure | Lead form fields, error messages | React's default escaping (no `dangerouslySetInnerHTML` anywhere — confirmed by `grep`, `ARCHITECTURE.md`); error responses carry a `code`/`message`, never a stack trace or internal detail (`http/responses.ts`) | Mitigated |
| Denial of service | Volumetric abuse of the public form | Per-IP rate limiting — real, but per-Worker-isolate only (see "Open" below) | Partially mitigated |

### Surface 2 — Worker API

| Threat | Scenario | Mitigation | Status |
|---|---|---|---|
| Spoofing | Forged `cf-connecting-ip` header used to evade rate limiting | Cloudflare sets `CF-Connecting-IP` itself at the edge and strips/overwrites any client-supplied value before a Worker ever sees it — this only holds once actually deployed behind Cloudflare; a direct `wrangler dev` instance (as used for all local verification so far) has no such guarantee and trusts whatever header value is sent | Mitigated once deployed; **not applicable to local-only verification today** — documented so this isn't mistaken for a deployed guarantee |
| Tampering | Malformed/oversized request bodies | Every write endpoint validates required fields and object shapes (`validation/primitives.ts`) before touching a repository; invalid JSON returns 400, not a 500 | Mitigated |
| Repudiation | A write happens with no record of who/what caused it | Every lead/assessment creation records an `audit_events` row (`router.ts`'s `recordAuditEvent`); a failed audit write is logged but never silently swallowed | Mitigated for the actions instrumented so far (lead/assessment creation); login/logout/report-generation audit events are not yet emitted because those flows don't exist yet (no portal, no server-side reports) |
| Information disclosure | Verbose internal errors leak stack traces/paths | Centralized error handling (`router.ts`'s top-level `try/catch`) returns a generic `internal_error` to the client while logging the real error server-side with a correlating `requestId` | Mitigated |
| **Information disclosure (ERP-1 finding)** | **`GET /api/leads` has no authentication at all — any caller can list every captured lead: name, email, company, DPDP answers, risk result.** Verified directly against `router.ts`: the route dispatch for `GET /api/leads` calls `listLeads` with no session/role check anywhere on that path. | None today. | **HIGH — open, not fixed this pass.** Not exploitable *today* only because nothing is deployed. `leadStore.ts`'s `fetchLeads()` (the one intended future caller — an Admin Portal) exists but nothing calls it yet, so this is currently dead-but-exposed surface, not active product behavior. **Not fixed in this pass deliberately**: the existing router test suite (9+ assertions) exercises this endpoint unauthenticated by design, `OPERATIONAL_RUNBOOK.md` documents anonymous `curl` against it as the standard local verification step, and a real fix means deciding what "authorized" means here (any session? an organization-scoped role via `auth/authorize.ts`?) — a decision that deserves its own reviewed pass, not a rushed patch appended to an audit. **Recommended fix, next pass**: gate this route with `getSession`/`requireOrganizationAccess` the moment a real caller (Admin Portal) exists, and before any deployment regardless. |
| Denial of service | Sustained abusive traffic against any endpoint | Rate limiting on all state-changing routes, `/api/auth/*` POST actions on a separate, stricter limiter | Partially mitigated — see "Open: rate limiting is per-isolate" |
| Elevation of privilege | A caller reaches an endpoint or performs an action their role shouldn't allow | RBAC foundation exists (`auth/rbac.ts`) but **nothing in this codebase currently gates a route by role** — there are no protected routes yet, because there's no Admin/Customer Portal yet to protect (`ROADMAP.md`) | Not applicable yet — there is no privileged surface to escalate into. Revisit the moment any protected route is added; `auth/rbac.ts`'s helpers exist specifically so that route can check `hasAtLeastRole`/`canAccessOrganization` from day one rather than retrofitting it |

### Surface 3 — D1 database

| Threat | Scenario | Mitigation | Status |
|---|---|---|---|
| Tampering (SQL injection) | Malicious input reaching a raw SQL string | Every repository uses parameterized `db.prepare(...).bind(...)` — no string interpolation into SQL anywhere (`grep` confirms; every `*.d1.ts` file follows the same pattern) | Mitigated |
| Information disclosure | A repository leaks another tenant's data | `organization_id`/`assessment_id` foreign keys exist on every relevant table, but **no query anywhere currently filters by organization** — because there is no multi-tenant caller yet (no authenticated portal reads this data with a specific organization's context) | Not applicable yet, same reasoning as the RBAC gap above — becomes a real requirement the moment an authenticated, organization-scoped read path exists. Do not add organization-scoped queries speculatively ahead of that real consumer (this repository's own stated engineering principle) |
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
| V4 — Access Control | Deny by default | ❌ **Fail (ERP-1 finding)** | `GET /api/leads` allows by default — no session check at all. Downgraded from RC1's "N/A yet" once this pass actually traced the route dispatch instead of assuming the absence of protected routes meant nothing was exposed. See Surface 2's table above |
| V5 — Validation | All input is validated before use | ⚠️ Partial | Shape/presence validated (`validation/primitives.ts`); business-critical *values* (the risk score) are not re-derived server-side — the tampering finding above |
| V5 — Validation | Output encoding prevents injection | ✅ Pass | React's default escaping; no `dangerouslySetInnerHTML`; parameterized SQL everywhere |
| V7 — Error Handling & Logging | Errors don't leak internals; security events are logged | ✅ Pass | Centralized error handling + structured logging with request correlation (`observability/logger.ts`) |
| V8 — Data Protection | Sensitive data isn't logged | ✅ Pass | Log fields are structural (method, path, status, requestId) — no request bodies, no PII, no secrets are ever passed to `logger.*` calls anywhere in this codebase (checked directly) |
| V9 — Communications | TLS is enforced | N/A locally | HSTS header is present (RC1) and takes effect the day this is served over real HTTPS; meaningless over local `wrangler dev`'s plain HTTP, by spec |
| V11 — Business Logic | Business logic can't be bypassed via API manipulation | ⚠️ Open | Same tampering finding — a client can submit a `result` inconsistent with `answers` |
| V13 — API | Rate limiting exists on state-changing endpoints | ✅ Pass, with caveat | Present on every write endpoint; per-isolate limitation documented below |
| V14 — Configuration | Secrets aren't hardcoded | ✅ Pass | `.dev.vars`/`.env.local` are gitignored; `.dev.vars.example` contains only placeholders; `AUTH_SECRET` supports rotation (RC1) |

## Supply-chain review (ERP-1)

- `package-lock.json` is lockfile v3 (npm 7+) — full integrity hashes per package, deterministic installs.
- `npm audit` (root workspace, all four packages): 0 known vulnerabilities — verified fresh this pass, not carried over.
- Postinstall scripts across the full dependency tree: exactly three (`core-js`, `esbuild`, `workerd`) — all well-known packages using postinstall to fetch platform-specific prebuilt binaries (standard practice for these tools, not an anomaly). No unfamiliar package runs a postinstall script.
- No dependency confusion risk identified — all `@titan/*` packages are private, workspace-local, never published to a public registry.

## Known, accepted gaps (not silently dropped)

- **`GET /api/leads` has no authentication (ERP-1 — HIGH).** The single highest-priority open finding in this document. See Surface 2's table above for the full evidence and why it wasn't rushed-fixed this pass.
- **Rate limiting is per-Worker-isolate, not global.** `security/rateLimiter.ts` says this directly in its own doc comment — a real, working limiter for local dev and for limiting abuse from any single isolate, but Cloudflare runs many isolates concurrently with no shared memory between them. A real global limit needs Cloudflare's native Rate Limiting binding or a Durable Object — both require a deployed Cloudflare account, which doesn't exist. Closing this is Stage 5+ scope once deployment is real.
- **No bot protection (Turnstile).** Requires a Cloudflare account. Explicitly deferred this session (`ROADMAP.md`'s deferral record) — rate limiting is the only current defense against automated abuse of the public form.
- **Client-submitted risk scores aren't recomputed server-side.** The tampering finding above — real, evidenced, not implemented this pass. Recommended for the next security-focused pass.
- **No CSP nonce support for Auth.js's own pages.** Investigated honestly (`http/finalizeResponse.ts`'s comment) — Auth.js's built-in sign-in page doesn't expose a hook for injecting one, so a scoped `style-src 'unsafe-inline'` is used instead of a fabricated nonce claim.
- **No organization-scoped query filtering yet.** Not a live gap — there is no authenticated, multi-tenant read path yet for it to matter to. Do not add it speculatively; add it when the first real consumer needs it (Admin/Customer Portal).
