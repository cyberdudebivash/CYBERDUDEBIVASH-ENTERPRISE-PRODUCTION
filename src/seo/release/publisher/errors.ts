export class ReleasePublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReleasePublishError";
  }
}
