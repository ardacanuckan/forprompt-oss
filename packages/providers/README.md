# @forprompt/providers

Provider abstraction layer for ForPrompt - enabling support for multiple AI providers, databases, and authentication systems.

## Features

- **Multiple AI Providers** - OpenRouter, OpenAI, Anthropic, Ollama
- **Database Abstraction** - Convex or PostgreSQL with Drizzle ORM
- **Auth Abstraction** - Pluggable authentication providers
- **Extended Thinking** - Support for Claude's reasoning mode
- **Streaming** - Real-time response streaming
- **Model Management** - Canonical model names across providers

## Installation

This is an internal package used by ForPrompt. It's not published to npm.

```typescript
import {
  anthropic,
  createProvider,
  ollama,
  openai,
} from "@forprompt/providers";
```

## AI Providers

See [AI_PROVIDERS.md](./AI_PROVIDERS.md) for detailed documentation.

### Quick Start

```typescript
import type { Message } from "@forprompt/providers";
import { createProvider } from "@forprompt/providers";

// Auto-detect from AI_PROVIDER env var
const ai = createProvider();

// Or specify provider
const ai = createProvider("anthropic", {
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const messages: Message[] = [
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "Hello!" },
];

// Complete
const result = await ai.complete(messages, {
  model: "claude-3-5-sonnet",
  maxTokens: 1024,
});

// Stream
for await (const chunk of ai.stream(messages)) {
  process.stdout.write(chunk.content);
}
```

### Supported Providers

| Provider   | Env Variable         | Features                    |
| ---------- | -------------------- | --------------------------- |
| OpenRouter | `OPENROUTER_API_KEY` | 100+ models, unified API    |
| OpenAI     | `OPENAI_API_KEY`     | GPT-4, GPT-4o, o1, o3       |
| Anthropic  | `ANTHROPIC_API_KEY`  | Claude 3, 3.5, 4 + thinking |
| Ollama     | `OLLAMA_HOST`        | Local models, air-gapped    |

### Extended Thinking (Claude)

```typescript
const result = await ai.completeWithThinking(messages, {
  model: "claude-3-5-sonnet",
  thinking: {
    enabled: true,
    budgetTokens: 5000,
  },
});

console.log("Thinking:", result.thinking);
console.log("Response:", result.content);
```

## Database (Drizzle ORM)

PostgreSQL support via Drizzle ORM for self-hosted deployments.

### Schema

The schema mirrors the Convex schema and includes:

- Users & Organizations
- Prompts & Versions
- Tools & Integrations
- Traces & Spans (logging)
- Webhooks & API Keys

### Usage

```typescript
import {
  createConnection,
  getDatabase,
} from "@forprompt/providers/data/drizzle";
import { prompts, users } from "@forprompt/providers/data/drizzle/schema";

// Connect
createConnection({ connectionString: process.env.DATABASE_URL });

// Query
const db = getDatabase();
const allUsers = await db.select().from(users);
const prompt = await db.query.prompts.findFirst({
  where: eq(prompts.key, "my-prompt"),
});
```

### Migrations

```bash
cd packages/providers

# Generate migration
pnpm db:generate

# Run migration
pnpm db:migrate

# Push schema (dev)
pnpm db:push

# Open Drizzle Studio
pnpm db:studio
```

## Exports

### Main

```typescript
// AI Providers
export {
  createProvider,
  openai,
  anthropic,
  ollama,
  openrouter,
} from "@forprompt/providers";
export type {
  AIProvider,
  Message,
  CompletionResult,
} from "@forprompt/providers";

// Models
export { MODELS, getModelInfo, supportsThinking } from "@forprompt/providers";
```

### AI Subpath

```typescript
import { createProviderRegistry } from "@forprompt/providers/ai/factory";
import { MODEL_MAPPINGS, MODELS } from "@forprompt/providers/ai/models";
import {
  AnthropicProvider,
  OpenAIProvider,
} from "@forprompt/providers/ai/providers";
```

### Data Subpath

```typescript
import {
  createConnection,
  getDatabase,
} from "@forprompt/providers/data/drizzle";
import {
  prompts,
  traces,
  users,
} from "@forprompt/providers/data/drizzle/schema";
```

## Environment Variables

```bash
# AI Provider Selection
AI_PROVIDER=openrouter  # openrouter | openai | anthropic | ollama

# Provider API Keys
OPENROUTER_API_KEY=sk-or-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_HOST=http://localhost:11434

# Database (PostgreSQL mode)
DATABASE_URL=postgresql://user:pass@localhost:5432/forprompt
```

## Development

```bash
# Build
pnpm build

# Test
pnpm test

# Type check
pnpm typecheck
```

## License

MIT
