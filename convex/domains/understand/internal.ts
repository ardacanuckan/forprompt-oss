/**
 * Internal operations for understand domain
 */

import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";

/**
 * Scheduled job: Recalculate analytics for all organizations
 * This mutation is called by a cron job at midnight UTC
 *
 * Note: The actual cron scheduling is configured in convex.json
 * This mutation iterates through all organizations and schedules
 * individual recalculation tasks for each org
 */
export const recalculateAllAnalytics = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all organizations
    const orgs = await ctx.db.query("organizations").collect();

    const today = new Date().toISOString().split("T")[0];

    // For each organization, create an analytics record if it doesn't exist
    // This is a simplified approach that doesn't require scheduler.runAfter
    for (const org of orgs) {
      // Check if analytics record exists for today
      const existing = await ctx.db
        .query("understandAnalytics")
        .withIndex("by_org_date", (q) =>
          q.eq("orgId", org._id).eq("date", today!),
        )
        .unique();

      if (!existing) {
        // Get all violations for this org
        const violations = await ctx.db
          .query("understandViolations")
          .withIndex("by_org", (q) => q.eq("orgId", org._id))
          .collect();

        // Count by severity
        const bySeverity = {
          error: violations.filter((v) => v.severity === "error").length,
          warning: violations.filter((v) => v.severity === "warning").length,
          info: violations.filter((v) => v.severity === "info").length,
        };

        // Calculate compliance score
        const score = Math.max(
          0,
          100 -
            (bySeverity.error * 10 +
              bySeverity.warning * 5 +
              bySeverity.info * 1),
        );

        // Count by rule
        const byRule: Record<string, number> = {};
        for (const v of violations) {
          byRule[v.ruleId] = (byRule[v.ruleId] || 0) + 1;
        }

        // Create analytics record
        const now = Date.now();
        await ctx.db.insert("understandAnalytics", {
          orgId: org._id,
          date: today!,
          complianceScore: score,
          totalViolations: violations.length,
          newViolations: 0,
          fixedViolations: 0,
          byRule: JSON.stringify(byRule),
          bySeverity: JSON.stringify(bySeverity),
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});
