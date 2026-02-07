/**
 * Violation queries
 */

import { v } from "convex/values";

import { query } from "../../../_generated/server";
import { requireOrgAccess } from "../../../lib/auth/permissions";

/**
 * List violations with optional filters
 */
export const listViolations = query({
  args: {
    orgId: v.id("organizations"),
    status: v.optional(v.string()), // "flagged" | "fixed" | "approved" | "ignored"
    severity: v.optional(v.string()), // "error" | "warning" | "info"
    ruleId: v.optional(v.id("understandRules")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    let query = ctx.db
      .query("understandViolations")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId));

    // Apply filters if provided
    if (args.status !== undefined) {
      query = ctx.db
        .query("understandViolations")
        .withIndex("by_org_status", (q) =>
          q.eq("orgId", args.orgId).eq("status", args.status!),
        );
    } else if (args.severity !== undefined) {
      query = ctx.db
        .query("understandViolations")
        .withIndex("by_org_severity", (q) =>
          q.eq("orgId", args.orgId).eq("severity", args.severity!),
        );
    }

    const violations = await query.order("desc").take(args.limit ?? 100);

    return violations;
  },
});

/**
 * Get single violation by ID
 */
export const getViolation = query({
  args: {
    violationId: v.id("understandViolations"),
  },
  handler: async (ctx, args) => {
    const violation = await ctx.db.get(args.violationId);
    if (!violation) return null;

    await requireOrgAccess(ctx, violation.orgId);
    return violation;
  },
});

/**
 * Get violations for a specific rule
 */
export const getViolationsByRule = query({
  args: {
    ruleId: v.id("understandRules"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.ruleId);
    if (!rule) return [];

    await requireOrgAccess(ctx, rule.orgId);

    const violations = await ctx.db
      .query("understandViolations")
      .withIndex("by_rule", (q) => q.eq("ruleId", args.ruleId))
      .order("desc")
      .take(args.limit ?? 100);

    return violations;
  },
});

/**
 * Get quick stats for violations
 */
export const getViolationStats = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const violations = await ctx.db
      .query("understandViolations")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const stats = {
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

    return stats;
  },
});
