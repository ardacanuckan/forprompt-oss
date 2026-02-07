# Contributing to ForPrompt

Thank you for considering contributing to ForPrompt! We welcome all contributions.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- [Convex](https://convex.dev) account (free tier works)
- [Clerk](https://clerk.com) account (free tier works)

### Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/forprompt-oss.git
cd forprompt-oss

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your Convex and Clerk credentials

# Start Convex
pnpm convex:dev

# Start development server
pnpm dev
```

## Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Make** your changes
4. **Test** your changes: `pnpm typecheck && pnpm lint`
5. **Commit** with a descriptive message
6. **Push** to your fork: `git push origin feature/my-feature`
7. **Open** a Pull Request

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix a bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add or update tests
chore: maintenance tasks
```

## Code Style

- We use ESLint and Prettier for code formatting
- Run `pnpm lint` before committing
- Run `pnpm typecheck` to ensure type safety

## Project Structure

```
forprompt-oss/
├── apps/forprompt/     # Next.js web dashboard
├── packages/sdk/       # TypeScript SDK
├── packages/ui/        # Shared UI components
├── convex/             # Convex backend
└── tooling/            # Shared configs
```

## Need Help?

- Open an [issue](https://github.com/ardacanuckan/forprompt-oss/issues)
- Start a [discussion](https://github.com/ardacanuckan/forprompt-oss/discussions)

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
