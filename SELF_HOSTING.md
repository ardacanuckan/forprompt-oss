# Self-Hosting ForPrompt

This guide walks you through deploying ForPrompt on your own infrastructure.

## Architecture Overview

ForPrompt consists of:

- **Frontend**: Next.js 15 web application
- **Backend**: Convex serverless functions + real-time database
- **Auth**: Clerk for authentication and multi-tenancy

## Prerequisites

- Node.js 22+
- pnpm 10+
- A [Convex](https://convex.dev) account (free tier available)
- A [Clerk](https://clerk.com) account (free tier available)
- (Optional) [OpenRouter](https://openrouter.ai) API key for AI features

## Step 1: Clone and Install

```bash
git clone https://github.com/ardacanuckan/forprompt-oss.git
cd forprompt-oss
pnpm install
```

## Step 2: Set Up Convex

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

## Step 3: Set Up Clerk

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

## Step 4: Configure Environment

Create `.env` file in the root:

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

# Optional: AI Features
OPENROUTER_API_KEY=sk-or-...
```

## Step 5: Deploy Backend

Deploy Convex functions:

```bash
pnpm convex:deploy
```

This pushes all backend functions to your Convex deployment.

## Step 6: Run Locally

Start the development server:

```bash
pnpm dev
```

Visit `http://localhost:3000`

## Step 7: Deploy Frontend

### Option A: Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Option B: Docker

```bash
docker build -t forprompt -f apps/forprompt/Dockerfile .
docker run -p 3000:3000 --env-file .env forprompt
```

### Option C: Node.js

```bash
pnpm build
cd apps/forprompt
pnpm start
```

## SDK Configuration

When using the ForPrompt SDK with your self-hosted instance, set the base URL:

```bash
# In your application's .env
FORPROMPT_API_KEY=fp_your_api_key
FORPROMPT_BASE_URL=https://your-convex-url.convex.site
```

```typescript
import { createForPrompt } from "@forprompt/sdk";

const client = createForPrompt({
  apiKey: process.env.FORPROMPT_API_KEY!,
  baseUrl: process.env.FORPROMPT_BASE_URL!,
});
```

## Updating

To update your self-hosted instance:

```bash
git pull origin main
pnpm install
pnpm convex:deploy
pnpm build
# Restart your frontend
```

## Troubleshooting

### Clerk webhooks not working

1. Verify the webhook URL is correct: `https://your-convex.convex.site/clerk-webhook`
2. Check the webhook signing secret matches
3. Ensure all required events are selected

### Convex deployment fails

1. Run `npx convex login` to re-authenticate
2. Check `convex/schema.ts` for any syntax errors
3. Run `npx convex dev` locally to see detailed errors

### SDK can't connect

1. Verify `FORPROMPT_BASE_URL` is set correctly
2. Ensure it points to your Convex site URL (ends in `.convex.site`)
3. Check your API key is valid

## Support

- [GitHub Issues](https://github.com/ardacanuckan/forprompt-oss/issues)
- [Documentation](https://forprompt.dev/docs)
