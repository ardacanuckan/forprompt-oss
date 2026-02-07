/**
 * Conversation logging queries
 * Retrieves traces and spans for dashboard viewing
 */

import { v } from "convex/values";
import { query, internalQuery } from "../../_generated/server";

/**
 * Get traces for a project
 */
export const getTraces = query({
  args: {
    projectId: v.id("projects"),
    promptKey: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { projectId, promptKey, limit = 50 } = args;

    let query = ctx.db
      .query("traces")
      .withIndex("by_project", (q) => q.eq("projectId", projectId));

    if (promptKey) {
      query = ctx.db
        .query("traces")
        .withIndex("by_project_prompt", (q) =>
          q.eq("projectId", projectId).eq("promptKey", promptKey)
        );
    }

    const traces = await query
      .order("desc")
      .take(limit);

    return traces;
  },
});

/**
 * Get a single trace with all its spans
 */
export const getTraceWithSpans = query({
  args: {
    traceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get trace
    const trace = await ctx.db
      .query("traces")
      .withIndex("by_trace_id", (q) => q.eq("traceId", args.traceId))
      .first();

    if (!trace) {
      throw new Error("Trace not found");
    }

    // Get all spans for this trace
    const spans = await ctx.db
      .query("spans")
      .withIndex("by_trace", (q) => q.eq("traceId", args.traceId))
      .order("asc")
      .collect();

    return {
      trace,
      spans,
    };
  },
});

/**
 * Get trace by ID (without spans)
 */
export const getTrace = query({
  args: {
    traceId: v.string(),
  },
  handler: async (ctx, args) => {
    const trace = await ctx.db
      .query("traces")
      .withIndex("by_trace_id", (q) => q.eq("traceId", args.traceId))
      .first();

    return trace;
  },
});

/**
 * Get stats for a project
 */
export const getProjectStats = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const traces = await ctx.db
      .query("traces")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const totalSpans = traces.reduce((sum, trace) => sum + trace.spanCount, 0);

    return {
      totalTraces: traces.length,
      totalSpans,
    };
  },
});

/**
 * Get a single trace with all its spans (internal)
 */
export const getTraceWithSpansInternal = internalQuery({
  args: {
    traceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get trace
    const trace = await ctx.db
      .query("traces")
      .withIndex("by_trace_id", (q) => q.eq("traceId", args.traceId))
      .first();

    if (!trace) {
      return null;
    }

    // Get all spans for this trace
    const spans = await ctx.db
      .query("spans")
      .withIndex("by_trace", (q) => q.eq("traceId", args.traceId))
      .order("asc")
      .collect();

    return {
      trace,
      spans,
    };
  },
});

