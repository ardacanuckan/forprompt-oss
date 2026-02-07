import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/auth/index.ts",
    "src/data/index.ts",
    "src/data/drizzle/index.ts",
    "src/data/drizzle/schema/index.ts",
    "src/ai/index.ts",
    "src/ai/providers/index.ts",
    "src/ai/models.ts",
    "src/ai/factory.ts",
  ],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: "dist",
  splitting: false,
});
