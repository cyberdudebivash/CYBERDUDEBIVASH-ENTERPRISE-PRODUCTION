-- COM-1 (Enterprise Commercial Platform). The seat grant itself — one per
-- subscription, created alongside it. Seat *usage* is deliberately not a
-- column here: it's the live count of an organization's own real
-- user_profiles rows (UserProfileRepository.findByOrganizationId), so it
-- can never drift from real membership the way a separately maintained
-- counter could.
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  subscription_id TEXT NOT NULL REFERENCES subscriptions (id),
  seat_limit INTEGER NOT NULL,
  status TEXT NOT NULL,
  activated_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_licenses_organization_id ON licenses (organization_id);
CREATE INDEX IF NOT EXISTS idx_licenses_subscription_id ON licenses (subscription_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses (status);
