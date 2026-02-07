/**
 * Understand domain queries - Policy and Rule management
 */

import { v } from "convex/values";

import { query } from "../../_generated/server";
import { requireOrgAccess } from "../../lib/auth/permissions";

/**
 * List all policies for an organization
 */
export const listPolicies = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    return await ctx.db
      .query("understandPolicies")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a single policy with all its rules
 */
export const getPolicy = query({
  args: { policyId: v.id("understandPolicies") },
  handler: async (ctx, args) => {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) return null;

    await requireOrgAccess(ctx, policy.orgId);

    // Get all rules for this policy
    const rules = await ctx.db
      .query("understandRules")
      .withIndex("by_policy", (q) => q.eq("policyId", args.policyId))
      .collect();

    return { ...policy, rules };
  },
});

/**
 * List all rules for a specific policy
 */
export const listRules = query({
  args: { policyId: v.id("understandPolicies") },
  handler: async (ctx, args) => {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) return [];

    await requireOrgAccess(ctx, policy.orgId);

    return await ctx.db
      .query("understandRules")
      .withIndex("by_policy", (q) => q.eq("policyId", args.policyId))
      .collect();
  },
});

/**
 * Get a single rule by ID
 */
export const getRule = query({
  args: { ruleId: v.id("understandRules") },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.ruleId);
    if (!rule) return null;

    await requireOrgAccess(ctx, rule.orgId);

    return rule;
  },
});
