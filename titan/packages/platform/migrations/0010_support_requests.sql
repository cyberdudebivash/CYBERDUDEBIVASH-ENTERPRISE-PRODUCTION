-- CPP-1 (Customer Portal). A real, small new entity — everything else the
-- portal shows is composed from tables that already exist. status is a
-- closed single-value vocabulary ("open") because no admin-side resolution
-- endpoint exists anywhere in this codebase yet; extending it is real,
-- named future work for the day one does (repositories/types.ts's own
-- comment on SupportRequestStatus has the full reasoning).
CREATE TABLE IF NOT EXISTS support_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations (id),
  created_by TEXT NOT NULL REFERENCES users (id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_requests_created_by ON support_requests (created_by);
CREATE INDEX IF NOT EXISTS idx_support_requests_organization_id ON support_requests (organization_id);
