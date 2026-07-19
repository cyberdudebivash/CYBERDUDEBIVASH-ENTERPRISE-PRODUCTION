export class ReleaseVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReleaseVerificationError";
  }
}
