import { createD1SupportRequestRepository } from "./supportRequestRepository.d1.js";
import { describeSupportRequestRepositoryContract } from "./supportRequestRepository.contract.js";
import { createTestD1Factory } from "./testUtils/testD1.js";

const createDb = await createTestD1Factory();

describeSupportRequestRepositoryContract("D1 (real SQLite via sql.js)", () =>
  createD1SupportRequestRepository(createDb()),
);
