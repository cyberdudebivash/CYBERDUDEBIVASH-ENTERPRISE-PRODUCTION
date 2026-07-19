# Type System Root-Cause Fix

Follow-up to the `React.createElement` workaround introduced during Task 3's `TrustBadge` extraction. Investigated per explicit request: determine whether the underlying `key`-not-recognized issue was a TypeScript configuration problem, a JSX runtime setting, or a type-resolution quirk — and fix it at the root if a clean fix exists. One existed. Root cause found and fixed; the `createElement` workaround has been reverted back to plain JSX across all 3 call sites.

## Root cause

`src/types/ambient.d.ts` (included via `tsconfig.json`'s `typeRoots: ["./node_modules/@types", "./src/types"]`) contained a complete, hand-rolled shadow declaration of the `react` module plus a hand-rolled global `declare namespace JSX { ... }`. This looks like an emergency shim written at some point when real `@types/react`/`@types/express` weren't available or working — both are declared as real devDependencies in `package.json` today.

The shim's `JSX` namespace defined `IntrinsicElements` as `{ [elemName: string]: any }` (so host elements like `<div key={...}>` accepted anything, `key` included) but never defined `JSX.LibraryManagedAttributes<C, P>` — the conditional type that's actually responsible for recognizing `key`/`ref` as special, component-external props for *custom* components. Every custom component (including React's own `<Fragment>`, confirmed by direct test) was missing that mechanism entirely, independent of anything in this session's own code.

The shim also redeclared `express` (a cut-down, partial version of the real `@types/express` shape) and a simplified `react` module (missing exports like `Component` and `ErrorInfo`, which is why `src/main.tsx` had 2 of its 4 "pre-existing baseline" typecheck errors all session — they were never actually pre-existing project defects, they were caused by this same shim).

## Fix

`src/types/ambient.d.ts` now contains only what it should: a Node types reference, a Vite client types reference (`import.meta.env` was untyped before this — the last remaining error after removing the shim), and the `*.css` module declaration (still needed; nothing else provides it). The shadow `react`, `express`, and global `JSX` declarations are gone; the project now type-checks against the real, complete `@types/react` / `@types/react-dom` / `@types/express`.

Result: `npx tsc --noEmit` goes from 4 errors (all session, treated as an accepted baseline) to **zero**, across the entire project (`src/`, `server.ts`, `vite.config.ts`) — not just the files this session touched.

## A separate, unrelated finding surfaced while fixing this

While reinstalling to verify the fix, `@types/react`, `@types/react-dom`, and `@types/express` turned out to be **absent from `node_modules/@types/`** in this sandbox despite: being correctly declared in `package.json`, having correct, complete entries with valid registry URLs and integrity hashes in `package-lock.json`, and `npm install` reporting success with no errors. Direct `curl`+`tar` against the exact registry URLs from the lockfile downloaded and extracted each package correctly outside of npm, confirming the packages themselves and the registry are fine — something in this sandbox's `npm install` was silently failing to materialize just these 3 scoped packages while succeeding for everything else in the same install (`react`, `react-dom`, `express`, `vite`, `motion`, `lucide-react`, etc. all installed correctly every time).

Worked around by extracting the verified-correct tarballs directly into `node_modules/@types/` for this session. This is **not** committed (node_modules is gitignored, as it should be) and **not guaranteed to reproduce or need reproducing** in a different environment — this looks like a sandbox/proxy-specific quirk rather than a real npm or registry problem (the same three packages, and no others, failed identically across multiple separate install attempts in this session; everything else in the same `npm install` runs worked). GitHub Actions' hosted runners (where `deploy.yml` actually runs) are not behind this sandbox's proxy and have not been observed to have this problem.

Flagging it anyway because the consequence, if it ever recurs anywhere: with `noImplicitAny: false` set in `tsconfig.json`, a genuinely missing `@types/react` doesn't produce a loud "cannot find module" error — it silently falls back to `any` for essentially all JSX and component typing, which "fixes" symptoms like the `key` issue by disabling type-checking around them rather than by resolving them correctly. If `tsc --noEmit` ever starts passing suspiciously easily after a fresh `npm install`, check `node_modules/@types/react/package.json` actually exists before trusting the result.

This is also the concrete argument for Task 8's `tsc --noEmit` CI gate (deferred until Phase 0.2's architectural changes settle, per direction): `deploy.yml` currently only runs `vite build`, which doesn't type-check at all — so neither this shim nor a future silent-missing-types scenario would ever be caught by CI today.

## Verification

- `npx tsc --noEmit`: zero errors (was 4).
- `npx vite build`: clean, same bundle composition as before (this was always a types-only issue — nothing here could have affected runtime output, and the build output confirms it didn't).
- Real headless-Chromium smoke test against the built app: header renders, Services dropdown opens on hover, clicking a dropdown item navigates and closes the dropdown, `aria-current` updates correctly, footer renders, zero page errors — identical results to the pre-fix smoke test, confirming no behavior change from either the `ambient.d.ts` edit or reverting `createElement` back to plain JSX.
