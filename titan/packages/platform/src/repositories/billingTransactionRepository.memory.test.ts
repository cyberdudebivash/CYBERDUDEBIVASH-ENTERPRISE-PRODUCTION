import { createInMemoryBillingTransactionRepository } from "./billingTransactionRepository.memory.js";
import { describeBillingTransactionRepositoryContract } from "./billingTransactionRepository.contract.js";

describeBillingTransactionRepositoryContract("in-memory", () =>
  createInMemoryBillingTransactionRepository(),
);
