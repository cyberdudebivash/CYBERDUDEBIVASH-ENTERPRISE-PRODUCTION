-- One row per completed assessment run. organization_id/created_by are
-- nullable because the free public DPDP scan (Titan Module 1) is completed
-- by anonymous visitors with no account — the same reason leads.organization_id
-- is nullable in 0005_leads.sql. framework is a plain string, not an enum
-- table, matching ARCHITECTURE.md's stated future-framework-expansion intent
-- (ISO/SOC/NIST alongside DPDP) without a migration per new framework.
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations (id),
  created_by TEXT REFERENCES users (id),
  framework TEXT NOT NULL,
  framework_version TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessments_organization_id ON assessments (organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments (created_at);
