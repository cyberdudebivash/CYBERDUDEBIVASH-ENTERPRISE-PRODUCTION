import { createInMemoryAuditRepository } from "./auditRepository.memory.js";
import { describeAuditRepositoryContract } from "./auditRepository.contract.js";

describeAuditRepositoryContract("in-memory", () => createInMemoryAuditRepository());
