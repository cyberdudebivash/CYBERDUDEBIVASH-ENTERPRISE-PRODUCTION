import { createInMemoryLicenseRepository } from "./licenseRepository.memory.js";
import { describeLicenseRepositoryContract } from "./licenseRepository.contract.js";

describeLicenseRepositoryContract("in-memory", () => createInMemoryLicenseRepository());
