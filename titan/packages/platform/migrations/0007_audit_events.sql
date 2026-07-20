-- Workstream 6/7 (audit logging). actor_id is nullable because the events
-- this stage actually emits (assessment created, lead created) both happen
-- on the unauthenticated public scan path today — there is no logged-in
-- actor yet. metadata_json is a free-form JSON blob (request id, error
-- detail, etc.) rather than named columns, since the set of events this
-- table needs to describe is still growing (Workstream 6/7's own list:
-- assessment created, lead created, login, logout, report generated).
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT REFERENCES users (id),
  organization_id TEXT REFERENCES organizations (id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events (entity_type, entity_id);
