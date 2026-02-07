/**
 * Prompt version mutations
 */

import { v } from "convex/values";
import { mutation, internalMutation } from "../../../_generated/server";
import { NotFoundError } from "../../../lib/utils/errors";

/**
 * Create a new version for a prompt (auto-increments version number)
 */
export const create = mutation({
  args: {
    promptId: v.id("prompts"),
    systemPrompt: v.string(),
    description: v.optional(v.string()),
    setAsActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt) {
      throw new NotFoundError("Prompt");
    }

    // Get the latest version number
    const latestVersion = await ctx.db
      .query("promptVersions")
      .withIndex("by_prompt", (q) => q.eq("promptId", args.promptId))
      .order("desc")
      .first();

    const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    const now = Date.now();
    const versionId = await ctx.db.insert("promptVersions", {
      promptId: args.promptId,
      versionNumber: newVersionNumber,
      systemPrompt: args.systemPrompt,
      description: args.description,
      testCount: 0,
      avgTokens: 0,
      avgResponseTime: 0,
      createdAt: now,
      updatedAt: now,
    });

    // If this is the first version or setAsActive is true, set it as active
    if (!latestVersion || args.setAsActive) {
      await ctx.db.patch(args.promptId, {
        activeVersionId: versionId,
        updatedAt: now,
      });
    }

    return versionId;
  },
});

/**
 * Update an existing prompt version's content
 */
export const update = mutation({
  args: {
    versionId: v.id("promptVersions"),
    systemPrompt: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { versionId, ...updates } = args;
    const existing = await ctx.db.get(versionId);
    if (!existing) {
      throw new NotFoundError("Prompt version");
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(versionId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });
    return versionId;
  },
});

/**
 * Delete a prompt version and its test results
 */
export const deleteVersion = mutation({
  args: {
    versionId: v.id("promptVersions"),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new NotFoundError("Version");
    }

    // Check if this is the active version
    const prompt = await ctx.db.get(version.promptId);
    if (prompt && prompt.activeVersionId === args.versionId) {
      // Find another version to set as active, or set to undefined
      const otherVersions = await ctx.db
        .query("promptVersions")
        .withIndex("by_prompt", (q) => q.eq("promptId", version.promptId))
        .filter((q) => q.neq(q.field("_id"), args.versionId))
        .order("desc")
        .first();

      await ctx.db.patch(version.promptId, {
        activeVersionId: otherVersions?._id,
        updatedAt: Date.now(),
      });
    }

    // Delete all test results first
    const testResults = await ctx.db
      .query("promptTestResults")
      .withIndex("by_version", (q) => q.eq("versionId", args.versionId))
      .collect();

    for (const result of testResults) {
      await ctx.db.delete(result._id);
    }

    // Delete the version
    await ctx.db.delete(args.versionId);
    return { success: true };
  },
});

/**
 * Rollback: Create a new version from an old one and set it as active
 */
export const rollback = mutation({
  args: {
    versionId: v.id("promptVersions"),
  },
  handler: async (ctx, args) => {
    const sourceVersion = await ctx.db.get(args.versionId);
    if (!sourceVersion) {
      throw new NotFoundError("Source version");
    }

    const prompt = await ctx.db.get(sourceVersion.promptId);
    if (!prompt) {
      throw new NotFoundError("Prompt");
    }

    // Get the latest version number
    const latestVersion = await ctx.db
      .query("promptVersions")
      .withIndex("by_prompt", (q) => q.eq("promptId", sourceVersion.promptId))
      .order("desc")
      .first();

    const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    const now = Date.now();
    const newVersionId = await ctx.db.insert("promptVersions", {
      promptId: sourceVersion.promptId,
      versionNumber: newVersionNumber,
      systemPrompt: sourceVersion.systemPrompt,
      description: `Rollback from v${sourceVersion.versionNumber}`,
      testCount: 0,
      avgTokens: 0,
      avgResponseTime: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Set the new version as active
    await ctx.db.patch(sourceVersion.promptId, {
      activeVersionId: newVersionId,
      updatedAt: now,
    });

    return newVersionId;
  },
});

/**
 * Save AI analysis result for a prompt version (internal - called from actions)
 */
export const saveAnalysisResultInternal = internalMutation({
  args: {
    versionId: v.id("promptVersions"),
    clarityScore: v.number(),
    improvements: v.array(v.string()),
    edgeCases: v.array(v.string()),
    optimizations: v.array(v.string()),
    overallAssessment: v.string(),
    alignmentCheck: v.optional(v.object({
      purposeAlignment: v.object({
        score: v.number(),
        feedback: v.string(),
      }),
      behaviorAlignment: v.object({
        score: v.number(),
        feedback: v.string(),
      }),
      constraintsAlignment: v.object({
        score: v.number(),
        feedback: v.string(),
      }),
    })),
    toolUsageAnalysis: v.optional(v.object({
      tools: v.array(v.object({
        name: v.string(),
        isProperlyInstructed: v.boolean(),
        issues: v.array(v.string()),
        suggestions: v.array(v.string()),
      })),
      overallToolUsage: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const { versionId, ...analysisData } = args;

    // Insert new analysis result (no need to verify version in internal mutation)
    const resultId = await ctx.db.insert("promptAnalysisResults", {
      versionId,
      ...analysisData,
      createdAt: Date.now(),
    });

    return resultId;
  },
});

