import { describe, expect, it } from "vitest";
import { isTrustedOrigin } from "./csrf.js";

const ALLOWED = "http://localhost:5173";

describe("isTrustedOrigin", () => {
  it("allows a request with no Origin header", () => {
    const request = new Request("https://example.com/api/leads", { method: "POST" });
    expect(isTrustedOrigin(request, ALLOWED)).toBe(true);
  });

  it("allows a request whose Origin matches the allowed origin", () => {
    const request = new Request("https://example.com/api/leads", {
      method: "POST",
      headers: { Origin: ALLOWED },
    });
    expect(isTrustedOrigin(request, ALLOWED)).toBe(true);
  });

  it("rejects a request whose Origin does not match", () => {
    const request = new Request("https://example.com/api/leads", {
      method: "POST",
      headers: { Origin: "https://evil.example.com" },
    });
    expect(isTrustedOrigin(request, ALLOWED)).toBe(false);
  });
});
