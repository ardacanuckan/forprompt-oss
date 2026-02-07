import { defineConfig } from "eslint/config";

import { baseConfig } from "@forprompt/eslint-config/base";
import { reactConfig } from "@forprompt/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
