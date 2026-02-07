/**
 * Prompts - named prompt identifiers (e.g., "userContextGeneration", "chatDefault")
 */

import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const prompts = pgTable(
  'prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    key: text('key').notNull(), // Unique identifier like "userContextGeneration"
    name: text('name').notNull(), // Display name
    description: text('description'),
    activeVersionId: uuid('active_version_id'), // Currently active version (FK added after promptVersions)
    // Prompt Information fields
    purpose: text('purpose'), // Primary goal of the prompt
    expectedBehavior: text('expected_behavior'), // How the prompt should behave
    inputFormat: text('input_format'), // Expected input structure
    outputFormat: text('output_format'), // Expected output structure
    constraints: text('constraints'), // Limitations and rules
    useCases: text('use_cases'), // Primary use cases
    additionalNotes: text('additional_notes'), // Free-form documentation
    toolsNotes: text('tools_notes'), // Additional notes about tool usage strategy
    referencePrompt: text('reference_prompt'), // Original/reference prompt for manual configuration
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('prompts_project_id_idx').on(table.projectId),
    index('prompts_key_idx').on(table.projectId, table.key),
  ]
);

export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
