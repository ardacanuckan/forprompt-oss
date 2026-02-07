# @forprompt/sdk

Sync and manage AI prompts from your [ForPrompt](https://forprompt.dev) projects.

## Features

- **Simple CLI** - `init` and `deploy` commands for easy setup
- **MCP Server** - Integrate with Claude Code, Claude Desktop, Cursor, and more
- **Local files** - Prompts synced to TypeScript files for fast imports
- **Version history** - Track all prompt versions locally
- **Type-safe** - Full TypeScript support
- **Zero config** - Just API key in `.env`

## Installation

```bash
npm install @forprompt/sdk
```

## Quick Start

### 1. Initialize your project

```bash
npx forprompt init
```

This will:
- Ask for your API key (get it from your ForPrompt Dashboard)
- Save it to `.env` file
- Create `forprompt/` directory

### 2. Deploy prompts

```bash
npx forprompt deploy
```

Syncs all prompts from your ForPrompt project to local files.

### 3. Use in your code

**Option A: Import from local files (recommended)**

```typescript
import { userContextPrompt } from "./forprompt";

// Or use the helper
import { getPrompt } from "./forprompt";
const prompt = getPrompt("userContextPrompt");
```

**Option B: Fetch from API at runtime**

```typescript
import { forprompt } from "@forprompt/sdk";

// Auto-loads from FORPROMPT_API_KEY environment variable
const prompt = await forprompt.getPrompt("userContextPrompt");
console.log(prompt.systemPrompt);
```

## CLI Commands

### `forprompt init`

Initialize ForPrompt in your project.

```bash
npx forprompt init
npx forprompt init --api-key=fp_xxx  # Provide key directly
```

### `forprompt deploy`

Sync prompts from server to local files.

```bash
npx forprompt deploy
npx forprompt deploy --clean  # Remove deleted prompts locally
```

## Project Structure

After `forprompt deploy`:

```
my-app/
├── .env                          # FORPROMPT_API_KEY=fp_xxx
├── forprompt/
│   ├── .forpromptrc              # Project config
│   ├── index.ts                  # Exports all prompts
│   ├── userContextPrompt/
│   │   ├── prompt.ts             # export const userContextPrompt = "..."
│   │   ├── metadata.json         # Version info
│   │   └── versions/
│   │       ├── v1.txt
│   │       └── v2.txt
│   └── chatDefaultPrompt/
│       └── ...
```

## SDK API

### Auto-configured client

```typescript
import { forprompt } from "@forprompt/sdk";

// Uses FORPROMPT_API_KEY from environment
const prompt = await forprompt.getPrompt("userContextPrompt");
```

### Custom client

```typescript
import { createForPrompt } from "@forprompt/sdk";

const client = createForPrompt({
  apiKey: "fp_xxx",
  baseUrl: "https://wooden-fox-811.convex.site", // Optional: Custom backend URL
});

const prompt = await client.getPrompt("userContextPrompt");
```

### Get specific version

```typescript
const promptV2 = await forprompt.getPrompt("userContextPrompt", { version: 2 });
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FORPROMPT_API_KEY` | Your project API key (required) |
| `FORPROMPT_BASE_URL` | Custom API URL (optional) |

## Logging

Track AI conversations with automatic tracing.

### Conversation Logging (Multi-turn)

For multi-turn conversations where messages share the same trace:

```typescript
import { logger } from "@forprompt/sdk";

// Start a trace
const traceId = logger.startTrace("onboarding", {
  versionNumber: 2  // Track prompt version
});

// Log user message
await logger.log({ role: "user", content: "Hello" });

// Log AI response
await logger.log({
  role: "assistant",
  content: "Hi! How can I help?",
  model: "gpt-4o",
  tokens: { input: 10, output: 50 },
  durationMs: 1200
});

// End trace (optional)
await logger.endTrace();
```

### Single Request Logging

For one-shot AI requests without conversation tracking:

```typescript
import { createLogger } from "@forprompt/sdk";

const logger = createLogger({ apiKey: "fp_proj_xxx" });

// Log a single request/response pair
const { traceId } = await logger.logRequest({
  promptKey: "aicoaching",
  versionNumber: 2,
  input: "How do I learn Python?",
  output: "Here are 5 steps...",
  model: "gpt-4o",
  tokens: { input: 10, output: 150 },
  durationMs: 1200
});
```

### When to Use Each Mode

| Mode | Method | Use Case |
|------|--------|----------|
| **Conversation** | `startTrace()` + `log()` | Multi-turn chats, chatbots, context-dependent conversations |
| **Single Request** | `logRequest()` | One-shot API calls, batch processing, simple Q&A |

## TypeScript

Full type definitions included:

```typescript
import type { Prompt, ForPromptConfig, LogOptions, SingleRequestOptions } from "@forprompt/sdk";
```

## Workflow

1. Create/edit prompts in [ForPrompt Dashboard](https://forprompt.dev)
2. Run `npx forprompt deploy` to sync locally
3. Commit the `forprompt/` folder to version control
4. Import prompts directly in your code

## MCP Server Integration

ForPrompt includes an MCP (Model Context Protocol) server that exposes your prompts to AI assistants like Claude Code, Claude Desktop, Cursor, and other MCP-compatible tools.

### Claude Code

Add ForPrompt to Claude Code with a single command:

```bash
claude mcp add forprompt -e FORPROMPT_API_KEY=your-api-key -- npx -y @forprompt/sdk mcp start
```

After adding, restart Claude Code and ask: "List my ForPrompt prompts"

### Claude Desktop

Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "forprompt": {
      "command": "npx",
      "args": ["-y", "@forprompt/sdk", "mcp", "start"],
      "env": {
        "FORPROMPT_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "forprompt": {
      "command": "npx",
      "args": ["-y", "@forprompt/sdk", "mcp", "start"],
      "env": {
        "FORPROMPT_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `forprompt_get_prompt` | Fetch a prompt by its key |
| `forprompt_list_prompts` | List all available prompts |
| `forprompt_search_prompts` | Search prompts by text |
| `forprompt_get_prompt_metadata` | Get prompt metadata only |
| `forprompt_get_system_prompt` | Get raw system prompt text |

### Available MCP Resources

| URI | Description |
|-----|-------------|
| `forprompt://prompts` | List all prompts |
| `forprompt://prompts/{key}` | Get a specific prompt |
| `forprompt://prompts/{key}/v{n}` | Get a specific version |
| `forprompt://prompts/{key}/metadata` | Get metadata only |

### Supported Editors

- **Claude Code** - Anthropic's CLI-based AI assistant
- **Claude Desktop** - Anthropic's Claude desktop application
- **Cursor** - AI-powered code editor
- **Continue.dev** - Open-source AI code assistant
- **Windsurf** - AI-powered IDE

## License

AGPL-3.0-or-later

## Author

Created by Arda Uckan for ForPrompt
