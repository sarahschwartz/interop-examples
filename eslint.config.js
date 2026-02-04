import pluginJs from "@eslint/js";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/temp/",
      "**/tmp/",
      "**/.nuxt/",
      "**/.output/",
      "**/artifacts-zk/",
      "**/artifacts/",
      "**/abis/",
      "**/ignition/deployments/",
      "**/cache/",
      "**/deployments-zk/",
      "**/cache-zk/",
      "**/typechain-types/",
    ],
  },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": ["warn"],
    },
  },
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "sort-imports": "off",
    },
  },
];
