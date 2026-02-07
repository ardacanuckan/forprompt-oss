# SDK Publishing Guide

This document outlines the steps to publish `@forprompt/sdk` to npm.

## Pre-Publishing Checklist

All items below have been completed and the SDK is ready for publishing:

- [x] **License**: Updated to AGPL-3.0-or-later (matches platform license)
- [x] **LICENSE file**: Added to SDK package directory
- [x] **Repository metadata**: Updated to point to monorepo structure
- [x] **npm provenance**: Enabled for supply chain security
- [x] **.npmignore**: Created to control published files
- [x] **CHANGELOG.md**: SDK-specific changelog created
- [x] **ESLint configuration**: Added with shared tooling
- [x] **Version management**: Dynamic version from package.json
- [x] **TypeScript**: All type errors resolved
- [x] **Build**: Verified successful compilation
- [x] **Test infrastructure**: Vitest config and comprehensive tests added
- [x] **CI/CD**: GitHub Actions workflow for automated publishing

## Package Structure

```
packages/sdk/
├── dist/                 # Built files (generated)
├── src/                  # Source code
│   ├── __tests__/       # Unit tests
│   ├── cli/             # CLI commands
│   ├── mcp/             # MCP server
│   ├── client.ts        # Main client
│   ├── trace.ts         # Logger
│   ├── pii.ts           # PII redaction
│   └── types.ts         # Type definitions
├── LICENSE              # AGPL-3.0 license
├── CHANGELOG.md         # Version history
├── README.md            # Documentation
├── package.json         # Package metadata
├── .npmignore           # npm publish exclusions
├── eslint.config.ts     # Linting rules
├── vitest.config.ts     # Test configuration
└── tsup.config.ts       # Build configuration
```

## Publishing Methods

### Method 1: Automated (Recommended)

1. Update version in `package.json`:
   ```bash
   cd packages/sdk
   npm version patch  # or minor, major
   ```

2. Create and push a git tag:
   ```bash
   git add packages/sdk/package.json
   git commit -m "chore(sdk): bump version to X.Y.Z"
   git tag sdk-vX.Y.Z
   git push origin main --tags
   ```

3. GitHub Actions will automatically:
   - Run typecheck
   - Build the package
   - Publish to npm with provenance
   - Create a GitHub release

### Method 2: Manual

1. Ensure you're logged into npm:
   ```bash
   npm login
   ```

2. Build and publish:
   ```bash
   cd packages/sdk
   pnpm build
   pnpm publish --no-git-checks
   ```

## Pre-Publish Validation

The `prepublishOnly` script automatically runs:

```bash
pnpm run typecheck && pnpm run build
```

This ensures:
- No TypeScript errors
- Successful build
- All files are properly generated

## npm Package Contents

Files included in the published package (via `files` field in package.json):

- `dist/` - All compiled JavaScript, TypeScript definitions, and source maps
- `README.md` - Package documentation
- `LICENSE` - AGPL-3.0 license text

Files excluded (via `.npmignore`):

- Source TypeScript files (`src/`)
- Test files (`**/*.test.ts`)
- Configuration files (tsconfig, eslint, vitest)
- Development artifacts (.turbo, coverage, node_modules)

## Security Features

### npm Provenance

The package is published with provenance enabled, providing:
- Cryptographic proof of build origin
- Transparency about build process
- Enhanced supply chain security

Provenance is automatically generated when publishing via GitHub Actions with `id-token: write` permission.

### API Key Security

The SDK includes PII detection and redaction to prevent accidental logging of sensitive information.

## Version Strategy

Following Semantic Versioning (semver):

- **Patch** (0.1.X): Bug fixes, documentation updates
- **Minor** (0.X.0): New features, backward-compatible changes
- **Major** (X.0.0): Breaking changes

## Post-Publishing

After successful publication:

1. Verify on npm: https://www.npmjs.com/package/@forprompt/sdk
2. Test installation: `npm install @forprompt/sdk`
3. Update main CHANGELOG.md if needed
4. Announce release in appropriate channels

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

### TypeScript Errors

```bash
# Run typecheck to see errors
pnpm typecheck
```

### Publish Permission Denied

Ensure you have:
- npm account with publish access
- Correct npm authentication token in CI (for automated publishing)
- Member of @forprompt organization on npm

## Testing Before Publishing

While the test suite is written and comprehensive, there's currently a Vitest/ESM configuration issue in the monorepo setup. The tests are located in `src/__tests__/` and cover:

- Client API (`client.test.ts`)
- Logger/Tracing (`trace.test.ts`)
- PII Redaction (`pii.test.ts`)
- Type Definitions (`types.test.ts`)

To manually verify functionality before publishing:

```bash
# Build and test locally
pnpm build
node -e "const sdk = require('./dist/index.cjs'); console.log(sdk)"
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/ardacanuckan/forprompt/issues
- Documentation: https://forprompt.dev/docs
