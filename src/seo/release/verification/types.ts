// Owns: nothing new. Verification reuses validators/shared.ts's
// ValidationIssue/ValidationResult directly — the same primitive
// vocabulary every prior phase's own validator (Metadata/Schema/
// Relationship/Commercial/Build) already reused rather than inventing
// a parallel "VerificationIssue" shape that means the same thing.
export type { ValidationIssue, ValidationResult } from "../../validators/shared";
