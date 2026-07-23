import { describe, expect, it } from "vitest";
import { buildMagicLinkEmail, formatExpiry } from "./emailTemplates.js";

describe("formatExpiry", () => {
  it("formats sub-hour durations in minutes", () => {
    const now = new Date("2026-07-23T10:00:00.000Z");
    const expires = new Date("2026-07-23T10:15:00.000Z");
    expect(formatExpiry(expires, now)).toBe("in 15 minutes");
  });

  it("uses singular 'minute' for exactly one minute", () => {
    const now = new Date("2026-07-23T10:00:00.000Z");
    const expires = new Date("2026-07-23T10:01:00.000Z");
    expect(formatExpiry(expires, now)).toBe("in 1 minute");
  });

  it("formats hour-plus durations in rounded hours", () => {
    const now = new Date("2026-07-23T10:00:00.000Z");
    const expires = new Date("2026-07-23T11:58:00.000Z");
    expect(formatExpiry(expires, now)).toBe("in 2 hours");
  });

  it("uses singular 'hour' for exactly one hour", () => {
    const now = new Date("2026-07-23T10:00:00.000Z");
    const expires = new Date("2026-07-23T11:00:00.000Z");
    expect(formatExpiry(expires, now)).toBe("in 1 hour");
  });

  it("falls back to 'shortly' for an already-past expiry instead of a negative duration", () => {
    const now = new Date("2026-07-23T10:00:00.000Z");
    const expires = new Date("2026-07-23T09:00:00.000Z");
    expect(formatExpiry(expires, now)).toBe("shortly");
  });
});

describe("buildMagicLinkEmail", () => {
  const baseInput = {
    url: "https://titan-platform-production.workers.dev/api/auth/callback/email?token=abc123&callbackUrl=%2Fadmin",
    expires: new Date(Date.now() + 60 * 60 * 1000),
    identifier: "asha@acme.in",
  };

  it("has a clear, non-spammy subject line", () => {
    const { subject } = buildMagicLinkEmail(baseInput);
    expect(subject).toBe("Sign in to Titan");
  });

  it("includes the real sign-in url (HTML-escaped in html, verbatim in text) and Titan/CyberDudeBivash branding", () => {
    const { html, text } = buildMagicLinkEmail(baseInput);
    expect(html).toContain("Titan");
    expect(html).toContain("CYBERDUDEBIVASH");
    expect(text).toContain(baseInput.url);
    expect(html).toContain(baseInput.url.replace(/&/g, "&amp;"));
  });

  it("includes a security notice and the established titan support contact", () => {
    const { html, text } = buildMagicLinkEmail(baseInput);
    expect(html.toLowerCase()).toContain("didn't request");
    expect(text.toLowerCase()).toContain("didn't request");
    // Matches the support address titan's own DpdpAssessmentPage/pdfReport
    // already show customers — not a newly-invented address.
    expect(html).toContain("contact@cyberdudebivash.in");
    expect(text).toContain("contact@cyberdudebivash.in");
  });

  it("includes a real expiration notice derived from the actual expires value, not a hardcoded claim", () => {
    const soon = new Date(Date.now() + 10 * 60 * 1000);
    const { html, text } = buildMagicLinkEmail({ ...baseInput, expires: soon });
    expect(html).toContain("in 10 minutes");
    expect(text).toContain("in 10 minutes");
  });

  it("includes a dark-mode media query so the email renders correctly in dark-mode clients", () => {
    const { html } = buildMagicLinkEmail(baseInput);
    expect(html).toContain("prefers-color-scheme: dark");
  });

  it("HTML-escapes a hostile identifier instead of injecting it verbatim", () => {
    const { html } = buildMagicLinkEmail({
      ...baseInput,
      identifier: '"><script>alert(1)</script>',
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("plain-text version contains no HTML tags", () => {
    const { text } = buildMagicLinkEmail(baseInput);
    expect(text).not.toMatch(/<[a-z][\s\S]*>/i);
  });

  it("never asserts an unearned certification/audit claim in either version (CLAUDE.md anti-fabrication rule)", () => {
    const { html, text } = buildMagicLinkEmail(baseInput);
    for (const claim of ["ISO 27001", "SOC 2", "certified", "audited", "empanelled"]) {
      expect(html.toLowerCase()).not.toContain(claim.toLowerCase());
      expect(text.toLowerCase()).not.toContain(claim.toLowerCase());
    }
  });
});
