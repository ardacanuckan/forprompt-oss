import { defineConfig } from "eslint/config";

import { baseConfig } from "@forprompt/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
);
