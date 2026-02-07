/**
 * Prompt Test Results - for tracking prompt performance
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  integer,
  real,
} from 'drizzle-orm/pg-core';
import { promptVersions } from './prompt-versions';

export const promptTestResults = pgTable(
  'prompt_test_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => promptVersions.id, { onDelete: 'cascade' }),
    model: text('model').notNull(),
    userMessage: text('user_message').notNull(),
    response: text('response').notNull(),
    tokens: integer('tokens').notNull(),
    responseTime: real('response_time').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('prompt_test_results_version_id_idx').on(table.versionId)]
);

export type PromptTestResult = typeof promptTestResults.$inferSelect;
export type NewPromptTestResult = typeof promptTestResults.$inferInsert;
