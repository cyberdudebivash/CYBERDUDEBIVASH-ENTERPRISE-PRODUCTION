import { createD1AuditRepository } from "./auditRepository.d1.js";
import { describeAuditRepositoryContract } from "./auditRepository.contract.js";
import { createTestD1Factory } from "./testUtils/testD1.js";

const createDb = await createTestD1Factory();

describeAuditRepositoryContract("D1 (real SQLite via sql.js)", () =>
  createD1AuditRepository(createDb()),
);
