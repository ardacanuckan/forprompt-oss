/**
 * Webhook Subscriptions - tracks registered webhook endpoints
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  boolean,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const webhookSubscriptions = pgTable(
  'webhook_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    endpointUrl: text('endpoint_url').notNull(), // Client webhook endpoint URL
    secret: text('secret').notNull(), // HMAC signing secret for verification
    events: jsonb('events').$type<string[]>().notNull(), // ["prompt.created", "prompt.updated", "prompt.version.activated"]
    isActive: boolean('is_active').notNull(),
    lastDeliveryAt: timestamp('last_delivery_at', { withTimezone: true }),
    failureCount: integer('failure_count').notNull().default(0), // Track consecutive failures
    metadata: text('metadata'), // JSON: client info, format preferences
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('webhook_subscriptions_project_id_idx').on(table.projectId),
    index('webhook_subscriptions_active_idx').on(
      table.projectId,
      table.isActive
    ),
  ]
);

export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type NewWebhookSubscription = typeof webhookSubscriptions.$inferInsert;
