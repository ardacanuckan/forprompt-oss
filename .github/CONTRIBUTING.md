# Contributing to ForPrompt

First off, thank you for considering contributing to ForPrompt! It's people like you that make ForPrompt such a great tool.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible using our bug report template.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Create an issue and provide the following information:

- **Use a clear and descriptive title** for the issue
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to most ForPrompt users

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- [Convex](https://convex.dev) account
- [Clerk](https://clerk.com) account

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/forprompt-oss.git
cd forprompt-oss

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Start Convex backend
pnpm convex:dev

# Start development server
pnpm dev
```

### Project Structure

```
forprompt-oss/
├── apps/forprompt/     # Next.js web dashboard
├── packages/sdk/       # TypeScript SDK
├── packages/ui/        # Shared UI components
├── convex/             # Convex backend
└── tooling/            # Shared configs
```

### Code Style

We use ESLint and Prettier for code formatting. Run before committing:

```bash
pnpm lint
pnpm format
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` formatting, missing semicolons, etc.
- `refactor:` code change that neither fixes a bug nor adds a feature
- `test:` adding missing tests
- `chore:` updating build tasks, package manager configs, etc.

### Testing

```bash
# Run all tests
pnpm test

# Run type checking
pnpm typecheck

# Run linting
pnpm lint
```

## Community

- [GitHub Issues](https://github.com/ardacanuckan/forprompt-oss/issues) - Bug reports and feature requests
- [GitHub Discussions](https://github.com/ardacanuckan/forprompt-oss/discussions) - Questions and community discussions

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
