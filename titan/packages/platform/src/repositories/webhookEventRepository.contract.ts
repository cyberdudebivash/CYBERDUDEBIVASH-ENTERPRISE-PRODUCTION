import { describe, expect, it } from "vitest";
import type { NewWebhookEvent, WebhookEventRepository } from "./types.js";

const sampleEvent: NewWebhookEvent = {
  provider: "razorpay",
  providerEventId: "evt_abc123",
  eventType: "subscription.charged",
  receivedAt: "2026-07-23T00:00:00.000Z",
};

/** Proves the in-memory and D1-backed WebhookEventRepository implementations
 * are interchangeable, the same pattern every repository contract in this
 * package already establishes. The one property that actually matters here —
 * idempotency under Razorpay's real at-least-once webhook delivery — is the
 * whole point of every test below. */
export function describeWebhookEventRepositoryContract(
  name: string,
  createRepository: () => WebhookEventRepository,
) {
  describe(`WebhookEventRepository contract — ${name}`, () => {
    it("returns true the first time an event id is recorded", async () => {
      const repo = createRepository();
      expect(await repo.recordIfNew(sampleEvent)).toBe(true);
    });

    it("returns false for a redelivery of the exact same event id — the real webhook-retry scenario", async () => {
      const repo = createRepository();
      expect(await repo.recordIfNew(sampleEvent)).toBe(true);
      expect(await repo.recordIfNew(sampleEvent)).toBe(false);
      expect(await repo.recordIfNew(sampleEvent)).toBe(false);
    });

    it("treats different event ids from the same provider as independent", async () => {
      const repo = createRepository();
      expect(await repo.recordIfNew(sampleEvent)).toBe(true);
      expect(await repo.recordIfNew({ ...sampleEvent, providerEventId: "evt_def456" })).toBe(true);
    });
  });
}
