# Self-Hosting ForPrompt

This guide walks you through deploying ForPrompt on your own infrastructure.

## Deployment Options

ForPrompt supports two deployment modes:

| Mode                | Database               | Best For                                                                |
| ------------------- | ---------------------- | ----------------------------------------------------------------------- |
| **Convex Mode**     | Convex Cloud           | Quick setup, real-time sync, managed infrastructure                     |
| **PostgreSQL Mode** | Self-hosted PostgreSQL | Full control, air-gapped environments, existing Postgres infrastructure |

---

## Option A: Convex Mode (Managed Backend)

Uses Convex's managed serverless platform for database and backend functions.

### Prerequisites

- Node.js 22+
- pnpm 10+
- [Convex](https://convex.dev) account (free tier available)
- [Clerk](https://clerk.com) account (free tier available)
- (Optional) [OpenRouter](https://openrouter.ai) API key for AI features

### Step 1: Clone and Install

```bash
git clone https://github.com/ardacanuckan/forprompt-oss.git
cd forprompt-oss
pnpm install
```

### Step 2: Set Up Convex

1. Create a new project at [dashboard.convex.dev](https://dashboard.convex.dev)

2. Install Convex CLI and login:

   ```bash
   npx convex login
   ```

3. Link your project:

   ```bash
   npx convex init
   ```

   Select your newly created project.

4. Note your deployment URL (e.g., `https://your-project.convex.cloud`)

### Step 3: Set Up Clerk

1. Create a new application at [dashboard.clerk.com](https://dashboard.clerk.com)

2. Enable **Organizations** in Clerk settings (required for multi-tenancy)

3. Get your API keys from the Clerk dashboard:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

4. Set up webhooks:
   - Go to **Webhooks** in Clerk dashboard
   - Add endpoint: `https://your-convex-url.convex.site/clerk-webhook`
   - Select events: `user.created`, `user.updated`, `user.deleted`, `organization.created`, `organization.updated`, `organization.deleted`, `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`
   - Copy the webhook signing secret (`CLERK_WEBHOOK_SECRET`)

### Step 4: Configure Environment

```bash
cp .env.example .env
```

Fill in your values:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Convex Backend
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Optional: AI Features (see AI Providers section below)
OPENROUTER_API_KEY=sk-or-...
```

### Step 5: Deploy and Run

```bash
# Deploy backend
pnpm convex:deploy

# Start development server
pnpm dev
```

Visit `http://localhost:3000`

---

## Option B: PostgreSQL Mode (Full Self-Hosted)

Uses your own PostgreSQL database with Drizzle ORM. Full control, no external dependencies for data storage.

### Prerequisites

- Node.js 22+
- pnpm 10+
- PostgreSQL 14+ (or use Docker)
- [Clerk](https://clerk.com) account (free tier available)
- (Optional) AI provider API key

### Step 1: Clone and Install

```bash
git clone https://github.com/ardacanuckan/forprompt-oss.git
cd forprompt-oss
pnpm install
```

### Step 2: Set Up PostgreSQL

**Option A: Docker (Recommended)**

```bash
docker run -d \
  --name forprompt-db \
  -e POSTGRES_USER=forprompt \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=forprompt \
  -p 5432:5432 \
  -v forprompt_data:/var/lib/postgresql/data \
  postgres:16-alpine
```

**Option B: Existing PostgreSQL**

Create a database:

```sql
CREATE DATABASE forprompt;
CREATE USER forprompt WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE forprompt TO forprompt;
```

### Step 3: Run Database Migrations

```bash
# Set your database URL
export DATABASE_URL="postgresql://forprompt:your_secure_password@localhost:5432/forprompt"

# Generate and run migrations
cd packages/providers
pnpm db:generate
pnpm db:migrate
```

### Step 4: Set Up Clerk

Follow the same Clerk setup as Option A (Step 3).

### Step 5: Configure Environment

```bash
cp .env.example .env
```

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://forprompt:your_secure_password@localhost:5432/forprompt
DATA_PROVIDER=postgresql  # Switch from Convex to PostgreSQL

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Optional: AI Features
OPENROUTER_API_KEY=sk-or-...
# Or use local AI (see AI Providers section)
OLLAMA_BASE_URL=http://localhost:11434
```

### Step 6: Run

```bash
pnpm dev
```

### Database Management

```bash
cd packages/providers

# Open Drizzle Studio (GUI for your database)
pnpm db:studio

# Push schema changes directly (development)
pnpm db:push

# Generate migration files (production)
pnpm db:generate
pnpm db:migrate
```

---

## AI Providers

ForPrompt supports multiple AI providers for prompt analysis, testing, and editing features.

### Provider Options

| Provider       | Type  | Best For                                           |
| -------------- | ----- | -------------------------------------------------- |
| **OpenRouter** | Cloud | Access to 100+ models (GPT-4, Claude, Llama, etc.) |
| **OpenAI**     | Cloud | Direct OpenAI API access                           |
| **Anthropic**  | Cloud | Direct Claude API access                           |
| **Ollama**     | Local | Air-gapped environments, no API costs              |

### OpenRouter (Recommended)

Access to 100+ models through a single API key.

```env
OPENROUTER_API_KEY=sk-or-v1-...
AI_PROVIDER=openrouter
```

### OpenAI

```env
OPENAI_API_KEY=sk-...
AI_PROVIDER=openai
```

### Anthropic

```env
ANTHROPIC_API_KEY=sk-ant-...
AI_PROVIDER=anthropic
```

### Ollama (Local AI)

Run AI models locally without any cloud dependencies.

1. Install Ollama: https://ollama.ai

2. Pull a model:

   ```bash
   ollama pull llama3.1
   ollama pull codellama  # For code-related tasks
   ```

3. Configure environment:
   ```env
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.1
   AI_PROVIDER=ollama
   ```

### Disabling AI Features

AI features are optional. If no AI provider is configured, these features will be disabled:

- Prompt analysis (clarity scoring, suggestions)
- AI-powered prompt editing
- Test generation

Core features (version control, logging, team collaboration) work without AI.

---

## Docker Deployment

### Using Docker Compose (PostgreSQL Mode)

```bash
# Copy environment file
cp .env.example .env
# Edit .env with your values

# Start all services
docker compose -f docker-compose.postgres.yml up -d
```

### Using Docker Compose (Convex Mode)

```bash
docker compose up -d
```

### Building Custom Image

```bash
docker build -t forprompt -f apps/forprompt/Dockerfile .
docker run -p 3000:3000 --env-file .env forprompt
```

---

## Production Deployment

### Vercel (Convex Mode)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Kubernetes

See `deploy/kubernetes/` for Helm charts and manifests (coming soon).

### Node.js

```bash
pnpm build
cd apps/forprompt
NODE_ENV=production pnpm start
```

---

## SDK Configuration

Configure the SDK to point to your self-hosted instance:

```bash
# In your application's .env
FORPROMPT_API_KEY=fp_your_api_key
FORPROMPT_BASE_URL=https://your-domain.com/api
```

```typescript
import { createForPrompt } from "@forprompt/sdk";

const client = createForPrompt({
  apiKey: process.env.FORPROMPT_API_KEY!,
  baseUrl: process.env.FORPROMPT_BASE_URL!,
});
```

---

## Database Schema

The PostgreSQL schema includes 21 tables organized by domain:

### Core Tables

| Table                  | Description                       |
| ---------------------- | --------------------------------- |
| `users`                | User accounts (synced from Clerk) |
| `organizations`        | Team workspaces                   |
| `organization_members` | User-org relationships            |
| `projects`             | Projects within organizations     |
| `prompts`              | Prompt definitions with metadata  |
| `prompt_versions`      | Version history for prompts       |

### Logging & Analytics

| Table                  | Description                     |
| ---------------------- | ------------------------------- |
| `traces`               | Conversation sessions           |
| `spans`                | Individual events within traces |
| `conversation_reports` | AI-generated success reports    |

### Tools & Integration

| Table                   | Description              |
| ----------------------- | ------------------------ |
| `organization_tools`    | Tool library             |
| `prompt_tools`          | Prompt-tool associations |
| `webhook_subscriptions` | Webhook endpoints        |

See `packages/providers/src/data/drizzle/schema/` for complete schema definitions.

---

## Updating

```bash
git pull origin main
pnpm install

# If using PostgreSQL
cd packages/providers
pnpm db:generate
pnpm db:migrate
cd ../..

# If using Convex
pnpm convex:deploy

# Rebuild and restart
pnpm build
```

---

## Troubleshooting

### PostgreSQL connection fails

1. Verify PostgreSQL is running:

   ```bash
   docker ps  # If using Docker
   pg_isready -h localhost -p 5432
   ```

2. Check connection string format:

   ```
   postgresql://user:password@host:port/database
   ```

3. Verify network access (firewall, Docker networking)

### Migrations fail

1. Check database permissions
2. Run with verbose logging:
   ```bash
   cd packages/providers
   DATABASE_URL="..." pnpm db:push --verbose
   ```

### Clerk webhooks not working

1. Verify the webhook URL matches your deployment
2. Check the webhook signing secret matches
3. Ensure all required events are selected
4. Check server logs for webhook errors

### Ollama not responding

1. Verify Ollama is running:

   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Check the model is pulled:
   ```bash
   ollama list
   ```

### SDK can't connect

1. Verify `FORPROMPT_BASE_URL` is set correctly
2. Check CORS settings if cross-origin
3. Verify API key is valid

---

## Security Recommendations

### Production Checklist

- [ ] Use strong, unique passwords for PostgreSQL
- [ ] Enable SSL/TLS for database connections
- [ ] Use HTTPS for all endpoints
- [ ] Set up proper firewall rules
- [ ] Enable audit logging
- [ ] Regular database backups
- [ ] Keep dependencies updated

### API Key Management

- Rotate API keys periodically
- Use separate keys for different environments
- Never commit keys to version control
- Use secrets management (Vault, AWS Secrets Manager, etc.)

---

## Support

- [GitHub Issues](https://github.com/ardacanuckan/forprompt-oss/issues)
- [Contributing Guide](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
