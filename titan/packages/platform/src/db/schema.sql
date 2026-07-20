-- Titan platform — D1 schema.
--
-- Scoped to what has a real consumer today (the DPDP lead-capture flow,
-- titan/apps/web's LeadCaptureForm, still localStorage-backed pending
-- Workstream 7's frontend rewiring). Organization/User/Assessment/Report tables
-- from ARCHITECTURE.md's full data model are added when a real workstream needs
-- them, not speculatively ahead of that — matching how this repository has
-- scoped every other package so far.
--
-- Not yet applied to a real D1 database (no Cloudflare account/credentials in
-- this environment — DECISION_LOG.md). Verified only via a fake D1 double in
-- this package's tests; a real `wrangler d1 migrations apply` run against an
-- actual D1 instance is Stage 4 scope.

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);
