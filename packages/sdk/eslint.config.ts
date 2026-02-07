import { baseConfig } from "@forprompt/eslint-config/base";
import { defineConfig } from "eslint/config";

export default defineConfig(
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
