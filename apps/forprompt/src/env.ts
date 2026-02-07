import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod/v4";

export const env = createEnv({
  extends: [vercel()],
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    CLERK_SECRET_KEY: z.string().min(1),
    // Health check optional environment variables
    APP_VERSION: z.string().default("0.0.0"),
    REDIS_URL: z.string().url().optional(),
    // Polar payment environment variables (server-side)
    POLAR_ACCESS_TOKEN: z.string().optional(),
    POLAR_SUCCESS_URL: z.string().url().optional(),
    POLAR_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  },

  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_CONVEX_URL: z.string().url(),
    // Polar product IDs (public) - monthly only
    NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID: z.string().optional(),
    NEXT_PUBLIC_POLAR_ENTERPRISE_PRODUCT_ID: z.string().optional(),
    // Analytics
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID:
      process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID,
    NEXT_PUBLIC_POLAR_ENTERPRISE_PRODUCT_ID:
      process.env.NEXT_PUBLIC_POLAR_ENTERPRISE_PRODUCT_ID,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
