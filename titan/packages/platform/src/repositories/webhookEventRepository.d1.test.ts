import { createD1WebhookEventRepository } from "./webhookEventRepository.d1.js";
import { describeWebhookEventRepositoryContract } from "./webhookEventRepository.contract.js";
import { createTestD1Factory } from "./testUtils/testD1.js";

const createDb = await createTestD1Factory();

describeWebhookEventRepositoryContract("D1 (real SQLite via sql.js)", () =>
  createD1WebhookEventRepository(createDb()),
);
