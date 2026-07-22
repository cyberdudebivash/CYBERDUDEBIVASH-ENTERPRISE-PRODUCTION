import { createInMemorySubscriptionRepository } from "./subscriptionRepository.memory.js";
import { describeSubscriptionRepositoryContract } from "./subscriptionRepository.contract.js";

describeSubscriptionRepositoryContract("in-memory", () => createInMemorySubscriptionRepository());
