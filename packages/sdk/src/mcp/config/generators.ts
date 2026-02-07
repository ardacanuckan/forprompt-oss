/**
 * MCP Configuration Generators
 *
 * Generate configuration files for various AI editors and tools
 * to connect to the ForPrompt MCP server.
 */

import * as os from "os";
import * as path from "path";

export type SupportedEditor =
  | "claude-desktop"
  | "claude-code"
  | "cursor"
  | "continue"
  | "windsurf"
  | "vscode";

export interface EditorConfig {
  name: string;
  description: string;
  configPath: string;
  configFileName: string;
  generate: (apiKey: string, baseUrl?: string) => string;
  instructions: string;
}

/**
 * Get the config file path for an editor
 */
function getEditorConfigPath(editor: SupportedEditor): string {
  const home = os.homedir();

  switch (editor) {
    case "claude-desktop":
      if (process.platform === "darwin") {
        return path.join(
          home,
          "Library",
          "Application Support",
          "Claude",
          "claude_desktop_config.json"
        );
      } else if (process.platform === "win32") {
        return path.join(
          process.env.APPDATA || path.join(home, "AppData", "Roaming"),
          "Claude",
          "claude_desktop_config.json"
        );
      } else {
        return path.join(home, ".config", "Claude", "claude_desktop_config.json");
      }

    case "claude-code":
      return path.join(process.cwd(), ".mcp.json");

    case "cursor":
      return path.join(process.cwd(), ".cursor", "mcp.json");

    case "continue":
      return path.join(home, ".continue", "config.json");

    case "windsurf":
      return path.join(home, ".windsurf", "mcp.json");

    case "vscode":
      return path.join(process.cwd(), ".vscode", "mcp.json");

    default:
      throw new Error(`Unknown editor: ${editor}`);
  }
}

/**
 * Generate MCP server configuration for Claude Desktop
 */
function generateClaudeDesktopConfig(apiKey: string, baseUrl?: string): string {
  const config = {
    mcpServers: {
      forprompt: {
        command: "npx",
        args: ["-y", "@forprompt/sdk", "mcp", "start"],
        env: {
          FORPROMPT_API_KEY: apiKey,
          ...(baseUrl && { FORPROMPT_BASE_URL: baseUrl }),
        },
      },
    },
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Generate MCP server configuration for Claude Code
 */
function generateClaudeCodeConfig(apiKey: string, baseUrl?: string): string {
  const config = {
    mcpServers: {
      forprompt: {
        command: "npx",
        args: ["-y", "@forprompt/sdk", "mcp", "start"],
        env: {
          FORPROMPT_API_KEY: apiKey,
          ...(baseUrl && { FORPROMPT_BASE_URL: baseUrl }),
        },
      },
    },
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Generate MCP server configuration for Cursor
 */
function generateCursorConfig(apiKey: string, baseUrl?: string): string {
  const config = {
    mcpServers: {
      forprompt: {
        command: "npx",
        args: ["-y", "@forprompt/sdk", "mcp", "start"],
        env: {
          FORPROMPT_API_KEY: apiKey,
          ...(baseUrl && { FORPROMPT_BASE_URL: baseUrl }),
        },
      },
    },
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Generate MCP server configuration for Continue.dev
 */
function generateContinueConfig(apiKey: string, baseUrl?: string): string {
  const config = {
    mcpServers: [
      {
        name: "forprompt",
        command: "npx",
        args: ["-y", "@forprompt/sdk", "mcp", "start"],
        env: {
          FORPROMPT_API_KEY: apiKey,
          ...(baseUrl && { FORPROMPT_BASE_URL: baseUrl }),
        },
      },
    ],
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Generate MCP server configuration for Windsurf
 */
function generateWindsurfConfig(apiKey: string, baseUrl?: string): string {
  const config = {
    mcpServers: {
      forprompt: {
        command: "npx",
        args: ["-y", "@forprompt/sdk", "mcp", "start"],
        env: {
          FORPROMPT_API_KEY: apiKey,
          ...(baseUrl && { FORPROMPT_BASE_URL: baseUrl }),
        },
      },
    },
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Generate MCP server configuration for VS Code
 */
function generateVSCodeConfig(apiKey: string, baseUrl?: string): string {
  const config = {
    mcpServers: {
      forprompt: {
        command: "npx",
        args: ["-y", "@forprompt/sdk", "mcp", "start"],
        env: {
          FORPROMPT_API_KEY: apiKey,
          ...(baseUrl && { FORPROMPT_BASE_URL: baseUrl }),
        },
      },
    },
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Editor configurations
 */
export const editorConfigs: Record<SupportedEditor, EditorConfig> = {
  "claude-desktop": {
    name: "Claude Desktop",
    description: "Anthropic's Claude desktop application",
    configPath: getEditorConfigPath("claude-desktop"),
    configFileName: "claude_desktop_config.json",
    generate: generateClaudeDesktopConfig,
    instructions: `
1. Open the config file at the path shown above
2. Add or merge the ForPrompt MCP server configuration
3. Restart Claude Desktop
4. You can now ask Claude to "list my ForPrompt prompts" or "get the [prompt-key] prompt"
`,
  },

  "claude-code": {
    name: "Claude Code",
    description: "Anthropic's Claude Code CLI tool",
    configPath: getEditorConfigPath("claude-code"),
    configFileName: ".mcp.json",
    generate: generateClaudeCodeConfig,
    instructions: `
1. Create .mcp.json in your project root directory
2. Add the ForPrompt MCP server configuration
3. Claude Code will automatically detect and load the MCP server
4. You can now ask Claude Code to manage your ForPrompt prompts
`,
  },

  cursor: {
    name: "Cursor",
    description: "Cursor AI-powered code editor",
    configPath: getEditorConfigPath("cursor"),
    configFileName: "mcp.json",
    generate: generateCursorConfig,
    instructions: `
1. Create the .cursor directory in your project root if it doesn't exist
2. Save the configuration to .cursor/mcp.json
3. Restart Cursor or reload the window
4. Your ForPrompt prompts will be available via MCP
`,
  },

  continue: {
    name: "Continue.dev",
    description: "Continue - open-source AI code assistant",
    configPath: getEditorConfigPath("continue"),
    configFileName: "config.json",
    generate: generateContinueConfig,
    instructions: `
1. Open your Continue config file (~/.continue/config.json)
2. Add the ForPrompt MCP server to the mcpServers array
3. Restart your IDE or reload Continue
4. Your ForPrompt prompts will be available via MCP
`,
  },

  windsurf: {
    name: "Windsurf",
    description: "Windsurf AI-powered IDE",
    configPath: getEditorConfigPath("windsurf"),
    configFileName: "mcp.json",
    generate: generateWindsurfConfig,
    instructions: `
1. Create the ~/.windsurf directory if it doesn't exist
2. Save the configuration to ~/.windsurf/mcp.json
3. Restart Windsurf
4. Your ForPrompt prompts will be available via MCP
`,
  },

  vscode: {
    name: "VS Code",
    description: "Visual Studio Code with MCP extension",
    configPath: getEditorConfigPath("vscode"),
    configFileName: "mcp.json",
    generate: generateVSCodeConfig,
    instructions: `
1. Install an MCP-compatible extension in VS Code
2. Create .vscode/mcp.json in your project
3. Add the ForPrompt MCP server configuration
4. Reload VS Code
`,
  },
};

/**
 * Generate configuration for a specific editor
 */
export function generateConfig(
  editor: SupportedEditor,
  apiKey: string,
  baseUrl?: string
): { config: string; path: string; instructions: string } {
  const editorConfig = editorConfigs[editor];

  if (!editorConfig) {
    throw new Error(
      `Unknown editor: ${editor}. Supported editors: ${getSupportedEditors().join(", ")}`
    );
  }

  return {
    config: editorConfig.generate(apiKey, baseUrl),
    path: editorConfig.configPath,
    instructions: editorConfig.instructions,
  };
}

/**
 * Get the config path for an editor
 */
export function getConfigPath(editor: SupportedEditor): string {
  return editorConfigs[editor]?.configPath || "";
}

/**
 * Get list of supported editors
 */
export function getSupportedEditors(): SupportedEditor[] {
  return Object.keys(editorConfigs) as SupportedEditor[];
}
