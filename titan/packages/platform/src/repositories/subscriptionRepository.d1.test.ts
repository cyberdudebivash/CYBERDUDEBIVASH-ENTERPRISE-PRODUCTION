import { createD1SubscriptionRepository } from "./subscriptionRepository.d1.js";
import { describeSubscriptionRepositoryContract } from "./subscriptionRepository.contract.js";
import { createTestD1Factory } from "./testUtils/testD1.js";

const createDb = await createTestD1Factory();

describeSubscriptionRepositoryContract("D1 (real SQLite via sql.js)", () =>
  createD1SubscriptionRepository(createDb()),
);
