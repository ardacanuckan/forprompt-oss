/**
 * PostgreSQL Schema for ForPrompt
 *
 * This schema mirrors the Convex schema and provides type-safe
 * database operations using Drizzle ORM.
 */

// ============================================================================
// User & Organization Management
// ============================================================================
export { users, type User, type NewUser } from './users';
export {
  organizations,
  type Organization,
  type NewOrganization,
} from './organizations';
export {
  organizationMembers,
  type OrganizationMember,
  type NewOrganizationMember,
} from './organization-members';
export {
  organizationApiKeys,
  type OrganizationApiKey,
  type NewOrganizationApiKey,
} from './organization-api-keys';
export {
  organizationInvitations,
  type OrganizationInvitation,
  type NewOrganizationInvitation,
} from './organization-invitations';

// ============================================================================
// Projects
// ============================================================================
export { projects, type Project, type NewProject } from './projects';
export {
  projectApiKeys,
  type ProjectApiKey,
  type NewProjectApiKey,
} from './project-api-keys';

// ============================================================================
// Prompt Versioning System
// ============================================================================
export { prompts, type Prompt, type NewPrompt } from './prompts';
export {
  promptVersions,
  type PromptVersion,
  type NewPromptVersion,
} from './prompt-versions';
export {
  promptTestResults,
  type PromptTestResult,
  type NewPromptTestResult,
} from './prompt-test-results';
export {
  promptAnalysisResults,
  type PromptAnalysisResult,
  type NewPromptAnalysisResult,
  type AlignmentCheck,
  type ToolUsageAnalysis,
} from './prompt-analysis-results';

// ============================================================================
// Tool Management System
// ============================================================================
export {
  organizationTools,
  type OrganizationTool,
  type NewOrganizationTool,
} from './organization-tools';
export {
  promptTools,
  type PromptTool,
  type NewPromptTool,
} from './prompt-tools';

// ============================================================================
// Webhook System
// ============================================================================
export {
  webhookSubscriptions,
  type WebhookSubscription,
  type NewWebhookSubscription,
} from './webhook-subscriptions';

// ============================================================================
// Conversation Logging System (Trace/Span Model)
// ============================================================================
export { traces, type Trace, type NewTrace } from './traces';
export { spans, type Span, type NewSpan } from './spans';

// ============================================================================
// Conversation Success Reports System
// ============================================================================
export {
  conversationReports,
  type ConversationReport,
  type NewConversationReport,
} from './conversation-reports';
export {
  batchReports,
  type BatchReport,
  type NewBatchReport,
} from './batch-reports';
export {
  versionSuccessReports,
  type VersionSuccessReport,
  type NewVersionSuccessReport,
} from './version-success-reports';

// ============================================================================
// Relations (for Drizzle query builder)
// ============================================================================
export * from './relations';
