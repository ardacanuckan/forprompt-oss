/**
 * Conversation analysis queries
 */

import { v } from "convex/values";
import { query, internalQuery } from "../../../_generated/server";

/**
 * Get conversation report by trace ID (internal)
 */
export const getConversationReportByTraceInternal = internalQuery({
  args: {
    traceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversationReports")
      .withIndex("by_trace", (q) => q.eq("traceId", args.traceId))
      .first();
  },
});

/**
 * Get conversation reports by trace IDs (internal)
 */
export const getConversationReportsByTracesInternal = internalQuery({
  args: {
    traceIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const reports = [];

    for (const traceId of args.traceIds) {
      const report = await ctx.db
        .query("conversationReports")
        .withIndex("by_trace", (q) => q.eq("traceId", traceId))
        .first();

      if (report) {
        reports.push(report);
      }
    }

    return reports;
  },
});

/**
 * Get all conversation reports for a prompt key
 */
export const getConversationReportsByPrompt = query({
  args: {
    projectId: v.id("projects"),
    promptKey: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const allReports = await ctx.db
      .query("conversationReports")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    return allReports
      .filter((r) => r.promptKey === args.promptKey)
      .slice(0, limit);
  },
});

/**
 * Get batch reports by prompt (internal)
 */
export const getBatchReportsByPromptInternal = internalQuery({
  args: {
    projectId: v.id("projects"),
    promptKey: v.string(),
    versionNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allReports = await ctx.db
      .query("batchReports")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    let reports = allReports.filter((r) => r.promptKey === args.promptKey);

    if (args.versionNumber !== undefined) {
      reports = reports.filter((r) => r.versionNumber === args.versionNumber);
    }

    return reports;
  },
});

/**
 * Get batch reports for a prompt key
 */
export const getBatchReportsByPrompt = query({
  args: {
    projectId: v.id("projects"),
    promptKey: v.string(),
    versionNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allReports = await ctx.db
      .query("batchReports")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    let reports = allReports.filter((r) => r.promptKey === args.promptKey);

    if (args.versionNumber !== undefined) {
      reports = reports.filter((r) => r.versionNumber === args.versionNumber);
    }

    return reports;
  },
});

/**
 * Get version success report
 */
export const getVersionReport = query({
  args: {
    projectId: v.id("projects"),
    promptKey: v.string(),
    versionNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allReports = await ctx.db
      .query("versionSuccessReports")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const reports = allReports.filter((r) => r.promptKey === args.promptKey);
    const report = reports.find((r) => r.versionNumber === args.versionNumber);

    return report ?? null;
  },
});

/**
 * Get all version reports for a project
 */
export const getVersionReportsByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("versionSuccessReports")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

/**
 * Get analysis statistics for a prompt
 */
export const getPromptAnalysisStats = query({
  args: {
    projectId: v.id("projects"),
    promptKey: v.string(),
  },
  handler: async (ctx, args) => {
    const allConversationReports = await ctx.db
      .query("conversationReports")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const conversationReports = allConversationReports.filter(
      (r) => r.promptKey === args.promptKey
    );

    const allBatchReports = await ctx.db
      .query("batchReports")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const batchReports = allBatchReports.filter(
      (r) => r.promptKey === args.promptKey
    );

    const avgScore =
      conversationReports.length > 0
        ? conversationReports.reduce((sum, r) => sum + r.successScore, 0) /
          conversationReports.length
        : 0;

    return {
      totalConversationReports: conversationReports.length,
      totalBatchReports: batchReports.length,
      averageSuccessScore: avgScore,
    };
  },
});
