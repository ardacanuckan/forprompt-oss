# Changelog

All notable changes to the ForPrompt SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Updated license from MIT to AGPL-3.0-or-later to match platform license
- Added npm provenance support for enhanced security
- Improved repository metadata to reflect monorepo structure

### Added
- Comprehensive test suite with Vitest
- ESLint configuration for code quality
- Pre-publish validation (lint, typecheck, test, build)
- Dynamic version management from package.json

## [0.1.0] - 2025-01-18

### Added
- Initial release of ForPrompt SDK
- **Client API**
  - `getPrompt()` - Fetch prompts by key with retry and timeout support
  - `getPrompts()` - Batch fetch multiple prompts
  - Auto-configuration from environment variables
  - Custom client instances with `createForPrompt()`

- **CLI Commands**
  - `forprompt init` - Initialize project with API key
  - `forprompt deploy` - Sync prompts to local files
  - `forprompt mcp` - MCP server management

- **MCP (Model Context Protocol) Server**
  - Tools: `forprompt_get_prompt`, `forprompt_list_prompts`, `forprompt_search_prompts`
  - Resources: Access prompts via `forprompt://` URIs
  - Support for Claude Desktop, Cursor, Continue.dev, Windsurf, VS Code

- **Logging & Tracing**
  - `logger.startTrace()` - Multi-turn conversation tracking
  - `logger.log()` - Log individual messages
  - `logger.logRequest()` - Single request/response logging
  - Automatic trace/span model for analytics

- **Security Features**
  - PII detection and redaction
  - API key validation
  - Retry with exponential backoff
  - Request timeout handling

- **Local File Sync**
  - TypeScript file generation
  - Version history tracking
  - Metadata preservation
  - Webhook support (planned)

### Infrastructure
- TypeScript SDK with full type definitions
- ESM and CommonJS dual package support
- CLI with shebang for direct execution
- Comprehensive README documentation

---

## Version History

- **0.1.0** - Initial release with core SDK functionality

[Unreleased]: https://github.com/ardacanuckan/forprompt/compare/sdk-v0.1.0...HEAD
[0.1.0]: https://github.com/ardacanuckan/forprompt/releases/tag/sdk-v0.1.0
