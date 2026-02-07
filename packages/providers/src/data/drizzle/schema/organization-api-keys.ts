/**
 * Organization API keys - stores encrypted API keys per org
 */

import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const organizationApiKeys = pgTable(
  'organization_api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // User-friendly name for the key
    service: text('service').notNull(), // "openrouter", "anthropic", "openai", "custom"
    keyValue: text('key_value').notNull(), // Encrypted API key
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    index('organization_api_keys_org_id_idx').on(table.orgId),
    index('organization_api_keys_service_idx').on(table.orgId, table.service),
  ]
);

export type OrganizationApiKey = typeof organizationApiKeys.$inferSelect;
export type NewOrganizationApiKey = typeof organizationApiKeys.$inferInsert;
