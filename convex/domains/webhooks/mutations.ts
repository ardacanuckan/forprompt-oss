/**
 * Webhook subscription mutations
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { NotFoundError } from "../../lib/utils/errors";
import { generateSecureApiKey } from "../../lib/utils/encryption";

/**
 * Internal mutation to increment failure count
 */
export const incrementFailureCount = internalMutation({
  args: {
    subscriptionId: v.id("webhookSubscriptions"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      return;
    }

    const newFailureCount = subscription.failureCount + 1;

    // Disable webhook after 10 consecutive failures
    const shouldDisable = newFailureCount >= 10;

    await ctx.db.patch(args.subscriptionId, {
      failureCount: newFailureCount,
      ...(shouldDisable && { isActive: false }),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to register webhook (for HTTP API)
 */
export const registerWebhookInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    endpointUrl: v.string(),
    events: v.array(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if webhook already exists for this endpoint
    const existing = await ctx.db
      .query("webhookSubscriptions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("endpointUrl"), args.endpointUrl))
      .first();

    if (existing) {
      // Update existing subscription
      await ctx.db.patch(existing._id, {
        events: args.events,
        metadata: args.metadata,
        isActive: true,
        updatedAt: Date.now(),
      });
      return { subscriptionId: existing._id, secret: existing.secret };
    }

    // Generate webhook secret for HMAC signing
    const secret = generateSecureApiKey();
    const now = Date.now();

    const subscriptionId = await ctx.db.insert("webhookSubscriptions", {
      projectId: args.projectId,
      endpointUrl: args.endpointUrl,
      secret,
      events: args.events,
      isActive: true,
      failureCount: 0,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    return { subscriptionId, secret };
  },
});

/**
 * Internal mutation to delete webhook (for HTTP API)
 */
export const deleteWebhookInternal = internalMutation({
  args: {
    subscriptionId: v.id("webhookSubscriptions"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription || subscription.projectId !== args.projectId) {
      throw new NotFoundError("Webhook subscription");
    }

    await ctx.db.delete(args.subscriptionId);
  },
});

/**
 * Internal mutation to update last delivery time
 */
export const updateLastDelivery = internalMutation({
  args: {
    subscriptionId: v.id("webhookSubscriptions"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      return;
    }

    await ctx.db.patch(args.subscriptionId, {
      lastDeliveryAt: Date.now(),
      failureCount: 0, // Reset on successful delivery
    });
  },
});
