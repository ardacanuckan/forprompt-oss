/**
 * Tool management mutations
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { ConflictError, NotFoundError } from "../../lib/utils/errors";

/**
 * Create a new organization tool
 */
export const createTool = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    description: v.string(),
    parameters: v.string(), // JSON schema as string
    category: v.optional(v.string()),
    exampleUsage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }
    
    // Get user from identity
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    
    if (!user) {
      throw new Error("User not found");
    }

    // Validate JSON schema
    try {
      JSON.parse(args.parameters);
    } catch (error) {
      throw new Error("Invalid JSON schema for parameters");
    }

    // Check if tool name already exists in this org
    const existing = await ctx.db
      .query("organizationTools")
      .withIndex("by_name", (q) => 
        q.eq("orgId", args.orgId).eq("name", args.name)
      )
      .unique();

    if (existing) {
      throw new ConflictError(
        `Tool with name "${args.name}" already exists in this organization`
      );
    }

    const now = Date.now();
    const toolId = await ctx.db.insert("organizationTools", {
      orgId: args.orgId,
      name: args.name,
      description: args.description,
      parameters: args.parameters,
      category: args.category,
      exampleUsage: args.exampleUsage,
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return toolId;
  },
});

/**
 * Update an existing tool
 */
export const updateTool = mutation({
  args: {
    toolId: v.id("organizationTools"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    parameters: v.optional(v.string()),
    category: v.optional(v.string()),
    exampleUsage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new NotFoundError("Tool not found");
    }

    // Validate JSON schema if provided
    if (args.parameters) {
      try {
        JSON.parse(args.parameters);
      } catch (error) {
        throw new Error("Invalid JSON schema for parameters");
      }
    }

    // Check for name conflicts if name is being changed
    if (args.name && args.name !== tool.name) {
      const existing = await ctx.db
        .query("organizationTools")
        .withIndex("by_name", (q) => 
          q.eq("orgId", tool.orgId).eq("name", args.name!)
        )
        .unique();

      if (existing) {
        throw new ConflictError(
          `Tool with name "${args.name}" already exists in this organization`
        );
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.toolId, {
      ...(args.name && { name: args.name }),
      ...(args.description && { description: args.description }),
      ...(args.parameters && { parameters: args.parameters }),
      ...(args.category !== undefined && { category: args.category }),
      ...(args.exampleUsage !== undefined && { exampleUsage: args.exampleUsage }),
      updatedAt: now,
    });

    return args.toolId;
  },
});

/**
 * Delete a tool (checks if it's in use first)
 */
export const deleteTool = mutation({
  args: {
    toolId: v.id("organizationTools"),
  },
  handler: async (ctx, args) => {
    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new NotFoundError("Tool not found");
    }

    // Check if tool is being used by any prompts
    const usage = await ctx.db
      .query("promptTools")
      .withIndex("by_tool", (q) => q.eq("toolId", args.toolId))
      .first();

    if (usage) {
      throw new Error(
        "Cannot delete tool that is currently being used by prompts. Remove it from all prompts first."
      );
    }

    await ctx.db.delete(args.toolId);
  },
});

/**
 * Add a tool to a prompt
 */
export const addToolToPrompt = mutation({
  args: {
    promptId: v.id("prompts"),
    toolId: v.id("organizationTools"),
    isRequired: v.boolean(),
    usageNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if prompt exists
    const prompt = await ctx.db.get(args.promptId);
    if (!prompt) {
      throw new NotFoundError("Prompt not found");
    }

    // Check if tool exists
    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new NotFoundError("Tool not found");
    }

    // Check if already linked
    const existing = await ctx.db
      .query("promptTools")
      .withIndex("by_prompt_tool", (q) => 
        q.eq("promptId", args.promptId).eq("toolId", args.toolId)
      )
      .unique();

    if (existing) {
      throw new ConflictError("Tool is already linked to this prompt");
    }

    const now = Date.now();
    const promptToolId = await ctx.db.insert("promptTools", {
      promptId: args.promptId,
      toolId: args.toolId,
      isRequired: args.isRequired,
      usageNotes: args.usageNotes,
      createdAt: now,
    });

    return promptToolId;
  },
});

/**
 * Remove a tool from a prompt
 */
export const removeToolFromPrompt = mutation({
  args: {
    promptId: v.id("prompts"),
    toolId: v.id("organizationTools"),
  },
  handler: async (ctx, args) => {
    const promptTool = await ctx.db
      .query("promptTools")
      .withIndex("by_prompt_tool", (q) => 
        q.eq("promptId", args.promptId).eq("toolId", args.toolId)
      )
      .unique();

    if (!promptTool) {
      throw new NotFoundError("Tool is not linked to this prompt");
    }

    await ctx.db.delete(promptTool._id);
  },
});

/**
 * Update prompt tool configuration
 */
export const updatePromptToolConfig = mutation({
  args: {
    promptId: v.id("prompts"),
    toolId: v.id("organizationTools"),
    isRequired: v.optional(v.boolean()),
    usageNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const promptTool = await ctx.db
      .query("promptTools")
      .withIndex("by_prompt_tool", (q) => 
        q.eq("promptId", args.promptId).eq("toolId", args.toolId)
      )
      .unique();

    if (!promptTool) {
      throw new NotFoundError("Tool is not linked to this prompt");
    }

    await ctx.db.patch(promptTool._id, {
      ...(args.isRequired !== undefined && { isRequired: args.isRequired }),
      ...(args.usageNotes !== undefined && { usageNotes: args.usageNotes }),
    });
  },
});

