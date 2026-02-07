/**
 * ForPrompt MCP Server
 *
 * Model Context Protocol server that exposes ForPrompt prompts as
 * resources and tools for AI assistants like Claude, Cursor, and Continue.
 *
 * @example
 * ```typescript
 * import { startMcpServer } from "@forprompt/sdk/mcp";
 *
 * // Start with environment variables
 * await startMcpServer();
 *
 * // Or with explicit config
 * await startMcpServer({
 *   apiKey: "fp_xxx",
 *   baseUrl: process.env.FORPROMPT_BASE_URL
 * });
 * ```
 */

export { ForPromptMcpServer, startMcpServer } from "./server.js";
export type { ForPromptMcpServerConfig } from "./server.js";

// Re-export config generators
export {
  generateConfig,
  getConfigPath,
  getSupportedEditors,
  type EditorConfig,
  type SupportedEditor,
} from "./config/generators.js";
