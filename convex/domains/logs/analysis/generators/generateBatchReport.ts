/**
 * Generate batch report action
 */

import { v } from "convex/values";
import { action } from "../../../../_generated/server";
import { internal } from "../../../../_generated/api";
import { DEFAULT_MODEL, parseJSONResponse } from "../../../../lib/ai";
import { chatWithTracking, getOrgIdFromProject } from "../../../../lib/aiTracked";
import { buildBatchReportPrompt } from "../builders/reportBuilder";

interface BatchReport {
  reportId?: string;
  averageScore: number;
  commonPatterns: string[];
  frequentIssues: string[];
  recommendations: string[];
  summary: string;
}

export const generateBatchReport = action({
  args: {
    projectId: v.id("projects"),
    promptKey: v.string(),
    batchNumber: v.number(),
    traceIds: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<BatchReport> => {
    // Get conversation reports for these traces
    const reports = await ctx.runQuery(
      internal.domains.logs.analysis.queries.getConversationReportsByTracesInternal,
      { traceIds: args.traceIds }
    ) as any[];

    if (!reports || reports.length === 0) {
      throw new Error("No conversation reports found for batch");
    }

    // Build batch analysis prompt
    const batchPrompt = buildBatchReportPrompt({
      promptKey: args.promptKey,
      conversationReports: reports.map((r) => ({
        successScore: r.successScore,
        outcome: r.outcome,
        criticalPoints: r.criticalPoints,
        issues: r.issues,
        summary: r.summary,
      })),
      batchNumber: args.batchNumber,
    });

    // Get organization context for usage tracking
    const orgId = await getOrgIdFromProject(ctx, args.projectId);

    // Call AI with usage tracking
    let content: string;
    if (orgId) {
      content = await chatWithTracking(
        {
          ctx,
          orgId,
          projectId: args.projectId,
        },
        "generateBatchReport",
        {
          model: DEFAULT_MODEL,
          messages: [{ role: "user", content: batchPrompt }],
          maxTokens: 2000,
        }
      );
    } else {
      const ai = await import("../../../../lib/ai");
      content = await ai.chat({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: batchPrompt }],
        maxTokens: 2000,
      });
    }

    try {
      const analysis = parseJSONResponse<{
        averageScore: number;
        commonPatterns: string[];
        frequentIssues: string[];
        recommendations: string[];
        summary: string;
      }>(content);

      const result: BatchReport = {
        averageScore: analysis?.averageScore ?? 5,
        commonPatterns: analysis?.commonPatterns ?? [],
        frequentIssues: analysis?.frequentIssues ?? [],
        recommendations: analysis?.recommendations ?? [],
        summary: analysis?.summary ?? "No summary provided",
      };

      // Save batch report
      await ctx.runMutation(
        internal.domains.logs.analysis.mutations.saveBatchReportInternal,
        {
          projectId: args.projectId,
          promptKey: args.promptKey,
          versionNumber: undefined,
          batchNumber: args.batchNumber,
          conversationCount: reports.length,
          traceIds: args.traceIds,
          ...result,
        }
      );

      return result;
    } catch (error) {
      console.error("Batch analysis parsing failed:", error);

      const avgScore = reports.reduce((sum, r) => sum + r.successScore, 0) / reports.length;

      const fallback: BatchReport = {
        averageScore: avgScore,
        commonPatterns: ["Analysis failed - manual review needed"],
        frequentIssues: [],
        recommendations: ["Retry batch analysis"],
        summary: content.substring(0, 200),
      };

      await ctx.runMutation(
        internal.domains.logs.analysis.mutations.saveBatchReportInternal,
        {
          projectId: args.projectId,
          promptKey: args.promptKey,
          versionNumber: undefined,
          batchNumber: args.batchNumber,
          conversationCount: reports.length,
          traceIds: args.traceIds,
          ...fallback,
        }
      );

      return fallback;
    }
  },
});




