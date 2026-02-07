/**
 * Prompt Versions - individual versions of a prompt (v1, v2, v3...)
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
import { prompts } from './prompts';

export const promptVersions = pgTable(
  'prompt_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    promptId: uuid('prompt_id')
      .notNull()
      .references(() => prompts.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(), // Auto-incrementing per prompt (1, 2, 3...)
    systemPrompt: text('system_prompt').notNull(),
    description: text('description'), // Changelog/notes for this version
    // Statistics
    testCount: integer('test_count'),
    avgTokens: real('avg_tokens'),
    avgResponseTime: real('avg_response_time'),
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('prompt_versions_prompt_id_idx').on(table.promptId),
    index('prompt_versions_prompt_version_idx').on(
      table.promptId,
      table.versionNumber
    ),
  ]
);

export type PromptVersion = typeof promptVersions.$inferSelect;
export type NewPromptVersion = typeof promptVersions.$inferInsert;
