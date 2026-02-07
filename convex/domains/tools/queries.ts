/**
 * Tool queries
 */

import { v } from "convex/values";
import { query, internalQuery } from "../../_generated/server";
import { NotFoundError } from "../../lib/utils/errors";

/**
 * List all tools for an organization with optional filters
 */
export const listOrgTools = query({
  args: {
    orgId: v.id("organizations"),
    category: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let toolsQuery = ctx.db
      .query("organizationTools")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId));

    // Apply category filter if provided
    if (args.category) {
      toolsQuery = ctx.db
        .query("organizationTools")
        .withIndex("by_category", (q) => 
          q.eq("orgId", args.orgId).eq("category", args.category)
        );
    }

    let tools = await toolsQuery.collect();

    // Apply search filter if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      tools = tools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchLower) ||
          tool.description.toLowerCase().includes(searchLower)
      );
    }

    return tools;
  },
});

/**
 * Get a single tool by ID
 */
export const getTool = query({
  args: {
    toolId: v.id("organizationTools"),
  },
  handler: async (ctx, args) => {
    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new NotFoundError("Tool not found");
    }
    return tool;
  },
});

/**
 * Get all tools linked to a prompt with their details
 */
export const getPromptTools = query({
  args: {
    promptId: v.id("prompts"),
  },
  handler: async (ctx, args) => {
    const promptTools = await ctx.db
      .query("promptTools")
      .withIndex("by_prompt", (q) => q.eq("promptId", args.promptId))
      .collect();

    // Fetch full tool details for each linked tool
    const toolsWithDetails = await Promise.all(
      promptTools.map(async (pt) => {
        const tool = await ctx.db.get(pt.toolId);
        return {
          ...pt,
          tool,
        };
      })
    );

    return toolsWithDetails;
  },
});

/**
 * Get usage count for a tool (how many prompts use it)
 */
export const getToolUsageCount = query({
  args: {
    toolId: v.id("organizationTools"),
  },
  handler: async (ctx, args) => {
    const usages = await ctx.db
      .query("promptTools")
      .withIndex("by_tool", (q) => q.eq("toolId", args.toolId))
      .collect();

    return usages.length;
  },
});

/**
 * Search tools by name or description
 */
export const searchTools = query({
  args: {
    orgId: v.id("organizations"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const allTools = await ctx.db
      .query("organizationTools")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const searchLower = args.query.toLowerCase();
    return allTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(searchLower) ||
        tool.description.toLowerCase().includes(searchLower)
    );
  },
});

/**
 * Internal query to get prompt tools (for actions)
 */
export const getPromptToolsInternal = internalQuery({
  args: {
    promptId: v.id("prompts"),
  },
  handler: async (ctx, args) => {
    const promptTools = await ctx.db
      .query("promptTools")
      .withIndex("by_prompt", (q) => q.eq("promptId", args.promptId))
      .collect();

    // Fetch full tool details for each linked tool
    const toolsWithDetails = await Promise.all(
      promptTools.map(async (pt) => {
        const tool = await ctx.db.get(pt.toolId);
        return {
          ...pt,
          tool,
        };
      })
    );

    return toolsWithDetails;
  },
});

