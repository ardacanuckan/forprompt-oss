/**
 * Understand domain mutations - Policy and Rule management
 */

import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import { requireAuth, requireOrgAccess } from "../../lib/auth/permissions";

/**
 * Create a new policy
 */
export const createPolicy = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireOrgAccess(ctx, args.orgId);

    const now = Date.now();
    const policyId = await ctx.db.insert("understandPolicies", {
      orgId: args.orgId,
      name: args.name,
      description: args.description,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return policyId;
  },
});

/**
 * Update an existing policy
 */
export const updatePolicy = mutation({
  args: {
    policyId: v.id("understandPolicies"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { policyId, ...updates } = args;
    const policy = await ctx.db.get(policyId);

    if (!policy) {
      throw new Error("Policy not found");
    }

    await requireOrgAccess(ctx, policy.orgId);

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    );

    await ctx.db.patch(policyId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return policyId;
  },
});

/**
 * Delete a policy and all its rules (cascade delete)
 */
export const deletePolicy = mutation({
  args: { policyId: v.id("understandPolicies") },
  handler: async (ctx, args) => {
    const policy = await ctx.db.get(args.policyId);

    if (!policy) {
      throw new Error("Policy not found");
    }

    await requireOrgAccess(ctx, policy.orgId);

    // Cascade delete: remove all rules first
    const rules = await ctx.db
      .query("understandRules")
      .withIndex("by_policy", (q) => q.eq("policyId", args.policyId))
      .collect();

    for (const rule of rules) {
      await ctx.db.delete(rule._id);
    }

    // Delete the policy
    await ctx.db.delete(args.policyId);

    return { success: true };
  },
});

/**
 * Create a new rule within a policy
 */
export const createRule = mutation({
  args: {
    policyId: v.id("understandPolicies"),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    severity: v.string(),
    pattern: v.string(),
    filePatterns: v.array(v.string()),
    excludePatterns: v.optional(v.array(v.string())),
    message: v.string(),
    suggestion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { policyId, ...ruleData } = args;
    const policy = await ctx.db.get(policyId);

    if (!policy) {
      throw new Error("Policy not found");
    }

    await requireOrgAccess(ctx, policy.orgId);

    const now = Date.now();
    const ruleId = await ctx.db.insert("understandRules", {
      policyId,
      orgId: policy.orgId,
      ...ruleData,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    return ruleId;
  },
});

/**
 * Update an existing rule
 */
export const updateRule = mutation({
  args: {
    ruleId: v.id("understandRules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    severity: v.optional(v.string()),
    pattern: v.optional(v.string()),
    filePatterns: v.optional(v.array(v.string())),
    excludePatterns: v.optional(v.array(v.string())),
    message: v.optional(v.string()),
    suggestion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { ruleId, ...updates } = args;
    const rule = await ctx.db.get(ruleId);

    if (!rule) {
      throw new Error("Rule not found");
    }

    await requireOrgAccess(ctx, rule.orgId);

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    );

    await ctx.db.patch(ruleId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return ruleId;
  },
});

/**
 * Delete a rule
 */
export const deleteRule = mutation({
  args: { ruleId: v.id("understandRules") },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.ruleId);

    if (!rule) {
      throw new Error("Rule not found");
    }

    await requireOrgAccess(ctx, rule.orgId);

    await ctx.db.delete(args.ruleId);

    return { success: true };
  },
});

/**
 * Toggle a rule's enabled status
 */
export const toggleRule = mutation({
  args: { ruleId: v.id("understandRules") },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.ruleId);

    if (!rule) {
      throw new Error("Rule not found");
    }

    await requireOrgAccess(ctx, rule.orgId);

    await ctx.db.patch(args.ruleId, {
      enabled: !rule.enabled,
      updatedAt: Date.now(),
    });

    return { success: true, enabled: !rule.enabled };
  },
});
