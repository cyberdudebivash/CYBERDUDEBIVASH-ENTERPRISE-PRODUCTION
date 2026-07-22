import { createD1LicenseRepository } from "./licenseRepository.d1.js";
import { describeLicenseRepositoryContract } from "./licenseRepository.contract.js";
import { createTestD1Factory } from "./testUtils/testD1.js";

const createDb = await createTestD1Factory();

describeLicenseRepositoryContract("D1 (real SQLite via sql.js)", () =>
  createD1LicenseRepository(createDb()),
);
