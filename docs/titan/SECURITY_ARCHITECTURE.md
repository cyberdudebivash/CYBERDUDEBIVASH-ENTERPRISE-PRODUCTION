# Security Architecture (SEC-1)

Trust boundaries, attack surface, authentication/authorization flow, tenant isolation, and edge security for Titan — the architectural companion to `SECURITY_GUIDE.md` (the per-surface threat model and control review) and `THREAT_MODEL.md` (STRIDE analysis and the security findings register). Every claim below cites the real code that implements it; nothing here describes a control that doesn't exist in this repository today.

## Trust boundaries

```
┌─────────────────┐        ┌──────────────────────────────┐        ┌────────────┐
│  Browser         │  (1)   │  Cloudflare Worker            │  (3)   │  D1        │
│  (admin SPA,     │───────▶│  (titan-platform)              │───────▶│  database  │
│  portal SPA,     │        │  - CORS/CSRF/rate limit        │        └────────────┘
│  public assessment)│      │  - Auth.js (session lookup)   │
└─────────────────┘        │  - RBAC gate                    │        ┌────────────┐
                            │  - Repository Pattern           │  (4)   │  Auth.js    │
                            └──────────────────────────────┘◀───────│  (in-process│
                                          │ (2)                       │  library)   │
                                          ▼                          └────────────┘
                            ┌──────────────────────────────┐
                            │  GitHub Actions (titan-ci /   │
                            │  titan-deploy) — CI/CD only    │
                            └──────────────────────────────┘
```

1. **Browser ↔ Worker** — the primary, actively-defended boundary. Crossed by every real request; every control in this document (CORS, CSRF, rate limiting, authentication, authorization, security headers) exists at this boundary.
2. **Worker ↔ D1** — a single Cloudflare binding (`env.DB`), never a network call this project's own code makes credential decisions about; access is governed entirely by Cloudflare's own binding model (a Worker either has the binding or it doesn't — there is no separate D1-level auth this application configures).
3. **Worker ↔ Auth.js** — in-process (`@auth/core`), not a network boundary; Auth.js's own session/CSRF/cookie logic runs inside the same Worker invocation.
4. **CI/CD ↔ Cloudflare** — `titan-deploy.yml` only, gated by `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` GitHub Actions secrets; dormant today (no Cloudflare account has ever existed — `DECISION_LOG.md`).

No trust boundary in this system has ever been exercised against real internet traffic — every boundary above has been verified locally (`wrangler dev` + real local D1) or in CI, never in a deployed environment.

## Attack surface inventory

Every route this Worker handles, by trust tier (verified by reading every route-matching conditional in `router.ts`, 45 total including the fallback):

| Tier | Routes | Count |
|---|---|---|
| Anonymous, unauthenticated | `GET /health`, `GET /health/ready`, `POST /api/leads`, `POST /api/assessments`, `/api/auth/*` (Auth.js's own action-level rules) | 5 |
| Any authenticated caller (no role/org gate) | `GET /api/me`, `GET /api/commercial/plans` | 2 |
| Organization member (own org only, `resolvePortalOrganizationId`) | Every `/api/portal/*` route (7) plus `/api/portal/commercial/subscription` (3) | 10 |
| Platform Administrator only | Every remaining `GET`/`POST`/`PATCH`/`DELETE` route — leads, assessments, organizations, users, audit, operations, reports, commercial admin | 27 |
| Per-record delegation | `GET /api/assessments/:id` (Platform Administrator, or a member of that assessment's own organization) | 1 |

No route in this inventory is undocumented — every one appears in `SECURITY_GUIDE.md`'s own endpoint-to-policy map, cross-checked against `router.ts` directly for this document.

## Authentication flow

1. A caller signs in via Auth.js (`/api/auth/signin`) — Email (dev-mode, logs the magic link instead of sending it), Google, or GitHub (both OAuth providers are code-complete but dormant: no real credentials have ever been configured, `auth/config.ts:97-106`).
2. Auth.js's database session strategy (`strategy: "database"`, `auth/config.ts:114`) creates a real row in the `sessions` table via `@auth/d1-adapter` — not a JWT-only scheme; every request re-validates against D1.
3. `router.ts`'s `resolveCaller` (lines 800-807) calls `getSession` (`auth/session.ts`), which replays the incoming request's own headers (including the session cookie) against Auth.js's internal `/api/auth/session` action, then resolves the caller's `UserProfileRecord[]` via `userProfiles.findByUserId`. Fails closed to `null` (→ 401) if either `authConfig` or `userProfiles` isn't configured, or no session exists.
4. `auth/config.ts`'s `session` callback rebuilds a minimal `{ user: { id, name, email, image }, expires }` object — the raw adapter session's `sessionToken`/`userId` columns are never serialized into `GET /api/auth/session`'s JSON body (verified directly, `auth/config.ts:138-148`).

## Authorization flow

**Precise role model** (correcting an imprecise "four roles" shorthand that has appeared in earlier phase summaries): there is exactly **one role enum, three values** — `UserRole = "member" | "admin" | "owner"` (`repositories/types.ts:232`), scoped per organization-membership row (`UserProfileRecord.organizationId`). On top of that one enum:

- **Anonymous** / **Authenticated** are not roles — they are the two states `resolveCaller` can resolve to (`null` vs. a real `Caller`).
- **Platform Administrator** is not a fourth enum value — it is a **sentinel convention**: a `UserProfileRecord` with `organizationId: null` **and** `role: "owner"` (`auth/rbac.ts`'s `isPlatformAdministratorProfile`, not itself exported — only `isPlatformAdministrator(profiles)`, which checks whether *any* profile matches, is). A real database unique index (`migrations/0003`, `(user_id, organization_id)`) guarantees at most one such row per user.

`auth/authorize.ts` exposes four gate functions, each returning `Response | null` (403 or proceed):

| Function | Checks | Live call sites |
|---|---|---|
| `requirePlatformAdministrator` | `isPlatformAdministrator(profiles)` | Every cross-organization list/search/export/summary route (27 routes) |
| `requireLeadsAccess` | Pure alias for `requirePlatformAdministrator` | Every `/api/leads*` route |
| `requireAssessmentAccess` | Platform Administrator, **or** a member (any of the 3 roles) of the assessment's own `organizationId` | `GET /api/assessments/:id` only |
| `requireOrganizationAccess` | `canAccessOrganization(profiles, organizationId, minimumRole)` — a real, tested, per-organization-plus-minimum-role gate | **None** — exported and unit-tested (`auth/authorize.test.ts`) but not wired into any live route today. Kept ready for the day a real self-service, organization-scoped admin surface needs a minimum-role gate finer than "any membership" (`resolvePortalOrganizationId`'s own portal routes don't need one — every one of the 3 roles gets identical portal access) |

Every route this system exposes today is deny-by-default: `resolveCaller` returns `null` for any caller it can't positively resolve, and every handler explicitly checks the result before proceeding (verified directly for all 45 routes, `SECURITY_GUIDE.md`'s ASVS V4 row).

## Tenant isolation model

Two structurally different mechanisms, not one, depending on whether the underlying repository query is filterable:

1. **Per-record delegation** (`GET /api/assessments/:id` only) — the record is fetched first, then `requireAssessmentAccess` checks the caller's membership against *that specific record's* `organizationId`. Correct because a single record has exactly one organization to check against.
2. **Server-side-resolved scope** (every `/api/portal/*` route) — `resolvePortalOrganizationId` (`router.ts:2928-2942`) derives the organization id from the caller's own `UserProfileRecord[]` **before** calling any repository method; no portal handler ever reads an `organizationId` from a query parameter, path segment, or request body (verified by grep — zero matches for `record.organizationId`/`body.organizationId`/`value.organizationId` patterns across the whole file). A client-supplied `organizationId` on a portal request is silently ignored, not honored (`router.test.ts`'s dedicated cross-organization-isolation cases).
3. **Cross-organization by construction, restricted to the one caller who can't leak tenant data** — every `list()`/`search()` method on `leadRepository`/`organizationRepository`/`assessmentRepository`/`auditRepository`/`userRepository` runs one unfiltered query across every organization (confirmed by reading each `*.d1.ts`'s `search()` directly). There is no query-layer `WHERE organizationId = ?` anywhere in these five repositories. Gating any of them at "any organization member" would leak every other organization's data to a member of one — so today, only Platform Administrator (a role with no single organization to be scoped to) may call any of them. This is `SECURITY_GUIDE.md`'s own long-standing, explicitly-named "Known, accepted gap," not new to this phase.

## Data flow (a single request, start to finish)

```
Request → OPTIONS? → preflightResponse (CORS only, no security headers — see below)
        → POST write?→ isTrustedOrigin (CSRF) → checkRateLimit (write routes only)
        → resolveCaller (Auth.js session → D1 lookup → UserProfileRecord[])
        → require*/resolvePortalOrganizationId (authorization gate)
        → repository call (parameterized D1 query, or in-memory for tests)
        → jsonSuccess/jsonError → finalizeResponse (security headers + CORS + X-Request-Id)
        → structured log line (requestId-correlated)
```

**One real, precise gap in this pipeline**: `OPTIONS` preflight responses (`cors.ts`'s `preflightResponse`) never pass through `finalizeResponse` — they get CORS headers and `Access-Control-Max-Age` only, not `X-Content-Type-Options`/`X-Frame-Options`/CSP/`X-Request-Id`. A reasonable design (an empty 204 carrying no data), but worth stating precisely rather than assuming "every response" is literal.

## External dependencies

This Worker calls exactly two things at request time: **D1** (`env.DB`, parameterized queries only) and, in-process, **`@auth/core`** (no network call — it's a library, not a service). No third-party API is called from any request path — no payment gateway, no email-sending service (the dev-mode Email provider logs instead of sending), no analytics SDK, no external logging/monitoring service. The only outbound calls this codebase's own tooling ever makes are `wrangler`'s own calls to the real Cloudflare API, exclusively from local dev/CI, never from the deployed Worker's own runtime.

## Privilege boundaries — exact grants per tier

See `SECURITY_GUIDE.md`'s "Authorization model" section for the complete, endpoint-by-endpoint table — not duplicated here to avoid two documents drifting apart. Summary: Anonymous (2 public POST routes + health) → Authenticated (adds `GET /api/me`, `GET /api/commercial/plans`, the admin shell's role-agnostic sections) → Organization Member/Admin/Owner (adds the entire Customer Portal, scoped to their own organization, all three roles treated identically) → Platform Administrator (every cross-organization route, every admin write).

## Security headers

Applied to every routed response via `finalizeResponse.ts` (verified directly, not assumed):

| Header | Value | Notes |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | |
| `X-Frame-Options` | `DENY` | |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Inert over local plain-HTTP `wrangler dev` (spec requirement); takes effect automatically the day this is served over real HTTPS |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | |
| `Cross-Origin-Opener-Policy` | `same-origin` | |
| `Cross-Origin-Resource-Policy` | `cross-origin` | Deliberately not `same-origin` — this API is designed to be called cross-origin by its own SPAs; the stricter value would fight the CORS configuration this Worker needs, not add real protection |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` (strict, every route) or `default-src 'self'; style-src 'unsafe-inline'; script-src 'self'; base-uri 'self'; form-action 'self' <allowedOrigin>; frame-ancestors 'none'` (`/api/auth/*` only, for Auth.js's own rendered HTML pages) | **SEC-1**: `frame-ancestors 'none'` added to both variants — CSP3's `frame-ancestors` does not inherit from `default-src`, so `default-src 'none'` alone provided zero framing protection; clickjacking defense was resting entirely on the legacy `X-Frame-Options` header until this fix. Both headers are now present, in depth |
| `X-Request-Id` | a real per-request UUID (reused from an inbound `X-Request-Id` if present) | |

**Not set, deliberately**: `Cross-Origin-Embedder-Policy` — this API doesn't use any feature (`SharedArrayBuffer`, cross-origin isolation) that needs it; adding it would be a control with nothing to protect. A CSP nonce for `/api/auth/*` — Auth.js's built-in pages don't expose a hook to inject one (`finalizeResponse.ts`'s own comment); the scoped `style-src 'unsafe-inline'` is the honest, narrower alternative.

## CORS policy

`http/cors.ts`, verified directly: `Access-Control-Allow-Origin` is always one concrete configured origin — **never** a wildcard (required, since `Access-Control-Allow-Credentials: true` and `"*"` are mutually exclusive per the Fetch spec, and this API legitimately needs both cross-origin and credentialed access for its own SPAs). `Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS`. `Access-Control-Expose-Headers: Content-Disposition` (needed for the Audit/Reports export filename to be readable by browser JS — a real gap found only by Playwright E2E verification, EAP-6). `Vary: Origin` is set.

## CSRF mechanism

`security/csrf.ts`'s `isTrustedOrigin` — the entire mechanism, one function: an absent `Origin` header is allowed through (same-origin browsers and legitimate non-browser callers both commonly omit it — CSRF is a browser-specific threat by definition); a present-but-mismatched `Origin` is rejected with 403. No token, no double-submit cookie — Origin validation alone, applied to every state-changing route (12 total, verified by grep for every `isTrustedOrigin` call site).

## Rate limiting

`security/rateLimiter.ts` — a **fixed-window** counter (not sliding window, not token bucket), keyed on `request.headers.get("cf-connecting-ip") ?? "unknown"` — Cloudflare's own edge-set header specifically, not a generic `X-Forwarded-For` a client could spoof once actually deployed behind Cloudflare (locally, or in any non-Cloudflare-fronted context, every caller collapses onto the shared `"unknown"` bucket — a real, narrow fairness caveat, not a vulnerability in a deployed context).

| Route | Limiter | Threshold | Since |
|---|---|---|---|
| `POST /api/auth/*` | `authRateLimiter` | 10/60s | RC1 |
| `POST /api/leads` | `rateLimiter` | 30/60s | RC1 |
| `POST /api/assessments` | `rateLimiter` | 30/60s | RC1 |
| `POST /api/organizations` | `rateLimiter` | 30/60s | EAP-4 |
| `POST /api/portal/support` | `rateLimiter` | 30/60s | **SEC-1** |
| `POST /api/portal/commercial/subscription` | `rateLimiter` | 30/60s | **SEC-1** |
| `PATCH /api/portal/commercial/subscription` | `rateLimiter` | 30/60s | **SEC-1** |

**A real inconsistency found and partially closed this phase**: `POST /api/organizations` (an authenticated, Platform-Administrator-only write) was already rate-limited, but the codebase's own in-code rationale for every *other* authenticated write (`PATCH /api/leads/:id`, `PATCH /api/organizations/:id`, the three `/api/users/:id/profiles*` routes, `PATCH /api/commercial/subscriptions/:id`, and — until this phase — the three routes now added above) claimed rate limiting "exists specifically for the anonymous, unauthenticated POST routes... an authenticated write already requires a real session." That rationale never actually held for `POST /api/organizations`, and this phase closes the gap for the three customer-facing writes named explicitly in this program's own brief (Portal APIs, Commercial APIs) — the tier where a compromised or malicious session is the more plausible abuse vector, unlike a Platform Administrator's own account. The remaining Platform-Administrator-only writes (`PATCH /api/leads/:id`, `PATCH /api/organizations/:id`, `/api/users/:id/profiles*`, `PATCH /api/commercial/subscriptions/:id`) remain unrated, consistently with each other now — a deliberate, narrower scope decision (extending rate limiting to seven more admin-only call sites for marginal benefit was judged out of proportion to the real risk an already-privileged, already-audited admin session represents), not an oversight. Recorded as a tracked, low-severity finding in `THREAT_MODEL.md`'s findings register.

**`GET /health`/`GET /health/ready` remain deliberately unrated-limited.** Both are cheap (health is a pure literal; readiness is one `SELECT 1`); a real orchestrator or load balancer needs to poll these frequently once deployed, and applying the same rate limiter used for abuse-prone write routes risks false "unhealthy" readings against legitimate high-frequency polling — a worse operational outcome than the low-grade cost-amplification risk it would guard against. `check-operational-thresholds.mjs` (OPS-1) is the real, existing tool for detecting abnormal latency on these two routes instead.

**Operations/reporting `GET` routes (`GET /api/operations/summary`, `GET /api/reports/*`, every admin list/search) are deliberately not rate-limited.** All are Platform-Administrator-only reads — the caller is already the most privileged real actor in this system, and rate-limiting an operator's own dashboard during a real incident (the exact moment they most need to poll it) would directly undermine what OPS-1 built. Consistent with every other authenticated-read route in this codebase never being rate-limited either.

## WAF & edge security (Workstream 4 — documentation only)

**No WAF rule, bot-mitigation policy, IP allow/deny list, or edge security zone is deployed anywhere** — this project has never had a Cloudflare account (`DECISION_LOG.md`), so there is nothing to fabricate here and nothing is claimed as configured. What's real: this application's own architecture is compatible with Cloudflare's standard edge security products, none of which have ever been exercised:

| Cloudflare capability | Real status | What it would add |
|---|---|---|
| Managed Rules (WAF) | Not configured — no account | Signature-based mitigation for common web attack patterns (SQLi/XSS/RCE payloads) at the edge, ahead of this Worker ever running — defense in depth on top of, not instead of, this application's own parameterized-SQL/no-`dangerouslySetInnerHTML` posture |
| Rate Limiting Rules (native) | Not configured — no account | A real, cross-isolate rate limit — closes `SECURITY_GUIDE.md`'s own long-standing "per-isolate only" gap, which this application's own in-memory limiter cannot close from inside a Worker |
| Bot Fight Mode / Turnstile | Not configured — no account | Real bot mitigation for the public assessment/lead-submission form — `ROADMAP.md`'s own deferral record; rate limiting is the only current defense |
| Cloudflare Access (Zero Trust) | Not configured — no account | Could gate `/admin`/`/portal` at the edge, ahead of Auth.js — a real, available option for a future phase to evaluate, not a replacement for this application's own RBAC (which would still gate what an Access-authenticated caller can actually do) |

Nothing above is treated as a security control this system currently has — every mitigation in `SECURITY_GUIDE.md`'s threat model is implemented in application code specifically because none of the above exist yet.
