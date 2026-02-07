/**
 * Analytics aggregation functions
 */

import { v } from "convex/values";

import { internalMutation } from "../../../_generated/server";

/**
 * Recalculate analytics for a specific day
 * Called by scheduled job or manually
 */
export const recalculateDay = internalMutation({
  args: {
    orgId: v.id("organizations"),
    date: v.string(), // "2024-01-15"
  },
  handler: async (ctx, args) => {
    // Get all violations for this org
    const violations = await ctx.db
      .query("understandViolations")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Get violations created on this date
    const dateStart = new Date(args.date).getTime();
    const dateEnd = dateStart + 24 * 60 * 60 * 1000;

    const newViolations = violations.filter(
      (v) => v.createdAt >= dateStart && v.createdAt < dateEnd,
    );

    const fixedViolations = violations.filter(
      (v) =>
        v.resolvedAt &&
        v.resolvedAt >= dateStart &&
        v.resolvedAt < dateEnd &&
        v.status === "fixed",
    );

    // Count by rule
    const byRule: Record<string, number> = {};
    for (const v of violations) {
      byRule[v.ruleId] = (byRule[v.ruleId] || 0) + 1;
    }

    // Count by severity
    const bySeverity = {
      error: violations.filter((v) => v.severity === "error").length,
      warning: violations.filter((v) => v.severity === "warning").length,
      info: violations.filter((v) => v.severity === "info").length,
    };

    // Calculate compliance score (simple: 100 - (errors * 10 + warnings * 5 + info * 1))
    const score = Math.max(
      0,
      100 -
        (bySeverity.error * 10 + bySeverity.warning * 5 + bySeverity.info * 1),
    );

    // Upsert analytics record
    const existing = await ctx.db
      .query("understandAnalytics")
      .withIndex("by_org_date", (q) =>
        q.eq("orgId", args.orgId).eq("date", args.date),
      )
      .unique();

    const now = Date.now();
    const data = {
      orgId: args.orgId,
      date: args.date,
      complianceScore: score,
      totalViolations: violations.length,
      newViolations: newViolations.length,
      fixedViolations: fixedViolations.length,
      byRule: JSON.stringify(byRule),
      bySeverity: JSON.stringify(bySeverity),
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      const id = await ctx.db.insert("understandAnalytics", {
        ...data,
        createdAt: now,
      });
      return id;
    }
  },
});
