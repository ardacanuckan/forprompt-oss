/**
 * MCP Tool Handlers
 *
 * Exposes ForPrompt operations as MCP tools that AI assistants can execute.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ForPrompt } from "../client.js";
import type { ForPromptMcpServerConfig } from "./server.js";
import type { Prompt, SyncResponse } from "../types.js";

const DEFAULT_BASE_URL = "https://wooden-fox-811.convex.site";

/**
 * Get API config from config object or environment
 */
function getApiConfig(config: ForPromptMcpServerConfig): {
  apiKey: string;
  baseUrl: string;
} {
  const apiKey = config.apiKey || process.env.FORPROMPT_API_KEY;
  const baseUrl = (
    config.baseUrl ||
    process.env.FORPROMPT_BASE_URL ||
    DEFAULT_BASE_URL
  ).replace(/\/$/, "");

  if (!apiKey) {
    throw new Error(
      "API key is required. Set FORPROMPT_API_KEY environment variable."
    );
  }

  return { apiKey, baseUrl };
}

/**
 * Fetch all prompts using the sync endpoint
 */
async function fetchAllPrompts(
  config: ForPromptMcpServerConfig
): Promise<Prompt[]> {
  const { apiKey, baseUrl } = getApiConfig(config);

  const response = await fetch(`${baseUrl}/api/sync`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({
      error: "Unknown error",
    }))) as { error?: string };
    throw new Error(errorData.error || `Failed to fetch prompts`);
  }

  const data = (await response.json()) as SyncResponse;
  return data.prompts;
}

/**
 * Create a new prompt
 */
async function createPrompt(
  config: ForPromptMcpServerConfig,
  data: {
    key: string;
    name: string;
    description?: string;
    systemPrompt?: string;
  }
): Promise<{ promptId: string; versionId?: string; versionNumber?: number }> {
  const { apiKey, baseUrl } = getApiConfig(config);

  const response = await fetch(`${baseUrl}/api/prompts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({
      error: "Unknown error",
    }))) as { error?: string };
    throw new Error(errorData.error || "Failed to create prompt");
  }

  return response.json() as Promise<{
    promptId: string;
    versionId?: string;
    versionNumber?: number;
  }>;
}

/**
 * Update a prompt
 */
async function updatePrompt(
  config: ForPromptMcpServerConfig,
  data: {
    key: string;
    name?: string;
    description?: string;
    purpose?: string;
    expectedBehavior?: string;
    inputFormat?: string;
    outputFormat?: string;
    constraints?: string;
    useCases?: string;
    additionalNotes?: string;
    toolsNotes?: string;
  }
): Promise<{ promptId: string }> {
  const { apiKey, baseUrl } = getApiConfig(config);

  const response = await fetch(`${baseUrl}/api/prompts`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({
      error: "Unknown error",
    }))) as { error?: string };
    throw new Error(errorData.error || "Failed to update prompt");
  }

  return response.json() as Promise<{ promptId: string }>;
}

/**
 * Create a new version for a prompt
 */
async function createVersionApi(
  config: ForPromptMcpServerConfig,
  data: {
    key: string;
    systemPrompt: string;
    description?: string;
    setAsActive?: boolean;
  }
): Promise<{ versionId: string; versionNumber: number }> {
  const { apiKey, baseUrl } = getApiConfig(config);

  const response = await fetch(`${baseUrl}/api/prompts/versions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({
      error: "Unknown error",
    }))) as { error?: string };
    throw new Error(errorData.error || "Failed to create version");
  }

  return response.json() as Promise<{ versionId: string; versionNumber: number }>;
}

/**
 * Delete a prompt
 */
async function deletePromptApi(
  config: ForPromptMcpServerConfig,
  key: string
): Promise<{ success: boolean }> {
  const { apiKey, baseUrl } = getApiConfig(config);

  const response = await fetch(`${baseUrl}/api/prompts?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({
      error: "Unknown error",
    }))) as { error?: string };
    throw new Error(errorData.error || "Failed to delete prompt");
  }

  return response.json() as Promise<{ success: boolean }>;
}

/**
 * Format a prompt for display
 */
function formatPrompt(prompt: Prompt): string {
  const sections: string[] = [];

  sections.push(`# ${prompt.name}`);
  sections.push(`**Key:** ${prompt.key}`);
  sections.push(`**Version:** ${prompt.versionNumber}`);

  if (prompt.description) {
    sections.push(`**Description:** ${prompt.description}`);
  }

  sections.push("");
  sections.push("## System Prompt");
  sections.push("```");
  sections.push(prompt.systemPrompt);
  sections.push("```");

  if (prompt.purpose) {
    sections.push("");
    sections.push("## Purpose");
    sections.push(prompt.purpose);
  }

  if (prompt.expectedBehavior) {
    sections.push("");
    sections.push("## Expected Behavior");
    sections.push(prompt.expectedBehavior);
  }

  if (prompt.inputFormat) {
    sections.push("");
    sections.push("## Input Format");
    sections.push(prompt.inputFormat);
  }

  if (prompt.outputFormat) {
    sections.push("");
    sections.push("## Output Format");
    sections.push(prompt.outputFormat);
  }

  if (prompt.constraints) {
    sections.push("");
    sections.push("## Constraints");
    sections.push(prompt.constraints);
  }

  if (prompt.useCases) {
    sections.push("");
    sections.push("## Use Cases");
    sections.push(prompt.useCases);
  }

  if (prompt.additionalNotes) {
    sections.push("");
    sections.push("## Additional Notes");
    sections.push(prompt.additionalNotes);
  }

  if (prompt.toolsNotes) {
    sections.push("");
    sections.push("## Tools Notes");
    sections.push(prompt.toolsNotes);
  }

  return sections.join("\n");
}

// Define input schemas
const GetPromptInputSchema = z.object({
  key: z.string().describe("The unique key identifier for the prompt"),
  version: z
    .number()
    .optional()
    .describe(
      "Specific version number to fetch (optional, defaults to active version)"
    ),
});

const ListPromptsInputSchema = z.object({
  search: z
    .string()
    .optional()
    .describe("Optional search term to filter prompts by name or key"),
});

const SearchPromptsInputSchema = z.object({
  query: z.string().describe("Search query to find matching prompts"),
});

const GetMetadataInputSchema = z.object({
  key: z.string().describe("The unique key identifier for the prompt"),
});

const GetSystemPromptInputSchema = z.object({
  key: z.string().describe("The unique key identifier for the prompt"),
  version: z.number().optional().describe("Specific version number (optional)"),
});

// Write operation schemas
const CreatePromptInputSchema = z.object({
  key: z
    .string()
    .describe(
      "Unique key identifier for the prompt (lowercase, no spaces, use underscores)"
    ),
  name: z.string().describe("Human-readable name for the prompt"),
  description: z.string().optional().describe("Description of what the prompt does"),
  systemPrompt: z
    .string()
    .optional()
    .describe("Initial system prompt content (optional, can be added later)"),
});

const UpdatePromptInputSchema = z.object({
  key: z.string().describe("The unique key identifier for the prompt to update"),
  name: z.string().optional().describe("New name for the prompt"),
  description: z.string().optional().describe("New description"),
  purpose: z.string().optional().describe("The purpose/goal of this prompt"),
  expectedBehavior: z
    .string()
    .optional()
    .describe("Expected behavior when using this prompt"),
  inputFormat: z.string().optional().describe("Expected input format"),
  outputFormat: z.string().optional().describe("Expected output format"),
  constraints: z.string().optional().describe("Constraints and limitations"),
  useCases: z.string().optional().describe("Primary use cases"),
  additionalNotes: z.string().optional().describe("Additional notes"),
  toolsNotes: z.string().optional().describe("Notes about tool usage"),
});

const CreateVersionInputSchema = z.object({
  key: z.string().describe("The prompt key to create a new version for"),
  systemPrompt: z.string().describe("The new system prompt content"),
  description: z
    .string()
    .optional()
    .describe("Description of changes in this version"),
  setAsActive: z
    .boolean()
    .optional()
    .describe("Whether to set this as the active version (default: true)"),
});

const DeletePromptInputSchema = z.object({
  key: z.string().describe("The unique key identifier for the prompt to delete"),
});

// Setup operation schemas
const SetupProjectInputSchema = z.object({
  projectPath: z
    .string()
    .describe("Absolute path to the project root directory"),
  language: z
    .enum(["typescript", "javascript", "python"])
    .optional()
    .describe("Programming language (auto-detected if not specified)"),
  packageManager: z
    .enum(["npm", "yarn", "pnpm", "bun", "pip", "poetry", "uv"])
    .optional()
    .describe("Package manager to use (auto-detected if not specified)"),
});

const GenerateConfigInputSchema = z.object({
  projectPath: z.string().describe("Absolute path to the project root directory"),
  apiKey: z.string().optional().describe("API key (will prompt user if not provided)"),
  baseUrl: z.string().optional().describe("Custom API base URL (optional)"),
});

const GenerateExampleInputSchema = z.object({
  language: z
    .enum(["typescript", "javascript", "python"])
    .describe("Programming language for the example"),
  useCase: z
    .enum(["basic", "streaming", "with-tools", "react-hook", "nextjs-api"])
    .describe("Type of example to generate"),
  promptKey: z
    .string()
    .optional()
    .describe("Optional prompt key to use in the example"),
});

const DetectProjectInputSchema = z.object({
  projectPath: z.string().describe("Absolute path to the project root directory"),
});

const GetIntegrationGuideInputSchema = z.object({
  framework: z
    .enum(["nextjs", "react", "express", "fastapi", "django", "flask", "generic"])
    .describe("Framework to get integration guide for"),
  language: z
    .enum(["typescript", "javascript", "python"])
    .optional()
    .describe("Programming language"),
});

/**
 * Register all MCP tools
 */
export function registerTools(
  server: McpServer,
  client: ForPrompt,
  config: ForPromptMcpServerConfig
): void {
  // Tool: Get a single prompt by key
  server.registerTool(
    "forprompt_get_prompt",
    {
      description:
        "Fetch a prompt by its key from ForPrompt. Returns the system prompt content and metadata including purpose, expected behavior, constraints, and more.",
      inputSchema: GetPromptInputSchema,
    },
    async ({ key, version }) => {
      try {
        const prompt = await client.getPrompt(key, { version });
        return {
          content: [
            {
              type: "text" as const,
              text: formatPrompt(prompt),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching prompt "${key}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: List all prompts
  server.registerTool(
    "forprompt_list_prompts",
    {
      description:
        "List all available prompts in your ForPrompt project. Returns a summary of each prompt including key, name, description, and version.",
      inputSchema: ListPromptsInputSchema,
    },
    async ({ search }) => {
      try {
        let prompts = await fetchAllPrompts(config);

        // Filter by search term if provided
        if (search) {
          const searchLower = search.toLowerCase();
          prompts = prompts.filter(
            (p) =>
              p.key.toLowerCase().includes(searchLower) ||
              p.name.toLowerCase().includes(searchLower) ||
              p.description?.toLowerCase().includes(searchLower)
          );
        }

        if (prompts.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: search
                  ? `No prompts found matching "${search}"`
                  : "No prompts found in this project",
              },
            ],
          };
        }

        const lines = prompts.map((p) => {
          const desc = p.description ? ` - ${p.description}` : "";
          return `- **${p.key}** (v${p.versionNumber}): ${p.name}${desc}`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `# ForPrompt Prompts\n\nFound ${prompts.length} prompt(s):\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing prompts: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Search prompts
  server.registerTool(
    "forprompt_search_prompts",
    {
      description:
        "Search prompts by text query. Searches across prompt names, keys, descriptions, purposes, and use cases.",
      inputSchema: SearchPromptsInputSchema,
    },
    async ({ query }) => {
      try {
        const allPrompts = await fetchAllPrompts(config);
        const queryLower = query.toLowerCase();

        const matches = allPrompts.filter((p) => {
          const searchFields = [
            p.key,
            p.name,
            p.description,
            p.purpose,
            p.useCases,
            p.expectedBehavior,
            p.systemPrompt,
          ];
          return searchFields.some(
            (field) => field && field.toLowerCase().includes(queryLower)
          );
        });

        if (matches.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No prompts found matching "${query}"`,
              },
            ],
          };
        }

        const results = matches.map((p) => {
          const sections = [`## ${p.name} (\`${p.key}\`)`];
          if (p.description) sections.push(`*${p.description}*`);
          sections.push(`Version: ${p.versionNumber}`);
          if (p.purpose) sections.push(`**Purpose:** ${p.purpose}`);
          return sections.join("\n");
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `# Search Results for "${query}"\n\nFound ${matches.length} matching prompt(s):\n\n${results.join("\n\n---\n\n")}`,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching prompts: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get prompt metadata only
  server.registerTool(
    "forprompt_get_prompt_metadata",
    {
      description:
        "Get metadata for a prompt without the full system prompt content. Useful for understanding what a prompt does before fetching it.",
      inputSchema: GetMetadataInputSchema,
    },
    async ({ key }) => {
      try {
        const prompt = await client.getPrompt(key);
        const metadata = {
          key: prompt.key,
          name: prompt.name,
          description: prompt.description,
          versionNumber: prompt.versionNumber,
          updatedAt: new Date(prompt.updatedAt).toISOString(),
          purpose: prompt.purpose,
          expectedBehavior: prompt.expectedBehavior,
          inputFormat: prompt.inputFormat,
          outputFormat: prompt.outputFormat,
          constraints: prompt.constraints,
          useCases: prompt.useCases,
          additionalNotes: prompt.additionalNotes,
          toolsNotes: prompt.toolsNotes,
          systemPromptLength: prompt.systemPrompt.length,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: `# Metadata for "${prompt.name}"\n\n\`\`\`json\n${JSON.stringify(metadata, null, 2)}\n\`\`\``,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching metadata for "${key}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get raw system prompt only
  server.registerTool(
    "forprompt_get_system_prompt",
    {
      description:
        "Get only the raw system prompt text without metadata. Useful when you just need the prompt content to use directly.",
      inputSchema: GetSystemPromptInputSchema,
    },
    async ({ key, version }) => {
      try {
        const prompt = await client.getPrompt(key, { version });
        return {
          content: [
            {
              type: "text" as const,
              text: prompt.systemPrompt,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching system prompt for "${key}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ==================== WRITE OPERATIONS ====================

  // Tool: Create a new prompt
  server.registerTool(
    "forprompt_create_prompt",
    {
      description:
        "Create a new prompt in ForPrompt. You can optionally include an initial system prompt content. The key must be unique, lowercase, and use underscores instead of spaces.",
      inputSchema: CreatePromptInputSchema,
    },
    async ({ key, name, description, systemPrompt }) => {
      try {
        const result = await createPrompt(config, {
          key,
          name,
          description,
          systemPrompt,
        });

        let message = `Successfully created prompt "${name}" with key "${key}"`;
        if (result.versionNumber) {
          message += ` (v${result.versionNumber})`;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: message,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating prompt: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Update a prompt
  server.registerTool(
    "forprompt_update_prompt",
    {
      description:
        "Update an existing prompt's metadata (name, description, purpose, expected behavior, etc.). To update the system prompt content, use forprompt_create_version instead.",
      inputSchema: UpdatePromptInputSchema,
    },
    async (args) => {
      try {
        await updatePrompt(config, args);

        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully updated prompt "${args.key}"`,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error updating prompt: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Create a new version
  server.registerTool(
    "forprompt_create_version",
    {
      description:
        "Create a new version of an existing prompt with updated system prompt content. This is the proper way to update the actual prompt text while maintaining version history.",
      inputSchema: CreateVersionInputSchema,
    },
    async ({ key, systemPrompt, description, setAsActive }) => {
      try {
        const result = await createVersionApi(config, {
          key,
          systemPrompt,
          description,
          setAsActive,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully created version ${result.versionNumber} for prompt "${key}"`,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating version: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Delete a prompt
  server.registerTool(
    "forprompt_delete_prompt",
    {
      description:
        "Delete a prompt and all its versions. This action is irreversible. Use with caution.",
      inputSchema: DeletePromptInputSchema,
    },
    async ({ key }) => {
      try {
        await deletePromptApi(config, key);

        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully deleted prompt "${key}" and all its versions`,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error deleting prompt: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ==================== SETUP & INTEGRATION TOOLS ====================

  // Tool: Detect project type
  server.registerTool(
    "forprompt_detect_project",
    {
      description:
        "Detect the project type, language, and package manager in a directory. Use this first before running setup to understand the project structure.",
      inputSchema: DetectProjectInputSchema,
    },
    async ({ projectPath }) => {
      try {
        const fs = await import("fs");
        const path = await import("path");

        const detection = {
          language: null as string | null,
          packageManager: null as string | null,
          framework: null as string | null,
          hasForPrompt: false,
          configFiles: [] as string[],
        };

        // Check for package.json (Node.js/TypeScript/JavaScript)
        const packageJsonPath = path.join(projectPath, "package.json");
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

          // Detect language
          if (packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript) {
            detection.language = "typescript";
          } else {
            detection.language = "javascript";
          }

          // Check if ForPrompt is already installed
          if (packageJson.dependencies?.["@forprompt/sdk"] || packageJson.devDependencies?.["@forprompt/sdk"]) {
            detection.hasForPrompt = true;
          }

          // Detect framework
          if (packageJson.dependencies?.next) {
            detection.framework = "nextjs";
          } else if (packageJson.dependencies?.react) {
            detection.framework = "react";
          } else if (packageJson.dependencies?.express) {
            detection.framework = "express";
          }

          // Detect package manager
          if (fs.existsSync(path.join(projectPath, "pnpm-lock.yaml"))) {
            detection.packageManager = "pnpm";
          } else if (fs.existsSync(path.join(projectPath, "yarn.lock"))) {
            detection.packageManager = "yarn";
          } else if (fs.existsSync(path.join(projectPath, "bun.lockb"))) {
            detection.packageManager = "bun";
          } else if (fs.existsSync(path.join(projectPath, "package-lock.json"))) {
            detection.packageManager = "npm";
          }

          detection.configFiles.push("package.json");
        }

        // Check for Python projects
        const pyprojectPath = path.join(projectPath, "pyproject.toml");
        const requirementsPath = path.join(projectPath, "requirements.txt");

        if (fs.existsSync(pyprojectPath)) {
          detection.language = "python";
          const content = fs.readFileSync(pyprojectPath, "utf-8");
          if (content.includes("poetry")) {
            detection.packageManager = "poetry";
          } else if (content.includes("uv")) {
            detection.packageManager = "uv";
          } else {
            detection.packageManager = "pip";
          }
          detection.configFiles.push("pyproject.toml");

          // Detect Python framework
          if (content.includes("fastapi")) {
            detection.framework = "fastapi";
          } else if (content.includes("django")) {
            detection.framework = "django";
          } else if (content.includes("flask")) {
            detection.framework = "flask";
          }

          // Check if forprompt is installed
          if (content.includes("forprompt")) {
            detection.hasForPrompt = true;
          }
        } else if (fs.existsSync(requirementsPath)) {
          detection.language = "python";
          detection.packageManager = "pip";
          detection.configFiles.push("requirements.txt");

          const content = fs.readFileSync(requirementsPath, "utf-8");
          if (content.includes("forprompt")) {
            detection.hasForPrompt = true;
          }
        }

        // Check for existing ForPrompt config
        const forpromptConfigPath = path.join(projectPath, ".forprompt");
        if (fs.existsSync(forpromptConfigPath)) {
          detection.configFiles.push(".forprompt");
        }

        if (!detection.language) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Could not detect project type at "${projectPath}". Make sure the path contains a package.json (Node.js) or pyproject.toml/requirements.txt (Python).`,
              },
            ],
            isError: true,
          };
        }

        const lines = [
          `# Project Detection Results`,
          ``,
          `**Path:** ${projectPath}`,
          `**Language:** ${detection.language}`,
          `**Package Manager:** ${detection.packageManager || "unknown"}`,
          `**Framework:** ${detection.framework || "none detected"}`,
          `**ForPrompt Installed:** ${detection.hasForPrompt ? "Yes" : "No"}`,
          `**Config Files Found:** ${detection.configFiles.join(", ")}`,
          ``,
        ];

        if (!detection.hasForPrompt) {
          lines.push(`## Next Steps`);
          lines.push(``);
          lines.push(`1. Run \`forprompt_setup_project\` to install the SDK`);
          lines.push(`2. Run \`forprompt_generate_config\` to create the config file`);
          lines.push(`3. Use \`forprompt_generate_example\` to see usage examples`);
        } else {
          lines.push(`ForPrompt is already installed! You can:`);
          lines.push(`- Use \`forprompt_list_prompts\` to see available prompts`);
          lines.push(`- Use \`forprompt_create_prompt\` to create new prompts`);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: lines.join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error detecting project: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Setup project (install SDK)
  server.registerTool(
    "forprompt_setup_project",
    {
      description:
        "Install the ForPrompt SDK in a project. Auto-detects the language and package manager, or you can specify them. Returns the command to run - you should execute it using your terminal/bash tool.",
      inputSchema: SetupProjectInputSchema,
    },
    async ({ projectPath, language, packageManager }) => {
      try {
        const fs = await import("fs");
        const path = await import("path");

        // Auto-detect if not provided
        let detectedLanguage = language;
        let detectedPM = packageManager;

        if (!detectedLanguage || !detectedPM) {
          const packageJsonPath = path.join(projectPath, "package.json");
          const pyprojectPath = path.join(projectPath, "pyproject.toml");
          const requirementsPath = path.join(projectPath, "requirements.txt");

          if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

            if (!detectedLanguage) {
              detectedLanguage = packageJson.devDependencies?.typescript ? "typescript" : "javascript";
            }

            if (!detectedPM) {
              if (fs.existsSync(path.join(projectPath, "pnpm-lock.yaml"))) {
                detectedPM = "pnpm";
              } else if (fs.existsSync(path.join(projectPath, "yarn.lock"))) {
                detectedPM = "yarn";
              } else if (fs.existsSync(path.join(projectPath, "bun.lockb"))) {
                detectedPM = "bun";
              } else {
                detectedPM = "npm";
              }
            }
          } else if (fs.existsSync(pyprojectPath) || fs.existsSync(requirementsPath)) {
            detectedLanguage = "python";

            if (!detectedPM) {
              if (fs.existsSync(pyprojectPath)) {
                const content = fs.readFileSync(pyprojectPath, "utf-8");
                if (content.includes("poetry")) {
                  detectedPM = "poetry";
                } else {
                  detectedPM = "pip";
                }
              } else {
                detectedPM = "pip";
              }
            }
          }
        }

        if (!detectedLanguage) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Could not detect project type. Please specify the language parameter ("typescript", "javascript", or "python").`,
              },
            ],
            isError: true,
          };
        }

        // Generate install command
        let installCommand: string;
        let packageName: string;

        if (detectedLanguage === "python") {
          packageName = "forprompt";
          switch (detectedPM) {
            case "poetry":
              installCommand = `cd "${projectPath}" && poetry add ${packageName}`;
              break;
            case "uv":
              installCommand = `cd "${projectPath}" && uv add ${packageName}`;
              break;
            default:
              installCommand = `cd "${projectPath}" && pip install ${packageName}`;
          }
        } else {
          packageName = "@forprompt/sdk";
          switch (detectedPM) {
            case "yarn":
              installCommand = `cd "${projectPath}" && yarn add ${packageName}`;
              break;
            case "pnpm":
              installCommand = `cd "${projectPath}" && pnpm add ${packageName}`;
              break;
            case "bun":
              installCommand = `cd "${projectPath}" && bun add ${packageName}`;
              break;
            default:
              installCommand = `cd "${projectPath}" && npm install ${packageName}`;
          }
        }

        const lines = [
          `# ForPrompt SDK Installation`,
          ``,
          `**Project:** ${projectPath}`,
          `**Language:** ${detectedLanguage}`,
          `**Package Manager:** ${detectedPM}`,
          ``,
          `## Install Command`,
          ``,
          "```bash",
          installCommand,
          "```",
          ``,
          `**Run this command to install the ForPrompt SDK.**`,
          ``,
          `## After Installation`,
          ``,
          `1. Create a \`.forprompt\` config file with your API key`,
          `2. Or set the \`FORPROMPT_API_KEY\` environment variable`,
          ``,
          `Use \`forprompt_generate_config\` to create the config file automatically.`,
        ];

        return {
          content: [
            {
              type: "text" as const,
              text: lines.join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error setting up project: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Generate config file
  server.registerTool(
    "forprompt_generate_config",
    {
      description:
        "Generate a .forprompt configuration file for a project. Returns the config content that should be written to .forprompt file in the project root.",
      inputSchema: GenerateConfigInputSchema,
    },
    async ({ projectPath, apiKey, baseUrl }) => {
      try {
        const configLines = [
          `# ForPrompt Configuration`,
          `# Generated by ForPrompt MCP Server`,
          ``,
        ];

        if (apiKey) {
          configLines.push(`FORPROMPT_API_KEY=${apiKey}`);
        } else {
          configLines.push(`# Add your API key here:`);
          configLines.push(`FORPROMPT_API_KEY=your_api_key_here`);
        }

        if (baseUrl) {
          configLines.push(`FORPROMPT_BASE_URL=${baseUrl}`);
        }

        const configContent = configLines.join("\n");
        const configPath = `${projectPath}/.forprompt`;

        const lines = [
          `# ForPrompt Configuration`,
          ``,
          `Create a file at \`${configPath}\` with the following content:`,
          ``,
          "```env",
          configContent,
          "```",
          ``,
          `## Alternative: Environment Variables`,
          ``,
          `Instead of a config file, you can set environment variables:`,
          ``,
          "```bash",
          `export FORPROMPT_API_KEY=your_api_key_here`,
          "```",
          ``,
          `## Get Your API Key`,
          ``,
          `1. Go to https://forprompt.dev/dashboard`,
          `2. Navigate to your organization settings`,
          `3. Create or copy your API key`,
          ``,
          `**Important:** Add \`.forprompt\` to your \`.gitignore\` to keep your API key secure!`,
        ];

        return {
          content: [
            {
              type: "text" as const,
              text: lines.join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error generating config: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Generate example code
  server.registerTool(
    "forprompt_generate_example",
    {
      description:
        "Generate example code showing how to use ForPrompt SDK. Supports different languages and use cases like basic usage, streaming, React hooks, and Next.js API routes.",
      inputSchema: GenerateExampleInputSchema,
    },
    async ({ language, useCase, promptKey }) => {
      try {
        const key = promptKey || "my_prompt";
        let code: string;
        let description: string;

        if (language === "python") {
          switch (useCase) {
            case "streaming":
              description = "Python streaming example with ForPrompt";
              code = `from forprompt import ForPrompt
import os

# Initialize the client
client = ForPrompt(api_key=os.environ.get("FORPROMPT_API_KEY"))

# Get the prompt
prompt = client.get_prompt("${key}")

# Use with your LLM (example with OpenAI)
from openai import OpenAI

openai = OpenAI()

# Stream the response
stream = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": prompt.system_prompt},
        {"role": "user", "content": "Your user message here"}
    ],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")`;
              break;
            case "with-tools":
              description = "Python example with tools/functions";
              code = `from forprompt import ForPrompt
import os
import json

client = ForPrompt(api_key=os.environ.get("FORPROMPT_API_KEY"))

# Get the prompt with tools
prompt = client.get_prompt("${key}")

# Define your tools
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City name"}
                },
                "required": ["location"]
            }
        }
    }
]

# Use with OpenAI
from openai import OpenAI

openai = OpenAI()

response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": prompt.system_prompt},
        {"role": "user", "content": "What's the weather in Tokyo?"}
    ],
    tools=tools,
    tool_choice="auto"
)

print(response.choices[0].message)`;
              break;
            default:
              description = "Basic Python usage example";
              code = `from forprompt import ForPrompt
import os

# Initialize the client
client = ForPrompt(api_key=os.environ.get("FORPROMPT_API_KEY"))

# Get a prompt by key
prompt = client.get_prompt("${key}")

print(f"Prompt: {prompt.name}")
print(f"Version: {prompt.version_number}")
print(f"System Prompt: {prompt.system_prompt}")

# Use the prompt with your LLM
from openai import OpenAI

openai = OpenAI()

response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": prompt.system_prompt},
        {"role": "user", "content": "Your user message here"}
    ]
)

print(response.choices[0].message.content)`;
          }
        } else {
          // TypeScript/JavaScript
          const isTS = language === "typescript";
          const ext = isTS ? "ts" : "js";

          switch (useCase) {
            case "streaming":
              description = "Streaming example with ForPrompt";
              code = `import { forprompt } from '@forprompt/sdk';
import OpenAI from 'openai';

async function main() {
  // Get the prompt
  const prompt = await forprompt.getPrompt('${key}');

  const openai = new OpenAI();

  // Stream the response
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: prompt.systemPrompt },
      { role: 'user', content: 'Your user message here' }
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) process.stdout.write(content);
  }
}

main();`;
              break;
            case "react-hook":
              description = "React hook example";
              code = `import { useState, useEffect } from 'react';
import { forprompt } from '@forprompt/sdk';
${isTS ? "import type { Prompt } from '@forprompt/sdk';\n" : ""}
// Custom hook to fetch a ForPrompt prompt
export function usePrompt(key${isTS ? ": string" : ""}) {
  const [prompt, setPrompt] = useState${isTS ? "<Prompt | null>" : ""}(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState${isTS ? "<Error | null>" : ""}(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrompt() {
      try {
        setLoading(true);
        const data = await forprompt.getPrompt(key);
        if (!cancelled) {
          setPrompt(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err${isTS ? " as Error" : ""});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPrompt();

    return () => { cancelled = true; };
  }, [key]);

  return { prompt, loading, error };
}

// Usage in a component
function ChatComponent() {
  const { prompt, loading, error } = usePrompt('${key}');

  if (loading) return <div>Loading prompt...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{prompt${isTS ? "!" : ""}.name}</h1>
      <p>Version: {prompt${isTS ? "!" : ""}.versionNumber}</p>
      {/* Use prompt.systemPrompt with your AI chat */}
    </div>
  );
}`;
              break;
            case "nextjs-api":
              description = "Next.js API route example";
              code = `// app/api/chat/route.${ext}
import { forprompt } from '@forprompt/sdk';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';
${isTS ? "\nexport const runtime = 'edge';\n" : ""}
const openai = new OpenAI();

export async function POST(request${isTS ? ": Request" : ""}) {
  try {
    const { message, promptKey } = await request.json();

    // Fetch the prompt from ForPrompt
    const prompt = await forprompt.getPrompt(promptKey || '${key}');

    // Create completion with the system prompt
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: message }
      ],
    });

    return NextResponse.json({
      content: response.choices[0].message.content,
      promptVersion: prompt.versionNumber,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}`;
              break;
            case "with-tools":
              description = "Example with tools/functions";
              code = `import { forprompt } from '@forprompt/sdk';
import OpenAI from 'openai';

const openai = new OpenAI();

// Define your tools
const tools${isTS ? ": OpenAI.ChatCompletionTool[]" : ""} = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name' }
        },
        required: ['location']
      }
    }
  }
];

async function main() {
  const prompt = await forprompt.getPrompt('${key}');

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: prompt.systemPrompt },
      { role: 'user', content: "What's the weather in Tokyo?" }
    ],
    tools,
    tool_choice: 'auto',
  });

  console.log(response.choices[0].message);
}

main();`;
              break;
            default:
              description = "Basic usage example";
              code = `import { forprompt } from '@forprompt/sdk';
import OpenAI from 'openai';

async function main() {
  // Get a prompt by key
  const prompt = await forprompt.getPrompt('${key}');

  console.log('Prompt:', prompt.name);
  console.log('Version:', prompt.versionNumber);
  console.log('System Prompt:', prompt.systemPrompt);

  // Use with OpenAI
  const openai = new OpenAI();

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: prompt.systemPrompt },
      { role: 'user', content: 'Your user message here' }
    ],
  });

  console.log(response.choices[0].message.content);
}

main();`;
          }
        }

        const lines = [
          `# ${description}`,
          ``,
          `**Language:** ${language}`,
          `**Use Case:** ${useCase}`,
          ``,
          "```" + (language === "python" ? "python" : language),
          code,
          "```",
          ``,
          `## Setup Required`,
          ``,
          `1. Install the ForPrompt SDK`,
          `2. Set your \`FORPROMPT_API_KEY\` environment variable`,
          `3. Create a prompt with key \`${key}\` in ForPrompt dashboard`,
        ];

        return {
          content: [
            {
              type: "text" as const,
              text: lines.join("\n"),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error generating example: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get integration guide
  server.registerTool(
    "forprompt_integration_guide",
    {
      description:
        "Get a step-by-step integration guide for ForPrompt with specific frameworks like Next.js, React, Express, FastAPI, Django, or Flask.",
      inputSchema: GetIntegrationGuideInputSchema,
    },
    async ({ framework, language }) => {
      try {
        let guide: string;

        switch (framework) {
          case "nextjs":
            guide = `# ForPrompt + Next.js Integration Guide

## 1. Install the SDK

\`\`\`bash
npm install @forprompt/sdk
# or: pnpm add @forprompt/sdk
\`\`\`

## 2. Set up environment variables

Add to your \`.env.local\`:

\`\`\`env
FORPROMPT_API_KEY=your_api_key_here
\`\`\`

## 3. Create an API route

\`\`\`typescript
// app/api/chat/route.ts
import { forprompt } from '@forprompt/sdk';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { message, promptKey } = await request.json();

  // Fetch prompt from ForPrompt
  const prompt = await forprompt.getPrompt(promptKey);

  // Use prompt.systemPrompt with your LLM
  // ... your AI logic here

  return NextResponse.json({ response: '...' });
}
\`\`\`

## 4. Create a client hook (optional)

\`\`\`typescript
// hooks/useForPrompt.ts
'use client';
import { forprompt } from '@forprompt/sdk';
import { useEffect, useState } from 'react';

export function usePrompt(key: string) {
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    forprompt.getPrompt(key).then(setPrompt);
  }, [key]);

  return prompt;
}
\`\`\`

## 5. Best Practices

- Cache prompts in production using Next.js caching
- Use server components for initial prompt fetch
- Consider using SWR or React Query for client-side caching`;
            break;

          case "react":
            guide = `# ForPrompt + React Integration Guide

## 1. Install the SDK

\`\`\`bash
npm install @forprompt/sdk
\`\`\`

## 2. Create a custom hook

\`\`\`typescript
// hooks/usePrompt.ts
import { useState, useEffect } from 'react';
import { forprompt, Prompt } from '@forprompt/sdk';

export function usePrompt(key: string) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    forprompt.getPrompt(key)
      .then(setPrompt)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [key]);

  return { prompt, loading, error };
}
\`\`\`

## 3. Use in components

\`\`\`tsx
function ChatBot() {
  const { prompt, loading } = usePrompt('customer_support');

  if (loading) return <Spinner />;

  return <Chat systemPrompt={prompt.systemPrompt} />;
}
\`\`\``;
            break;

          case "express":
            guide = `# ForPrompt + Express Integration Guide

## 1. Install the SDK

\`\`\`bash
npm install @forprompt/sdk
\`\`\`

## 2. Create a middleware (optional)

\`\`\`typescript
// middleware/forprompt.ts
import { forprompt } from '@forprompt/sdk';

export async function loadPrompt(req, res, next) {
  try {
    const promptKey = req.query.promptKey || req.body.promptKey;
    if (promptKey) {
      req.prompt = await forprompt.getPrompt(promptKey);
    }
    next();
  } catch (error) {
    next(error);
  }
}
\`\`\`

## 3. Use in routes

\`\`\`typescript
import express from 'express';
import { forprompt } from '@forprompt/sdk';

const app = express();

app.post('/api/chat', async (req, res) => {
  const { message, promptKey } = req.body;

  const prompt = await forprompt.getPrompt(promptKey);

  // Use prompt.systemPrompt with your LLM
  // ...

  res.json({ response: '...' });
});
\`\`\``;
            break;

          case "fastapi":
            guide = `# ForPrompt + FastAPI Integration Guide

## 1. Install the SDK

\`\`\`bash
pip install forprompt
\`\`\`

## 2. Create a dependency

\`\`\`python
# dependencies.py
from forprompt import ForPrompt
import os

def get_forprompt():
    return ForPrompt(api_key=os.environ.get("FORPROMPT_API_KEY"))
\`\`\`

## 3. Use in routes

\`\`\`python
from fastapi import FastAPI, Depends
from forprompt import ForPrompt
from dependencies import get_forprompt

app = FastAPI()

@app.post("/api/chat")
async def chat(
    message: str,
    prompt_key: str,
    fp: ForPrompt = Depends(get_forprompt)
):
    prompt = fp.get_prompt(prompt_key)

    # Use prompt.system_prompt with your LLM
    # ...

    return {"response": "..."}
\`\`\`

## 4. Best Practices

- Cache prompts using functools.lru_cache or Redis
- Use async version for better performance
- Consider using Pydantic models for prompt data`;
            break;

          case "django":
            guide = `# ForPrompt + Django Integration Guide

## 1. Install the SDK

\`\`\`bash
pip install forprompt
\`\`\`

## 2. Add to settings

\`\`\`python
# settings.py
FORPROMPT_API_KEY = os.environ.get("FORPROMPT_API_KEY")
\`\`\`

## 3. Create a utility

\`\`\`python
# utils/forprompt.py
from forprompt import ForPrompt
from django.conf import settings
from functools import lru_cache

@lru_cache(maxsize=100)
def get_prompt(key: str):
    client = ForPrompt(api_key=settings.FORPROMPT_API_KEY)
    return client.get_prompt(key)
\`\`\`

## 4. Use in views

\`\`\`python
from django.http import JsonResponse
from utils.forprompt import get_prompt

def chat_view(request):
    prompt_key = request.POST.get('prompt_key')
    prompt = get_prompt(prompt_key)

    # Use prompt.system_prompt with your LLM

    return JsonResponse({"response": "..."})
\`\`\``;
            break;

          case "flask":
            guide = `# ForPrompt + Flask Integration Guide

## 1. Install the SDK

\`\`\`bash
pip install forprompt
\`\`\`

## 2. Initialize the client

\`\`\`python
# app.py
from flask import Flask, request, jsonify
from forprompt import ForPrompt
import os

app = Flask(__name__)
forprompt_client = ForPrompt(api_key=os.environ.get("FORPROMPT_API_KEY"))

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    prompt = forprompt_client.get_prompt(data['prompt_key'])

    # Use prompt.system_prompt with your LLM

    return jsonify({"response": "..."})
\`\`\``;
            break;

          default:
            guide = `# ForPrompt Generic Integration Guide

## TypeScript/JavaScript

\`\`\`typescript
import { forprompt } from '@forprompt/sdk';

const prompt = await forprompt.getPrompt('your_prompt_key');
console.log(prompt.systemPrompt);
\`\`\`

## Python

\`\`\`python
from forprompt import ForPrompt
import os

client = ForPrompt(api_key=os.environ.get("FORPROMPT_API_KEY"))
prompt = client.get_prompt("your_prompt_key")
print(prompt.system_prompt)
\`\`\`

## Environment Setup

1. Get your API key from https://forprompt.dev/dashboard
2. Set \`FORPROMPT_API_KEY\` environment variable
3. Install the SDK for your language
4. Start fetching prompts!`;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: guide,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error generating guide: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
