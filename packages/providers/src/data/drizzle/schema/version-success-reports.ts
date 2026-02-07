/**
 * Version Success Reports - Aggregated report per prompt version
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

export const versionSuccessReports = pgTable(
  'version_success_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    promptKey: text('prompt_key').notNull(),
    versionNumber: integer('version_number'),
    // Aggregate statistics
    totalAnalyzed: integer('total_analyzed').notNull(),
    overallSuccessRate: real('overall_success_rate').notNull(), // Percentage
    averageScore: real('average_score').notNull(),
    totalBatches: integer('total_batches').notNull(),
    // Report data
    keyInsights: jsonb('key_insights').$type<string[]>().notNull(),
    improvementSuggestions: jsonb('improvement_suggestions')
      .$type<string[]>()
      .notNull(),
    strengthsIdentified: jsonb('strengths_identified')
      .$type<string[]>()
      .notNull(),
    weaknessesIdentified: jsonb('weaknesses_identified')
      .$type<string[]>()
      .notNull(),
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('version_success_reports_project_id_idx').on(table.projectId)]
);

export type VersionSuccessReport = typeof versionSuccessReports.$inferSelect;
export type NewVersionSuccessReport = typeof versionSuccessReports.$inferInsert;
