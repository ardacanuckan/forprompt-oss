# Convex Backend

This is the Convex backend for the ForPrompt application, organized using domain-driven design principles.

## Directory Structure

```
convex/
├── _generated/          # Auto-generated Convex files (do not edit)
├── lib/                 # Shared utilities and helpers
│   ├── auth/           # Authentication & authorization
│   │   ├── permissions.ts    # Permission helpers (requireAuth, requireOrgAccess, etc.)
│   │   ├── guards.ts         # Reusable guard patterns
│   │   └── middleware.ts     # Context enrichment utilities
│   ├── utils/          # Common utilities
│   │   ├── dates.ts          # Date and period utilities
│   │   ├── validators.ts     # Input validation helpers
│   │   ├── errors.ts         # Custom error classes
│   │   └── encryption.ts     # Encryption utilities for API keys
│   └── types/          # Shared TypeScript types
│       └── common.ts         # Common interfaces and types
├── domains/            # Domain-driven organization
│   ├── users/
│   │   ├── queries.ts        # User query functions
│   │   ├── mutations.ts      # User mutation functions
│   │   └── internal.ts       # Internal operations (webhooks)
│   ├── organizations/
│   │   ├── queries.ts        # Organization queries
│   │   ├── mutations.ts      # Organization mutations
│   │   ├── members.ts        # Member management
│   │   ├── settings.ts       # Organization settings
│   │   └── internal.ts       # Webhook handlers
│   ├── projects/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── promptOrchestrator/
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── models/
│   │       ├── queries.ts    # Model queries
│   │       ├── mutations.ts  # Model CRUD
│   │       ├── actions.ts    # OpenRouter API calls
│   │       ├── testing.ts    # Test result tracking
│   │       ├── generators/   # AI-powered generators
│   │       ├── builders/     # Prompt composition
│   │       ├── instructions/ # AI instruction templates
│   │       └── data/         # Data formatters
│   ├── apiKeys/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── integrations/
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── invitations/
│   │   ├── queries.ts
│   │   └── internal.ts
│   └── usage/
│       ├── queries.ts
│       └── tracking.ts
├── http/               # HTTP API routes
│   ├── routes/
│   │   ├── prompts.ts        # Prompt API endpoints
│   │   └── webhooks.ts       # Clerk webhook handlers
│   └── index.ts              # Router composition
├── schema.ts           # Database schema definition
├── auth.config.ts      # Clerk authentication config
├── sync.ts             # Manual sync utilities
└── tasks.ts            # Example tasks (can be removed)
```

## Architecture Principles

### 1. Domain-Driven Design

Each domain has its own folder with clear separation of concerns:
- `queries.ts` - Read operations
- `mutations.ts` - Write operations
- `actions.ts` - External API calls
- `internal.ts` - Internal operations (webhooks, cross-domain calls)

### 2. Shared Utilities

Common functionality is centralized in the `lib/` folder:
- **Auth**: Permission checks, guards, and middleware
- **Utils**: Date handling, validation, encryption, error handling
- **Types**: Shared TypeScript interfaces and types

### 3. HTTP Layer

HTTP routes are organized by feature in `http/routes/` and composed in `http/index.ts`.

## Usage Examples

### Importing from domains

```typescript
// Import queries
import { list } from "./domains/projects/queries";
import { getCurrentUser } from "./domains/users/queries";

// Import mutations
import { create } from "./domains/promptOrchestrator/mutations";
import { leaveOrganization } from "./domains/organizations/members";

// Import actions
import { testPrompt } from "./domains/promptOrchestrator/models/actions";
```

### Using shared utilities

```typescript
// Permission checks
import { requireOrgAccess, requireOrgAdmin } from "./lib/auth/permissions";

// Validation
import { validatePromptKey, validateEmail } from "./lib/utils/validators";

// Error handling
import { NotFoundError, ValidationError } from "./lib/utils/errors";

// Date utilities
import { getCurrentPeriod, getPeriodBounds } from "./lib/utils/dates";
```

### Accessing from frontend

The Convex client automatically generates typed accessors:

```typescript
// Queries
const projects = await convex.query(api.domains.projects.queries.list, { orgId });

// Mutations
await convex.mutation(api.domains.promptOrchestrator.mutations.create, {
  projectId,
  key: "myPrompt",
  name: "My Prompt"
});

// Actions
const result = await convex.action(api.domains.promptOrchestrator.models.actions.testPrompt, {
  versionId,
  userMessage: "Test",
  model: "anthropic/claude-3.5-sonnet"
});
```

## Key Benefits

✅ **Discoverability**: Clear where to find functionality  
✅ **Maintainability**: Smaller, focused files (50-200 lines each)  
✅ **Testability**: Isolated concerns easier to test  
✅ **Scalability**: Easy to add new domains  
✅ **Type Safety**: Shared types prevent drift  
✅ **Reusability**: Common utilities in one place  
✅ **Team Collaboration**: Reduced merge conflicts  

## Development

When adding new features:

1. Determine which domain it belongs to
2. Add queries/mutations in the appropriate domain folder
3. Use shared utilities from `lib/` when possible
4. Add new utility functions to `lib/` if they're reusable
5. Follow the established patterns for consistency

## Migration Notes

This backend was restructured from a flat file structure to domain-driven architecture. All functionality has been preserved and organized for better maintainability.

Old structure (flat):
```
convex/
├── users.ts (179 lines)
├── organizations.ts (461 lines)
├── prompts.ts (367 lines)
├── promptVersions.ts (550 lines)
└── ...
```

New structure (organized):
```
convex/
├── lib/ (shared utilities)
├── domains/ (feature-based modules)
├── http/ (API routes)
└── ...
```

File count increased from ~15 files to ~40 files, but each file is now focused and maintainable (50-150 lines each).
