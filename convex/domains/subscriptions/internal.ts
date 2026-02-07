/**
 * Internal subscription operations (for webhooks and system operations)
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
import {
  PRODUCT_TO_TIER,
  getMonthStart,
  getMonthEnd,
  type SubscriptionTier,
} from "../../lib/subscriptions/limits";

/**
 * Get subscription by Polar customer ID
 */
export const getByPolarCustomer = internalQuery({
  args: {
    polarCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_polar_customer", (q) =>
        q.eq("polarCustomerId", args.polarCustomerId)
      )
      .first();
  },
});

/**
 * Activate subscription from Polar webhook
 * Called on subscription.created, subscription.active, subscription.updated events
 */
export const activateSubscription = internalMutation({
  args: {
    orgId: v.id("organizations"),
    polarCustomerId: v.string(),
    polarSubscriptionId: v.string(),
    productId: v.string(),
    expirationAtMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Map product ID to tier
    const tier = PRODUCT_TO_TIER[args.productId] ?? "pro";

    // Find existing subscription
    const existing = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (existing) {
      // Update existing subscription
      await ctx.db.patch(existing._id, {
        tier,
        status: "active",
        polarCustomerId: args.polarCustomerId,
        polarSubscriptionId: args.polarSubscriptionId,
        productId: args.productId,
        periodEnd: args.expirationAtMs,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new subscription
      return await ctx.db.insert("organizationSubscriptions", {
        orgId: args.orgId,
        tier,
        status: "active",
        polarCustomerId: args.polarCustomerId,
        polarSubscriptionId: args.polarSubscriptionId,
        productId: args.productId,
        periodStart: getMonthStart(),
        periodEnd: args.expirationAtMs,
        cancelAtPeriodEnd: false,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Cancel subscription from Polar webhook
 * Called on subscription.canceled event - marks subscription to end at period end
 */
export const cancelSubscription = internalMutation({
  args: {
    polarCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_polar_customer", (q) =>
        q.eq("polarCustomerId", args.polarCustomerId)
      )
      .first();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        status: "cancelled",
        cancelAtPeriodEnd: true,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Expire subscription from Polar webhook
 * Called on subscription.revoked event - downgrades to free tier
 */
export const expireSubscription = internalMutation({
  args: {
    polarCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_polar_customer", (q) =>
        q.eq("polarCustomerId", args.polarCustomerId)
      )
      .first();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        tier: "free" as SubscriptionTier,
        status: "expired",
        periodEnd: undefined,
        cancelAtPeriodEnd: false,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Handle billing issue from Polar webhook
 * Called when subscription payment fails
 */
export const handleBillingIssue = internalMutation({
  args: {
    polarCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_polar_customer", (q) =>
        q.eq("polarCustomerId", args.polarCustomerId)
      )
      .first();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        status: "past_due",
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Link Polar customer to organization
 * Called when user initiates purchase flow
 */
export const linkPolarCustomer = internalMutation({
  args: {
    orgId: v.id("organizations"),
    polarCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const now = Date.now();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        polarCustomerId: args.polarCustomerId,
        updatedAt: now,
      });
      return subscription._id;
    } else {
      // Create free tier subscription with customer ID
      return await ctx.db.insert("organizationSubscriptions", {
        orgId: args.orgId,
        tier: "free",
        status: "active",
        polarCustomerId: args.polarCustomerId,
        cancelAtPeriodEnd: false,
        periodStart: getMonthStart(),
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Migration: Create default subscriptions for all existing organizations
 */
export const migrateExistingOrganizations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();
    const now = Date.now();
    const periodStart = getMonthStart();
    const periodEnd = getMonthEnd();

    let created = 0;
    let skipped = 0;

    for (const org of orgs) {
      // Check if subscription already exists
      const existing = await ctx.db
        .query("organizationSubscriptions")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Create free tier subscription
      await ctx.db.insert("organizationSubscriptions", {
        orgId: org._id,
        tier: "free",
        status: "active",
        cancelAtPeriodEnd: false,
        periodStart,
        periodEnd,
        createdAt: now,
        updatedAt: now,
      });

      // Create initial usage record
      await ctx.db.insert("organizationUsage", {
        orgId: org._id,
        periodStart,
        periodEnd,
        internalAiTokens: 0,
        productionTokens: 0,
        traces: 0,
        spans: 0,
        promptTests: 0,
        analysisRuns: 0,
        createdAt: now,
        updatedAt: now,
      });

      created++;
    }

    return { created, skipped, total: orgs.length };
  },
});
