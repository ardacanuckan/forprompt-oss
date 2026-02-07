import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@forprompt/eslint-config/base";
import { nextjsConfig } from "@forprompt/eslint-config/nextjs";
import { reactConfig } from "@forprompt/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
