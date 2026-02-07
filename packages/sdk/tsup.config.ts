import { defineConfig } from "tsup";

export default defineConfig([
  // Main SDK bundle
  {
    entry: ["src/index.ts", "src/version.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    outDir: "dist",
    external: ["fs", "path", "os", "readline", "crypto"],
  },
  // CLI bundle (ESM only, Node.js)
  {
    entry: ["src/cli/index.ts"],
    format: ["esm"],
    dts: false,
    clean: false,
    sourcemap: true,
    outDir: "dist/cli",
    platform: "node",
    target: "node18",
    external: ["fs", "path", "os", "readline", "crypto", "@modelcontextprotocol/sdk", "zod"],
  },
  // MCP Server bundle (ESM only, Node.js)
  {
    entry: {
      index: "src/mcp/index.ts",
      server: "src/mcp/server.ts",
    },
    format: ["esm"],
    dts: true,
    clean: false,
    sourcemap: true,
    outDir: "dist/mcp",
    platform: "node",
    target: "node18",
    external: ["fs", "path", "os", "readline", "crypto"],
  },
]);
