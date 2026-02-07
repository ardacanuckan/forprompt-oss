/**
 * Prompt version queries
 */

import { v } from "convex/values";
import { query, internalQuery } from "../../../_generated/server";

/**
 * List all versions for a prompt
 * @deprecated Use prompts.get instead, which includes versions
 */
export const list = query({
  args: {
    promptId: v.optional(v.id("prompts")),
  },
  handler: async (ctx, args) => {
    if (!args.promptId) return [];
    
    const promptId = args.promptId;
    return await ctx.db
      .query("promptVersions")
      .withIndex("by_prompt", (q) => q.eq("promptId", promptId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a single prompt version by ID
 */
export const get = query({
  args: {
    versionId: v.id("promptVersions"),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) return null;

    // Get the parent prompt to check if this is the active version
    const prompt = await ctx.db.get(version.promptId);
    
    return {
      ...version,
      isActive: prompt?.activeVersionId === version._id,
    };
  },
});

/**
 * Get the latest version number for a prompt
 */
export const getLatestVersionNumber = query({
  args: {
    promptId: v.id("prompts"),
  },
  handler: async (ctx, args) => {
    const latestVersion = await ctx.db
      .query("promptVersions")
      .withIndex("by_prompt", (q) => q.eq("promptId", args.promptId))
      .order("desc")
      .first();

    return latestVersion?.versionNumber ?? 0;
  },
});

/**
 * Get test results for a prompt version
 */
export const getTestResults = query({
  args: {
    versionId: v.id("promptVersions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("promptTestResults")
      .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
      .order("desc")
      .take(args.limit ?? 50);
    return results;
  },
});

/**
 * Internal: Get a single prompt version by ID (for actions)
 */
export const getInternal = internalQuery({
  args: {
    versionId: v.id("promptVersions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.versionId);
  },
});

/**
 * Internal: Get a single prompt version by ID (for sync API)
 */
export const getVersionInternal = internalQuery({
  args: {
    versionId: v.id("promptVersions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.versionId);
  },
});

/**
 * Get the latest AI analysis result for a prompt version
 */
export const getLatestAnalysis = query({
  args: {
    versionId: v.id("promptVersions"),
  },
  handler: async (ctx, args) => {
    const latestAnalysis = await ctx.db
      .query("promptAnalysisResults")
      .withIndex("by_version_created", (q) => q.eq("versionId", args.versionId))
      .order("desc")
      .first();

    return latestAnalysis;
  },
});

