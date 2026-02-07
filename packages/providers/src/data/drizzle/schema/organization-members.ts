/**
 * Organization memberships - tracks which users belong to which orgs
 */

import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clerkOrgId: text('clerk_org_id').notNull(),
    clerkUserId: text('clerk_user_id').notNull(),
    role: text('role').notNull(), // "org:admin" | "org:member"
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('organization_members_org_id_idx').on(table.orgId),
    index('organization_members_user_id_idx').on(table.userId),
    index('organization_members_clerk_ids_idx').on(
      table.clerkOrgId,
      table.clerkUserId
    ),
  ]
);

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
