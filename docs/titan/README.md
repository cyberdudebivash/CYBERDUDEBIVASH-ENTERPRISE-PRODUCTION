# Project Titan — CyberDudeBivash Compliance Platform

Planning phase only. **No implementation code exists yet** — this directory contains product vision, technical architecture, a phased delivery roadmap, and a draft (non-authoritative) DPDP assessment framework. Read in this order:

1. [`PRODUCT_VISION.md`](./PRODUCT_VISION.md) — what this is, who it's for, business model, explicit scope boundaries
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — technical design: where this lives in the repo, tech stack, data model, security, deployment
3. [`ROADMAP.md`](./ROADMAP.md) — phased delivery plan, what "done" means per phase, what's deliberately deferred
4. [`DPDP_ASSESSMENT_FRAMEWORK.md`](./DPDP_ASSESSMENT_FRAMEWORK.md) — draft compliance content (questions, risk framework) — **not legal advice, requires expert review before any real use**

## Why four documents, not the nine-folder structure the original brief requested

`/docs/product`, `/docs/api`, `/docs/security`, `/docs/testing`, `/docs/operations`, `/docs/analytics`, `/docs/growth` as separate folders each need real content to justify existing — an API doc before any API is designed, a runbook before anything runs, is a placeholder pretending to be documentation. Those folders get created when the phase that needs them starts (`ROADMAP.md` says which phase). Right now there are four real documents instead of nine mostly-empty ones. Same discipline as the recent `docs/audit/` consolidation: living documents updated in place, not one-per-mention.

## What "architecture and roadmap only" means concretely

- No `package.json`, no source directories, no CI changes for Titan in this pass.
- Everything here is a plan to be reviewed and revised, not a commitment already executed.
- `FEATURE_MATRIX.md` (requested in the original brief) isn't created yet — a matrix of zero implemented features has nothing to track. It gets created at the start of Phase 1 (`ROADMAP.md`) and maintained from there.
