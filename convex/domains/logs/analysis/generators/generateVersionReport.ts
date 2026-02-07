/**
 * Generate version report action
 */

import { v } from "convex/values";
import { action } from "../../../../_generated/server";
import { internal } from "../../../../_generated/api";
import { DEFAULT_MODEL, parseJSONResponse } from "../../../../lib/ai";
import { chatWithTracking, getOrgIdFromProject } from "../../../../lib/aiTracked";
import { buildVersionReportPrompt } from "../builders/reportBuilder";

interface VersionReport {
  reportId?: string;
  totalAnalyzed: number;
  overallSuccessRate: number;
  averageScore: number;
  totalBatches: number;
  keyInsights: string[];
  improvementSuggestions: string[];
  strengthsIdentified: string[];
  weaknessesIdentified: string[];
  summary: string;
}

export const generateVersionReport = action({
  args: {
    projectId: v.id("projects"),
    promptKey: v.string(),
    versionNumber: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<VersionReport> => {
    // Get all batch reports for this prompt/version
    const batchReports = await ctx.runQuery(
      internal.domains.logs.analysis.queries.getBatchReportsByPromptInternal,
      {
        projectId: args.projectId,
        promptKey: args.promptKey,
        versionNumber: args.versionNumber,
      }
    ) as any[];

    if (!batchReports || batchReports.length === 0) {
      throw new Error("No batch reports found for version");
    }

    const totalConversations = batchReports.reduce(
      (sum, b) => sum + b.conversationCount,
      0
    );

    // Build version analysis prompt
    const versionPrompt = buildVersionReportPrompt({
      promptKey: args.promptKey,
      versionNumber: args.versionNumber,
      batchReports: batchReports.map((b) => ({
        batchNumber: b.batchNumber,
        averageScore: b.averageScore,
        commonPatterns: b.commonPatterns,
        frequentIssues: b.frequentIssues,
        recommendations: b.recommendations,
        summary: b.summary,
      })),
      totalConversations,
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
        "generateVersionReport",
        {
          model: DEFAULT_MODEL,
          messages: [{ role: "user", content: versionPrompt }],
          maxTokens: 2500,
        }
      );
    } else {
      const ai = await import("../../../../lib/ai");
      content = await ai.chat({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: versionPrompt }],
        maxTokens: 2500,
      });
    }

    try {
      const analysis = parseJSONResponse<{
        overallSuccessRate: number;
        averageScore: number;
        keyInsights: string[];
        improvementSuggestions: string[];
        strengthsIdentified: string[];
        weaknessesIdentified: string[];
        summary: string;
      }>(content);

      const result: VersionReport = {
        totalAnalyzed: totalConversations,
        overallSuccessRate: analysis?.overallSuccessRate ?? 50,
        averageScore: analysis?.averageScore ?? 5,
        totalBatches: batchReports.length,
        keyInsights: analysis?.keyInsights ?? [],
        improvementSuggestions: analysis?.improvementSuggestions ?? [],
        strengthsIdentified: analysis?.strengthsIdentified ?? [],
        weaknessesIdentified: analysis?.weaknessesIdentified ?? [],
        summary: analysis?.summary ?? "No summary provided",
      };

      // Save version report
      await ctx.runMutation(
        internal.domains.logs.analysis.mutations.saveVersionReportInternal,
        {
          projectId: args.projectId,
          promptKey: args.promptKey,
          versionNumber: args.versionNumber,
          ...result,
        }
      );

      return result;
    } catch (error) {
      console.error("Version analysis parsing failed:", error);

      const avgScore = batchReports.reduce((sum, b) => sum + b.averageScore, 0) / batchReports.length;
      const successRate = (avgScore / 10) * 100;

      const fallback: VersionReport = {
        totalAnalyzed: totalConversations,
        overallSuccessRate: successRate,
        averageScore: avgScore,
        totalBatches: batchReports.length,
        keyInsights: ["Analysis failed - manual review needed"],
        improvementSuggestions: ["Retry version analysis"],
        strengthsIdentified: [],
        weaknessesIdentified: [],
        summary: content.substring(0, 200),
      };

      await ctx.runMutation(
        internal.domains.logs.analysis.mutations.saveVersionReportInternal,
        {
          projectId: args.projectId,
          promptKey: args.promptKey,
          versionNumber: args.versionNumber,
          ...fallback,
        }
      );

      return fallback;
    }
  },
});




