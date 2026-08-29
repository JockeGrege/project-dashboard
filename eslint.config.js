import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "playwright-report", "coverage"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Architectural fence: the view layers never import the Firebase SDK or the
  // Firebase wiring. Firestore lives behind the Store; `src/app` is the
  // composition root and is allowed to pick and construct adapters.
  {
    files: [
      "src/routes/**",
      "src/selectors/**",
      "src/ui/**",
      "src/uploads/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "firebase",
                "firebase/*",
                "@/firebase",
                "@/firebase/*",
                "@/store/firestore-store",
              ],
              message:
                "Firestore access goes through the Store (useStore / useStoreApi). Only src/store and src/firebase may touch the Firebase SDK.",
            },
          ],
        },
      ],
    },
  },

  // Selectors are pure: no clock, no randomness, no I/O. `now` is a parameter.
  {
    files: ["src/selectors/**/*.ts"],
    ignores: ["src/selectors/**/*.test.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "Date", message: "Selectors are pure — take `now: number` as a parameter." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Selectors are pure — no randomness." },
        { object: "Date", property: "now", message: "Selectors are pure — take `now: number` as a parameter." },
      ],
    },
  },
);
