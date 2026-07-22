-- COM-1 (Enterprise Commercial Platform). One subscription per organization
-- (enforced at the application layer via findByOrganizationId, the same
-- "one real row per tenant" shape support_requests' own per-user scoping
-- established, not a UNIQUE constraint — a future multi-subscription
-- concept, if one is ever needed, shouldn't require a schema migration to
-- relax a constraint that was never load-bearing).
--
-- plan_id is a plain TEXT, not a foreign key into a plans table — the plan
-- catalog is code-defined (commercial/planCatalog.ts), not a database
-- table, the same reasoning assessments.framework is a plain string rather
-- than a foreign key into a frameworks table.
--
-- Provider-agnostic: no payment amount, currency, invoice id, or card/token
-- column exists here or anywhere in this migration — this table models the
-- commercial lifecycle a real billing provider integration would plug
-- into, not the provider itself.
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,
  trial_ends_at TEXT,
  current_period_end TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  canceled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions (organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions (plan_id);
