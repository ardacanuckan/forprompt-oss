/**
 * Conversation analysis mutations
 */

import { v } from "convex/values";
import { internalMutation } from "../../../_generated/server";

/**
 * Save a conversation report (internal only)
 */
export const saveConversationReportInternal = internalMutation({
  args: {
    traceId: v.string(),
    projectId: v.id("projects"),
    promptKey: v.string(),
    versionNumber: v.optional(v.number()),
    successScore: v.number(),
    outcome: v.string(),
    criticalPoints: v.array(v.string()),
    issues: v.array(v.string()),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversationReports", {
      traceId: args.traceId,
      projectId: args.projectId,
      promptKey: args.promptKey,
      versionNumber: args.versionNumber,
      successScore: args.successScore,
      outcome: args.outcome,
      criticalPoints: args.criticalPoints,
      issues: args.issues,
      summary: args.summary,
      createdAt: Date.now(),
    });
  },
});

/**
 * Save a batch report (internal only)
 */
export const saveBatchReportInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    promptKey: v.string(),
    versionNumber: v.optional(v.number()),
    batchNumber: v.number(),
    conversationCount: v.number(),
    traceIds: v.array(v.string()),
    averageScore: v.number(),
    commonPatterns: v.array(v.string()),
    frequentIssues: v.array(v.string()),
    recommendations: v.array(v.string()),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("batchReports", {
      projectId: args.projectId,
      promptKey: args.promptKey,
      versionNumber: args.versionNumber,
      batchNumber: args.batchNumber,
      conversationCount: args.conversationCount,
      traceIds: args.traceIds,
      averageScore: args.averageScore,
      commonPatterns: args.commonPatterns,
      frequentIssues: args.frequentIssues,
      recommendations: args.recommendations,
      summary: args.summary,
      createdAt: Date.now(),
    });
  },
});

/**
 * Save or update a version report (internal only)
 */
export const saveVersionReportInternal = internalMutation({
  args: {
    projectId: v.id("projects"),
    promptKey: v.string(),
    versionNumber: v.optional(v.number()),
    totalAnalyzed: v.number(),
    overallSuccessRate: v.number(),
    averageScore: v.number(),
    totalBatches: v.number(),
    keyInsights: v.array(v.string()),
    improvementSuggestions: v.array(v.string()),
    strengthsIdentified: v.array(v.string()),
    weaknessesIdentified: v.array(v.string()),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if a report already exists for this prompt/version
    const allReports = await ctx.db
      .query("versionSuccessReports")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const existingReports = allReports.filter((r) => r.promptKey === args.promptKey);
    const existingReport = existingReports.find(
      (r) => r.versionNumber === args.versionNumber
    );

    if (existingReport) {
      await ctx.db.patch(existingReport._id, {
        totalAnalyzed: args.totalAnalyzed,
        overallSuccessRate: args.overallSuccessRate,
        averageScore: args.averageScore,
        totalBatches: args.totalBatches,
        keyInsights: args.keyInsights,
        improvementSuggestions: args.improvementSuggestions,
        strengthsIdentified: args.strengthsIdentified,
        weaknessesIdentified: args.weaknessesIdentified,
        summary: args.summary,
        updatedAt: Date.now(),
      });

      return existingReport._id;
    } else {
      return await ctx.db.insert("versionSuccessReports", {
        projectId: args.projectId,
        promptKey: args.promptKey,
        versionNumber: args.versionNumber,
        totalAnalyzed: args.totalAnalyzed,
        overallSuccessRate: args.overallSuccessRate,
        averageScore: args.averageScore,
        totalBatches: args.totalBatches,
        keyInsights: args.keyInsights,
        improvementSuggestions: args.improvementSuggestions,
        strengthsIdentified: args.strengthsIdentified,
        weaknessesIdentified: args.weaknessesIdentified,
        summary: args.summary,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});
