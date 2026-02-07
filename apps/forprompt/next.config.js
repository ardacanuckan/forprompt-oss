import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  /** Enable standalone output for optimized Docker builds */
  output: "standalone",

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@forprompt/api",
    "@forprompt/db",
    "@forprompt/ui",
    "@forprompt/validators",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default config;
