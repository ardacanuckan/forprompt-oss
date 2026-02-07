#!/usr/bin/env node
/**
 * ForPrompt MCP Server
 *
 * Model Context Protocol server that exposes ForPrompt prompts as
 * resources and tools for AI assistants like Claude, Cursor, and Continue.
 *
 * Usage:
 *   npx forprompt mcp start
 *   FORPROMPT_API_KEY=fp_xxx npx forprompt-mcp
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createForPrompt, ForPrompt } from "../client.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { VERSION } from "../version.js";

export interface ForPromptMcpServerConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class ForPromptMcpServer {
  private mcpServer: McpServer;
  private forprompt: ForPrompt;
  private config: ForPromptMcpServerConfig;

  constructor(config: ForPromptMcpServerConfig = {}) {
    this.config = config;

    // Create ForPrompt client (auto-loads from env if not provided)
    this.forprompt = createForPrompt({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    });

    // Create MCP server
    this.mcpServer = new McpServer({
      name: "forprompt",
      version: VERSION,
    });

    // Register capabilities
    this.registerCapabilities();
  }

  private registerCapabilities(): void {
    // Register tools (CRUD operations for prompts)
    registerTools(this.mcpServer, this.forprompt, this.config);

    // Register resources (prompts as readable content)
    registerResources(this.mcpServer, this.forprompt, this.config);
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
  }

  /**
   * Get the underlying MCP server instance
   */
  getServer(): McpServer {
    return this.mcpServer;
  }
}

/**
 * Create and start an MCP server
 */
export async function startMcpServer(
  config: ForPromptMcpServerConfig = {}
): Promise<ForPromptMcpServer> {
  const server = new ForPromptMcpServer(config);
  await server.start();
  return server;
}

// Run server if executed directly
// Check if this file is being run directly as the main module
function isMainModule(): boolean {
  const arg1 = process.argv[1] || "";
  return (
    arg1.endsWith("forprompt-mcp") ||
    arg1.endsWith("server.js") ||
    arg1.includes("mcp/server")
  );
}

if (isMainModule()) {
  startMcpServer().catch((error) => {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  });
}
