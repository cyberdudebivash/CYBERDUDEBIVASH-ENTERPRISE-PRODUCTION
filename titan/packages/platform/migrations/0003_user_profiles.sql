-- RBAC + organization-membership foundation (Workstream 6). Deliberately a
-- table separate from Auth.js's own "users" (0001_authjs_core.sql): the
-- adapter owns that table's shape and queries.ts writes to it directly, so
-- application-specific fields (role, organization membership) live in a
-- table application code owns instead of extending the adapter's schema.
--
-- One profile per user per organization: a user with access to more than
-- one organization gets more than one row. role is a plain TEXT enum,
-- checked in application code (Repository Pattern — DECISION_LOG.md) rather
-- than a DB-level CHECK constraint, matching how every other enum-shaped
-- field in this schema (assessments.framework, reports.format) is handled.
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  organization_id TEXT REFERENCES organizations (id),
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON user_profiles (organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_user_org ON user_profiles (user_id, organization_id);
