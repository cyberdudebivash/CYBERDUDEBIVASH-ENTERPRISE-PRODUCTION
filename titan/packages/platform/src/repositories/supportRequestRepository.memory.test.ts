import { createInMemorySupportRequestRepository } from "./supportRequestRepository.memory.js";
import { describeSupportRequestRepositoryContract } from "./supportRequestRepository.contract.js";

describeSupportRequestRepositoryContract("in-memory", () =>
  createInMemorySupportRequestRepository(),
);
