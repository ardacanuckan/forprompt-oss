/**
 * MCP Resource Handlers
 *
 * Exposes ForPrompt prompts as MCP resources that AI assistants can read.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ForPrompt } from "../client.js";
import type { ForPromptMcpServerConfig } from "./server.js";
import type { Prompt, SyncResponse } from "../types.js";

const DEFAULT_BASE_URL = "https://wooden-fox-811.convex.site";

/**
 * Fetch all prompts using the sync endpoint
 */
async function fetchAllPrompts(
  config: ForPromptMcpServerConfig
): Promise<Prompt[]> {
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
 * Parse a forprompt:// URI and extract components
 */
function parseUri(uri: string): {
  key?: string;
  version?: number;
  type: "list" | "prompt" | "metadata";
} {
  // forprompt://prompts -> list all
  // forprompt://prompts/{key} -> single prompt
  // forprompt://prompts/{key}/v{number} -> specific version
  // forprompt://prompts/{key}/metadata -> metadata only

  const match = uri.match(/^forprompt:\/\/prompts(?:\/([^/]+))?(?:\/(v\d+|metadata))?$/);

  if (!match) {
    return { type: "list" };
  }

  const [, key, suffix] = match;

  if (!key) {
    return { type: "list" };
  }

  if (suffix === "metadata") {
    return { key, type: "metadata" };
  }

  if (suffix?.startsWith("v")) {
    const version = parseInt(suffix.slice(1), 10);
    return { key, version, type: "prompt" };
  }

  return { key, type: "prompt" };
}

/**
 * Format a prompt as resource content
 */
function formatPromptResource(prompt: Prompt): string {
  const sections: string[] = [];

  sections.push(`# ${prompt.name}`);
  sections.push("");
  sections.push(`Key: ${prompt.key}`);
  sections.push(`Version: ${prompt.versionNumber}`);
  sections.push(`Updated: ${new Date(prompt.updatedAt).toISOString()}`);

  if (prompt.description) {
    sections.push("");
    sections.push(`## Description`);
    sections.push(prompt.description);
  }

  sections.push("");
  sections.push("## System Prompt");
  sections.push("");
  sections.push(prompt.systemPrompt);

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

  return sections.join("\n");
}

/**
 * Register MCP resources
 */
export function registerResources(
  server: McpServer,
  client: ForPrompt,
  config: ForPromptMcpServerConfig
): void {
  // Resource template for prompts
  server.resource(
    "forprompt://prompts/{key}",
    "Access a ForPrompt prompt by its key. Returns the system prompt and all metadata.",
    async (uri) => {
      const parsed = parseUri(uri.href);

      if (parsed.type === "list" || !parsed.key) {
        // Return list of all prompts
        const prompts = await fetchAllPrompts(config);
        const list = prompts
          .map((p) => `- ${p.key}: ${p.name} (v${p.versionNumber})`)
          .join("\n");

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `# ForPrompt Prompts\n\n${prompts.length} prompt(s) available:\n\n${list}`,
            },
          ],
        };
      }

      if (parsed.type === "metadata") {
        // Return metadata only
        const prompt = await client.getPrompt(parsed.key);
        const metadata = {
          key: prompt.key,
          name: prompt.name,
          description: prompt.description,
          versionNumber: prompt.versionNumber,
          updatedAt: prompt.updatedAt,
          purpose: prompt.purpose,
          expectedBehavior: prompt.expectedBehavior,
          inputFormat: prompt.inputFormat,
          outputFormat: prompt.outputFormat,
          constraints: prompt.constraints,
          useCases: prompt.useCases,
        };

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(metadata, null, 2),
            },
          ],
        };
      }

      // Return full prompt
      const prompt = await client.getPrompt(parsed.key, {
        version: parsed.version,
      });

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text: formatPromptResource(prompt),
          },
        ],
      };
    }
  );
}
