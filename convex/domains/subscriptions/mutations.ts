/**
 * Subscription and usage mutations
 */

import { v } from "convex/values";

import type { SubscriptionTier } from "../../lib/subscriptions/limits";
import { internalMutation, mutation } from "../../_generated/server";
import {
  getMonthEnd,
  getMonthStart,
  getTierConfig,
  isUnlimited,
} from "../../lib/subscriptions/limits";

/**
 * Custom error for usage limit exceeded
 */
export class UsageLimitError extends Error {
  constructor(
    public limitType: string,
    public current: number,
    public limit: number,
    public tier: string,
  ) {
    super(
      `Usage limit exceeded for ${limitType}. Current: ${current}, Limit: ${limit}. Upgrade to a higher tier to continue.`,
    );
    this.name = "UsageLimitError";
  }
}

/**
 * Internal: Create enterprise subscription for a new organization (OSS default)
 */
export const createDefaultSubscription = internalMutation({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    const periodStart = getMonthStart();
    const periodEnd = getMonthEnd();

    const subscriptionId = await ctx.db.insert("organizationSubscriptions", {
      orgId: args.orgId,
      tier: "enterprise",
      status: "active",
      cancelAtPeriodEnd: false,
      periodStart,
      periodEnd,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("organizationUsage", {
      orgId: args.orgId,
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

    return subscriptionId;
  },
});

/**
 * Internal: Increment usage for a specific metric
 */
export const incrementUsage = internalMutation({
  args: {
    orgId: v.id("organizations"),
    metric: v.union(
      v.literal("internalAiTokens"),
      v.literal("productionTokens"),
      v.literal("traces"),
      v.literal("spans"),
      v.literal("promptTests"),
      v.literal("analysisRuns"),
    ),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const periodStart = getMonthStart();

    // Get or create usage record
    let usage = await ctx.db
      .query("organizationUsage")
      .withIndex("by_org_period", (q) =>
        q.eq("orgId", args.orgId).eq("periodStart", periodStart),
      )
      .first();

    const now = Date.now();

    if (!usage) {
      // Create new usage record
      const usageId = await ctx.db.insert("organizationUsage", {
        orgId: args.orgId,
        periodStart,
        periodEnd: getMonthEnd(),
        internalAiTokens: 0,
        productionTokens: 0,
        traces: 0,
        spans: 0,
        promptTests: 0,
        analysisRuns: 0,
        createdAt: now,
        updatedAt: now,
      });
      usage = await ctx.db.get(usageId);
    }

    if (!usage) {
      throw new Error("Failed to create usage record");
    }

    // Increment the specific metric
    const updateData: Record<string, number> = {
      [args.metric]: usage[args.metric] + args.amount,
      updatedAt: now,
    };

    await ctx.db.patch(usage._id, updateData);

    return usage[args.metric] + args.amount;
  },
});

/**
 * Internal: Check if an organization is within their usage limits
 * Throws UsageLimitError if limit is exceeded
 */
export const checkUsageLimit = internalMutation({
  args: {
    orgId: v.id("organizations"),
    metric: v.union(
      v.literal("internalAiTokens"),
      v.literal("productionTokens"),
      v.literal("traces"),
    ),
    additionalUsage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get subscription
    const subscription = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const tier = (subscription?.tier ?? "free") as SubscriptionTier;
    const config = getTierConfig(tier);

    // Map metric to limit field
    const limitMap: Record<string, keyof typeof config> = {
      internalAiTokens: "monthlyInternalAiTokens",
      productionTokens: "monthlyProductionTokens",
      traces: "monthlyTraces",
    };

    const limitField = limitMap[args.metric];
    const limit = config[limitField] as number;

    // Unlimited check
    if (isUnlimited(limit)) {
      return { allowed: true, current: 0, limit: -1, tier };
    }

    // Get current usage
    const periodStart = getMonthStart();
    const usage = await ctx.db
      .query("organizationUsage")
      .withIndex("by_org_period", (q) =>
        q.eq("orgId", args.orgId).eq("periodStart", periodStart),
      )
      .first();

    const current = usage?.[args.metric as keyof typeof usage] ?? 0;
    const projected = (current as number) + (args.additionalUsage ?? 0);

    if (projected > limit) {
      throw new UsageLimitError(args.metric, current as number, limit, tier);
    }

    return { allowed: true, current, limit, tier };
  },
});

/**
 * Internal: Track AI usage with full details
 */
export const trackAiUsage = internalMutation({
  args: {
    orgId: v.id("organizations"),
    projectId: v.optional(v.id("projects")),
    userId: v.optional(v.id("users")),
    operation: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    model: v.string(),
    promptId: v.optional(v.id("prompts")),
    versionId: v.optional(v.id("promptVersions")),
    traceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Log individual AI usage
    await ctx.db.insert("aiUsageLogs", {
      orgId: args.orgId,
      projectId: args.projectId,
      userId: args.userId,
      operation: args.operation,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.totalTokens,
      model: args.model,
      promptId: args.promptId,
      versionId: args.versionId,
      traceId: args.traceId,
      createdAt: Date.now(),
    });

    // Increment aggregated usage
    const periodStart = getMonthStart();
    let usage = await ctx.db
      .query("organizationUsage")
      .withIndex("by_org_period", (q) =>
        q.eq("orgId", args.orgId).eq("periodStart", periodStart),
      )
      .first();

    const now = Date.now();

    if (!usage) {
      await ctx.db.insert("organizationUsage", {
        orgId: args.orgId,
        periodStart,
        periodEnd: getMonthEnd(),
        internalAiTokens: args.totalTokens,
        productionTokens: 0,
        traces: 0,
        spans: 0,
        promptTests: args.operation === "testPrompt" ? 1 : 0,
        analysisRuns: args.operation.includes("analyze") ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(usage._id, {
        internalAiTokens: usage.internalAiTokens + args.totalTokens,
        promptTests:
          usage.promptTests + (args.operation === "testPrompt" ? 1 : 0),
        analysisRuns:
          usage.analysisRuns + (args.operation.includes("analyze") ? 1 : 0),
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Internal: Reset usage for a new billing period
 */
export const resetPeriodUsage = internalMutation({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const periodStart = getMonthStart();
    const periodEnd = getMonthEnd();

    // Create new usage record for the new period
    await ctx.db.insert("organizationUsage", {
      orgId: args.orgId,
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

    return { success: true };
  },
});

/**
 * Internal: Update subscription tier
 */
export const updateSubscriptionTier = internalMutation({
  args: {
    orgId: v.id("organizations"),
    tier: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
    status: v.string(),
    periodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const now = Date.now();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        tier: args.tier,
        status: args.status,
        periodEnd: args.periodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? false,
        updatedAt: now,
      });
      return subscription._id;
    } else {
      return await ctx.db.insert("organizationSubscriptions", {
        orgId: args.orgId,
        tier: args.tier,
        status: args.status,
        periodStart: getMonthStart(),
        periodEnd: args.periodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? false,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
