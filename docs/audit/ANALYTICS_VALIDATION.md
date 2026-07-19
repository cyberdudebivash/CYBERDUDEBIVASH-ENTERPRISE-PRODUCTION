# Analytics Validation Report

Phase 0.1, Task 9. Documentation only — no IDs invented, none replaced. Where a value looks like a placeholder, it's flagged for manual verification rather than assumed either way.

## Every measurement/tracking ID found

| ID | Type | Status |
|---|---|---|
| `G-MDT720X9YW` | Google Analytics 4 (gtag) | **Unverified.** The homepage's own source (`_vite_entry.html`, which becomes `index.html`) still carries its original setup comment: *"Replace G-MDT720X9YW with your Measurement ID from: analytics.google.com → Admin → Data Streams → Web → Measurement ID"*. This reads as either an un-replaced placeholder, or a real ID left with stale instructional text — the repo cannot distinguish these. **Action required: log into analytics.google.com and confirm this property is owned and receiving data.** |
| `ca-pub-8343951291888650` | Google AdSense publisher ID | Present and structurally consistent everywhere it appears — no placeholder language found near it, unlike the GA4 ID. Not independently verifiable as "real" from the repo, but shows no sign of being a stand-in. |

## Coverage — which pages carry what

GA4 (`gtag/js?id=`) is present on **12 of 20** static pages: `_vite_entry.html`/`index.html`, `about.html`, `bug-bounty.html`, `contact.html`, `platforms.html`, `pricing.html`, `privacy.html`, `services.html`, `status.html`, `threat-intel.html`.
**Missing GA4:** `apps.html`, `compliance.html`, `dark-web-monitor.html`, `item.html`, `research.html`, `soc-services.html`, `vciso.html`.

AdSense is present on **18 of 20** pages — broader coverage than GA4. Every page carrying GA4 also carries AdSense, plus 6 more that carry ads without any analytics on the same page.

**Finding:** ad monetization is more consistently wired up across the site than visitor analytics is. Concretely: `vciso.html`, `soc-services.html`, `compliance.html`, and `research.html` — four of the highest-intent commercial pages — show ads to visitors but don't measure them at all.

## Consent Mode

Google Consent Mode v2 is correctly implemented on the homepage entry (`_vite_entry.html`): `analytics_storage`/`ad_storage`/`ad_user_data`/`ad_personalization` all default to `denied`, with a `wait_for_update` of 500ms, and a `localStorage`-backed restore of a prior accept decision. This is genuine, correctly-structured GDPR/DPDP consent handling — not superficial. `CookieConsent.tsx` in the SPA implements the matching accept/reject UI and calls `gtag('consent', 'update', ...)` on the visitor's choice.

## Event tracking wired into the SPA

`src/App.tsx` fires:
- `gtag('event', 'purchase', ...)` on Gumroad product checkout
- `gtag('event', 'generate_lead', ...)` on enterprise contact-form submission

Both depend entirely on the GA4 ID above being real. If it isn't, these events fire into nothing — there is currently no way to know how many demo requests, leads, or purchases the site has actually driven.

## Other platforms

No Plausible, PostHog, Mixpanel, Segment, or other analytics platform found anywhere in the codebase (`src/`, all static HTML, `blogger-theme.xml`). GA4 is the only visitor-analytics mechanism that exists, wired or not.

## Recommendation

1. **Immediate:** verify `G-MDT720X9YW` ownership. This determines whether any conversion data collected to date is real — see audit findings #16 and #19.
2. Once verified, add GA4 to the 7 pages currently missing it, prioritizing `vciso.html`, `compliance.html`, and `soc-services.html` (highest commercial intent, currently unmeasured).
3. Decide deliberately whether AdSense belongs on `vciso.html`/`compliance.html`/`soc-services.html` at all — see audit finding #17 (Enterprise UX): running ads next to a vCISO or compliance-automation sales pitch is a stronger version of the same credibility concern already raised for the homepage.
