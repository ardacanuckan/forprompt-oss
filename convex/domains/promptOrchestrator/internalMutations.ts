/**
 * Internal mutations for prompt orchestrator (used by HTTP API)
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { validatePromptKey } from "../../lib/utils/validators";
import { ConflictError, NotFoundError } from "../../lib/utils/errors";

/**
 * Create a new prompt (internal - called from HTTP API)
 */
export const createPromptInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    key: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate key format
    validatePromptKey(args.key);

    // Check if key already exists in this project
    const existing = await ctx.db
      .query("prompts")
      .withIndex("by_key", (q) =>
        q.eq("projectId", args.projectId).eq("key", args.key)
      )
      .unique();

    if (existing) {
      throw new ConflictError(
        `Prompt with key "${args.key}" already exists in this project`
      );
    }

    const now = Date.now();
    const promptId = await ctx.db.insert("prompts", {
      projectId: args.projectId,
      key: args.key,
      name: args.name,
      description: args.description,
      activeVersionId: undefined,
      createdAt: now,
      updatedAt: now,
    });

    // If systemPrompt is provided, create initial version
    let versionId = undefined;
    let versionNumber = undefined;
    if (args.systemPrompt) {
      versionId = await ctx.db.insert("promptVersions", {
        promptId,
        versionNumber: 1,
        systemPrompt: args.systemPrompt,
        description: "Initial version",
        testCount: 0,
        avgTokens: 0,
        avgResponseTime: 0,
        createdAt: now,
        updatedAt: now,
      });
      versionNumber = 1;

      // Set as active version
      await ctx.db.patch(promptId, {
        activeVersionId: versionId,
      });
    }

    // Trigger webhook: prompt.created
    await ctx.scheduler.runAfter(
      0,
      internal.domains.webhooks.delivery.triggerWebhooks,
      {
        projectId: args.projectId,
        event: "prompt.created",
        payload: {
          event: "prompt.created",
          timestamp: now,
          projectId: args.projectId,
          data: {
            promptId,
            promptKey: args.key,
            name: args.name,
            description: args.description,
          },
        },
      }
    );

    return { promptId, versionId, versionNumber };
  },
});

/**
 * Update a prompt's metadata (internal - called from HTTP API)
 */
export const updatePromptInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    key: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    purpose: v.optional(v.string()),
    expectedBehavior: v.optional(v.string()),
    inputFormat: v.optional(v.string()),
    outputFormat: v.optional(v.string()),
    constraints: v.optional(v.string()),
    useCases: v.optional(v.string()),
    additionalNotes: v.optional(v.string()),
    toolsNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { projectId, key, ...updates } = args;

    // Find the prompt by key
    const prompt = await ctx.db
      .query("prompts")
      .withIndex("by_key", (q) => q.eq("projectId", projectId).eq("key", key))
      .unique();

    if (!prompt) {
      throw new NotFoundError(`Prompt with key "${key}" not found`);
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    const now = Date.now();
    await ctx.db.patch(prompt._id, {
      ...filteredUpdates,
      updatedAt: now,
    });

    // Trigger webhook: prompt.updated
    await ctx.scheduler.runAfter(
      0,
      internal.domains.webhooks.delivery.triggerWebhooks,
      {
        projectId,
        event: "prompt.updated",
        payload: {
          event: "prompt.updated",
          timestamp: now,
          projectId,
          data: {
            promptId: prompt._id,
            promptKey: key,
            ...filteredUpdates,
          },
        },
      }
    );

    return { promptId: prompt._id };
  },
});

/**
 * Create a new version for a prompt (internal - called from HTTP API)
 */
export const createVersionInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    key: v.string(),
    systemPrompt: v.string(),
    description: v.optional(v.string()),
    setAsActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Find the prompt by key
    const prompt = await ctx.db
      .query("prompts")
      .withIndex("by_key", (q) =>
        q.eq("projectId", args.projectId).eq("key", args.key)
      )
      .unique();

    if (!prompt) {
      throw new NotFoundError(`Prompt with key "${args.key}" not found`);
    }

    // Get the latest version number
    const latestVersion = await ctx.db
      .query("promptVersions")
      .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
      .order("desc")
      .first();

    const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    const now = Date.now();
    const versionId = await ctx.db.insert("promptVersions", {
      promptId: prompt._id,
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
    if (!latestVersion || args.setAsActive !== false) {
      await ctx.db.patch(prompt._id, {
        activeVersionId: versionId,
        updatedAt: now,
      });
    }

    // Trigger webhook: prompt.version.activated (if set as active)
    if (!latestVersion || args.setAsActive !== false) {
      await ctx.scheduler.runAfter(
        0,
        internal.domains.webhooks.delivery.triggerWebhooks,
        {
          projectId: args.projectId,
          event: "prompt.version.activated",
          payload: {
            event: "prompt.version.activated",
            timestamp: now,
            projectId: args.projectId,
            data: {
              promptId: prompt._id,
              promptKey: prompt.key,
              versionId,
              versionNumber: newVersionNumber,
            },
          },
        }
      );
    }

    return { versionId, versionNumber: newVersionNumber };
  },
});

/**
 * Delete a prompt (internal - called from HTTP API)
 */
export const deletePromptInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the prompt by key
    const prompt = await ctx.db
      .query("prompts")
      .withIndex("by_key", (q) =>
        q.eq("projectId", args.projectId).eq("key", args.key)
      )
      .unique();

    if (!prompt) {
      throw new NotFoundError(`Prompt with key "${args.key}" not found`);
    }

    // Get all versions for this prompt
    const versions = await ctx.db
      .query("promptVersions")
      .withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
      .collect();

    // Delete all test results and versions
    for (const version of versions) {
      const testResults = await ctx.db
        .query("promptTestResults")
        .withIndex("by_version", (q) => q.eq("versionId", version._id))
        .collect();

      for (const result of testResults) {
        await ctx.db.delete(result._id);
      }

      await ctx.db.delete(version._id);
    }

    // Delete the prompt
    await ctx.db.delete(prompt._id);

    // Trigger webhook: prompt.deleted
    const now = Date.now();
    await ctx.scheduler.runAfter(
      0,
      internal.domains.webhooks.delivery.triggerWebhooks,
      {
        projectId: args.projectId,
        event: "prompt.deleted",
        payload: {
          event: "prompt.deleted",
          timestamp: now,
          projectId: args.projectId,
          data: {
            promptId: prompt._id,
            promptKey: args.key,
          },
        },
      }
    );

    return { success: true };
  },
});
