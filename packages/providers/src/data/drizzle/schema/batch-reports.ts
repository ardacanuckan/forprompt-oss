/**
 * Batch Reports - Summary of every 10 conversations
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

export const batchReports = pgTable(
  'batch_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    promptKey: text('prompt_key').notNull(),
    versionNumber: integer('version_number'),
    batchNumber: integer('batch_number').notNull(), // 1, 2, 3... (sequential)
    // Batch metadata
    conversationCount: integer('conversation_count').notNull(), // Should be ~10
    traceIds: jsonb('trace_ids').$type<string[]>().notNull(), // References to conversations in this batch
    // Report data
    averageScore: real('average_score').notNull(),
    commonPatterns: jsonb('common_patterns').$type<string[]>().notNull(),
    frequentIssues: jsonb('frequent_issues').$type<string[]>().notNull(),
    recommendations: jsonb('recommendations').$type<string[]>().notNull(),
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('batch_reports_project_id_idx').on(table.projectId)]
);

export type BatchReport = typeof batchReports.$inferSelect;
export type NewBatchReport = typeof batchReports.$inferInsert;
