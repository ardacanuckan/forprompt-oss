/**
 * MCP CLI Commands
 *
 * Commands for managing the ForPrompt MCP server.
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { startMcpServer } from "../../mcp/server.js";
import {
  generateConfig,
  getSupportedEditors,
  editorConfigs,
  type SupportedEditor,
} from "../../mcp/config/generators.js";
import { getApiKey as getApiKeyFromConfig, saveApiKeyToEnv } from "../utils/config.js";

export interface McpCommandOptions {
  subcommand?: string;
  editor?: string;
  all?: boolean;
  transport?: string;
  port?: number;
}

/**
 * Prompt user for input
 */
async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Get API key from environment or config
 */
function getApiKey(): string | undefined {
  return getApiKeyFromConfig() || undefined;
}

/**
 * Start the MCP server
 */
async function startCommand(options: McpCommandOptions): Promise<void> {
  console.log("Starting ForPrompt MCP server...");

  const apiKey = getApiKey();

  if (!apiKey) {
    console.error(
      "\nError: No API key found. Please run 'npx forprompt init' first or set FORPROMPT_API_KEY environment variable.\n"
    );
    process.exit(1);
  }

  try {
    // Start the server (stdio transport)
    await startMcpServer({
      apiKey,
      baseUrl: process.env.FORPROMPT_BASE_URL,
    });
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

/**
 * Generate configuration for editors
 */
async function configCommand(options: McpCommandOptions): Promise<void> {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log("\nNo API key found. Let me help you set one up.\n");

    const inputKey = await promptUser("Enter your ForPrompt API key: ");
    if (!inputKey) {
      console.error("Error: API key is required.");
      process.exit(1);
    }

    // Save to .env file
    saveApiKeyToEnv(inputKey);
    console.log(`\n✓ API key saved to .env\n`);

    process.env.FORPROMPT_API_KEY = inputKey;
    return configCommand({ ...options });
  }

  const baseUrl = process.env.FORPROMPT_BASE_URL;

  // Generate for all editors
  if (options.all) {
    console.log("\nGenerating MCP configurations for all supported editors:\n");

    for (const editor of getSupportedEditors()) {
      try {
        const { config, path: configPath, instructions } = generateConfig(
          editor,
          apiKey,
          baseUrl
        );

        console.log(`\n## ${editorConfigs[editor].name}`);
        console.log(`Config file: ${configPath}`);
        console.log("\n```json");
        console.log(config);
        console.log("```");
        console.log(instructions);
      } catch (error) {
        console.error(`Error generating config for ${editor}:`, error);
      }
    }

    return;
  }

  // Generate for specific editor
  const editor = options.editor as SupportedEditor;

  if (!editor) {
    console.log("\nForPrompt MCP Configuration Generator\n");
    console.log("Supported editors:");

    for (const [key, config] of Object.entries(editorConfigs)) {
      console.log(`  - ${key}: ${config.description}`);
    }

    console.log("\nUsage:");
    console.log("  npx forprompt mcp config --editor=claude-desktop");
    console.log("  npx forprompt mcp config --editor=cursor");
    console.log("  npx forprompt mcp config --all");
    return;
  }

  if (!getSupportedEditors().includes(editor)) {
    console.error(
      `\nError: Unknown editor "${editor}". Supported editors: ${getSupportedEditors().join(", ")}\n`
    );
    process.exit(1);
  }

  try {
    const { config, path: configPath, instructions } = generateConfig(
      editor,
      apiKey,
      baseUrl
    );

    console.log(`\n# ${editorConfigs[editor].name} MCP Configuration\n`);
    console.log(`Config file: ${configPath}\n`);
    console.log("Add this to your configuration file:\n");
    console.log("```json");
    console.log(config);
    console.log("```");
    console.log(instructions);

    // Offer to write the config
    const shouldWrite = await promptUser(
      "\nWould you like to write this config file? (y/N): "
    );

    if (shouldWrite.toLowerCase() === "y") {
      const configDir = path.dirname(configPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Check if file exists
      if (fs.existsSync(configPath)) {
        const overwrite = await promptUser(
          `\nFile ${configPath} already exists. Overwrite? (y/N): `
        );
        if (overwrite.toLowerCase() !== "y") {
          console.log("\nConfig not written. You can copy the config above manually.");
          return;
        }
      }

      fs.writeFileSync(configPath, config);
      console.log(`\n✓ Config written to ${configPath}`);
      console.log(
        `\nRemember to restart ${editorConfigs[editor].name} to apply changes.`
      );
    }
  } catch (error) {
    console.error("Error generating config:", error);
    process.exit(1);
  }
}

/**
 * Show MCP server info
 */
async function infoCommand(): Promise<void> {
  console.log(`
ForPrompt MCP Server
====================

The ForPrompt MCP server exposes your prompts to AI assistants like
Claude Desktop, Cursor, Continue.dev, and other MCP-compatible tools.

Setup & Integration Tools:
  - forprompt_detect_project       Detect project type, language, package manager
  - forprompt_setup_project        Get install command for ForPrompt SDK
  - forprompt_generate_config      Generate .forprompt config file
  - forprompt_generate_example     Generate code examples for your language
  - forprompt_integration_guide    Get framework-specific integration guide

Read Tools:
  - forprompt_get_prompt           Fetch a prompt by its key
  - forprompt_list_prompts         List all available prompts
  - forprompt_search_prompts       Search prompts by text
  - forprompt_get_prompt_metadata  Get prompt metadata only
  - forprompt_get_system_prompt    Get raw system prompt text

Write Tools:
  - forprompt_create_prompt        Create a new prompt
  - forprompt_update_prompt        Update prompt metadata
  - forprompt_create_version       Create a new version (update prompt text)
  - forprompt_delete_prompt        Delete a prompt

Available Resources:
  - forprompt://prompts              List all prompts
  - forprompt://prompts/{key}        Get a specific prompt
  - forprompt://prompts/{key}/v{n}   Get a specific version
  - forprompt://prompts/{key}/metadata  Get metadata only

Quick Start:
  1. Run: npx forprompt mcp config --editor=claude-desktop
  2. Restart Claude Desktop
  3. Ask Claude: "Integrate ForPrompt into my project"
  4. Or: "List my ForPrompt prompts"
  5. Or: "Create a new prompt called customer_support"

Example Conversations:
  "Integrate ForPrompt into this project"
  "Show me how to use ForPrompt with Next.js"
  "Create a prompt for customer support with key customer_support_v1"
  "Update the system prompt for my chatbot"

Environment Variables:
  FORPROMPT_API_KEY    Your project API key (required)
  FORPROMPT_BASE_URL   Custom API URL (optional)

For more information, visit: https://forprompt.dev/docs/mcp
`);
}

/**
 * Main MCP command handler
 */
export async function mcpCommand(options: McpCommandOptions): Promise<void> {
  const subcommand = options.subcommand || "help";

  switch (subcommand) {
    case "start":
      await startCommand(options);
      break;

    case "config":
      await configCommand(options);
      break;

    case "info":
      await infoCommand();
      break;

    case "help":
    default:
      console.log(`
ForPrompt MCP Commands
======================

Usage:
  npx forprompt mcp <command> [options]

Commands:
  start     Start the MCP server (stdio transport)
  config    Generate configuration for AI editors
  info      Show MCP server information

Config Options:
  --editor=<name>   Generate config for specific editor
                    Options: claude-code, claude-desktop, cursor, continue, windsurf, vscode
  --all             Generate configs for all supported editors

Examples:
  npx forprompt mcp start
  npx forprompt mcp config --editor=claude-code
  npx forprompt mcp config --editor=claude-desktop
  npx forprompt mcp config --editor=cursor
  npx forprompt mcp config --all
  npx forprompt mcp info

For detailed documentation, visit: https://forprompt.dev/docs/mcp
`);
  }
}
