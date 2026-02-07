/**
 * Conversation Reports - AI-generated analysis for individual conversations
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  integer,
  real,
  jsonb,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const conversationReports = pgTable(
  'conversation_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    traceId: text('trace_id').notNull(), // Links to trace
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    promptKey: text('prompt_key').notNull(), // "onboardingprompt", "chatprompt"
    versionNumber: integer('version_number'), // Prompt version at time of conversation
    // Report data
    successScore: real('success_score').notNull(), // 1-10 score
    outcome: text('outcome').notNull(), // "success", "partial", "failed"
    criticalPoints: jsonb('critical_points').$type<string[]>().notNull(), // 3-4 key observations
    issues: jsonb('issues').$type<string[]>().notNull(), // Problems identified
    summary: text('summary').notNull(), // Brief summary
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('conversation_reports_trace_id_idx').on(table.traceId),
    index('conversation_reports_project_id_idx').on(table.projectId),
  ]
);

export type ConversationReport = typeof conversationReports.$inferSelect;
export type NewConversationReport = typeof conversationReports.$inferInsert;
