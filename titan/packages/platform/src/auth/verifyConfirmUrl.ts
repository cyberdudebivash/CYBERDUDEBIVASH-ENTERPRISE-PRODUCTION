/**
 * Rewrites Auth.js's own magic-link callback URL into a link to a safe,
 * side-effect-free confirmation page (`verifyConfirmPage.ts`, served at
 * `GET /api/auth/verify-confirm`) instead of emailing the raw callback
 * directly.
 *
 * Real production evidence, not a theoretical concern: Cloudflare Workers
 * Logs showed the raw `/api/auth/callback/email` URL being visited and
 * consumed ~6 seconds after send — far faster than a human opening an
 * email — immediately followed by a GET to the homepage, then the real
 * recipient's own click ~90 seconds later finding the token already
 * consumed. Consistent with an automated link-safety scanner (this email
 * was also landing in spam, which typically means extra automated
 * scrutiny), not the recipient. Auth.js's built-in Email provider treats
 * any GET to its callback URL as a completed sign-in — there is no way to
 * distinguish a scanner's prefetch from a real click at that layer.
 *
 * The confirmation page this points to is deliberately inert on GET: it
 * only reads the same `token`/`email`/`callbackUrl` query params to render
 * a plain `<a href>` pointing at the real callback — visiting the page
 * itself consumes nothing, so a scanner prefetching it is harmless. Only an
 * actual click ever reaches the real, token-consuming callback.
 */
export function toConfirmUrl(authCallbackUrl: string): string {
  const target = new URL(authCallbackUrl);
  target.pathname = "/api/auth/verify-confirm";
  return target.toString();
}
