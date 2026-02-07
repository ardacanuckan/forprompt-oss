# syntax=docker/dockerfile:1

# ForPrompt Next.js Dockerfile
# Multi-stage build optimized for pnpm monorepo

# =============================================================================
# Stage 1: Base - Set up Node.js and pnpm
# =============================================================================
FROM node:22.21.0-alpine AS base

# Install pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

WORKDIR /app

# =============================================================================
# Stage 2: Dependencies - Install all dependencies
# =============================================================================
FROM base AS deps

# Copy workspace configuration files (for layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all package.json files to establish workspace structure
COPY apps/nextjs/package.json ./apps/nextjs/
COPY packages/ui/package.json ./packages/ui/
COPY packages/validators/package.json ./packages/validators/
COPY tooling/tailwind/package.json ./tooling/tailwind/
COPY tooling/typescript/package.json ./tooling/typescript/
COPY tooling/eslint/package.json ./tooling/eslint/
COPY tooling/prettier/package.json ./tooling/prettier/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy workspace package source files (needed for Next.js transpilation)
COPY packages/ ./packages/
COPY tooling/ ./tooling/

# =============================================================================
# Stage 3: Builder - Build the Next.js application
# =============================================================================
FROM deps AS builder

# Copy Next.js app source
COPY apps/nextjs/ ./apps/nextjs/

# Build-time environment variables (NEXT_PUBLIC_* are baked into the bundle)
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CONVEX_URL

ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL}

# Skip env validation during Docker build
ENV CI=true
ENV SKIP_ENV_VALIDATION=true

# Build the application
WORKDIR /app/apps/nextjs
RUN pnpm build

# =============================================================================
# Stage 4: Runner - Production image
# =============================================================================
FROM node:22.21.0-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/apps/nextjs/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/nextjs/.next/static ./apps/nextjs/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/nextjs/public ./apps/nextjs/public

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "apps/nextjs/server.js"]

# =============================================================================
# Stage 5: Development - For docker-compose dev mode with hot reload
# =============================================================================
FROM deps AS development

WORKDIR /app

# Copy all source (will be overridden by volume mounts in docker-compose)
COPY . .

# Set development environment
ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Start development server
CMD ["pnpm", "--filter", "@forprompt/nextjs", "dev"]
