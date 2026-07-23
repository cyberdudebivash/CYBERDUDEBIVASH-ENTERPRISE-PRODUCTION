import type { NewWebhookEvent, WebhookEventRecord, WebhookEventRepository } from "./types.js";

export function createInMemoryWebhookEventRepository(): WebhookEventRepository {
  const seen = new Set<string>();
  const events: WebhookEventRecord[] = [];

  return {
    async recordIfNew(event: NewWebhookEvent): Promise<boolean> {
      const key = `${event.provider}:${event.providerEventId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      events.push({ id: crypto.randomUUID(), ...event });
      return true;
    },
  };
}
