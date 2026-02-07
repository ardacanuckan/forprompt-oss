<div align="center">

# ForPrompt

### GitHub for AI Prompts

Version control, testing, and deployment for AI prompts — without changing your code.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Convex](https://img.shields.io/badge/Convex-Backend-orange.svg)](https://convex.dev/)

[Documentation](SELF_HOSTING.md) · [Report Bug](https://github.com/ardacanuckan/forprompt-oss/issues) · [Request Feature](https://github.com/ardacanuckan/forprompt-oss/issues)

</div>

---

## Why ForPrompt?

Prompts are the new code. But unlike code, they're often:

- Hardcoded in your application
- Scattered across files with no version history
- Impossible to update without redeploying
- Tested manually, one at a time

**ForPrompt fixes this.** Manage prompts like you manage code — with version control, testing, and instant deployment.

---

## Features

| Feature             | Description                                               |
| ------------------- | --------------------------------------------------------- |
| **Version Control** | Full history for every prompt. Compare, rollback, branch. |
| **Instant Updates** | Change prompts in production without code changes         |
| **A/B Testing**     | Built-in evaluation tools to compare prompt versions      |
| **SDK Integration** | TypeScript & Python SDKs with full type safety            |
| **MCP Server**      | Works with Claude Code, Cursor, Windsurf, and more        |
| **Real-time Sync**  | Changes propagate instantly across your team              |
| **Multi-tenancy**   | Organizations with role-based access control              |
| **Self-Hosted**     | Your data, your infrastructure, your control              |

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- [Convex](https://convex.dev) account (free tier available)
- [Clerk](https://clerk.com) account (free tier available)

### 1. Clone & Install

```bash
git clone https://github.com/ardacanuckan/forprompt-oss.git
cd forprompt-oss
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Clerk (https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex (auto-generated on first run)
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### 3. Start Backend

```bash
pnpm convex:dev
```

This will prompt you to create a Convex project and set up the database.

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — you're ready to go!

---

## Using the SDK

### Installation

```bash
npm install @forprompt/sdk
```

### Fetch Prompts in Your App

```typescript
import { createForPrompt } from "@forprompt/sdk";

const forprompt = createForPrompt({
  apiKey: process.env.FORPROMPT_API_KEY!,
  baseUrl: process.env.FORPROMPT_BASE_URL!, // Your Convex URL
});

// Get a prompt by key
const prompt = await forprompt.getPrompt("customer-support-agent");

// Use with your LLM
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: prompt.systemPrompt },
    { role: "user", content: userMessage },
  ],
});
```

### Sync Prompts to Local Files

```bash
npx @forprompt/sdk sync
```

This downloads all prompts to `.forprompt/` for version control with your code.

---

## MCP Integration

ForPrompt works as an MCP server for AI coding assistants.

### Claude Code

```bash
claude mcp add forprompt \
  -e FORPROMPT_API_KEY=your-api-key \
  -e FORPROMPT_BASE_URL=https://your-convex.convex.site \
  -- npx -y @forprompt/sdk mcp start
```

### Cursor / Windsurf / Other

Add to your MCP config:

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

---

## Tech Stack

| Layer        | Technology                                         |
| ------------ | -------------------------------------------------- |
| **Frontend** | Next.js 15, React 19, Tailwind CSS v4, shadcn/ui   |
| **Backend**  | Convex (serverless functions + real-time database) |
| **Auth**     | Clerk (users, organizations, RBAC)                 |
| **SDKs**     | TypeScript, Python                                 |
| **Monorepo** | Turborepo + pnpm workspaces                        |

---

## Project Structure

```
forprompt-oss/
├── apps/
│   └── forprompt/          # Next.js web dashboard
├── packages/
│   ├── sdk/                # TypeScript SDK (@forprompt/sdk)
│   ├── sdk-python/         # Python SDK
│   ├── ui/                 # Shared UI components
│   └── validators/         # Shared Zod schemas
├── convex/                 # Convex backend
│   ├── domains/            # Feature modules (DDD)
│   │   ├── prompts/        # Prompt CRUD & versioning
│   │   ├── organizations/  # Multi-tenancy
│   │   └── apiKeys/        # API key management
│   ├── http/               # HTTP API routes
│   └── schema.ts           # Database schema
└── tooling/                # Shared ESLint, Prettier, TS configs
```

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
| `pnpm ui-add`        | Add shadcn/ui components           |

---

## Deployment

### Docker

```bash
docker compose up -d
```

See [SELF_HOSTING.md](SELF_HOSTING.md) for complete deployment instructions.

### Vercel

1. Push to GitHub
2. Import to Vercel
3. Set environment variables
4. Deploy

---

## Configuration

### Environment Variables

| Variable                            | Required | Description                |
| ----------------------------------- | -------- | -------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes      | Clerk public key           |
| `CLERK_SECRET_KEY`                  | Yes      | Clerk secret key           |
| `CLERK_WEBHOOK_SECRET`              | Yes      | For Clerk webhooks         |
| `NEXT_PUBLIC_CONVEX_URL`            | Yes      | Your Convex deployment URL |
| `CONVEX_DEPLOYMENT`                 | Yes      | Convex deployment name     |
| `OPENROUTER_API_KEY`                | No       | For AI-powered features    |

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## License

This project is licensed under the **Apache License 2.0** — see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

Built with amazing open source tools:

- [Next.js](https://nextjs.org/) - React framework
- [Convex](https://convex.dev/) - Backend platform
- [Clerk](https://clerk.com/) - Authentication
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Turborepo](https://turbo.build/) - Monorepo tooling

---

<div align="center">

**[Documentation](SELF_HOSTING.md)** · **[Report Bug](https://github.com/ardacanuckan/forprompt-oss/issues)** · **[Request Feature](https://github.com/ardacanuckan/forprompt-oss/issues)**

Made with love by [Arda Uckan](https://github.com/ardacanuckan)

</div>
