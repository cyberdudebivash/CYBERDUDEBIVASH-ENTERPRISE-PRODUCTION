// Shared ESLint flat config for all Titan packages/apps.
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  fetch: "readonly",
  Request: "readonly",
  Response: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  console: "readonly",
  requestAnimationFrame: "readonly",
  crypto: "readonly",
  // EAP-2: found the same way the .wrangler/ ignore below was — real new
  // code (useLeadSearch.ts's search debounce, leadWorkspacePreferences.ts's
  // localStorage-backed saved filters/columns) was the first in this
  // workspace to actually need them, surfacing a real gap in this
  // hand-curated list rather than a config file with everything
  // pre-declared speculatively.
  setTimeout: "readonly",
  clearTimeout: "readonly",
  localStorage: "readonly",
};

const nodeGlobals = {
  process: "readonly",
  __dirname: "readonly",
};

/** @param {{ tsconfigRootDir: string }} opts */
export function titanEslintConfig({ tsconfigRootDir }) {
  return [
    js.configs.recommended,
    {
      // Build-tooling config files: syntax-checked, not type-aware-linted —
      // they intentionally sit outside each package's own tsconfig `include`
      // (app source shouldn't type-check against its own bundler config).
      files: ["**/*.config.{ts,mts}"],
      languageOptions: {
        parser: tsParser,
        globals: { ...nodeGlobals },
      },
      plugins: { "@typescript-eslint": tseslint },
      rules: {
        ...tseslint.configs.recommended.rules,
      },
    },
    {
      files: ["**/*.{ts,tsx}"],
      ignores: ["**/*.config.{ts,mts}"],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          project: true,
          tsconfigRootDir,
        },
        globals: { ...browserGlobals, ...nodeGlobals },
      },
      plugins: {
        "@typescript-eslint": tseslint,
        react,
        "react-hooks": reactHooks,
        "jsx-a11y": jsxA11y,
      },
      settings: {
        react: { version: "19" },
      },
      rules: {
        ...tseslint.configs.recommended.rules,
        ...react.configs.recommended.rules,
        ...reactHooks.configs.recommended.rules,
        ...jsxA11y.configs.recommended.rules,
        "react/react-in-jsx-scope": "off",
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
        "@typescript-eslint/consistent-type-imports": "error",
      },
    },
    {
      // PRD-1: standalone Node.js CLI scripts (packages/platform/scripts/) —
      // deployment/validation tooling run directly via `node scripts/x.mjs`,
      // never bundled into the Worker or the browser app, so this needs real
      // Node/fetch globals rather than browserGlobals (which assumes a
      // window/DOM context none of these scripts have).
      files: ["**/scripts/**/*.mjs"],
      languageOptions: {
        globals: { ...nodeGlobals, console: "readonly", URL: "readonly", fetch: "readonly" },
      },
    },
    {
      // .wrangler/ is `wrangler dev`'s local build cache (gitignored,
      // packages/platform/.gitignore) — its generated bundles aren't this
      // codebase's source and shouldn't be linted as if they were. Found
      // because a real local `wrangler dev` run (Stage 4 Workstream 10
      // verification) created it for the first time in this workspace.
      ignores: ["**/dist/**", "**/coverage/**", "**/node_modules/**", "**/.wrangler/**"],
    },
  ];
}
