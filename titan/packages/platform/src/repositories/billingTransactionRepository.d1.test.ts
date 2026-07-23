import { createD1BillingTransactionRepository } from "./billingTransactionRepository.d1.js";
import { describeBillingTransactionRepositoryContract } from "./billingTransactionRepository.contract.js";
import { createTestD1Factory } from "./testUtils/testD1.js";

const createDb = await createTestD1Factory();

describeBillingTransactionRepositoryContract("D1 (real SQLite via sql.js)", () =>
  createD1BillingTransactionRepository(createDb()),
);
