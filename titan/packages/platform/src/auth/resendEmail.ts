import type { Logger } from "../observability/logger.js";
import { buildMagicLinkEmail } from "./emailTemplates.js";

/**
 * Real Resend integration — `POST https://api.resend.com/emails` via
 * `fetch` (native to Workers, no SDK dependency of unknown Workers
 * compatibility), mirroring exactly how `commercial/razorpay.ts` talks to
 * Razorpay's own REST API: no vendor SDK, Bearer/Basic auth built by hand,
 * defensive parsing of the vendor's own JSON error shape.
 *
 * This project has never had a real Resend API key in any environment it
 * has run in — `sendMagicLinkEmail` genuinely calls the real Resend API and
 * will fail without a real `RESEND_API_KEY`/`EMAIL_FROM` pair, the same
 * "real but blocked without real credentials" shape already established for
 * `createRazorpayOrder`. `auth/config.ts` only wires this in when both are
 * present; it never fabricates a "from" address, since Resend rejects mail
 * from a domain that hasn't been verified in the Resend dashboard, and this
 * project has never had one — silently defaulting to a guessed address
 * would fail confusingly (or silently land in spam) at send time instead of
 * simply not registering the provider.
 *
 * A magic-link send happens inline in the `POST /api/auth/signin/email`
 * request Auth.js is already handling, so retry/timeout budgets stay small
 * on purpose: one retry (two attempts total), a short fixed backoff, and a
 * 10s per-attempt abort — enough to ride out a transient blip without
 * risking the surrounding request itself timing out.
 */

export interface ResendCredentials {
  /** Resend dashboard API key (Settings > API Keys). Never logged. */
  apiKey: string;
  /** Must be an address on a domain verified in the Resend dashboard —
   * Resend rejects (422) sends from an unverified domain. */
  from: string;
}

export class ResendApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ResendApiError";
  }
}

export interface MagicLinkEmailParams {
  to: string;
  url: string;
  expires: Date;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;

/** 429 (rate limited) and 5xx (Resend-side failure) are worth one retry;
 * every 4xx other than 429 is a real request problem (bad API key,
 * unverified sender domain, malformed address) that a retry cannot fix. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type AttemptResult =
  { ok: true; messageId?: string } | { ok: false; retryable: boolean; error: Error };

async function attemptSend(
  payload: Record<string, unknown>,
  credentials: ResendCredentials,
): Promise<AttemptResult> {
  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    // Network failure, DNS error, or the AbortSignal firing — all
    // transient from the caller's point of view, all worth one retry.
    return {
      ok: false,
      retryable: true,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  if (response.ok) {
    const body = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, messageId: body.id };
  }

  // Resend's own error responses are JSON with a `.message` — read
  // defensively since a network-layer/proxy failure won't be JSON at all.
  let description = `Resend API request failed with status ${response.status}`;
  try {
    const body = (await response.json()) as { message?: string };
    if (body.message) description = body.message;
  } catch {
    // Non-JSON error body — keep the generic message above.
  }

  return {
    ok: false,
    retryable: isRetryableStatus(response.status),
    error: new ResendApiError(description, response.status),
  };
}

/** Never resolves silently on failure — throws, so Auth.js's own
 * `sendVerificationRequest` error handling takes over (redirect to
 * `/api/auth/error`) instead of the caller believing a link was delivered
 * that never was. Never logs `credentials.apiKey`, the generated `url`
 * (contains the raw sign-in token), or the rendered email body — only
 * operational metadata (recipient, Resend's own message id, status,
 * attempt count), the same "never leak a token/secret into a log line"
 * discipline `auth/config.ts`'s session callback already applies to
 * `sessionToken`. */
export async function sendMagicLinkEmail(
  params: MagicLinkEmailParams,
  credentials: ResendCredentials,
  logger?: Logger,
): Promise<void> {
  const { subject, html, text } = buildMagicLinkEmail({
    url: params.url,
    expires: params.expires,
    identifier: params.to,
  });
  const payload = {
    from: credentials.from,
    to: [params.to],
    subject,
    html,
    text,
  };

  let result: AttemptResult | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    result = await attemptSend(payload, credentials);
    if (result.ok) {
      logger?.info("magic-link email sent", {
        provider: "resend",
        identifier: params.to,
        messageId: result.messageId,
        attempt,
      });
      return;
    }

    if (!result.retryable || attempt === MAX_ATTEMPTS) break;

    logger?.warn("magic-link email send failed, retrying", {
      provider: "resend",
      identifier: params.to,
      attempt,
      status: result.error instanceof ResendApiError ? result.error.status : undefined,
      message: result.error.message,
    });
    await delay(RETRY_DELAY_MS);
  }

  // Loop only exits without returning when every attempt failed, so
  // `result` is always the final (non-ok) outcome here — narrowed
  // explicitly rather than asserted, so this stays type-safe if that
  // invariant is ever broken by a future edit.
  if (!result || result.ok) {
    throw new Error("sendMagicLinkEmail: exhausted attempts without a recorded failure");
  }
  const finalError = result.error;
  logger?.error("magic-link email send failed", {
    provider: "resend",
    identifier: params.to,
    status: finalError instanceof ResendApiError ? finalError.status : undefined,
    message: finalError.message,
  });
  throw finalError;
}
