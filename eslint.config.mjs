import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
  {
    // main.js is build output, not source.
    ignores: ["node_modules/", "main.js", ".worktrees/"],
  },

  ...obsidianmd.configs.recommended,

  // Main plugin source
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: "./tsconfig.json" },
    },
    rules: {
      // TypeScript already enforces identifier references; no-undef produces
      // false positives for ambient Obsidian types.
      "no-undef": "off",

      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-enum-comparison": "error",
    },
  },

  // Unit tests use tsconfig.test.json and run under Vitest in Node.js.
  {
    files: ["src/**/*.test.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: "./tsconfig.test.json" },
      globals: globals.node,
    },
    rules: {
      // Tests run in Node.js, where its built-in modules are available.
      "obsidianmd/no-nodejs-modules": "off",
      // Tests run in Node.js via Vitest, not a browser/Obsidian window context.
      "obsidianmd/prefer-window-timers": "off",
      // Tests build detached elements; Obsidian's global createDiv() isn't
      // available outside the app.
      "obsidianmd/prefer-create-el": "off",
      // Tests legitimately pass unbound methods to expect() matchers.
      "@typescript-eslint/unbound-method": "off",
    },
  },
]);
