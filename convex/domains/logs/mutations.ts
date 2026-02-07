/**
 * Conversation logging mutations
 * Implements trace/span model for logging AI conversations
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { internal } from "../../_generated/api";

/**
 * Log a span - automatically creates trace if it doesn't exist
 * This is the main logging endpoint used by SDK
 */
export const logSpan = mutation({
  args: {
    projectId: v.id("projects"),
    traceId: v.string(),
    promptKey: v.string(),
    versionNumber: v.optional(v.number()), // Prompt version for analytics
    type: v.string(), // "message", "llm_call", "tool_call"
    // Message fields
    role: v.optional(v.string()),
    content: v.optional(v.string()),
    // LLM metadata
    model: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    // Source and metadata
    source: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { traceId, promptKey, versionNumber, source, projectId, ...spanData } = args;

    // Check if trace exists
    const existingTrace = await ctx.db
      .query("traces")
      .withIndex("by_trace_id", (q) => q.eq("traceId", traceId))
      .first();

    if (!existingTrace) {
      // Create new trace
      await ctx.db.insert("traces", {
        projectId,
        traceId,
        promptKey,
        versionNumber,
        model: spanData.model || undefined,
        source: source || "unknown",
        status: "active",
        spanCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Update promptVersion testCount if versionNumber is provided
      if (versionNumber !== undefined) {
        // Find the prompt by key and project
        const prompt = await ctx.db
          .query("prompts")
          .withIndex("by_key", (q) => q.eq("projectId", projectId).eq("key", promptKey))
          .first();

        if (prompt) {
          // Find the version by prompt and version number
          const version = await ctx.db
            .query("promptVersions")
            .withIndex("by_prompt_version", (q) =>
              q.eq("promptId", prompt._id).eq("versionNumber", versionNumber)
            )
            .first();

          if (version) {
            // Increment the testCount
            const currentCount = version.testCount ?? 0;
            await ctx.db.patch(version._id, {
              testCount: currentCount + 1,
              updatedAt: Date.now(),
            });
          }
        }
      }
    }

    // Create span
    const spanId = await ctx.db.insert("spans", {
      traceId,
      projectId,
      versionNumber,
      ...spanData,
      createdAt: Date.now(),
    });

    // Update trace span count and updatedAt
    const trace = await ctx.db
      .query("traces")
      .withIndex("by_trace_id", (q) => q.eq("traceId", traceId))
      .first();

    if (trace) {
      await ctx.db.patch(trace._id, {
        spanCount: trace.spanCount + 1,
        updatedAt: Date.now(),
        // Update model if not set
        model: trace.model || spanData.model || undefined,
      });
    }

    // Track production usage
    const project = await ctx.db.get(projectId);
    if (project?.orgId) {
      // Increment production tokens if provided
      const totalTokens = (spanData.inputTokens || 0) + (spanData.outputTokens || 0);
      if (totalTokens > 0) {
        await ctx.scheduler.runAfter(0, internal.domains.subscriptions.mutations.incrementUsage, {
          orgId: project.orgId,
          metric: "productionTokens",
          amount: totalTokens,
        });
      }

      // Increment trace count if this was a new trace
      if (!existingTrace) {
        await ctx.scheduler.runAfter(0, internal.domains.subscriptions.mutations.incrementUsage, {
          orgId: project.orgId,
          metric: "traces",
          amount: 1,
        });
      }

      // Increment span count
      await ctx.scheduler.runAfter(0, internal.domains.subscriptions.mutations.incrementUsage, {
        orgId: project.orgId,
        metric: "spans",
        amount: 1,
      });
    }

    return {
      spanId,
      traceId,
    };
  },
});

/**
 * Update trace status (e.g., mark as completed)
 */
export const updateTrace = mutation({
  args: {
    traceId: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trace = await ctx.db
      .query("traces")
      .withIndex("by_trace_id", (q) => q.eq("traceId", args.traceId))
      .first();

    if (!trace) {
      throw new Error("Trace not found");
    }

    await ctx.db.patch(trace._id, {
      status: args.status || "completed",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
export const deleteTrace = mutation({
  args: {
    traceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the trace using the correct index
    const trace = await ctx.db
      .query("traces")
      .withIndex("by_trace_id", (q) => q.eq("traceId", args.traceId))
      .first();

    if (!trace) {
      throw new Error("Trace not found");
    }

    // Delete all spans associated with this trace
    const spans = await ctx.db
      .query("spans")
      .withIndex("by_trace", (q) => q.eq("traceId", args.traceId))
      .collect();

    for (const span of spans) {
      await ctx.db.delete(span._id);
    }

    // Delete the trace itself
    await ctx.db.delete(trace._id);

    return { success: true };
  },
});

/**
 * Clear all logs for a project
 */
export const clearProjectLogs = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    // Get all traces for the project
    const traces = await ctx.db
      .query("traces")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const trace of traces) {
      // Delete spans
      const spans = await ctx.db
        .query("spans")
        .withIndex("by_trace", (q) => q.eq("traceId", trace.traceId))
        .collect();

      for (const span of spans) {
        await ctx.db.delete(span._id);
      }

      // Delete trace
      await ctx.db.delete(trace._id);
    }

    return { success: true };
  },
});
