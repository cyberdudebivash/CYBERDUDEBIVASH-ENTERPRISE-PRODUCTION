import { afterEach, describe, expect, it, vi } from "vitest";
import type { EmailConfig } from "@auth/core/providers/email";
import { createTestD1Factory } from "../repositories/testUtils/testD1.js";
import { createAuthConfig } from "./config.js";

const createDb = await createTestD1Factory();

describe("createAuthConfig", () => {
  it("always registers the dev-mode Email provider", () => {
    const config = createAuthConfig({ db: createDb(), secret: "test-secret" });
    const ids = config.providers.map((p) => ("id" in p ? p.id : undefined));
    expect(ids).toContain("email");
  });

  it("does not register Google or GitHub when no credentials are supplied", () => {
    const config = createAuthConfig({ db: createDb(), secret: "test-secret" });
    const ids = config.providers.map((p) => ("id" in p ? p.id : undefined));
    expect(ids).not.toContain("google");
    expect(ids).not.toContain("github");
  });

  it("registers Google and GitHub when credentials are supplied", () => {
    const config = createAuthConfig({
      db: createDb(),
      secret: "test-secret",
      google: { clientId: "g-id", clientSecret: "g-secret" },
      github: { clientId: "h-id", clientSecret: "h-secret" },
    });
    const ids = config.providers.map((p) => ("id" in p ? p.id : undefined));
    expect(ids).toContain("google");
    expect(ids).toContain("github");
  });

  it("wires the D1 adapter and a database session strategy", () => {
    const config = createAuthConfig({ db: createDb(), secret: "test-secret" });
    expect(config.adapter).toBeDefined();
    expect(config.session?.strategy).toBe("database");
    expect(config.basePath).toBe("/api/auth");
  });

  it("accepts an array of secrets for rotation", () => {
    const config = createAuthConfig({ db: createDb(), secret: ["new-secret", "old-secret"] });
    expect(config.secret).toEqual(["new-secret", "old-secret"]);
  });

  it("the dev Email provider logs instead of sending real email", async () => {
    const messages: unknown[] = [];
    const config = createAuthConfig({
      db: createDb(),
      secret: "test-secret",
      logger: {
        info: (message, fields) => messages.push({ message, fields }),
        warn: () => {},
        error: () => {},
      },
    });
    const emailProvider = config.providers.find((p) => "id" in p && p.id === "email") as
      EmailConfig | undefined;
    expect(emailProvider).toBeDefined();

    await emailProvider!.sendVerificationRequest({
      identifier: "asha@acme.in",
      url: "https://example.com/api/auth/callback/email?token=abc",
      expires: new Date("2026-07-20T01:00:00.000Z"),
      provider: emailProvider!,
      token: "test-token",
      theme: {},
      request: new Request("https://example.com/api/auth/callback/email?token=abc"),
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      message: expect.stringContaining("dev mode"),
      fields: { identifier: "asha@acme.in" },
    });
  });

  it("the dev Email provider's from address is the local placeholder, not a real domain", () => {
    const config = createAuthConfig({ db: createDb(), secret: "test-secret" });
    const emailProvider = config.providers.find((p) => "id" in p && p.id === "email") as
      EmailConfig | undefined;
    expect(emailProvider?.from).toBe("no-reply@titan.local");
  });

  describe("Resend-backed Email provider (resend credentials supplied)", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("uses the configured Resend sender as the provider's from address, not the dev placeholder", () => {
      const config = createAuthConfig({
        db: createDb(),
        secret: "test-secret",
        resend: { apiKey: "re_test", from: "Titan <no-reply@cyberdudebivash.com>" },
      });
      const emailProvider = config.providers.find((p) => "id" in p && p.id === "email") as
        EmailConfig | undefined;
      expect(emailProvider?.from).toBe("Titan <no-reply@cyberdudebivash.com>");
    });

    it("sending a verification request actually calls the real Resend API, not the dev-mode logger", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ id: "re_abc" }), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      const messages: unknown[] = [];
      const config = createAuthConfig({
        db: createDb(),
        secret: "test-secret",
        resend: { apiKey: "re_test", from: "no-reply@cyberdudebivash.com" },
        logger: {
          info: (message, fields) => messages.push({ message, fields }),
          warn: () => {},
          error: () => {},
        },
      });
      const emailProvider = config.providers.find((p) => "id" in p && p.id === "email") as
        EmailConfig | undefined;
      expect(emailProvider).toBeDefined();

      await emailProvider!.sendVerificationRequest({
        identifier: "asha@acme.in",
        url: "https://example.com/api/auth/callback/email?token=abc",
        expires: new Date(Date.now() + 3600_000),
        provider: emailProvider!,
        token: "test-token",
        theme: {},
        request: new Request("https://example.com/api/auth/callback/email?token=abc"),
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({ method: "POST" }),
      );
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({ message: "magic-link email sent" });
      expect(messages.some((m) => (m as { message: string }).message.includes("dev mode"))).toBe(
        false,
      );
    });

    it("emails the safe verify-confirm link, never Auth.js's raw token-consuming callback URL", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ id: "re_abc" }), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      const config = createAuthConfig({
        db: createDb(),
        secret: "test-secret",
        resend: { apiKey: "re_test", from: "no-reply@cyberdudebivash.com" },
      });
      const emailProvider = config.providers.find((p) => "id" in p && p.id === "email") as
        EmailConfig | undefined;

      await emailProvider!.sendVerificationRequest({
        identifier: "asha@acme.in",
        url: "https://example.com/api/auth/callback/email?token=abc&email=asha%40acme.in",
        expires: new Date(Date.now() + 3600_000),
        provider: emailProvider!,
        token: "test-token",
        theme: {},
        request: new Request("https://example.com/api/auth/callback/email?token=abc"),
      });

      const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(requestInit.body as string) as { html: string; text: string };
      expect(body.html).toContain("/api/auth/verify-confirm?token=abc");
      expect(body.text).toContain("/api/auth/verify-confirm?token=abc");
      expect(body.html).not.toContain("/api/auth/callback/email");
      expect(body.text).not.toContain("/api/auth/callback/email");
    });
  });

  describe("redirect callback (EAP-1)", () => {
    // @auth/core types `callbacks` as optional even though createAuthConfig
    // always supplies one — narrowed once here so every test below can call
    // `redirect(...)` directly without repeating the assertion.
    function redirectOf(config: ReturnType<typeof createAuthConfig>) {
      const redirect = config.callbacks?.redirect;
      if (!redirect) throw new Error("expected a redirect callback");
      return redirect;
    }

    it("allows a relative callback URL, resolved against baseUrl", async () => {
      const config = createAuthConfig({ db: createDb(), secret: "test-secret" });
      const result = await redirectOf(config)({
        url: "/admin",
        baseUrl: "http://localhost:8787",
      });
      expect(result).toBe("http://localhost:8787/admin");
    });

    it("allows a callback URL on the Worker's own origin", async () => {
      const config = createAuthConfig({ db: createDb(), secret: "test-secret" });
      const result = await redirectOf(config)({
        url: "http://localhost:8787/somewhere",
        baseUrl: "http://localhost:8787",
      });
      expect(result).toBe("http://localhost:8787/somewhere");
    });

    it("falls back to baseUrl for an unrecognized origin when no allowedOrigin is configured", async () => {
      const config = createAuthConfig({ db: createDb(), secret: "test-secret" });
      const result = await redirectOf(config)({
        url: "https://evil.example.com/",
        baseUrl: "http://localhost:8787",
      });
      expect(result).toBe("http://localhost:8787");
    });

    it("allows a callback URL on the configured allowedOrigin (the cross-origin SPA)", async () => {
      const config = createAuthConfig({
        db: createDb(),
        secret: "test-secret",
        allowedOrigin: "http://localhost:5173",
      });
      const result = await redirectOf(config)({
        url: "http://localhost:5173/admin",
        baseUrl: "http://localhost:8787",
      });
      expect(result).toBe("http://localhost:5173/admin");
    });

    it("still falls back to baseUrl for an origin that isn't the Worker's own or the configured allowedOrigin", async () => {
      const config = createAuthConfig({
        db: createDb(),
        secret: "test-secret",
        allowedOrigin: "http://localhost:5173",
      });
      const result = await redirectOf(config)({
        url: "https://evil.example.com/",
        baseUrl: "http://localhost:8787",
      });
      expect(result).toBe("http://localhost:8787");
    });

    it("falls back to baseUrl for a malformed absolute URL instead of throwing", async () => {
      const config = createAuthConfig({
        db: createDb(),
        secret: "test-secret",
        allowedOrigin: "http://localhost:5173",
      });
      const result = await redirectOf(config)({
        url: "not a url",
        baseUrl: "http://localhost:8787",
      });
      expect(result).toBe("http://localhost:8787");
    });
  });
});
