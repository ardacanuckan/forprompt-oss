/**
 * Project queries
 */

import { v } from "convex/values";
import { query, internalQuery } from "../../_generated/server";

/**
 * List all projects for an organization
 */
export const list = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a single project by ID
 */
export const get = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

/**
 * Get a project by slug within an organization
 */
export const getBySlug = query({
  args: {
    orgId: v.id("organizations"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) =>
        q.eq("orgId", args.orgId).eq("slug", args.slug)
      )
      .unique();
  },
});

/**
 * Internal: Get a project by ID (for actions and internal functions)
 */
export const getInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

