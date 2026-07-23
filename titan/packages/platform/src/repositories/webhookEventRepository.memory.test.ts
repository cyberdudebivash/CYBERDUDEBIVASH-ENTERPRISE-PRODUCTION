import { createInMemoryWebhookEventRepository } from "./webhookEventRepository.memory.js";
import { describeWebhookEventRepositoryContract } from "./webhookEventRepository.contract.js";

describeWebhookEventRepositoryContract("in-memory", () => createInMemoryWebhookEventRepository());
