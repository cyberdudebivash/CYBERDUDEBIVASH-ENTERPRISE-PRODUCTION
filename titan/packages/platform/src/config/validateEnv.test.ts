import { describe, expect, it } from "vitest";
import { DEFAULT_ENVIRONMENT_NAME, validateProductionConfig } from "./validateEnv.js";

describe("validateProductionConfig", () => {
  it("is valid with no issues when ENVIRONMENT is unset (local dev)", () => {
    const result = validateProductionConfig({});
    expect(result.environment).toBe(DEFAULT_ENVIRONMENT_NAME);
    expect(result.isProductionTier).toBe(false);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("is valid with no issues in a fully-configured production environment", () => {
    const result = validateProductionConfig({
      ENVIRONMENT: "production",
      AUTH_SECRET: "a-real-generated-secret-value",
      ALLOWED_ORIGIN: "https://app.example.com",
    });
    expect(result.isProductionTier).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("is valid with no issues in a fully-configured staging environment", () => {
    const result = validateProductionConfig({
      ENVIRONMENT: "staging",
      AUTH_SECRET: "a-real-generated-secret-value",
      ALLOWED_ORIGIN: "https://staging.example.com",
    });
    expect(result.isProductionTier).toBe(true);
    expect(result.valid).toBe(true);
  });

  it("flags a missing AUTH_SECRET as an error in production", () => {
    const result = validateProductionConfig({
      ENVIRONMENT: "production",
      ALLOWED_ORIGIN: "https://app.example.com",
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "AUTH_SECRET", severity: "error" }),
    );
  });

  it("flags the shipped dev placeholder AUTH_SECRET as an error in production", () => {
    const result = validateProductionConfig({
      ENVIRONMENT: "production",
      AUTH_SECRET: "dev-only-placeholder-generate-your-own-32-byte-secret",
      ALLOWED_ORIGIN: "https://app.example.com",
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "AUTH_SECRET", severity: "error" }),
    );
  });

  it("flags a missing ALLOWED_ORIGIN as an error in production", () => {
    const result = validateProductionConfig({
      ENVIRONMENT: "production",
      AUTH_SECRET: "a-real-generated-secret-value",
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "ALLOWED_ORIGIN", severity: "error" }),
    );
  });

  it("flags a localhost ALLOWED_ORIGIN as an error in production", () => {
    const result = validateProductionConfig({
      ENVIRONMENT: "production",
      AUTH_SECRET: "a-real-generated-secret-value",
      ALLOWED_ORIGIN: "http://localhost:5173",
    });
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "ALLOWED_ORIGIN", severity: "error" }),
    );
  });

  it("flags a non-https ALLOWED_ORIGIN as a warning, not an error, in production", () => {
    const result = validateProductionConfig({
      ENVIRONMENT: "production",
      AUTH_SECRET: "a-real-generated-secret-value",
      ALLOWED_ORIGIN: "http://app.example.com",
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "ALLOWED_ORIGIN", severity: "warning" }),
    );
  });

  it("does not validate AUTH_SECRET/ALLOWED_ORIGIN at all outside a production-tier environment", () => {
    const result = validateProductionConfig({ ENVIRONMENT: "some-custom-tier" });
    expect(result.isProductionTier).toBe(false);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
