import { describe, expect, it } from "vitest";
import { toConfirmUrl } from "./verifyConfirmUrl.js";

describe("toConfirmUrl", () => {
  it("replaces only the pathname, preserving origin and the full query string verbatim", () => {
    const raw =
      "https://titan-platform-production.iambivash-bn.workers.dev/api/auth/callback/email?callbackUrl=https%3A%2F%2Ftitan-platform-production.iambivash-bn.workers.dev&token=abc123&email=asha%40acme.in";

    const result = toConfirmUrl(raw);
    const parsed = new URL(result);

    expect(parsed.origin).toBe("https://titan-platform-production.iambivash-bn.workers.dev");
    expect(parsed.pathname).toBe("/api/auth/verify-confirm");
    expect(parsed.searchParams.get("token")).toBe("abc123");
    expect(parsed.searchParams.get("email")).toBe("asha@acme.in");
    expect(parsed.searchParams.get("callbackUrl")).toBe(
      "https://titan-platform-production.iambivash-bn.workers.dev",
    );
  });

  it("works for a local dev origin too", () => {
    const raw = "http://localhost:8787/api/auth/callback/email?token=xyz&email=a%40b.com";
    const result = toConfirmUrl(raw);
    expect(result).toBe("http://localhost:8787/api/auth/verify-confirm?token=xyz&email=a%40b.com");
  });

  it("throws on a genuinely malformed URL rather than silently producing a broken link", () => {
    expect(() => toConfirmUrl("not a url")).toThrow();
  });
});
