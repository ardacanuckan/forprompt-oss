/**
 * Prompt mutations
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { validatePromptKey } from "../../lib/utils/validators";
import { ConflictError, NotFoundError } from "../../lib/utils/errors";

/**
 * Create a new prompt
 */
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    key: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
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

    // Trigger webhook: prompt.created
    await ctx.scheduler.runAfter(0, internal.domains.webhooks.delivery.triggerWebhooks, {
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
    });

    return promptId;
  },
});

/**
 * Update a prompt's metadata
 */
export const update = mutation({
  args: {
    promptId: v.id("prompts"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { promptId, ...updates } = args;
    const existing = await ctx.db.get(promptId);
    
    if (!existing) {
      throw new NotFoundError("Prompt");
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    const now = Date.now();
    await ctx.db.patch(promptId, {
      ...filteredUpdates,
      updatedAt: now,
    });

    // Trigger webhook: prompt.updated
    await ctx.scheduler.runAfter(0, internal.domains.webhooks.delivery.triggerWebhooks, {
      projectId: existing.projectId,
      event: "prompt.updated",
      payload: {
        event: "prompt.updated",
        timestamp: now,
        projectId: existing.projectId,
        data: {
          promptId,
          promptKey: existing.key,
          ...filteredUpdates,
        },
      },
    });

    return promptId;
  },
});

/**
 * Set the active version for a prompt
 */
export const setActiveVersion = mutation({
  args: {
    promptId: v.id("prompts"),
    versionId: v.id("promptVersions"),
  },
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt) {
      throw new NotFoundError("Prompt");
    }

    // Verify the version belongs to this prompt
    const version = await ctx.db.get(args.versionId);
    if (!version || version.promptId !== args.promptId) {
      throw new Error("Version does not belong to this prompt");
    }

    const now = Date.now();
    await ctx.db.patch(args.promptId, {
      activeVersionId: args.versionId,
      updatedAt: now,
    });

    // Trigger webhook: prompt.version.activated
    await ctx.scheduler.runAfter(0, internal.domains.webhooks.delivery.triggerWebhooks, {
      projectId: prompt.projectId,
      event: "prompt.version.activated",
      payload: {
        event: "prompt.version.activated",
        timestamp: now,
        projectId: prompt.projectId,
        data: {
          promptId: args.promptId,
          promptKey: prompt.key,
          versionId: args.versionId,
          versionNumber: version.versionNumber,
          systemPrompt: version.systemPrompt,
        },
      },
    });

    return { success: true };
  },
});

/**
 * Delete a prompt and all its versions (cascade delete)
 */
export const deletePrompt = mutation({
  args: {
    promptId: v.id("prompts"),
  },
  handler: async (ctx, args) => {
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt) {
      throw new NotFoundError("Prompt");
    }

    // Get all versions for this prompt
    const versions = await ctx.db
      .query("promptVersions")
      .withIndex("by_prompt", (q) => q.eq("promptId", args.promptId))
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
    await ctx.db.delete(args.promptId);

    // Trigger webhook: prompt.deleted
    const now = Date.now();
    await ctx.scheduler.runAfter(0, internal.domains.webhooks.delivery.triggerWebhooks, {
      projectId: prompt.projectId,
      event: "prompt.deleted",
      payload: {
        event: "prompt.deleted",
        timestamp: now,
        projectId: prompt.projectId,
        data: {
          promptId: args.promptId,
          promptKey: prompt.key,
        },
      },
    });

    return { success: true };
  },
});

/**
 * Update prompt information fields
 */
export const updateInformation = mutation({
  args: {
    promptId: v.id("prompts"),
    purpose: v.optional(v.string()),
    expectedBehavior: v.optional(v.string()),
    inputFormat: v.optional(v.string()),
    outputFormat: v.optional(v.string()),
    constraints: v.optional(v.string()),
    useCases: v.optional(v.string()),
    additionalNotes: v.optional(v.string()),
    toolsNotes: v.optional(v.string()),
    referencePrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { promptId, ...updates } = args;
    const existing = await ctx.db.get(promptId);

    if (!existing) {
      throw new NotFoundError("Prompt");
    }

    // Validate field lengths
    const maxLengths = {
      purpose: 4000,
      expectedBehavior: 4000,
      inputFormat: 4000,
      outputFormat: 4000,
      constraints: 4000,
      useCases: 4000,
      additionalNotes: 4000,
      toolsNotes: 4000,
      referencePrompt: 50000, // Allow longer reference prompts
    };

    for (const [field, value] of Object.entries(updates)) {
      if (value && typeof value === 'string') {
        const maxLength = maxLengths[field as keyof typeof maxLengths];
        if (maxLength && value.length > maxLength) {
          throw new Error(
            `${field} exceeds maximum length of ${maxLength} characters`
          );
        }
      }
    }

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(promptId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return promptId;
  },
});

/**
 * Duplicate a prompt to another project (or same project with new key)
 */
export const duplicate = mutation({
  args: {
    promptId: v.id("prompts"),
    targetProjectId: v.id("projects"),
    newKey: v.string(),
    newName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.promptId);
    if (!source) {
      throw new NotFoundError("Source prompt");
    }

    // Check if key already exists in target project
    const existing = await ctx.db
      .query("prompts")
      .withIndex("by_key", (q) => 
        q.eq("projectId", args.targetProjectId).eq("key", args.newKey)
      )
      .unique();

    if (existing) {
      throw new ConflictError(
        `Prompt with key "${args.newKey}" already exists in the target project`
      );
    }

    const now = Date.now();

    // Create the new prompt
    const newPromptId = await ctx.db.insert("prompts", {
      projectId: args.targetProjectId,
      key: args.newKey,
      name: args.newName ?? source.name,
      description: source.description,
      activeVersionId: undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Copy all versions from source
    const sourceVersions = await ctx.db
      .query("promptVersions")
      .withIndex("by_prompt", (q) => q.eq("promptId", args.promptId))
      .order("asc")
      .collect();

    let newActiveVersionId: typeof source.activeVersionId;

    for (const version of sourceVersions) {
      const newVersionId = await ctx.db.insert("promptVersions", {
        promptId: newPromptId,
        versionNumber: version.versionNumber,
        systemPrompt: version.systemPrompt,
        description: version.description,
        testCount: 0,
        avgTokens: 0,
        avgResponseTime: 0,
        createdAt: now,
        updatedAt: now,
      });

      // If this was the active version, mark the new one as active
      if (source.activeVersionId && version._id === source.activeVersionId) {
        newActiveVersionId = newVersionId;
      }
    }

    // Set the active version
    if (newActiveVersionId) {
      await ctx.db.patch(newPromptId, {
        activeVersionId: newActiveVersionId,
      });
    }

    return newPromptId;
  },
});

