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
  URL: "readonly",
  console: "readonly",
  requestAnimationFrame: "readonly",
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
      ignores: ["**/dist/**", "**/coverage/**", "**/node_modules/**"],
    },
  ];
}
