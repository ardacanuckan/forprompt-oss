/**
 * Webhook subscription queries
 */

import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";

/**
 * Get active webhooks for a project (internal use)
 */
export const getActiveWebhooksInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
    event: v.string(),
  },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("webhookSubscriptions")
      .withIndex("by_active", (q) =>
        q.eq("projectId", args.projectId).eq("isActive", true)
      )
      .collect();

    // Filter by event type
    return subscriptions.filter((sub) => sub.events.includes(args.event));
  },
});

/**
 * Get webhook details (internal use for delivery)
 */
export const getWebhookInternal = internalQuery({
  args: {
    subscriptionId: v.id("webhookSubscriptions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.subscriptionId);
  },
});

/**
 * List webhooks (internal use for HTTP API)
 */
export const listWebhooksInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("webhookSubscriptions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return subscriptions.map((sub) => ({
      ...sub,
      secret: undefined, // Don't expose secret in list view
    }));
  },
});
