/**
 * Memory queries
 */

import { v } from "convex/values";

import { query } from "../../../_generated/server";
import { requireOrgAccess } from "../../../lib/auth/permissions";

/**
 * List memory entries with optional type filter
 */
export const listMemory = query({
  args: {
    orgId: v.id("organizations"),
    type: v.optional(v.string()), // "pattern" | "exception" | "preference" | "knowledge"
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    if (args.type) {
      const memory = await ctx.db
        .query("understandMemory")
        .withIndex("by_org_type", (q) =>
          q.eq("orgId", args.orgId).eq("type", args.type as string),
        )
        .order("desc")
        .collect();
      return memory;
    }

    const memory = await ctx.db
      .query("understandMemory")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
    return memory;
  },
});

/**
 * Get single memory entry by ID
 */
export const getMemory = query({
  args: {
    memoryId: v.id("understandMemory"),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db.get(args.memoryId);
    if (!memory) return null;

    await requireOrgAccess(ctx, memory.orgId);
    return memory;
  },
});

/**
 * Get memory by unique key
 */
export const getMemoryByKey = query({
  args: {
    orgId: v.id("organizations"),
    type: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const memory = await ctx.db
      .query("understandMemory")
      .withIndex("by_org_key", (q) =>
        q.eq("orgId", args.orgId).eq("type", args.type).eq("key", args.key),
      )
      .unique();

    return memory;
  },
});

/**
 * Search memory content
 */
export const searchMemory = query({
  args: {
    orgId: v.id("organizations"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const allMemory = await ctx.db
      .query("understandMemory")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Simple text search in content and key
    const searchLower = args.query.toLowerCase();
    const results = allMemory.filter(
      (m) =>
        m.content.toLowerCase().includes(searchLower) ||
        m.key.toLowerCase().includes(searchLower),
    );

    return results;
  },
});

/**
 * Get full memory context for AI (all memory entries formatted)
 */
export const getMemoryContext = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const allMemory = await ctx.db
      .query("understandMemory")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Group by type
    const grouped = {
      patterns: allMemory.filter((m) => m.type === "pattern"),
      exceptions: allMemory.filter((m) => m.type === "exception"),
      preferences: allMemory.filter((m) => m.type === "preference"),
      knowledge: allMemory.filter((m) => m.type === "knowledge"),
    };

    return grouped;
  },
});
