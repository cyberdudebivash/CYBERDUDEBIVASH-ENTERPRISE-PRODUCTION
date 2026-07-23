import { describe, expect, it, vi, afterEach } from "vitest";
import { ResendApiError, sendMagicLinkEmail } from "./resendEmail.js";

describe("sendMagicLinkEmail", () => {
  const credentials = { apiKey: "re_test_fake_key", from: "Titan <no-reply@cyberdudebivash.com>" };
  const params = {
    to: "asha@acme.in",
    url: "https://titan-platform-production.workers.dev/api/auth/callback/email?token=abc&callbackUrl=%2Fadmin",
    expires: new Date(Date.now() + 60 * 60 * 1000),
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends real Bearer auth and a from/to/subject/html/text payload built from the templates", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "re_abc123" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendMagicLinkEmail(params, credentials);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials.apiKey}`,
    });

    const body = JSON.parse(requestInit.body as string);
    expect(body.from).toBe(credentials.from);
    expect(body.to).toEqual([params.to]);
    expect(body.subject).toBe("Sign in to Titan");
    expect(body.html).toContain(params.url.replace(/&/g, "&amp;"));
    expect(body.text).toContain(params.url);
  });

  it("never includes the API key in the request body, only the Authorization header", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "x" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendMagicLinkEmail(params, credentials);

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestInit.body as string).not.toContain(credentials.apiKey);
  });

  it("logs only operational metadata on success — never the API key, the sign-in url, or the rendered email body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "re_abc123" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const logged: unknown[] = [];
    const logger = {
      info: (message: string, fields?: unknown) => logged.push({ message, fields }),
      warn: (message: string, fields?: unknown) => logged.push({ message, fields }),
      error: (message: string, fields?: unknown) => logged.push({ message, fields }),
    };

    await sendMagicLinkEmail(params, credentials, logger);

    const serialized = JSON.stringify(logged);
    expect(serialized).not.toContain(credentials.apiKey);
    expect(serialized).not.toContain(params.url);
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({
      message: "magic-link email sent",
      fields: { provider: "resend", identifier: params.to, messageId: "re_abc123" },
    });
  });

  it("throws ResendApiError with Resend's own real error message on a non-retryable 4xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: "Domain not verified" }), { status: 422 }),
        ),
    );

    await expect(sendMagicLinkEmail(params, credentials)).rejects.toMatchObject({
      name: "ResendApiError",
      status: 422,
      message: "Domain not verified",
    });
  });

  it("does not retry a non-retryable 4xx — exactly one attempt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendMagicLinkEmail(params, credentials)).rejects.toBeInstanceOf(ResendApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once on a 5xx and succeeds on the second attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Bad Gateway", { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "re_retry_ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendMagicLinkEmail(params, credentials);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once on a 429 (rate limited)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "rate limited" }), { status: 429 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "re_ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendMagicLinkEmail(params, credentials);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once on a network failure, then throws the real network error after the second failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("network error"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendMagicLinkEmail(params, credentials)).rejects.toThrow("network error");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after exactly two attempts on repeated 5xx failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendMagicLinkEmail(params, credentials)).rejects.toBeInstanceOf(ResendApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to a generic message when the error response isn't JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>401</html>", { status: 401 })),
    );

    await expect(sendMagicLinkEmail(params, credentials)).rejects.toBeInstanceOf(ResendApiError);
  });
});
