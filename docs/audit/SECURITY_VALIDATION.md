# Security Validation Report

Phase 0.1, Task 10. Reviews what's configured, what's actually effective in production, and what to do about the gap.

## Hosting context (this determines everything below)

`.github/workflows/deploy.yml` deploys via `actions/deploy-pages@v4` — **GitHub Pages**. This is the single fact that makes several of the items below ineffective despite being correctly authored.

## `_headers`

**Fully and correctly authored. Zero effect in production.**

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(), interest-cohort=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://www.google-analytics.com https://tpc.googlesyndication.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://formspree.io https://www.google-analytics.com https://intel.cyberdudebivash.com; frame-src https://pagead2.googlesyndication.com https://tpc.googlesyndication.com; worker-src 'self';
```

`_headers` is a Netlify / Cloudflare Pages convention. GitHub Pages does not read it. **The production site currently serves none of the above at the HTTP level** — no CSP, no HSTS, no clickjacking protection, no MIME-sniffing protection. This is the same shape of problem as the compliance-claim gap fixed earlier in this engagement (documented intent that silently isn't what ships), except this one is invisible to a code reader and only shows up by inspecting response headers directly. Rated Critical in the architecture audit (finding #13) for exactly that reason.

**What's actually settable on GitHub Pages:** only via `<meta http-equiv>` tags in each page's `<head>`, and only for the subset of policies that support the meta-tag form — practically, that's CSP (`<meta http-equiv="Content-Security-Policy">`) and not much else. HSTS, X-Frame-Options, and Permissions-Policy have no meta-tag equivalent and **cannot** be replicated without either real HTTP header support or a different hosting layer (Cloudflare in front of GitHub Pages, or migrating to Netlify/Cloudflare Pages directly).

No `<meta http-equiv="Content-Security-Policy">` fallback currently exists on any page — confirmed by search across all HTML and `src/*.tsx`.

## `server.ts` (the Node/Express target)

No `helmet`, no manual `res.setHeader(...)` calls, no CSP — confirmed by direct read. This is the local-dev / potential Node-hosting target; it inherits none of `_headers`' intent either. If this server is ever used to serve production traffic directly (rather than static GitHub Pages), it currently ships with zero security headers of its own.

## `robots.txt`

**Genuinely well-constructed** — this is the one unambiguously strong item in this report. Correctly allows major search/social crawlers (Googlebot, Bingbot, LinkedInBot, Twitterbot, facebookexternalhit) with sensible crawl-delay values, explicitly disallows internal build artifacts (`/assets/index-*.js`, `/_vite_entry.html`, `/src/`) and the API surface (`/api/`), and deliberately blocks AI-training crawlers (GPTBot, CCBot, anthropic-ai, Claude-Web, cohere-ai, PerplexityBot, YouBot) — a real, current best practice most sites of this size skip.

## `security.txt`

Present at `public/.well-known/security.txt`, correctly formatted per RFC 9116: `Contact`, `Acknowledgments`, `Policy` (both pointing at `bug-bounty.html`), `Preferred-Languages`, `Canonical`, and an `Expires` date roughly a year out. No issues found.

## API surface (`server.ts`)

`POST /api/security/analyze` proxies to the Gemini API with no rate limiting and no request validation (no `express-rate-limit`, `zod`, `joi`, or equivalent anywhere in `package.json` or `server.ts`) — a public, unauthenticated endpoint fanning out to a metered third-party API. Covered in depth as audit finding #14; noted here because it's the one live *application-layer* (not header-layer) security gap.

## Summary table

| Control | Authored? | Effective in production? |
|---|---|---|
| CSP / HSTS / X-Frame-Options / Permissions-Policy / Referrer-Policy (`_headers`) | Yes, fully | **No — GitHub Pages ignores `_headers`** |
| `robots.txt` | Yes, well | Yes |
| `security.txt` | Yes, correctly | Yes |
| API rate limiting | No | N/A |
| Server-side headers (`server.ts`) | No | N/A |

## Recommendation

Pick one, in order of preference:

1. **Front GitHub Pages with Cloudflare** (free tier is sufficient) and set the same policy as Cloudflare-level response headers — smallest change, keeps GitHub Pages hosting.
2. **Migrate hosting to Cloudflare Pages or Netlify**, both of which read `_headers` natively — the file already exists and needs zero changes.
3. **Minimum viable fix without infrastructure change:** add a `<meta http-equiv="Content-Security-Policy">` tag matching the existing policy to every page `<head>` (covers CSP only — HSTS/X-Frame-Options/Permissions-Policy stay unaddressed until 1 or 2 happens).

Recommend against leaving this as-is: for a company whose product is cybersecurity credibility, an enterprise buyer's security team running a header scanner against the live domain today would find none of the hardening `_headers` claims to have.
