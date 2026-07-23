-- Real recurring billing (Razorpay Subscriptions API) + multi-currency
-- pricing. Extends, not replaces, migrations 0011-0013: a subscription is
-- still one row per organization, billing_transactions is still one row per
-- real payment attempt — this adds what those two need to (a) know which
-- currency an organization is billed in, (b) correlate Razorpay's own
-- recurring `subscription.*` webhook events back to the right local rows
-- (those events carry a Razorpay subscription id, not an order id), and
-- (c) record a subscription-mode checkout's own payment, which Razorpay's
-- real API genuinely never issues an order id for (verified against
-- Razorpay's documented Subscriptions Checkout contract — subscription-mode
-- checkout's success handler returns razorpay_payment_id/
-- razorpay_subscription_id/razorpay_signature, not razorpay_order_id, unlike
-- one-time Orders-mode checkout).
--
-- currency is added to `subscriptions` (not just `billing_transactions`):
-- once a customer picks a billing currency at subscribe time, every renewal
-- charge for that subscription's lifetime must stay in that same currency —
-- it is a property of the subscription, not of any one transaction.
ALTER TABLE subscriptions ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE subscriptions ADD COLUMN provider_subscription_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription_id
  ON subscriptions (provider_subscription_id);

-- billing_transactions.provider_order_id was NOT NULL UNIQUE
-- (0013_billing_transactions.sql) — correct for the one-time Orders API this
-- table was originally built for, but not for a subscription-mode payment,
-- which has no order id at all. SQLite has no ALTER COLUMN to relax a NOT
-- NULL constraint, so this rebuilds the table (D1's own documented pattern
-- for this exact situation) rather than leaving a constraint the
-- application can no longer satisfy for half its own real payments.
-- Existing rows are one-time Orders-mode transactions from before this
-- migration — provider_order_id stays populated for all of them,
-- provider_subscription_id is NULL for all of them (accurate: none of them
-- were ever a subscription charge).
CREATE TABLE billing_transactions_new (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  subscription_id TEXT NOT NULL REFERENCES subscriptions (id),
  plan_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_order_id TEXT,
  provider_subscription_id TEXT,
  provider_payment_id TEXT,
  provider_signature TEXT,
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO billing_transactions_new
  (id, organization_id, subscription_id, plan_id, provider, provider_order_id,
   provider_subscription_id, provider_payment_id, provider_signature,
   amount_paise, currency, status, created_at, updated_at)
SELECT
  id, organization_id, subscription_id, plan_id, provider, provider_order_id,
  NULL, provider_payment_id, provider_signature,
  amount_paise, currency, status, created_at, updated_at
FROM billing_transactions;

DROP TABLE billing_transactions;
ALTER TABLE billing_transactions_new RENAME TO billing_transactions;

CREATE INDEX IF NOT EXISTS idx_billing_transactions_organization_id ON billing_transactions (organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_subscription_id ON billing_transactions (subscription_id);
-- SQLite treats every NULL as distinct in a UNIQUE index, so any number of
-- subscription-mode rows (provider_order_id IS NULL) coexist without
-- conflict — only a real, non-null, duplicate order id is rejected, the
-- same protection the original index gave one-time Orders-mode rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_transactions_provider_order_id ON billing_transactions (provider_order_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_provider_subscription_id ON billing_transactions (provider_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_status ON billing_transactions (status);

-- Razorpay retries a webhook delivery until it gets a 2xx response, which
-- means the same event id can legitimately arrive more than once (a slow
-- handler, a transient 5xx, a network blip) — this is Razorpay's own
-- documented at-least-once delivery guarantee, not a hypothetical edge case.
-- Recording the event id here before acting on it, checked first on every
-- delivery, is what makes `POST /api/webhooks/razorpay` idempotent: a
-- replayed `subscription.charged` event must never grant a second billing
-- period or record a second transaction for the same real charge.
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_provider_event_id
  ON webhook_events (provider, provider_event_id);
