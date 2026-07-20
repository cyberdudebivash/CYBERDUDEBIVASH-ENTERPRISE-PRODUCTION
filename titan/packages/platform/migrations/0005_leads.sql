-- Superseded the standalone db/schema.sql (Stage 3) now that this package
-- has a real migrations/ directory. Same "leads" table shape Stage 3 already
-- shipped and tested (leadRepository.d1.ts/.contract.ts), plus two nullable
-- FKs added now that organizations and assessments exist: a lead captured
-- through the public scan has neither (organization_id/assessment_id stay
-- NULL); a lead captured against a specific assessment run links to it.
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations (id),
  assessment_id TEXT REFERENCES assessments (id),
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
CREATE INDEX IF NOT EXISTS idx_leads_assessment_id ON leads (assessment_id);
