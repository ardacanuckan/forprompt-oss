/**
 * Organization Tools - reusable tool definitions for AI agents
 */

import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const organizationTools = pgTable(
  'organization_tools',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // Tool name (e.g., "searchDatabase", "sendEmail")
    description: text('description').notNull(), // What the tool does
    parameters: text('parameters').notNull(), // JSON schema of parameters
    category: text('category'), // Tool category (e.g., "database", "api", "utility", "file")
    exampleUsage: text('example_usage'), // Example of how to use the tool
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('organization_tools_org_id_idx').on(table.orgId),
    index('organization_tools_category_idx').on(table.orgId, table.category),
    index('organization_tools_name_idx').on(table.orgId, table.name),
  ]
);

export type OrganizationTool = typeof organizationTools.$inferSelect;
export type NewOrganizationTool = typeof organizationTools.$inferInsert;
