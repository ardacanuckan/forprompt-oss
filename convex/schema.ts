import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================================================
  // User & Organization Management (synced from Clerk)
  // ============================================================================

  // Users table - synced from Clerk via webhooks
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    onboardingCompleted: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Organizations table - synced from Clerk via webhooks
  organizations: defineTable({
    clerkId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_slug", ["slug"]),

  // Organization memberships - tracks which users belong to which orgs
  organizationMembers: defineTable({
    orgId: v.id("organizations"),
    userId: v.id("users"),
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    role: v.string(), // "org:admin" | "org:member"
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_clerk_ids", ["clerkOrgId", "clerkUserId"]),

  // ============================================================================
  // Projects (belong to Organizations)
  // ============================================================================

  projects: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_slug", ["orgId", "slug"]),

  // Project API Keys - authentication keys for each project
  projectApiKeys: defineTable({
    projectId: v.id("projects"),
    keyValue: v.string(), // Encrypted API key (AES-256-GCM)
    keyHash: v.optional(v.string()), // SHA-256 hash for O(1) lookup
    keyPrefix: v.optional(v.string()), // First 8 chars (e.g., "fp_proj_") for indexing
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_project", ["projectId"])
    .index("by_prefix_hash", ["keyPrefix", "keyHash"]), // O(1) lookup index

  // ============================================================================
  // Prompt Versioning System
  // ============================================================================

  // Prompts - named prompt identifiers (e.g., "userContextGeneration", "chatDefault")
  prompts: defineTable({
    projectId: v.id("projects"),
    key: v.string(), // Unique identifier like "userContextGeneration"
    name: v.string(), // Display name
    description: v.optional(v.string()),
    activeVersionId: v.optional(v.id("promptVersions")), // Currently active version
    // Prompt Information fields
    purpose: v.optional(v.string()), // Primary goal of the prompt
    expectedBehavior: v.optional(v.string()), // How the prompt should behave
    inputFormat: v.optional(v.string()), // Expected input structure
    outputFormat: v.optional(v.string()), // Expected output structure
    constraints: v.optional(v.string()), // Limitations and rules
    useCases: v.optional(v.string()), // Primary use cases
    additionalNotes: v.optional(v.string()), // Free-form documentation
    toolsNotes: v.optional(v.string()), // Additional notes about tool usage strategy
    referencePrompt: v.optional(v.string()), // Original/reference prompt for manual configuration
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_key", ["projectId", "key"]),

  // Prompt Versions - individual versions of a prompt (v1, v2, v3...)
  promptVersions: defineTable({
    promptId: v.id("prompts"),
    versionNumber: v.number(), // Auto-incrementing per prompt (1, 2, 3...)
    systemPrompt: v.string(),
    description: v.optional(v.string()), // Changelog/notes for this version
    // Statistics
    testCount: v.optional(v.number()),
    avgTokens: v.optional(v.number()),
    avgResponseTime: v.optional(v.number()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_prompt", ["promptId"])
    .index("by_prompt_version", ["promptId", "versionNumber"]),

  // Test results for tracking prompt performance
  promptTestResults: defineTable({
    versionId: v.id("promptVersions"),
    model: v.string(),
    userMessage: v.string(),
    response: v.string(),
    tokens: v.number(),
    responseTime: v.number(),
    createdAt: v.number(),
  }).index("by_version", ["versionId"]),

  // AI Analysis results - stores AI-generated analysis for prompt versions
  promptAnalysisResults: defineTable({
    versionId: v.id("promptVersions"),
    clarityScore: v.number(),
    improvements: v.array(v.string()),
    edgeCases: v.array(v.string()),
    optimizations: v.array(v.string()),
    overallAssessment: v.string(),
    // Alignment check (optional)
    alignmentCheck: v.optional(
      v.object({
        purposeAlignment: v.object({
          score: v.number(),
          feedback: v.string(),
        }),
        behaviorAlignment: v.object({
          score: v.number(),
          feedback: v.string(),
        }),
        constraintsAlignment: v.object({
          score: v.number(),
          feedback: v.string(),
        }),
      }),
    ),
    // Tool usage analysis (optional)
    toolUsageAnalysis: v.optional(
      v.object({
        tools: v.array(
          v.object({
            name: v.string(),
            isProperlyInstructed: v.boolean(),
            issues: v.array(v.string()),
            suggestions: v.array(v.string()),
          }),
        ),
        overallToolUsage: v.string(),
      }),
    ),
    createdAt: v.number(),
  })
    .index("by_version", ["versionId"])
    .index("by_version_created", ["versionId", "createdAt"]),

  // ============================================================================
  // Tool Management System
  // ============================================================================

  // Organization Tools - reusable tool definitions for AI agents
  organizationTools: defineTable({
    orgId: v.id("organizations"),
    name: v.string(), // Tool name (e.g., "searchDatabase", "sendEmail")
    description: v.string(), // What the tool does
    parameters: v.string(), // JSON schema of parameters
    category: v.optional(v.string()), // Tool category (e.g., "database", "api", "utility", "file")
    exampleUsage: v.optional(v.string()), // Example of how to use the tool
    createdBy: v.id("users"), // User who created the tool
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_category", ["orgId", "category"])
    .index("by_name", ["orgId", "name"]),

  // Prompt Tools - many-to-many relationship between prompts and tools
  promptTools: defineTable({
    promptId: v.id("prompts"),
    toolId: v.id("organizationTools"),
    isRequired: v.boolean(), // Whether tool is required or optional
    usageNotes: v.optional(v.string()), // How this specific prompt uses this tool
    createdAt: v.number(),
  })
    .index("by_prompt", ["promptId"])
    .index("by_tool", ["toolId"])
    .index("by_prompt_tool", ["promptId", "toolId"]),

  // ============================================================================
  // Organization Management
  // ============================================================================

  // Organization API keys - stores encrypted API keys per org
  organizationApiKeys: defineTable({
    orgId: v.id("organizations"),
    name: v.string(), // User-friendly name for the key
    service: v.string(), // "openrouter", "anthropic", "openai", "custom"
    keyValue: v.string(), // Encrypted API key
    lastUsedAt: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.id("users"), // User who created the key
  })
    .index("by_org", ["orgId"])
    .index("by_service", ["orgId", "service"]),

  // Organization invitations - tracks pending invitations
  organizationInvitations: defineTable({
    orgId: v.id("organizations"),
    clerkInvitationId: v.string(), // Clerk's invitation ID
    email: v.string(),
    role: v.string(), // "org:admin" | "org:member"
    status: v.string(), // "pending" | "accepted" | "revoked"
    invitedBy: v.id("users"), // User who sent the invitation
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_org", ["orgId"])
    .index("by_email", ["email"])
    .index("by_clerk_id", ["clerkInvitationId"])
    .index("by_status", ["orgId", "status"]),

  // ============================================================================
  // Webhook System for Prompt Synchronization
  // ============================================================================

  // Webhook subscriptions - tracks registered webhook endpoints
  webhookSubscriptions: defineTable({
    projectId: v.id("projects"),
    endpointUrl: v.string(), // Client webhook endpoint URL
    secret: v.string(), // HMAC signing secret for verification
    events: v.array(v.string()), // ["prompt.created", "prompt.updated", "prompt.version.activated"]
    isActive: v.boolean(),
    lastDeliveryAt: v.optional(v.number()),
    failureCount: v.number(), // Track consecutive failures
    metadata: v.optional(v.string()), // JSON: client info, format preferences
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_active", ["projectId", "isActive"]),

  // ============================================================================
  // Subscription & Usage Management
  // ============================================================================

  // Organization subscriptions - stores subscription tier per organization
  // OSS: All organizations get enterprise tier by default
  organizationSubscriptions: defineTable({
    orgId: v.id("organizations"),
    tier: v.string(), // Always "enterprise" in OSS
    // Billing period
    periodStart: v.number(),
    periodEnd: v.optional(v.number()),
    status: v.string(), // "active"
    cancelAtPeriodEnd: v.boolean(),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),

  // Organization usage tracking - aggregated per billing period
  organizationUsage: defineTable({
    orgId: v.id("organizations"),
    periodStart: v.number(), // Start of billing period
    periodEnd: v.number(), // End of billing period
    // AI Token usage (from ForPrompt's internal AI features)
    internalAiTokens: v.number(), // analyzePrompt, generatePrompt, enhanceField, editPrompt, etc.
    // Production usage (from SDK logging)
    productionTokens: v.number(), // inputTokens + outputTokens from spans
    traces: v.number(), // Number of traces logged
    spans: v.number(), // Number of spans logged
    // Additional metrics
    promptTests: v.number(), // Number of prompt tests run
    analysisRuns: v.number(), // Number of AI analysis runs
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_period", ["orgId", "periodStart"]),

  // AI Usage logs - granular tracking for internal AI operations
  aiUsageLogs: defineTable({
    orgId: v.id("organizations"),
    projectId: v.optional(v.id("projects")),
    userId: v.optional(v.id("users")), // Who triggered the operation
    operation: v.string(), // "analyzePrompt" | "generatePrompt" | "enhanceField" | "editPrompt" | "testPrompt" | "analyzeConversation" | ...
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    model: v.string(),
    // Context
    promptId: v.optional(v.id("prompts")),
    versionId: v.optional(v.id("promptVersions")),
    traceId: v.optional(v.string()),
    // Timestamp
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_created", ["orgId", "createdAt"])
    .index("by_project", ["projectId"]),

  // ============================================================================
  // Rate Limiting System
  // ============================================================================

  // Rate limit buckets - token bucket algorithm for API rate limiting
  rateLimitBuckets: defineTable({
    key: v.string(), // Format: "type:identifier" (e.g., "verify:api_key_hash" or "fetch:ip_address")
    tokens: v.number(), // Current available tokens
    lastRefill: v.number(), // Timestamp of last refill
  }).index("by_key", ["key"]),

  // ============================================================================
  // Conversation Logging System (Trace/Span Model)
  // ============================================================================

  // Traces - represent full conversations/executions
  traces: defineTable({
    projectId: v.id("projects"),
    traceId: v.string(), // Client-generated UUID
    promptKey: v.string(), // "onboardingprompt", "chatprompt"
    versionNumber: v.optional(v.number()), // Prompt version at time of trace
    model: v.optional(v.string()), // "gpt-4o", "claude-3-opus"
    source: v.string(), // "test-app", "mobile-app", "sdk"
    status: v.string(), // "active", "completed"
    spanCount: v.number(), // Number of spans in this trace
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_trace_id", ["traceId"])
    .index("by_project", ["projectId"])
    .index("by_project_prompt", ["projectId", "promptKey"])
    .index("by_project_prompt_version", [
      "projectId",
      "promptKey",
      "versionNumber",
    ])
    .index("by_created", ["createdAt"]),

  // Spans - individual events within a trace (messages, LLM calls, tool calls)
  spans: defineTable({
    traceId: v.string(), // Links to parent trace
    projectId: v.id("projects"),
    versionNumber: v.optional(v.number()), // Denormalized for query efficiency
    type: v.string(), // "message", "llm_call", "tool_call"
    // Message fields
    role: v.optional(v.string()), // "user", "assistant", "system"
    content: v.optional(v.string()),
    // LLM metadata
    model: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    // Additional metadata
    metadata: v.optional(v.string()), // JSON string for flexible data
    createdAt: v.number(),
  })
    .index("by_trace", ["traceId"])
    .index("by_project", ["projectId"])
    .index("by_trace_created", ["traceId", "createdAt"]),

  // ============================================================================
  // Conversation Success Reports System
  // ============================================================================

  // Conversation Reports - AI-generated analysis for individual conversations
  conversationReports: defineTable({
    traceId: v.string(), // Links to trace
    projectId: v.id("projects"),
    promptKey: v.string(), // "onboardingprompt", "chatprompt"
    versionNumber: v.optional(v.number()), // Prompt version at time of conversation
    // Report data
    successScore: v.number(), // 1-10 score
    outcome: v.string(), // "success", "partial", "failed"
    criticalPoints: v.array(v.string()), // 3-4 key observations
    issues: v.array(v.string()), // Problems identified
    summary: v.string(), // Brief summary
    createdAt: v.number(),
  })
    .index("by_trace", ["traceId"])
    .index("by_project", ["projectId"]),

  // Batch Reports - Summary of every 10 conversations
  batchReports: defineTable({
    projectId: v.id("projects"),
    promptKey: v.string(),
    versionNumber: v.optional(v.number()),
    batchNumber: v.number(), // 1, 2, 3... (sequential)
    // Batch metadata
    conversationCount: v.number(), // Should be ~10
    traceIds: v.array(v.string()), // References to conversations in this batch
    // Report data
    averageScore: v.number(),
    commonPatterns: v.array(v.string()),
    frequentIssues: v.array(v.string()),
    recommendations: v.array(v.string()),
    summary: v.string(),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // Version Success Reports - Aggregated report per prompt version
  versionSuccessReports: defineTable({
    projectId: v.id("projects"),
    promptKey: v.string(),
    versionNumber: v.optional(v.number()),
    // Aggregate statistics
    totalAnalyzed: v.number(),
    overallSuccessRate: v.number(), // Percentage
    averageScore: v.number(),
    totalBatches: v.number(),
    // Report data
    keyInsights: v.array(v.string()),
    improvementSuggestions: v.array(v.string()),
    strengthsIdentified: v.array(v.string()),
    weaknessesIdentified: v.array(v.string()),
    summary: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  // ============================================================================
  // Understand - AI Policy Enforcement System
  // ============================================================================

  understandPolicies: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    version: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_active", ["orgId", "isActive"]),

  understandRules: defineTable({
    policyId: v.id("understandPolicies"),
    orgId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(), // "regex" | "semantic" | "ast"
    severity: v.string(), // "error" | "warning" | "info"
    pattern: v.string(),
    filePatterns: v.array(v.string()),
    excludePatterns: v.optional(v.array(v.string())),
    message: v.string(),
    suggestion: v.optional(v.string()),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_policy", ["policyId"])
    .index("by_org", ["orgId"])
    .index("by_org_enabled", ["orgId", "enabled"]),

  understandViolations: defineTable({
    orgId: v.id("organizations"),
    projectId: v.optional(v.id("projects")),
    ruleId: v.id("understandRules"),
    ruleName: v.string(), // Denormalized for display
    file: v.string(),
    line: v.number(),
    column: v.optional(v.number()),
    codeSnippet: v.optional(v.string()),
    message: v.string(),
    severity: v.string(),
    status: v.string(), // "flagged" | "fixed" | "approved" | "ignored"
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    approvalReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_org_severity", ["orgId", "severity"])
    .index("by_rule", ["ruleId"])
    .index("by_org_created", ["orgId", "createdAt"]),

  understandMemory: defineTable({
    orgId: v.id("organizations"),
    type: v.string(), // "pattern" | "exception" | "preference" | "knowledge"
    key: v.string(),
    content: v.string(),
    context: v.optional(v.string()), // JSON metadata
    source: v.string(), // "cli" | "web" | "auto-learned"
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_type", ["orgId", "type"])
    .index("by_org_key", ["orgId", "type", "key"]),

  understandAnalytics: defineTable({
    orgId: v.id("organizations"),
    date: v.string(), // "2024-01-15" - daily aggregation
    complianceScore: v.number(), // 0-100
    totalViolations: v.number(),
    newViolations: v.number(),
    fixedViolations: v.number(),
    byRule: v.string(), // JSON: { ruleId: count }
    bySeverity: v.string(), // JSON: { error: 5, warning: 12 }
    topFiles: v.optional(v.string()), // JSON: { file: count }
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_date", ["orgId", "date"]),
});
