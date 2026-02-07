/**
 * Traces - represent full conversations/executions
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  integer,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const traces = pgTable(
  'traces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    traceId: text('trace_id').notNull().unique(), // Client-generated UUID
    promptKey: text('prompt_key').notNull(), // "onboardingprompt", "chatprompt"
    model: text('model'), // "gpt-4o", "claude-3-opus"
    source: text('source').notNull(), // "test-app", "mobile-app", "sdk"
    status: text('status').notNull(), // "active", "completed"
    spanCount: integer('span_count').notNull().default(0), // Number of spans in this trace
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('traces_trace_id_idx').on(table.traceId),
    index('traces_project_id_idx').on(table.projectId),
    index('traces_project_prompt_idx').on(table.projectId, table.promptKey),
    index('traces_created_at_idx').on(table.createdAt),
  ]
);

export type Trace = typeof traces.$inferSelect;
export type NewTrace = typeof traces.$inferInsert;
