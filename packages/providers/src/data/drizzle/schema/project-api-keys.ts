/**
 * Project API Keys - authentication keys for each project
 */

import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { users } from './users';

export const projectApiKeys = pgTable(
  'project_api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    keyValue: text('key_value').notNull(), // Encrypted API key
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
  },
  (table) => [index('project_api_keys_project_id_idx').on(table.projectId)]
);

export type ProjectApiKey = typeof projectApiKeys.$inferSelect;
export type NewProjectApiKey = typeof projectApiKeys.$inferInsert;
