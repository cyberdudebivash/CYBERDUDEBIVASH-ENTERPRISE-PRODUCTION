-- Tenancy root. Every user_profile, assessment, lead, report, and
-- audit_event that belongs to a tenant hangs off organizations.id.
-- Anonymous/public flows (the free DPDP scan) leave organization_id NULL
-- on the child tables rather than requiring a synthetic organization.

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug);
