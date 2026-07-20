# Decision Log — Project Titan

Chronological record of architecture and product decisions once they're actually made — not proposals (those live in `ARCHITECTURE.md` until someone decides). Newest first.

## 2026-07-20 — Hosting, database, and auth: Cloudflare-native, Auth.js, Repository Pattern

**Decided:**

- **Hosting/runtime target**: Cloudflare, full platform — Pages (app shell/marketing), Workers (backend/API), D1 (database), R2 (object storage — generated PDF reports), Queues (async work — report/email delivery), Turnstile (bot mitigation on public endpoints), plus Cloudflare's CDN/WAF/Analytics.
- **Database engine**: Cloudflare D1 (SQLite-based), accessed exclusively through a Repository Pattern — business logic never imports a D1 client directly.
- **Auth approach**: self-hosted Auth.js, behind an authentication abstraction layer that application code depends on instead of Auth.js's APIs directly.

**Source:** the Phase 2 master prompt ("CYBERDUDEBIVASH® Enterprise — Project Titan — Phase 2 — Enterprise DPDP Platform Integration & Production Evolution"), which specifies these three under "Architectural Decisions" as directives, not options to weigh. This resolves `ARCHITECTURE.md`'s open decisions #2 (hosting target) and #4 (auth provider) from the Phase 1 planning pass — both had been blocking Workstreams 4–7 since Phase 1 foundation work completed.

**What this closes out:** `PLATFORM_FOUNDATION.md`'s "blocked on architecture decisions" note for authentication, authorization, database, and API foundations no longer applies to *which* hosting/auth/database engine — those three are now known. Building them out is still real work (Phase E/F of the master prompt), not done by virtue of being decided.

**What this does not decide:** payments provider, email provider, and the DPDP legal-review timing remain open — the Phase 2 master prompt doesn't address any of the three. See `ARCHITECTURE.md`'s "Still open" list.

**Rationale for the Repository Pattern specifically (not just "use D1"):** the master prompt states it explicitly ("Business logic must never depend directly on D1"), and it holds up independent of that instruction — D1 is SQLite-based with a narrower feature set than the Postgres `ARCHITECTURE.md`'s original Phase 1 pass recommended. A repository boundary means that if D1's limits become a real problem later, the fix is a new repository implementation, not a rewrite of every place that touches data.

## 2026-07-20 — Existing scanner (`dpdpriskscan.html`) adopted as Titan Module 1's starting point, not rebuilt

**Decided:** the working, production-quality DPDP risk scanner uploaded as part of the Phase 2 master prompt is treated as Version 1 of Module 1 (Assessment Core), to be modularized and integrated — not replaced with a from-scratch build.

**Source:** the Phase 2 master prompt's Mission and Non-Negotiable Rules ("DO NOT BUILD A NEW DPDP SCANNER... Never rebuild working features").

**Consequence for `ROADMAP.md`:** the original Phase 1 plan ("Module 2: questionnaire engine... built from scratch") is superseded for the question-engine and risk-engine pieces specifically — that logic already exists and works; the remaining work is extraction into tested, modular code (Phase C/D of the master prompt), not authoring it new. See the reconciliation note added to `ROADMAP.md`.
