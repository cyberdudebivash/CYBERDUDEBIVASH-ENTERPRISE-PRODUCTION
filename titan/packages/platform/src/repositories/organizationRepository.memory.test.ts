import { createInMemoryOrganizationRepository } from "./organizationRepository.memory.js";
import { describeOrganizationRepositoryContract } from "./organizationRepository.contract.js";

describeOrganizationRepositoryContract("in-memory", () => createInMemoryOrganizationRepository());
