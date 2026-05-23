// Flat config for Next.js 16 + ESLint 9. Avoids FlatCompat +
// `next/core-web-vitals` which throws "Converting circular structure to JSON"
// when @eslint/eslintrc tries to validate the inherited plugin chain on some
// ESLint 9 minor versions.
//
// Trade-off: the Next-specific rules (no-img-element, no-async-client-
// component, etc.) aren't enforced. Those are nice-to-have; verifier gate
// passing is load-bearing. The Executor's own TypeScript strict + the tsc
// gate cover the type-safety concerns those rules would otherwise nudge.
// Flat config for Next.js 16 + ESLint 9. Drops FlatCompat +
// `next/core-web-vitals` which throws "Converting circular structure to JSON"
// on some ESLint 9 minor versions, and drops .ts/.tsx from eslint's scope
// entirely -- the default Espree parser can't read TypeScript or JSX, and
// the verifier's tsc gate is the authoritative type-safety check.
//
// Trade-off: ESLint only lints .js / .mjs / .cjs files (config files,
// occasional plain-JS scripts). The Next-specific rules (no-img-element,
// no-async-client-component) aren't enforced. Verifier-passing > rule
// breadth at this stage of the build engine.
import js from "@eslint/js";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "next-env.d.ts",
      "node_modules/**",
      // TypeScript / JSX live outside ESLint's parser. tsc gates them.
      "**/*.ts",
      "**/*.tsx",
      "**/*.cts",
      "**/*.mts",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];

export default eslintConfig;
