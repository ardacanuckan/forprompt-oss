<div align="center">

<img src="assets/logo.png" alt="ForPrompt Logo" width="120" height="120">

# ForPrompt

### The Complete Platform for AI Prompt Engineering

Version control, AI-powered analysis, production analytics, and instant deployment for your prompts.

[![CI](https://github.com/ardacanuckan/forprompt-oss/actions/workflows/ci.yml/badge.svg)](https://github.com/ardacanuckan/forprompt-oss/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Convex](https://img.shields.io/badge/Convex-Backend-orange.svg)](https://convex.dev/)

[Documentation](SELF_HOSTING.md) · [Report Bug](https://github.com/ardacanuckan/forprompt-oss/issues) · [Request Feature](https://github.com/ardacanuckan/forprompt-oss/issues)

</div>

---

## What is ForPrompt?

ForPrompt is a **complete prompt engineering platform** that treats prompts as first-class citizens in your AI development workflow. It's not just version control — it's an entire ecosystem for building, testing, analyzing, and deploying AI prompts.

### The Problem

Building AI applications today means:

- Prompts hardcoded in your codebase, scattered across files
- No way to update prompts without redeploying your app
- Manual testing with no structured analysis
- No visibility into how prompts perform in production
- No collaboration tools for teams working on prompts

### The Solution

ForPrompt provides:

- **Version Control** — Git-like versioning for every prompt
- **AI-Powered Analysis** — Automatic clarity scoring, improvement suggestions, edge case detection
- **Production Analytics** — Real-time usage tracking, token consumption, response times
- **Instant Updates** — Change prompts in production without code changes
- **Team Collaboration** — Organizations, roles, and real-time sync

---

## Core Features

### 1. Smart Prompt Editor

A powerful editor with AI assistance built-in:

- **Inline AI Review** — Claude-powered suggestions while you edit
- **Extended Thinking** — See the AI's reasoning process in real-time
- **Syntax Highlighting** — Clean, readable prompt editing
- **Model Testing** — Test against multiple LLMs (GPT-4, Claude, etc.)

### 2. AI-Powered Prompt Analysis

Get instant feedback on your prompts:

| Analysis Type               | What It Does                                         |
| --------------------------- | ---------------------------------------------------- |
| **Clarity Score**           | 1-10 rating of how clear your prompt is              |
| **Improvement Suggestions** | Specific recommendations to enhance your prompt      |
| **Edge Case Detection**     | Identifies scenarios your prompt might not handle    |
| **Alignment Check**         | Verifies prompt matches your stated purpose/behavior |
| **Tool Usage Analysis**     | Checks if tools are properly integrated              |

### 3. Structured Prompt Metadata

Define prompts with structured information:

```
Purpose          → What the prompt is trying to achieve
Expected Behavior → How the AI should act
Input/Output Format → Data structure expectations
Constraints       → Limitations and boundaries
Use Cases         → Example scenarios
Tool Strategy     → How to use integrated tools
```

ForPrompt can **auto-generate system prompts** from this metadata and **extract metadata** from existing prompts.

### 4. Version Control

Full Git-like versioning for prompts:

- **Version History** — See every change with timestamps
- **Version Comparison** — Diff between any two versions
- **Instant Rollback** — Revert to any previous version
- **Active Version Management** — Control which version is live
- **Changelog** — Notes for each version

### 5. Production Logging & Analytics

Track everything in production:

```typescript
// SDK automatically logs conversations
const logger = forprompt.createLogger("my-prompt");
await logger.startTrace({ userId: "user123" });
await logger.log({ role: "user", content: message });
await logger.log({ role: "assistant", content: response });
await logger.endTrace();
```

**Analytics Dashboard:**

- Token usage per prompt/version
- Response time tracking
- Conversation success rates
- Version A/B comparison
- User-level analytics

### 6. Tool Management

Build a library of reusable tools:

- **Tool Library** — Organization-wide tool definitions
- **Prompt-Tool Associations** — Link tools to specific prompts
- **Parameter Schemas** — Structured tool parameters
- **Usage Documentation** — Examples for each tool
- **Export Formats** — Export tools in multiple formats

### 7. Team Collaboration

Built for teams:

- **Organizations** — Isolated workspaces for teams
- **Role-Based Access** — Admin/Member permissions
- **Invitations** — Email-based team invites
- **Real-time Sync** — Changes propagate instantly
- **Audit Trail** — Track who changed what

### 8. Webhook Integration

Sync prompts to your infrastructure:

```bash
# Register a webhook
POST /api/webhooks
{
  "url": "https://your-app.com/webhook",
  "events": ["prompt.updated", "prompt.version.activated"]
}
```

Events: `prompt.created`, `prompt.updated`, `prompt.deleted`, `prompt.version.activated`

---

## SDKs & Integrations

### TypeScript SDK

```bash
npm install @forprompt/sdk
```

```typescript
import { createForPrompt } from "@forprompt/sdk";

const forprompt = createForPrompt({
  apiKey: process.env.FORPROMPT_API_KEY!,
  baseUrl: process.env.FORPROMPT_BASE_URL!,
});

// Fetch a prompt
const prompt = await forprompt.getPrompt("customer-support");

// Use with any LLM
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: prompt.systemPrompt },
    { role: "user", content: userMessage },
  ],
});

// Log the conversation
const logger = forprompt.createLogger("customer-support");
await logger.logRequest({
  input: userMessage,
  output: response.choices[0].message.content,
  tokens: { input: 100, output: 50 },
});
```

### Python SDK

```bash
pip install forprompt
```

```python
from forprompt import ForPrompt

client = ForPrompt(
    api_key=os.environ["FORPROMPT_API_KEY"],
    base_url=os.environ["FORPROMPT_BASE_URL"]
)

prompt = client.get_prompt("customer-support")
print(prompt.system_prompt)
```

### MCP Server (Model Context Protocol)

ForPrompt works as an MCP server for AI coding assistants:

**Claude Code:**

```bash
claude mcp add forprompt \
  -e FORPROMPT_API_KEY=your-api-key \
  -e FORPROMPT_BASE_URL=https://your-convex.convex.site \
  -- npx -y @forprompt/sdk mcp start
```

**Cursor / Windsurf / Continue.dev:**

```json
{
  "mcpServers": {
    "forprompt": {
      "command": "npx",
      "args": ["-y", "@forprompt/sdk", "mcp", "start"],
      "env": {
        "FORPROMPT_API_KEY": "your-api-key",
        "FORPROMPT_BASE_URL": "https://your-convex.convex.site"
      }
    }
  }
}
```

**Available MCP Tools:**

- `forprompt_get_prompt` — Fetch prompt by key
- `forprompt_list_prompts` — List all prompts
- `forprompt_search_prompts` — Search prompts
- `forprompt_get_system_prompt` — Get raw system prompt

### CLI

```bash
# Initialize project
npx @forprompt/sdk init

# Sync prompts to local files
npx @forprompt/sdk sync

# Start MCP server
npx @forprompt/sdk mcp start
```

---

## API Reference

### REST API

| Endpoint                  | Method | Description              |
| ------------------------- | ------ | ------------------------ |
| `/api/prompts`            | GET    | Fetch prompt by key      |
| `/api/prompts`            | POST   | Create new prompt        |
| `/api/prompts/:id`        | PUT    | Update prompt            |
| `/api/sync`               | GET    | Sync all prompts         |
| `/api/log`                | POST   | Log traces/spans         |
| `/api/webhooks`           | POST   | Register webhook         |
| `/api/edit-prompt/stream` | POST   | AI-powered editing (SSE) |

### Streaming Edit API

Real-time AI-powered prompt editing with extended thinking:

```typescript
const response = await fetch("/api/edit-prompt/stream", {
  method: "POST",
  body: JSON.stringify({
    prompt: currentPrompt,
    instruction: "Make it more concise",
    conversationHistory: [...],
  }),
});

// Stream the response
const reader = response.body.getReader();
// Receive: thinking chunks, content chunks, done signal
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- [Convex](https://convex.dev) account (free tier)
- [Clerk](https://clerk.com) account (free tier)
- [OpenRouter](https://openrouter.ai) API key (optional, for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/ardacanuckan/forprompt-oss.git
cd forprompt-oss

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start Convex backend
pnpm convex:dev

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

### Tech Stack

| Layer        | Technology                                         |
| ------------ | -------------------------------------------------- |
| **Frontend** | Next.js 15, React 19, Tailwind CSS v4, shadcn/ui   |
| **Backend**  | Convex (serverless functions + real-time database) |
| **Auth**     | Clerk (users, organizations, multi-tenancy)        |
| **AI**       | OpenRouter API (Claude, GPT-4, etc.)               |
| **SDKs**     | TypeScript, Python                                 |
| **Monorepo** | Turborepo + pnpm workspaces                        |

### Project Structure

```
forprompt-oss/
├── apps/
│   └── forprompt/              # Next.js web dashboard
│       └── src/app/features/
│           ├── editor/         # Prompt editor with AI review
│           ├── testing/        # AI analysis & testing
│           ├── versions/       # Version history
│           ├── logs/           # Production analytics
│           ├── tools/          # Tool management
│           └── organization/   # Team settings
├── packages/
│   ├── sdk/                    # TypeScript SDK
│   │   ├── client.ts           # API client
│   │   ├── trace.ts            # Logging utilities
│   │   └── mcp/                # MCP server
│   ├── sdk-python/             # Python SDK
│   ├── ui/                     # Shared components
│   └── validators/             # Zod schemas
├── convex/                     # Backend
│   ├── domains/
│   │   ├── promptOrchestrator/ # Prompt CRUD & AI operations
│   │   ├── logs/               # Trace/span logging
│   │   ├── tools/              # Tool management
│   │   ├── webhooks/           # Event delivery
│   │   └── organizations/      # Multi-tenancy
│   ├── http/                   # REST API routes
│   └── schema.ts               # Database schema (29 tables)
└── tooling/                    # Shared configs
```

### Database Schema

ForPrompt uses 29 tables organized by domain:

**Prompt Management:**

- `prompts` — Prompt definitions with metadata
- `promptVersions` — Individual versions
- `promptTestResults` — Test execution results
- `promptAnalysisResults` — AI analysis results

**Logging & Analytics:**

- `traces` — Full conversations
- `spans` — Individual events
- `conversationReports` — AI-generated reports

**Team & Auth:**

- `users`, `organizations`, `organizationMembers`
- `projectApiKeys` (AES-256-GCM encrypted)

---

## Configuration

### Environment Variables

| Variable                            | Required | Description             |
| ----------------------------------- | -------- | ----------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes      | Clerk public key        |
| `CLERK_SECRET_KEY`                  | Yes      | Clerk secret key        |
| `CLERK_WEBHOOK_SECRET`              | Yes      | Clerk webhook signing   |
| `NEXT_PUBLIC_CONVEX_URL`            | Yes      | Convex deployment URL   |
| `CONVEX_DEPLOYMENT`                 | Yes      | Convex deployment name  |
| `OPENROUTER_API_KEY`                | No       | For AI-powered features |

---

## Deployment

### Docker

```bash
docker compose up -d
```

### Vercel

1. Push to GitHub
2. Import to Vercel
3. Set environment variables
4. Deploy

See [SELF_HOSTING.md](SELF_HOSTING.md) for complete instructions.

---

## Commands

| Command              | Description                        |
| -------------------- | ---------------------------------- |
| `pnpm dev`           | Start all apps in development mode |
| `pnpm build`         | Build all packages                 |
| `pnpm convex:dev`    | Start Convex development server    |
| `pnpm convex:deploy` | Deploy Convex to production        |
| `pnpm lint`          | Lint all code                      |
| `pnpm typecheck`     | Type check all packages            |

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## Security

For security issues, please see [SECURITY.md](SECURITY.md).

---

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.

---

<div align="center">

**[Documentation](SELF_HOSTING.md)** · **[Report Bug](https://github.com/ardacanuckan/forprompt-oss/issues)** · **[Request Feature](https://github.com/ardacanuckan/forprompt-oss/issues)**

Made with love by [Arda Uckan](https://github.com/ardacanuckan)

</div>
