import { describe, expect, it } from "vitest";
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
});
