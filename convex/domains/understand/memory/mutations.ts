/**
 * Memory mutations
 */

import { v } from "convex/values";

import { mutation } from "../../../_generated/server";
import { requireAuth, requireOrgAccess } from "../../../lib/auth/permissions";
import { NotFoundError } from "../../../lib/utils/errors";

/**
 * Create a new memory entry
 */
export const createMemory = mutation({
  args: {
    orgId: v.id("organizations"),
    type: v.string(), // "pattern" | "exception" | "preference" | "knowledge"
    key: v.string(),
    content: v.string(),
    context: v.optional(v.string()), // JSON metadata
    source: v.string(), // "cli" | "web" | "auto-learned"
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireOrgAccess(ctx, args.orgId);

    const now = Date.now();
    const memoryId = await ctx.db.insert("understandMemory", {
      orgId: args.orgId,
      type: args.type,
      key: args.key,
      content: args.content,
      context: args.context,
      source: args.source,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return memoryId;
  },
});

/**
 * Update memory content
 */
export const updateMemory = mutation({
  args: {
    memoryId: v.id("understandMemory"),
    content: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const memory = await ctx.db.get(args.memoryId);
    if (!memory) {
      throw new NotFoundError("Memory");
    }

    await requireOrgAccess(ctx, memory.orgId);

    const now = Date.now();
    await ctx.db.patch(args.memoryId, {
      content: args.content,
      context: args.context ?? memory.context,
      updatedAt: now,
    });

    return args.memoryId;
  },
});

/**
 * Delete memory entry
 */
export const deleteMemory = mutation({
  args: {
    memoryId: v.id("understandMemory"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const memory = await ctx.db.get(args.memoryId);
    if (!memory) {
      throw new NotFoundError("Memory");
    }

    await requireOrgAccess(ctx, memory.orgId);

    await ctx.db.delete(args.memoryId);
    return args.memoryId;
  },
});

/**
 * Upsert memory (create or update by key)
 */
export const upsertMemory = mutation({
  args: {
    orgId: v.id("organizations"),
    type: v.string(),
    key: v.string(),
    content: v.string(),
    context: v.optional(v.string()),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    await requireOrgAccess(ctx, args.orgId);

    // Check if exists
    const existing = await ctx.db
      .query("understandMemory")
      .withIndex("by_org_key", (q) =>
        q.eq("orgId", args.orgId).eq("type", args.type).eq("key", args.key),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        content: args.content,
        context: args.context,
        source: args.source,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new
      const memoryId = await ctx.db.insert("understandMemory", {
        orgId: args.orgId,
        type: args.type,
        key: args.key,
        content: args.content,
        context: args.context,
        source: args.source,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      return memoryId;
    }
  },
});
