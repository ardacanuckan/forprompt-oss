/**
 * Subscription and usage queries
 */

import { v } from "convex/values";
import { query, internalQuery } from "../../_generated/server";
import {
  SUBSCRIPTION_TIERS,
  getTierConfig,
  isFeatureAvailable,
  isUnlimited,
  getMonthStart,
  getMonthEnd,
  type SubscriptionTier,
  type FeatureName,
} from "../../lib/subscriptions/limits";

/**
 * Get an organization's subscription details
 */
export const getSubscription = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (!subscription) {
      // Return default free tier if no subscription exists
      return {
        tier: "free" as SubscriptionTier,
        status: "active",
        periodStart: getMonthStart(),
        periodEnd: getMonthEnd(),
        cancelAtPeriodEnd: false,
      };
    }

    return subscription;
  },
});

/**
 * Get an organization's current usage for the billing period
 */
export const getUsage = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const periodStart = getMonthStart();

    const usage = await ctx.db
      .query("organizationUsage")
      .withIndex("by_org_period", (q) =>
        q.eq("orgId", args.orgId).eq("periodStart", periodStart)
      )
      .first();

    if (!usage) {
      // Return zero usage if no record exists
      return {
        internalAiTokens: 0,
        productionTokens: 0,
        traces: 0,
        spans: 0,
        promptTests: 0,
        analysisRuns: 0,
        periodStart,
        periodEnd: getMonthEnd(),
      };
    }

    return usage;
  },
});

/**
 * Get limits for an organization based on their subscription tier
 */
export const getLimits = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const tier = (subscription?.tier ?? "free") as SubscriptionTier;
    const config = getTierConfig(tier);

    return {
      tier,
      tierName: config.name,
      monthlyInternalAiTokens: config.monthlyInternalAiTokens,
      monthlyProductionTokens: config.monthlyProductionTokens,
      monthlyTraces: config.monthlyTraces,
      maxPrompts: config.maxPrompts,
      maxProjects: config.maxProjects,
      maxMembers: config.maxMembers,
      maxWebhooks: config.maxWebhooks,
      features: config.features,
    };
  },
});

/**
 * Get usage as percentage of limits for dashboard display
 */
export const getUsagePercentage = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get subscription
    const subscription = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const tier = (subscription?.tier ?? "free") as SubscriptionTier;
    const config = getTierConfig(tier);

    // Get current usage
    const periodStart = getMonthStart();
    const usage = await ctx.db
      .query("organizationUsage")
      .withIndex("by_org_period", (q) =>
        q.eq("orgId", args.orgId).eq("periodStart", periodStart)
      )
      .first();

    const currentUsage = {
      internalAiTokens: usage?.internalAiTokens ?? 0,
      productionTokens: usage?.productionTokens ?? 0,
      traces: usage?.traces ?? 0,
    };

    // Calculate percentages (-1 = unlimited = always 0%)
    const calculatePercentage = (used: number, limit: number) => {
      if (isUnlimited(limit)) return 0;
      if (limit === 0) return used > 0 ? 100 : 0;
      return Math.min(Math.round((used / limit) * 100), 100);
    };

    return {
      tier,
      tierName: config.name,
      internalAiTokens: {
        used: currentUsage.internalAiTokens,
        limit: config.monthlyInternalAiTokens,
        percentage: calculatePercentage(
          currentUsage.internalAiTokens,
          config.monthlyInternalAiTokens
        ),
        isUnlimited: isUnlimited(config.monthlyInternalAiTokens),
      },
      productionTokens: {
        used: currentUsage.productionTokens,
        limit: config.monthlyProductionTokens,
        percentage: calculatePercentage(
          currentUsage.productionTokens,
          config.monthlyProductionTokens
        ),
        isUnlimited: isUnlimited(config.monthlyProductionTokens),
      },
      traces: {
        used: currentUsage.traces,
        limit: config.monthlyTraces,
        percentage: calculatePercentage(currentUsage.traces, config.monthlyTraces),
        isUnlimited: isUnlimited(config.monthlyTraces),
      },
      periodStart,
      periodEnd: getMonthEnd(),
    };
  },
});

/**
 * Check if an organization can perform a specific action
 */
export const canPerformAction = query({
  args: {
    orgId: v.id("organizations"),
    action: v.union(
      v.literal("aiPromptEditing"),
      v.literal("conversationAnalysis"),
      v.literal("batchReports"),
      v.literal("versionReports")
    ),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const tier = (subscription?.tier ?? "free") as SubscriptionTier;
    return isFeatureAvailable(tier, args.action as FeatureName);
  },
});

/**
 * Internal: Get subscription for internal functions
 */
export const getSubscriptionInternal = internalQuery({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    return subscription ?? {
      tier: "free" as SubscriptionTier,
      status: "active",
      periodStart: getMonthStart(),
      periodEnd: getMonthEnd(),
      cancelAtPeriodEnd: false,
    };
  },
});

/**
 * Internal: Get usage for internal functions
 */
export const getUsageInternal = internalQuery({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const periodStart = getMonthStart();

    const usage = await ctx.db
      .query("organizationUsage")
      .withIndex("by_org_period", (q) =>
        q.eq("orgId", args.orgId).eq("periodStart", periodStart)
      )
      .first();

    return usage ?? {
      internalAiTokens: 0,
      productionTokens: 0,
      traces: 0,
      spans: 0,
      promptTests: 0,
      analysisRuns: 0,
      periodStart,
      periodEnd: getMonthEnd(),
    };
  },
});

/**
 * Get all available subscription tiers and their features for pricing page
 */
export const getTiers = query({
  args: {},
  handler: async () => {
    return Object.entries(SUBSCRIPTION_TIERS).map(([key, config]) => ({
      id: key as SubscriptionTier,
      name: config.name,
      monthlyInternalAiTokens: config.monthlyInternalAiTokens,
      monthlyProductionTokens: config.monthlyProductionTokens,
      monthlyTraces: config.monthlyTraces,
      maxPrompts: config.maxPrompts,
      maxProjects: config.maxProjects,
      maxMembers: config.maxMembers,
      maxWebhooks: config.maxWebhooks,
      features: config.features,
    }));
  },
});
