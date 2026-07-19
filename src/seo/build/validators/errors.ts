// Owns: the Build Platform's own typed failure — thrown when
// generation must stop because a validation gate failed. Mirrors the
// Runtime Platform's own typed-error precedent (contracts/errors.ts)
// at the scope this phase actually needs: one error, since this
// phase's own instructions don't name a typed-error hierarchy the way
// Phase 1.5's did (only "Fail generation on validation errors").

export class BuildValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildValidationError";
  }
}
