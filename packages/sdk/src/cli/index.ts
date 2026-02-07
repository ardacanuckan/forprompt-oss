#!/usr/bin/env node

/**
 * ForPrompt CLI
 *
 * Commands:
 *   init    - Initialize ForPrompt in the current directory
 *   deploy  - Fetch and sync prompts to local files
 *   mcp     - MCP server management (start, config)
 *   help    - Show help message
 */

import { initCommand } from "./commands/init";
import { deployCommand } from "./commands/deploy";
import { mcpCommand } from "./commands/mcp";
import { VERSION } from "../version.js";

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): {
  command: string | undefined;
  subcommand: string | undefined;
  options: Record<string, string | boolean>;
} {
  const options: Record<string, string | boolean> = {};
  let command: string | undefined;
  let subcommand: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      if (key) {
        options[key] = value || true;
      }
    } else if (arg.startsWith("-")) {
      const key = arg.slice(1);
      if (key) {
        options[key] = true;
      }
    } else if (!command) {
      command = arg;
    } else if (!subcommand) {
      subcommand = arg;
    }
  }

  return { command, subcommand, options };
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
ForPrompt CLI v${VERSION}

Sync prompts from your ForPrompt projects to local files.

Usage:
  npx forprompt <command> [options]

Commands:
  init              Initialize ForPrompt in the current directory
  deploy            Fetch and sync prompts to local files
  mcp               MCP server management (start, config, info)
  help              Show this help message

Init Options:
  --api-key=<key>   Provide API key directly (otherwise prompted)

Deploy Options:
  --clean           Remove local prompts that no longer exist on server

MCP Options:
  mcp start         Start MCP server (stdio transport)
  mcp config        Generate config for AI editors
    --editor=<name> Editor: claude-desktop, cursor, continue, windsurf, vscode
    --all           Generate configs for all editors
  mcp info          Show MCP server information

Examples:
  npx forprompt init
  npx forprompt init --api-key=fp_xxx
  npx forprompt deploy
  npx forprompt deploy --clean
  npx forprompt mcp start
  npx forprompt mcp config --editor=claude-desktop

Environment Variables:
  FORPROMPT_API_KEY     API key (alternative to .env file)
  FORPROMPT_BASE_URL    Custom API base URL (for self-hosted)

Documentation:
  https://forprompt.dev/docs/cli
`);
}

/**
 * Show version
 */
function showVersion(): void {
  console.log(`forprompt v${VERSION}`);
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const { command, subcommand, options } = parseArgs(process.argv.slice(2));

  // Handle version flag
  if (options.version || options.v) {
    showVersion();
    return;
  }

  // Handle help flag
  if (options.help || options.h) {
    showHelp();
    return;
  }

  switch (command) {
    case "init":
      await initCommand({
        apiKey: options["api-key"] as string | undefined,
        baseUrl: options["base-url"] as string | undefined,
      });
      break;

    case "deploy":
      await deployCommand({
        clean: options.clean as boolean | undefined,
        baseUrl: options["base-url"] as string | undefined,
      });
      break;

    case "mcp":
      await mcpCommand({
        subcommand: subcommand,
        editor: options.editor as string | undefined,
        all: options.all as boolean | undefined,
        transport: options.transport as string | undefined,
        port: options.port ? parseInt(options.port as string, 10) : undefined,
      });
      break;

    case "help":
    case undefined:
      showHelp();
      break;

    case "version":
      showVersion();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log("Run 'npx forprompt help' for usage.");
      process.exit(1);
  }
}

// Run CLI
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
