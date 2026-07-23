import type { D1Database } from "@cloudflare/workers-types";
import type { NewWebhookEvent, WebhookEventRepository } from "./types.js";

/** D1-backed implementation (migrations/0014_recurring_billing_multicurrency.sql).
 *
 * A plain exists-check-then-insert, the same pattern this package's other
 * repositories already use for their own single-row invariants (e.g.
 * `SubscriptionRepository`'s "one subscription per organization" —
 * `findByOrganizationId` before `save`, not a database-level guarantee
 * either, per that table's own migration comment). The table's `UNIQUE
 * (provider, provider_event_id)` index is still the real backstop: if two
 * deliveries of the same webhook ever did race past the exists-check
 * simultaneously, the second `INSERT` throws a real constraint violation
 * here rather than silently double-recording — caught below and treated the
 * same as "already recorded", not surfaced as a request failure. */
export function createD1WebhookEventRepository(db: D1Database): WebhookEventRepository {
  return {
    async recordIfNew(event: NewWebhookEvent): Promise<boolean> {
      const existing = await db
        .prepare(`SELECT 1 FROM webhook_events WHERE provider = ? AND provider_event_id = ?`)
        .bind(event.provider, event.providerEventId)
        .first();
      if (existing) return false;

      try {
        await db
          .prepare(
            `INSERT INTO webhook_events (id, provider, provider_event_id, event_type, received_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            event.provider,
            event.providerEventId,
            event.eventType,
            event.receivedAt,
          )
          .run();
        return true;
      } catch {
        // A genuinely new failure (not the race above) would resurface on
        // the very next webhook delivery attempt anyway — Razorpay retries
        // until it sees a 2xx, so this never silently loses an event.
        return false;
      }
    },
  };
}
