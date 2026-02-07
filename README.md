# ForPrompt

**GitHub for AI Prompts** - Version control, testing, deployment, and production analytics for AI prompts.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

## Features

- **Version Control** - Track every change to your prompts with full history
- **A/B Testing** - Compare prompt versions with built-in evaluation tools
- **SDK Integration** - TypeScript and Python SDKs for seamless integration
- **MCP Server** - Works with Claude Code, Claude Desktop, Cursor, and more
- **Real-time Sync** - Prompts sync instantly across your team
- **Production Analytics** - Track usage, latency, and token consumption
- **Multi-tenancy** - Organizations with role-based access control

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/ardacanuckan/forprompt-oss.git
cd forprompt-oss
pnpm install
```

### 2. Set Up Services

You'll need:

- [Convex](https://convex.dev) account for the backend
- [Clerk](https://clerk.com) account for authentication

See [SELF_HOSTING.md](SELF_HOSTING.md) for detailed setup instructions.

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Convex and Clerk credentials
```

### 4. Deploy Backend

```bash
pnpm convex:deploy
```

### 5. Run

```bash
pnpm dev
```

Visit `http://localhost:3000`

## Tech Stack

- **Frontend**: Next.js 15 (React 19) + Tailwind CSS v4 + shadcn/ui
- **Backend**: Convex (serverless functions, real-time database)
- **Auth**: Clerk (users, organizations, multi-tenancy)
- **SDKs**: TypeScript (`@forprompt/sdk`) + Python

## Project Structure

```
forprompt-oss/
├── apps/
│   └── forprompt/       # Web dashboard (Next.js 15)
├── packages/
│   ├── sdk/             # TypeScript SDK
│   ├── ui/              # Shared React components
│   └── validators/      # Shared Zod schemas
├── convex/              # Backend (Convex)
│   ├── domains/         # Feature modules
│   ├── http/            # HTTP API routes
│   └── schema.ts        # Database schema
└── tooling/             # Shared configs
```

## SDK Usage

```typescript
import { createForPrompt } from "@forprompt/sdk";

const client = createForPrompt({
  apiKey: process.env.FORPROMPT_API_KEY!,
  baseUrl: process.env.FORPROMPT_BASE_URL!,
});

const prompt = await client.getPrompt("my-prompt-key");
console.log(prompt.systemPrompt);
```

## MCP Integration

Add ForPrompt to Claude Code:

```bash
claude mcp add forprompt \
  -e FORPROMPT_API_KEY=your-api-key \
  -e FORPROMPT_BASE_URL=https://your-convex.convex.site \
  -- npx -y @forprompt/sdk mcp start
```

## Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build all packages
pnpm convex:dev       # Start Convex dev server
pnpm convex:deploy    # Deploy to Convex
pnpm lint             # Lint code
pnpm typecheck        # Type check
```

## Self-Hosting

See [SELF_HOSTING.md](SELF_HOSTING.md) for complete deployment instructions including:

- Convex backend setup
- Clerk authentication configuration
- Docker deployment
- SDK configuration

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

[Apache 2.0](LICENSE)

## Author

Created by [Arda Uckan](https://github.com/ardacanuckan)
