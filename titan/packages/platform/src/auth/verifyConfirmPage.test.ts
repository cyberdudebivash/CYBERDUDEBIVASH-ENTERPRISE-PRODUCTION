import { describe, expect, it } from "vitest";
import { buildVerifyConfirmPage } from "./verifyConfirmPage.js";

describe("buildVerifyConfirmPage", () => {
  const baseInput = {
    origin: "https://titan-platform-production.iambivash-bn.workers.dev",
    token: "abc123",
    email: "asha@acme.in",
    callbackUrl: "https://titan-platform-production.iambivash-bn.workers.dev",
  };

  it("builds a real callback href on the same origin, carrying token/email/callbackUrl", () => {
    const html = buildVerifyConfirmPage(baseInput);
    expect(html).toContain(
      "https://titan-platform-production.iambivash-bn.workers.dev/api/auth/callback/email?token=abc123",
    );
    expect(html).toContain("email=asha%40acme.in");
    expect(html).toContain(
      "callbackUrl=https%3A%2F%2Ftitan-platform-production.iambivash-bn.workers.dev",
    );
  });

  it("shows a real, clickable button — not an auto-redirecting script — so a GET alone does nothing", () => {
    const html = buildVerifyConfirmPage(baseInput);
    expect(html).toContain('<a class="btn" href=');
    expect(html).not.toContain("<script");
    expect(html).not.toMatch(/window\.location/);
    expect(html).not.toContain('http-equiv="refresh"');
  });

  it("HTML-escapes a hostile email value instead of injecting it verbatim", () => {
    const html = buildVerifyConfirmPage({
      ...baseInput,
      email: '"><script>alert(1)</script>',
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders a graceful 'incomplete link' state instead of a broken button when token is missing", () => {
    const html = buildVerifyConfirmPage({ ...baseInput, token: "" });
    expect(html).not.toContain('<a class="btn"');
    expect(html.toLowerCase()).toContain("incomplete");
  });

  it("includes Titan/CyberDudeBivash branding and a dark-mode media query", () => {
    const html = buildVerifyConfirmPage(baseInput);
    expect(html).toContain("Titan Compliance Platform");
    expect(html).toContain("CYBERDUDEBIVASH");
    expect(html).toContain("prefers-color-scheme: dark");
  });

  it("tells the visitor why this extra step exists, not just what to click", () => {
    const html = buildVerifyConfirmPage(baseInput);
    expect(html.toLowerCase()).toContain("scanner");
  });

  it("is marked noindex/nofollow so search engines never index a page containing a live sign-in link", () => {
    const html = buildVerifyConfirmPage(baseInput);
    expect(html).toContain('name="robots" content="noindex, nofollow"');
  });
});
