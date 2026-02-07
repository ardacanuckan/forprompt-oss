/**
 * Drizzle ORM Relations - defines relationships between tables for query builder
 */

import { relations } from 'drizzle-orm';
import { users } from './users';
import { organizations } from './organizations';
import { organizationMembers } from './organization-members';
import { organizationApiKeys } from './organization-api-keys';
import { organizationInvitations } from './organization-invitations';
import { organizationTools } from './organization-tools';
import { projects } from './projects';
import { projectApiKeys } from './project-api-keys';
import { prompts } from './prompts';
import { promptVersions } from './prompt-versions';
import { promptTestResults } from './prompt-test-results';
import { promptAnalysisResults } from './prompt-analysis-results';
import { promptTools } from './prompt-tools';
import { webhookSubscriptions } from './webhook-subscriptions';
import { traces } from './traces';
import { spans } from './spans';
import { conversationReports } from './conversation-reports';
import { batchReports } from './batch-reports';
import { versionSuccessReports } from './version-success-reports';

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMembers),
  createdApiKeys: many(organizationApiKeys),
  sentInvitations: many(organizationInvitations),
  createdTools: many(organizationTools),
  createdProjectApiKeys: many(projectApiKeys),
}));

// Organization relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  projects: many(projects),
  apiKeys: many(organizationApiKeys),
  invitations: many(organizationInvitations),
  tools: many(organizationTools),
}));

// Organization member relations
export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.orgId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
  })
);

// Organization API key relations
export const organizationApiKeysRelations = relations(
  organizationApiKeys,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationApiKeys.orgId],
      references: [organizations.id],
    }),
    creator: one(users, {
      fields: [organizationApiKeys.createdBy],
      references: [users.id],
    }),
  })
);

// Organization invitation relations
export const organizationInvitationsRelations = relations(
  organizationInvitations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationInvitations.orgId],
      references: [organizations.id],
    }),
    inviter: one(users, {
      fields: [organizationInvitations.invitedBy],
      references: [users.id],
    }),
  })
);

// Organization tool relations
export const organizationToolsRelations = relations(
  organizationTools,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [organizationTools.orgId],
      references: [organizations.id],
    }),
    creator: one(users, {
      fields: [organizationTools.createdBy],
      references: [users.id],
    }),
    promptTools: many(promptTools),
  })
);

// Project relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  apiKeys: many(projectApiKeys),
  prompts: many(prompts),
  webhookSubscriptions: many(webhookSubscriptions),
  traces: many(traces),
  spans: many(spans),
  conversationReports: many(conversationReports),
  batchReports: many(batchReports),
  versionSuccessReports: many(versionSuccessReports),
}));

// Project API key relations
export const projectApiKeysRelations = relations(projectApiKeys, ({ one }) => ({
  project: one(projects, {
    fields: [projectApiKeys.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [projectApiKeys.createdBy],
    references: [users.id],
  }),
}));

// Prompt relations
export const promptsRelations = relations(prompts, ({ one, many }) => ({
  project: one(projects, {
    fields: [prompts.projectId],
    references: [projects.id],
  }),
  activeVersion: one(promptVersions, {
    fields: [prompts.activeVersionId],
    references: [promptVersions.id],
  }),
  versions: many(promptVersions),
  tools: many(promptTools),
}));

// Prompt version relations
export const promptVersionsRelations = relations(
  promptVersions,
  ({ one, many }) => ({
    prompt: one(prompts, {
      fields: [promptVersions.promptId],
      references: [prompts.id],
    }),
    testResults: many(promptTestResults),
    analysisResults: many(promptAnalysisResults),
  })
);

// Prompt test result relations
export const promptTestResultsRelations = relations(
  promptTestResults,
  ({ one }) => ({
    version: one(promptVersions, {
      fields: [promptTestResults.versionId],
      references: [promptVersions.id],
    }),
  })
);

// Prompt analysis result relations
export const promptAnalysisResultsRelations = relations(
  promptAnalysisResults,
  ({ one }) => ({
    version: one(promptVersions, {
      fields: [promptAnalysisResults.versionId],
      references: [promptVersions.id],
    }),
  })
);

// Prompt tool relations (many-to-many junction)
export const promptToolsRelations = relations(promptTools, ({ one }) => ({
  prompt: one(prompts, {
    fields: [promptTools.promptId],
    references: [prompts.id],
  }),
  tool: one(organizationTools, {
    fields: [promptTools.toolId],
    references: [organizationTools.id],
  }),
}));

// Webhook subscription relations
export const webhookSubscriptionsRelations = relations(
  webhookSubscriptions,
  ({ one }) => ({
    project: one(projects, {
      fields: [webhookSubscriptions.projectId],
      references: [projects.id],
    }),
  })
);

// Trace relations
export const tracesRelations = relations(traces, ({ one, many }) => ({
  project: one(projects, {
    fields: [traces.projectId],
    references: [projects.id],
  }),
  spans: many(spans),
}));

// Span relations
export const spansRelations = relations(spans, ({ one }) => ({
  project: one(projects, {
    fields: [spans.projectId],
    references: [projects.id],
  }),
}));

// Conversation report relations
export const conversationReportsRelations = relations(
  conversationReports,
  ({ one }) => ({
    project: one(projects, {
      fields: [conversationReports.projectId],
      references: [projects.id],
    }),
  })
);

// Batch report relations
export const batchReportsRelations = relations(batchReports, ({ one }) => ({
  project: one(projects, {
    fields: [batchReports.projectId],
    references: [projects.id],
  }),
}));

// Version success report relations
export const versionSuccessReportsRelations = relations(
  versionSuccessReports,
  ({ one }) => ({
    project: one(projects, {
      fields: [versionSuccessReports.projectId],
      references: [projects.id],
    }),
  })
);
