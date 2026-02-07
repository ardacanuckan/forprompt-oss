/**
 * Prompt Tools - many-to-many relationship between prompts and tools
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  boolean,
} from 'drizzle-orm/pg-core';
import { prompts } from './prompts';
import { organizationTools } from './organization-tools';

export const promptTools = pgTable(
  'prompt_tools',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    promptId: uuid('prompt_id')
      .notNull()
      .references(() => prompts.id, { onDelete: 'cascade' }),
    toolId: uuid('tool_id')
      .notNull()
      .references(() => organizationTools.id, { onDelete: 'cascade' }),
    isRequired: boolean('is_required').notNull(), // Whether tool is required or optional
    usageNotes: text('usage_notes'), // How this specific prompt uses this tool
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('prompt_tools_prompt_id_idx').on(table.promptId),
    index('prompt_tools_tool_id_idx').on(table.toolId),
    index('prompt_tools_prompt_tool_idx').on(table.promptId, table.toolId),
  ]
);

export type PromptTool = typeof promptTools.$inferSelect;
export type NewPromptTool = typeof promptTools.$inferInsert;
