/**
 * Prompt queries
 */

import { v } from "convex/values";
import { query, internalQuery } from "../../_generated/server";

/**
 * List all prompts for a project
 */
export const list = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    // Fetch active version for each prompt
    const promptsWithActiveVersion = await Promise.all(
      prompts.map(async (prompt) => {
        let activeVersion = null;
        if (prompt.activeVersionId) {
          activeVersion = await ctx.db.get(prompt.activeVersionId);
        }
        
        // Get version count
        const versions = await ctx.db
          .query("promptVersions")
          .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
          .collect();

        return {
          ...prompt,
          activeVersion,
          versionCount: versions.length,
        };
      })
    );

    return promptsWithActiveVersion;
  },
});

/**
 * Get a single prompt by ID with its active version
 */
export const get = query({
  args: {
    promptId: v.id("prompts"),
  },
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt) return null;

    let activeVersion = null;
    if (prompt.activeVersionId) {
      activeVersion = await ctx.db.get(prompt.activeVersionId);
    }

    // Get all versions
    const versions = await ctx.db
      .query("promptVersions")
      .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
      .order("desc")
      .collect();

    return {
      ...prompt,
      activeVersion,
      versions,
    };
  },
});

/**
 * Get a prompt by its key within a project
 */
export const getByKey = query({
  args: {
    projectId: v.id("projects"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const prompt = await ctx.db
      .query("prompts")
      .withIndex("by_key", (q) => 
        q.eq("projectId", args.projectId).eq("key", args.key)
      )
      .unique();

    if (!prompt) return null;

    let activeVersion = null;
    if (prompt.activeVersionId) {
      activeVersion = await ctx.db.get(prompt.activeVersionId);
    }

    return {
      ...prompt,
      activeVersion,
    };
  },
});

/**
 * Get a prompt with its linked tools
 */
export const getPromptWithTools = query({
  args: {
    promptId: v.id("prompts"),
  },
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt) return null;

    // Get linked tools
    const promptTools = await ctx.db
      .query("promptTools")
      .withIndex("by_prompt", (q) => q.eq("promptId", args.promptId))
      .collect();

    // Fetch full tool details
    const toolsWithDetails = await Promise.all(
      promptTools.map(async (pt) => {
        const tool = await ctx.db.get(pt.toolId);
        return {
          ...pt,
          tool,
        };
      })
    );

    return {
      ...prompt,
      tools: toolsWithDetails,
    };
  },
});

/**
 * Calculate completeness score for a prompt
 */
export const calculateCompleteness = query({
  args: {
    promptId: v.id("prompts"),
  },
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt) return 0;

    let score = 0;
    const weights = {
      purpose: 15,
      expectedBehavior: 15,
      inputFormat: 10,
      outputFormat: 10,
      constraints: 10,
      useCases: 10,
    };

    // Check information fields
    if (prompt.purpose?.trim()) score += weights.purpose;
    if (prompt.expectedBehavior?.trim()) score += weights.expectedBehavior;
    if (prompt.inputFormat?.trim()) score += weights.inputFormat;
    if (prompt.outputFormat?.trim()) score += weights.outputFormat;
    if (prompt.constraints?.trim()) score += weights.constraints;
    if (prompt.useCases?.trim()) score += weights.useCases;

    // Check for tools (20% weight)
    const promptTools = await ctx.db
      .query("promptTools")
      .withIndex("by_prompt", (q) => q.eq("promptId", args.promptId))
      .first();

    if (promptTools) {
      score += 20;
    }

    // Check for tool usage notes (10% weight)
    if (prompt.toolsNotes?.trim()) {
      score += 10;
    }

    return Math.round(score);
  },
});

/**
 * Count all prompts for an organization (across all projects)
 */
export const countByOrg = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Verify the organization exists
    const org = await ctx.db.get(args.orgId);
    if (!org) {
      // Organization doesn't exist - return 0 instead of throwing
      return 0;
    }

    // First get all projects for this org
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Count prompts across all projects
    let totalCount = 0;
    for (const project of projects) {
      const prompts = await ctx.db
        .query("prompts")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      totalCount += prompts.length;
    }

    return totalCount;
  },
});

/**
 * Internal query to get prompt by ID
 */
export const getByIdInternal = internalQuery({
  args: {
    promptId: v.id("prompts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.promptId);
  },
});

/**
 * Internal query to get prompt by key (for HTTP API)
 */
export const getByKeyInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const prompt = await ctx.db
      .query("prompts")
      .withIndex("by_key", (q) => 
        q.eq("projectId", args.projectId).eq("key", args.key)
      )
      .unique();

    if (!prompt) return null;

    let activeVersion = null;
    if (prompt.activeVersionId) {
      activeVersion = await ctx.db.get(prompt.activeVersionId);
    }

    return {
      ...prompt,
      activeVersion,
    };
  },
});

/**
 * Internal query to list all prompts for a project (for sync)
 */
export const listPromptsInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("prompts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

/**
 * Get all prompts for deploy (CLI deploy command)
 * Returns prompts with active version and all version history
 */
export const getPromptsForDeploy = internalQuery({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const result = await Promise.all(
      prompts.map(async (prompt) => {
        // Get active version
        let activeVersion = null;
        if (prompt.activeVersionId) {
          activeVersion = await ctx.db.get(prompt.activeVersionId);
        }

        // Get all versions
        const versions = await ctx.db
          .query("promptVersions")
          .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
          .order("desc")
          .collect();

        // Get linked tools
        const promptTools = await ctx.db
          .query("promptTools")
          .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
          .collect();

        const tools = await Promise.all(
          promptTools.map(async (pt) => {
            const tool = await ctx.db.get(pt.toolId);
            return tool
              ? {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                  isRequired: pt.isRequired,
                  usageNotes: pt.usageNotes,
                }
              : null;
          })
        );

        return {
          key: prompt.key,
          name: prompt.name,
          description: prompt.description,
          // Active version info
          activeVersion: activeVersion
            ? {
                versionNumber: activeVersion.versionNumber,
                systemPrompt: activeVersion.systemPrompt,
                description: activeVersion.description,
                updatedAt: activeVersion.updatedAt,
              }
            : null,
          // All versions for history
          versions: versions.map((v) => ({
            versionNumber: v.versionNumber,
            systemPrompt: v.systemPrompt,
            description: v.description,
            createdAt: v.createdAt,
          })),
          // Prompt metadata
          purpose: prompt.purpose,
          expectedBehavior: prompt.expectedBehavior,
          inputFormat: prompt.inputFormat,
          outputFormat: prompt.outputFormat,
          constraints: prompt.constraints,
          useCases: prompt.useCases,
          additionalNotes: prompt.additionalNotes,
          toolsNotes: prompt.toolsNotes,
          // Tools
          tools: tools.filter(Boolean),
          // Timestamps
          createdAt: prompt.createdAt,
          updatedAt: prompt.updatedAt,
        };
      })
    );

    return result;
  },
});

