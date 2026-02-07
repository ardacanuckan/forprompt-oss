/**
 * Internal subscription operations
 * OSS: All organizations get enterprise tier by default
 */

import { v } from "convex/values";

import type { SubscriptionTier } from "../../lib/subscriptions/limits";
import { internalMutation, internalQuery } from "../../_generated/server";
import { getMonthEnd, getMonthStart } from "../../lib/subscriptions/limits";

/**
 * Get subscription by organization ID
 */
export const getByOrg = internalQuery({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
  },
});

/**
 * Ensure organization has enterprise subscription (OSS default)
 */
export const ensureEnterprise = internalMutation({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("organizationSubscriptions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (existing) {
      if (existing.tier !== "enterprise") {
        await ctx.db.patch(existing._id, {
          tier: "enterprise" as SubscriptionTier,
          status: "active",
          updatedAt: now,
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("organizationSubscriptions", {
      orgId: args.orgId,
      tier: "enterprise" as SubscriptionTier,
      status: "active",
      periodStart: getMonthStart(),
      periodEnd: getMonthEnd(),
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Migration: Upgrade all existing organizations to enterprise
 */
export const migrateExistingOrganizations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();
    const now = Date.now();
    const periodStart = getMonthStart();
    const periodEnd = getMonthEnd();

    let created = 0;
    let upgraded = 0;

    for (const org of orgs) {
      const existing = await ctx.db
        .query("organizationSubscriptions")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .first();

      if (existing) {
        if (existing.tier !== "enterprise") {
          await ctx.db.patch(existing._id, {
            tier: "enterprise" as SubscriptionTier,
            status: "active",
            updatedAt: now,
          });
          upgraded++;
        }
        continue;
      }

      await ctx.db.insert("organizationSubscriptions", {
        orgId: org._id,
        tier: "enterprise" as SubscriptionTier,
        status: "active",
        cancelAtPeriodEnd: false,
        periodStart,
        periodEnd,
        createdAt: now,
        updatedAt: now,
      });

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

    return { created, upgraded, total: orgs.length };
  },
});
