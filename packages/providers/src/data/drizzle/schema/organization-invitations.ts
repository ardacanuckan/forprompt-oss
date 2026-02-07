/**
 * Organization invitations - tracks pending invitations
 */

import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const organizationInvitations = pgTable(
  'organization_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    clerkInvitationId: text('clerk_invitation_id').notNull().unique(),
    email: text('email').notNull(),
    role: text('role').notNull(), // "org:admin" | "org:member"
    status: text('status').notNull(), // "pending" | "accepted" | "revoked"
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    index('organization_invitations_org_id_idx').on(table.orgId),
    index('organization_invitations_email_idx').on(table.email),
    index('organization_invitations_clerk_id_idx').on(table.clerkInvitationId),
    index('organization_invitations_status_idx').on(table.orgId, table.status),
  ]
);

export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
export type NewOrganizationInvitation = typeof organizationInvitations.$inferInsert;
