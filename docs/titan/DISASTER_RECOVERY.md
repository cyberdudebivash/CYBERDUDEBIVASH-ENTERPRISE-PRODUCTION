# Disaster Recovery — Titan (PRD-1)

Backup, recovery, and failure-scenario procedures for `@titan/platform`. Every claim below that says "verified" was run for real, this phase, against real local D1 — not simulated, not assumed from D1/Wrangler's documentation alone. See `OPERATIONAL_RUNBOOK.md`'s own "Running migrations and seeding" section for day-to-day (non-disaster) database operations, and `DEPLOYMENT_GUIDE.md` for deploy/rollback.

## Backup mechanisms

Two independent, real mechanisms exist for D1 — this document doesn't invent a third:

1. **`wrangler d1 export`** — a full SQL dump (schema + data), the mechanism this phase built tooling around (`packages/platform/scripts/db-backup-local.mjs`, `npm run db:backup:local`). Works identically against `--local` (no credentials needed, verified) and `--remote` (a real deployed database, needs real credentials — not exercised in this project, same standing constraint as every other `--remote` operation).
2. **D1's own automatic backup on migration apply** — `wrangler d1 migrations apply`'s own `--help` output states plainly: "After applying, a backup will be captured" (confirmed directly from the installed `wrangler` 4.112.0's real help text, not assumed). This is Cloudflare's own built-in safety net specifically around schema changes, independent of anything this repository's own scripts do.

Cloudflare D1 also advertises point-in-time recovery ("time travel," up to 30 days) as a platform feature of any real, deployed D1 database — genuinely real, but **not exercisable from this project**: it operates on a real, deployed D1 instance via the Cloudflare API/dashboard, and this project has never had one. Named here as a real, available mechanism for the day a real database exists, not claimed as tested.

## The recovery drill this phase actually ran

Not a theoretical procedure — the exact commands below were executed against this session's real local D1 instance, with real before/after data captured.

**1. Baseline.** Queried real row counts across five tables with genuine accumulated data (from this session's own extensive testing across every prior phase):

```
leads: 65   assessments: 43   organizations: 62   audit_events: 373   subscriptions: 22
```

**2. Backup.** `wrangler d1 export titan-platform-db --local --output=backups/verify-export.sql` — produced a real 1341-line file containing 1183 `INSERT` statements plus the full schema (12 `CREATE TABLE` statements, matching all 12 real migrations).

**3. Simulated total data loss.** `rm -rf .wrangler/state/v3/d1` — the same "resetting local state entirely" procedure `DEVELOPER_GUIDE.md` has documented since Stage 4, here used deliberately as the disaster: every local D1 table, gone.

**4. First recovery attempt — a real finding, not a clean success.** Re-ran `wrangler d1 migrations apply` (rebuild schema) then restored the export — failed with `UNIQUE constraint failed: d1_migrations.id`. **Root cause**: `wrangler d1 export`'s full dump already includes Wrangler's own internal `d1_migrations` bookkeeping table's rows; re-applying migrations first, then restoring a full export, inserts those same tracking rows twice. **The correct procedure has one fewer step than assumed**: a full export is self-contained — restore it directly into an empty D1, no separate `migrations apply` first.

**5. Second attempt — real success.** Wiped local state again, restored `verify-export.sql` directly (`wrangler d1 execute titan-platform-db --local --file=backups/verify-export.sql`) with no prior migration step. Re-queried the same five row counts:

```
leads: 65   assessments: 43   organizations: 62   audit_events: 373   subscriptions: 22
```

**Exact match, every table.** Zero data loss across a real full-database wipe and restore.

**6. Application-level verification.** Started a real `wrangler dev` against the restored database and ran `smoke-test.mjs` — 4/4 checks passed (`/health`, `/health/ready`, and two authorization-gated routes all behaved correctly against the recovered data), confirming the restored database isn't just SQL-correct but genuinely usable by the real application, not just queryable directly.

This drill is the single strongest piece of evidence in this phase's report: a real, verified, zero-data-loss recovery from a real simulated total-loss scenario, including a real mistake caught and corrected mid-drill rather than glossed over.

## Recovery procedures by scenario

| Scenario | Procedure | Status |
|---|---|---|
| **Local D1 corrupted/lost** (dev machine) | `rm -rf .wrangler/state/v3/d1`, then restore from a `db:backup:local` export if one exists, or `db:migrations:apply:local` + `db:seed:local` for a fresh, non-production dataset | ✅ **Verified this phase** (the drill above) |
| **Remote (staging/production) D1 data loss** | `wrangler d1 export <db> --remote --output=<file>` on a schedule (not yet automated — see "Known limitations"), restore via `wrangler d1 execute <db> --remote --file=<file>` **with no prior migrations-apply step** (this phase's own real finding above) | **Documented, mechanism verified locally; never exercised against a real remote database** — no Cloudflare account exists to test against |
| **Bad migration applied to production** | D1/Wrangler's migration tooling is forward-only — there is no `.down.sql`/automatic rollback convention (confirmed: no such flag exists in `wrangler d1 migrations apply --help`'s real output). Recovery is either (a) a new forward migration that reverses the change, matching this repository's own additive-only migration history (verified: zero `DROP TABLE`/`DROP COLUMN` across all 12 migration files), or (b) restore from the automatic pre-migration backup `wrangler d1 migrations apply` itself captures (see "Backup mechanisms" above) | **Known limitation of the D1/Wrangler toolchain itself, not something this repository's own tooling can work around** — documented honestly rather than papered over with an untested rollback script |
| **Worker code deployed with a real bug** | `wrangler rollback --env <tier>` (`npm run rollback:staging`/`:production`) — Cloudflare's real, built-in instant Worker rollback. Rolls back *code only* — see `DEPLOYMENT_GUIDE.md`'s "Rollback" section for why this is never sufficient alone if a bad deploy also shipped a bad migration | **Command verified to exist and be correctly wired (`--help` output, real flag); never exercised against a real deployment** |
| **Secret compromised/leaked** | `wrangler secret put <NAME> --env <tier>` with a new value immediately invalidates the old one (Cloudflare secrets are write-only and versionless — the new `put` simply replaces what the Worker reads on its next invocation, no separate "rotate" command exists). `SECURITY_GUIDE.md`'s own secret-rotation section has the full procedure, including `AUTH_SECRET`'s support for an array value during a rotation window | **Documented; the underlying `AUTH_SECRET` array-rotation support was already real and tested (`auth/config.ts`) before PRD-1** |
| **Total Cloudflare account loss** | Every real resource (Workers, D1, Pages, DNS) would need to be recreated from scratch via `DEPLOYMENT_GUIDE.md`'s "First real deploy checklist," restoring D1 data from the most recent `--remote` export. This repository's own source code and migration history are the real, git-tracked source of truth for everything except the data itself | **Fully theoretical — never exercised, and could not be without a second real Cloudflare account to test against** |
| **This repository/git history lost** | Standard git remote redundancy (GitHub) — outside this document's scope; no Titan-specific procedure needed beyond what any git-hosted project already has | Not a Titan-specific concern |

## What "Infrastructure Recovery" vs. "Operational Recovery" mean here

- **Infrastructure recovery** — rebuilding Workers/D1/Pages/DNS from `wrangler.toml` + the `wrangler` CLI + this checklist. Every piece of *configuration* needed to do this is already real and in this repository (`ENVIRONMENT_GUIDE.md`); only the *credentials and real resource ids* are missing, by design, until a real deploy happens.
- **Operational recovery** — restoring *data* once infrastructure exists again. This is the drill this phase actually ran and verified above.

Neither has ever been exercised against real Cloudflare infrastructure — only the operational-recovery half has been exercised at all, against real local D1. The infrastructure-recovery half remains genuinely untested beyond the structural `--dry-run` verification `DEPLOYMENT_GUIDE.md` describes, because there has never been a real deployment to recover from a loss of.

## Known limitations

- No automated, scheduled backup job exists for a real remote database (would need Cloudflare Cron Triggers or an external scheduler calling `wrangler d1 export --remote` — genuinely new infrastructure this phase didn't build, since no real remote database exists yet to schedule backups *of*). Named as real, near-term follow-up the day a real deployment exists, not silently assumed to already be covered.
- The recovery drill above used a single-developer local D1 instance with no concurrent writers — a real production restore would need to consider in-flight requests during the restore window (a real operational concern D1's `--remote` restore doesn't need this project to solve; Cloudflare's own maintenance-mode/traffic-pause tooling is the real answer, not built or tested here).
- `wrangler d1 export --remote` and `wrangler d1 execute --remote --file=` have never been run against a real remote database in this project — everything above marked "verified" was verified against `--local` only, honestly labeled as such throughout this document rather than implied to cover the remote case too.
