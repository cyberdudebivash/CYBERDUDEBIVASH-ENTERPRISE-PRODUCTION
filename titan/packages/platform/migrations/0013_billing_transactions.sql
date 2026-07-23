-- Real payment-provider integration (Razorpay). Kept deliberately separate
-- from `subscriptions`/`licenses` (COM-1) rather than adding payment fields
-- to either — preserves COM-1's own provider-agnostic core (no amount/
-- currency/token field on the subscription model itself) while adding the
-- real billing layer alongside it, exactly the shape DECISION_LOG.md's
-- COM-1 entry already named as the intended future path: "A future Billing
-- Integration phase adds a real payment-provider adapter behind this same
-- subscription model; it does not turn subscriptionRepository.ts itself
-- into a payments table."
--
-- One row per real Razorpay order attempt — created before checkout opens,
-- updated to "paid" only after server-side signature verification succeeds
-- (never on an unverified client claim), or "failed" if verification fails.
CREATE TABLE IF NOT EXISTS billing_transactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  subscription_id TEXT NOT NULL REFERENCES subscriptions (id),
  plan_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_order_id TEXT NOT NULL,
  provider_payment_id TEXT,
  provider_signature TEXT,
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_organization_id ON billing_transactions (organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_subscription_id ON billing_transactions (subscription_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_transactions_provider_order_id ON billing_transactions (provider_order_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_status ON billing_transactions (status);
