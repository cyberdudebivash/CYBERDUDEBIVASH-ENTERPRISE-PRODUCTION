import { describe, expect, it } from "vitest";
import { createTestD1Factory } from "../repositories/testUtils/testD1.js";
import { createAuthConfig } from "./config.js";
import { getSession } from "./session.js";

const createDb = await createTestD1Factory();

describe("getSession", () => {
  it("returns null when the request carries no session cookie", async () => {
    const config = createAuthConfig({ db: createDb(), secret: "test-secret" });
    const session = await getSession(new Request("https://example.com/api/leads"), config);
    expect(session).toBeNull();
  });

  it("returns null for an unrecognized session cookie rather than throwing", async () => {
    const config = createAuthConfig({ db: createDb(), secret: "test-secret" });
    const session = await getSession(
      new Request("https://example.com/api/leads", {
        headers: { cookie: "authjs.session-token=does-not-exist" },
      }),
      config,
    );
    expect(session).toBeNull();
  });
});
