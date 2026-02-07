/**
 * Spans - individual events within a trace (messages, LLM calls, tool calls)
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
import { projects } from './projects';

export const spans = pgTable(
  'spans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    traceId: text('trace_id').notNull(), // Links to parent trace
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // "message", "llm_call", "tool_call"
    // Message fields
    role: text('role'), // "user", "assistant", "system"
    content: text('content'),
    // LLM metadata
    model: text('model'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    durationMs: real('duration_ms'),
    // Additional metadata
    metadata: text('metadata'), // JSON string for flexible data
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('spans_trace_id_idx').on(table.traceId),
    index('spans_project_id_idx').on(table.projectId),
    index('spans_trace_created_idx').on(table.traceId, table.createdAt),
  ]
);

export type Span = typeof spans.$inferSelect;
export type NewSpan = typeof spans.$inferInsert;
