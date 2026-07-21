-- EAP-4 (Enterprise Organization Management Platform): lifecycle and
-- metadata fields for the organizations table 0002 created, additive in the
-- same spirit as 0008_lead_lifecycle.sql's extension of leads.
--
-- status is a closed, two-value vocabulary ('active'/'archived') — an
-- organization is never deleted (no DELETE anywhere in this system, mirroring
-- audit_events' own append-only guarantee), only archived and restorable.
-- Defaulted to 'active' so the 5 organizations already exercised by
-- organizationRepository.contract.ts's existing fixtures stay valid rows.
--
-- industry/region are free-text, nullable — real organizations don't always
-- have one (or the platform admin hasn't captured it yet), so NULL means
-- "unknown", not "empty string". tags is a JSON array (tags_json), same
-- reasoning and shape as leads.tags_json (0008): a small, freeform label set
-- doesn't justify a join table.
--
-- updated_at is repository-owned, not caller-supplied (unlike created_at,
-- which callers already supply for leads/assessments) — it exists so the
-- Organization Workspace table has a real "last activity" column to sort/
-- display without joining audit_events, and letting a caller set their own
-- "last modified" timestamp would make that column meaningless. Defaulted to
-- created_at's value for pre-existing rows via the UPDATE below.
--
-- Deliberately NOT added here: notes. Same reasoning as 0008 — a note is an
-- audit-worthy event (organization.note_added), not a mutable column.
ALTER TABLE organizations ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN industry TEXT;
ALTER TABLE organizations ADD COLUMN region TEXT;
ALTER TABLE organizations ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';

UPDATE organizations SET updated_at = created_at WHERE updated_at = '';

CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations (status);
CREATE INDEX IF NOT EXISTS idx_organizations_industry ON organizations (industry);
CREATE INDEX IF NOT EXISTS idx_organizations_region ON organizations (region);
