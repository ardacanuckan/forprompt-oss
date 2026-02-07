/**
 * Analytics queries
 */

import { v } from "convex/values";

import { query } from "../../../_generated/server";
import { requireOrgAccess } from "../../../lib/auth/permissions";

/**
 * Get main dashboard analytics
 */
export const getAnalyticsDashboard = query({
  args: {
    orgId: v.id("organizations"),
    days: v.optional(v.number()), // Last N days (default 30)
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const days = args.days ?? 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Get analytics for date range
    const analytics = await ctx.db
      .query("understandAnalytics")
      .withIndex("by_org_date", (q) =>
        q.eq("orgId", args.orgId).gte("date", startDateStr!),
      )
      .collect();

    // Get current violations for real-time stats
    const violations = await ctx.db
      .query("understandViolations")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const currentStats = {
      total: violations.length,
      byStatus: {
        flagged: violations.filter((v) => v.status === "flagged").length,
        fixed: violations.filter((v) => v.status === "fixed").length,
        approved: violations.filter((v) => v.status === "approved").length,
        ignored: violations.filter((v) => v.status === "ignored").length,
      },
      bySeverity: {
        error: violations.filter((v) => v.severity === "error").length,
        warning: violations.filter((v) => v.severity === "warning").length,
        info: violations.filter((v) => v.severity === "info").length,
      },
    };

    return {
      analytics,
      currentStats,
      dateRange: {
        start: startDateStr,
        end: new Date().toISOString().split("T")[0],
      },
    };
  },
});

/**
 * Get compliance trend over time
 */
export const getComplianceTrend = query({
  args: {
    orgId: v.id("organizations"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - args.days);
    const startDateStr = startDate.toISOString().split("T")[0];

    const analytics = await ctx.db
      .query("understandAnalytics")
      .withIndex("by_org_date", (q) =>
        q.eq("orgId", args.orgId).gte("date", startDateStr!),
      )
      .order("asc")
      .collect();

    return analytics.map((a) => ({
      date: a.date,
      complianceScore: a.complianceScore,
      totalViolations: a.totalViolations,
    }));
  },
});

/**
 * Get top violations (most common)
 */
export const getTopViolations = query({
  args: {
    orgId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const violations = await ctx.db
      .query("understandViolations")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Count by rule
    const ruleCount = new Map<
      string,
      { ruleId: string; ruleName: string; count: number }
    >();

    for (const v of violations) {
      const key = v.ruleId;
      const existing = ruleCount.get(key);
      if (existing) {
        existing.count++;
      } else {
        ruleCount.set(key, {
          ruleId: v.ruleId,
          ruleName: v.ruleName,
          count: 1,
        });
      }
    }

    // Sort by count and take top N
    const sorted = Array.from(ruleCount.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, args.limit ?? 10);

    return sorted;
  },
});

/**
 * Get today's quick stats
 */
export const getTodayStats = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const today = new Date().toISOString().split("T")[0];

    const todayAnalytics = await ctx.db
      .query("understandAnalytics")
      .withIndex("by_org_date", (q) =>
        q.eq("orgId", args.orgId).eq("date", today!),
      )
      .unique();

    if (!todayAnalytics) {
      // Return empty stats if no data for today
      return {
        complianceScore: 100,
        totalViolations: 0,
        newViolations: 0,
        fixedViolations: 0,
      };
    }

    return {
      complianceScore: todayAnalytics.complianceScore,
      totalViolations: todayAnalytics.totalViolations,
      newViolations: todayAnalytics.newViolations,
      fixedViolations: todayAnalytics.fixedViolations,
    };
  },
});
