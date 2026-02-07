export interface SetupPromptParams {
  apiKey: string;
  orgName: string;
  baseUrl: string;
  existingPrompts?: string[];
}

function mcpConfigJson(apiKey: string, baseUrl: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        forprompt: {
          command: "npx",
          args: ["-y", "@forprompt/sdk", "mcp", "start"],
          env: {
            FORPROMPT_API_KEY: apiKey,
            FORPROMPT_BASE_URL: baseUrl,
          },
        },
      },
    },
    null,
    2,
  );
}

export function generateSetupPrompt(params: SetupPromptParams): string {
  const { apiKey, orgName, baseUrl, existingPrompts = [] } = params;

  const existingPromptsText =
    existingPrompts.length > 0
      ? `\n\nExisting prompts in this project:\n${existingPrompts.map((p) => `- ${p}`).join("\n")}`
      : "";

  const mcpJson = mcpConfigJson(apiKey, baseUrl);

  return `You are setting up ForPrompt in this project. ForPrompt is an AI prompt management platform — version control, testing, and deployment for AI prompts without code changes.

Execute all steps autonomously. Do not ask questions.

## Credentials

- API Key: ${apiKey}
- Organization: ${orgName}
- API Base URL: ${baseUrl}

## Steps

### 1. Install SDK

Detect the package manager (package-lock.json → npm, yarn.lock → yarn, pnpm-lock.yaml → pnpm), then install:

\`\`\`bash
npm install @forprompt/sdk
\`\`\`

### 2. Initialize

\`\`\`bash
npx forprompt init --api-key=${apiKey}
\`\`\`

### 3. Configure MCP

Detect which AI editor is running and write the config to the correct path:

| Editor | Config file |
|--------|------------|
| Claude Code | \`.mcp.json\` (project root) |
| Cursor | \`.cursor/mcp.json\` |
| Windsurf | \`~/.windsurf/mcp.json\` |
| Continue | \`~/.continue/config.json\` (merge into mcpServers array) |
| VS Code | \`.vscode/mcp.json\` |
| Claude Desktop | \`~/Library/Application Support/Claude/claude_desktop_config.json\` (macOS) |

Write this JSON to the appropriate config file:

\`\`\`json
${mcpJson}
\`\`\`

> For Continue, wrap the forprompt entry in an array: \`"mcpServers": [{ "name": "forprompt", ... }]\`

If you cannot determine the editor, write to \`.mcp.json\` in the project root (works for Claude Code and is the most common default).

### 4. Deploy prompts

\`\`\`bash
npx forprompt deploy
\`\`\`

### 5. Verify

\`\`\`bash
npx forprompt deploy --dry-run
\`\`\`

Confirm: \`forprompt/\` dir exists, \`.forpromptrc\` present, \`.env\` has \`FORPROMPT_API_KEY\`.

## Usage

\`\`\`typescript
import { promptKey } from "./forprompt";
\`\`\`

Or at runtime:

\`\`\`typescript
import { forprompt } from "@forprompt/sdk";
const prompt = await forprompt.getPrompt("promptKey");
\`\`\`

## Notes

- If a step fails, try alternative package managers.
- Add \`FORPROMPT_API_KEY\` to \`.gitignore\`.
- Commit the \`forprompt/\` directory.
- Set \`FORPROMPT_API_KEY\` in your deployment environment.${existingPromptsText}`;
}
